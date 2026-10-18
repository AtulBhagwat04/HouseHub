import User from '../models/User.js';
import Achievement from '../models/Achievement.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { levelFromXp, xpProgress } from '../../../shared/levels.js';
import { createNotification } from './notificationService.js';
import { logActivity } from './activityService.js';

/** Counters that the rest of the app is allowed to increment. */
export const STAT_FIELDS = [
  'choresCompleted',
  'choresCreated',
  'expensesAdded',
  'expensesPaid',
  'settlementsCompleted',
];

/**
 * The single definition of "what number does this achievement watch".
 * Server-side only - a client can never report its own progress.
 */
export function readMetric(user, metric) {
  const stats = user.stats || {};
  switch (metric) {
    case 'xp':
      return user.xp || 0;
    case 'level':
      return user.level || 1;
    case 'choresCompleted':
      return stats.choresCompleted || 0;
    case 'choresCreated':
      return stats.choresCreated || 0;
    case 'expensesAdded':
      return stats.expensesAdded || 0;
    case 'expensesPaid':
      return stats.expensesPaid || 0;
    case 'settlementsCompleted':
      return stats.settlementsCompleted || 0;
    default:
      return 0;
  }
}

export function achievementProgress(user, definition) {
  const current = readMetric(user, definition.metric);
  const target = Math.max(1, definition.target || 1);
  return {
    current,
    target,
    progress: Math.min(1, current / target),
    unlocked: current >= target,
  };
}

/** Atomic counter bumps. Unknown or zero-valued keys are ignored. */
export async function incrementStats(userId, increments = {}) {
  const update = {};
  for (const [key, value] of Object.entries(increments)) {
    if (!STAT_FIELDS.includes(key)) continue;
    const delta = Math.floor(Number(value) || 0);
    if (delta === 0) continue;
    update[`stats.${key}`] = delta;
  }
  if (Object.keys(update).length === 0) return;

  await User.updateOne({ _id: userId }, { $inc: update });
}

/**
 * Credits XP and re-derives the level.
 *
 * Concurrency: `$inc` is atomic, and the level is written with `$max`, so two
 * simultaneous completions can never drag a level backwards. The chore's own
 * `xpAwarded` flag is the outer guard that stops double-crediting entirely.
 */
export async function awardXp(userId, amount) {
  const award = Math.max(0, Math.floor(Number(amount) || 0));

  const before = await User.findById(userId).select('xp level');
  if (!before) throw ApiError.notFound('Member not found');

  if (award === 0) {
    return {
      awarded: 0,
      xpBefore: before.xp,
      xpAfter: before.xp,
      previousLevel: before.level,
      level: before.level,
      levelledUp: false,
      progress: xpProgress(before.xp),
    };
  }

  await User.updateOne({ _id: userId }, { $inc: { xp: award } });

  const after = await User.findById(userId).select('xp level');
  const computedLevel = levelFromXp(after.xp);
  if (computedLevel > after.level) {
    // $max keeps this monotonic under concurrent writers.
    await User.updateOne({ _id: userId }, { $max: { level: computedLevel } });
    after.level = computedLevel;
  }

  return {
    awarded: award,
    xpBefore: before.xp,
    xpAfter: after.xp,
    previousLevel: before.level,
    level: after.level,
    levelledUp: after.level > before.level,
    levelsGained: Math.max(0, after.level - before.level),
    progress: xpProgress(after.xp),
  };
}

/**
 * Unlocks every achievement the user now qualifies for.
 *
 * The `$push` is filtered on `achievements.achievement != id`, so re-running
 * this is safe and two concurrent completions cannot double-unlock.
 */
export async function evaluateAchievements(userId, { houseId = null } = {}) {
  const user = await User.findById(userId);
  if (!user) return [];

  const definitions = await Achievement.find({ isActive: true }).sort({ order: 1 });
  const alreadyUnlocked = new Set(user.achievements.map((entry) => String(entry.achievement)));
  const newlyUnlocked = [];

  for (const definition of definitions) {
    if (alreadyUnlocked.has(String(definition._id))) continue;

    const { current, progress } = achievementProgress(user, definition);
    if (current < definition.target) continue;

    const result = await User.updateOne(
      { _id: userId, 'achievements.achievement': { $ne: definition._id } },
      {
        $push: {
          achievements: {
            achievement: definition._id,
            unlockedAt: new Date(),
            progressAtUnlock: current,
          },
        },
      },
    );

    if (result.modifiedCount === 0) continue;

    newlyUnlocked.push({ definition, current, progress });

    await createNotification({
      recipientId: userId,
      houseId,
      type: 'achievement_unlocked',
      title: 'Achievement unlocked',
      message: `${definition.icon} ${definition.name} - ${definition.description}`,
      link: '/achievements',
      meta: { achievementCode: definition.code },
    });

    await logActivity({
      houseId,
      actorId: userId,
      type: 'achievement_unlocked',
      message: `unlocked ${definition.name}`,
      meta: { achievementCode: definition.code, icon: definition.icon },
    });
  }

  if (newlyUnlocked.length > 0) {
    logger.debug(`Unlocked ${newlyUnlocked.length} achievement(s) for user ${userId}`);
  }

  return newlyUnlocked;
}

/** Catalogue + this user's progress on each one, for the Achievements page. */
export async function buildAchievementBoard(user) {
  const definitions = await Achievement.find({ isActive: true }).sort({ order: 1 });
  const unlockedByCode = new Map();
  for (const entry of user.achievements) {
    unlockedByCode.set(String(entry.achievement), entry);
  }

  const board = definitions.map((definition) => ({
    definition,
    progress: achievementProgress(user, definition),
    unlockedAt: unlockedByCode.get(String(definition._id))?.unlockedAt || null,
  }));

  return {
    board,
    unlockedCount: board.filter((entry) => entry.unlockedAt).length,
    totalCount: board.length,
    xp: xpProgress(user.xp || 0),
  };
}

/**
 * Leaderboard for a house: XP descending, ties broken by chores completed, then
 * name. Rank is computed over the full member list so ties share a rank.
 */
export async function buildLeaderboard(house, { limit = null } = {}) {
  const memberIds = house.members.map((member) => member.user?._id || member.user);

  const users = await User.find({ _id: { $in: memberIds } })
    .select('name avatarUrl xp level stats')
    .lean();

  const roleById = new Map(house.members.map((member) => [String(member.user?._id || member.user), member.role]));

  const sorted = users
    .map((user) => ({
      _id: String(user._id),
      name: user.name,
      avatarUrl: user.avatarUrl || '',
      xp: user.xp || 0,
      level: xpProgress(user.xp || 0).level,
      choresCompleted: user.stats?.choresCompleted || 0,
      role: roleById.get(String(user._id)) || 'member',
    }))
    .sort(
      (a, b) =>
        b.xp - a.xp ||
        b.choresCompleted - a.choresCompleted ||
        a.name.localeCompare(b.name),
    );

  let previousXp = null;
  let previousRank = 0;
  const ranked = sorted.map((entry, index) => {
    const rank = previousXp !== null && entry.xp === previousXp ? previousRank : index + 1;
    previousXp = entry.xp;
    previousRank = rank;
    return { ...entry, rank };
  });

  return {
    entries: limit ? ranked.slice(0, limit) : ranked,
    totalMembers: ranked.length,
  };
}

/** Where does this user sit? Used on the dashboard and member cards. */
export function findRank(leaderboard, userId) {
  const key = String(userId);
  return leaderboard.entries.find((entry) => entry._id === key) || null;
}

export default {
  STAT_FIELDS,
  readMetric,
  achievementProgress,
  incrementStats,
  awardXp,
  evaluateAchievements,
  buildAchievementBoard,
  buildLeaderboard,
  findRank,
};

import Chore from '../models/Chore.js';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import { buildHouseBalances, summariseForMember } from './balanceService.js';
import { buildLeaderboard, findRank } from './gamificationService.js';
import { recentActivity } from './activityService.js';
import { serializeActivity, serializeChore, serializeUser } from '../utils/serializers.js';
import { toRupees } from '../../../shared/money.js';
import { xpProgress } from '../../../shared/levels.js';

function startOfWeek(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // Monday-based week
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Everything the dashboard renders, in one round trip.
 *
 * Runs its queries in parallel because the dashboard is the hottest page in the
 * app and a sequential waterfall of six queries is very visible on a cold load.
 */
export async function buildDashboard(house, userId) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const memberIds = house.members.map((member) => member.user?._id || member.user);

  const [
    balances,
    leaderboard,
    activity,
    myPending,
    myInProgress,
    myOverdue,
    myCompleted,
    houseCompleted,
    houseOpen,
    houseOverdue,
    houseCompletedThisWeek,
    recentExpenses,
  ] = await Promise.all([
    buildHouseBalances(house),
    buildLeaderboard(house),
    recentActivity(house._id, 8),
    Chore.countDocuments({ house: house._id, assignedTo: userId, status: 'pending', dueDate: { $gte: now } }),
    Chore.countDocuments({ house: house._id, assignedTo: userId, status: 'in_progress' }),
    Chore.countDocuments({ house: house._id, assignedTo: userId, status: { $ne: 'completed' }, dueDate: { $lt: now } }),
    Chore.countDocuments({ house: house._id, assignedTo: userId, status: 'completed' }),
    Chore.countDocuments({ house: house._id, status: 'completed' }),
    Chore.countDocuments({ house: house._id, status: { $ne: 'completed' } }),
    Chore.countDocuments({ house: house._id, status: { $ne: 'completed' }, dueDate: { $lt: now } }),
    Chore.countDocuments({ house: house._id, status: 'completed', completedAt: { $gte: weekStart } }),
    Expense.find({ house: house._id }).sort({ date: -1 }).limit(5).populate('paidBy', 'name avatarUrl').lean(),
  ]);

  const summary = summariseForMember(balances, userId);
  const me = await User.findById(userId).select('xp level name avatarUrl stats');
  const progress = xpProgress(me?.xp || 0);
  const myRank = findRank(leaderboard, userId);

  const memberById = new Map(
    house.members.map((member) => [String(member.user?._id || member.user), member]),
  );
  const memberDocs = await User.find({ _id: { $in: memberIds } })
    .select('name avatarUrl xp level')
    .lean();

  const members = memberDocs.map((user) => {
    const membership = memberById.get(String(user._id));
    return {
      ...serializeUser(user, { role: membership?.role, joinedAt: membership?.joinedAt }),
      net: balances.netByMember.get(String(user._id)) || 0,
      rank: findRank(leaderboard, user._id)?.rank || null,
      choresCompleted: user.stats?.choresCompleted || 0,
    };
  });

  const myChores = await Chore.find({ house: house._id, assignedTo: userId, status: { $ne: 'completed' } })
    .sort({ dueDate: 1 })
    .limit(5)
    .populate('assignedTo', 'name avatarUrl xp level')
    .populate('createdBy', 'name avatarUrl xp level');

  return {
    houseId: String(house._id),
    financials: {
      totalHouseExpenses: balances.totalExpenses,
      totalHouseExpensesRupees: toRupees(balances.totalExpenses),
      youOwe: summary.youOweTotal,
      youAreOwed: summary.youAreOwedTotal,
      netBalance: summary.netBalance,
      youOweRupees: toRupees(summary.youOweTotal),
      youAreOwedRupees: toRupees(summary.youAreOwedTotal),
      netBalanceRupees: toRupees(summary.netBalance),
      youOweTo: summary.youOwe,
      owedToYouBy: summary.youAreOwed,
    },
    chores: {
      myPending,
      myInProgress,
      myOverdue,
      myCompleted,
      houseOpen,
      houseOverdue,
      houseCompleted,
      houseCompletedThisWeek,
      weeklyGoal: {
        target: house.settings?.weeklyChoreGoal || 50,
        completed: houseCompletedThisWeek,
        progress: Math.min(
          1,
          houseCompletedThisWeek / Math.max(1, house.settings?.weeklyChoreGoal || 50),
        ),
      },
    },
    xp: {
      totalXp: progress.totalXp,
      level: progress.level,
      xpIntoLevel: progress.xpIntoLevel,
      xpForNextLevel: progress.xpForNextLevel,
      xpToNextLevel: progress.xpToNextLevel,
      progress: progress.progress,
    },
    rank: myRank?.rank || null,
    totalMembers: leaderboard.totalMembers,
    leaderboardTop: leaderboard.entries.slice(0, 3),
    upcomingChores: myChores.map(serializeChore),
    recentExpenses: recentExpenses.map((expense) => ({
      _id: String(expense._id),
      title: expense.title,
      amount: expense.amount,
      amountRupees: toRupees(expense.amount),
      category: expense.category,
      date: expense.date,
      paidBy: expense.paidBy?.name || 'Unknown',
    })),
    recentActivity: activity.map(serializeActivity),
    members,
  };
}

export default { buildDashboard };

import Chore from '../models/Chore.js';
import ApiError from '../utils/ApiError.js';
import { awardXp, evaluateAchievements, incrementStats } from './gamificationService.js';
import { createNotification, createNotifications } from './notificationService.js';
import { logActivity } from './activityService.js';
import { serializeChore } from '../utils/serializers.js';
import logger from '../utils/logger.js';

/** Only the assignee, or someone who manages the house, may progress a chore. */
export function assertCanComplete(house, chore, userId, houseRole) {
  const assignee = String(chore.assignedTo?._id || chore.assignedTo);
  const isAssignee = assignee === String(userId);
  const isManager = houseRole === 'owner' || houseRole === 'admin';
  if (!isAssignee && !isManager) {
    throw ApiError.forbidden('Only the assigned member can complete this chore');
  }
}

/**
 * THE COMPLETION FLOW (product spec section 20)
 *
 *   complete -> validate -> update chore -> award XP -> update level
 *            -> update leaderboard -> check achievements -> notify
 *
 * There are no multi-document transactions on a standalone MongoDB, so the flow
 * is built from two idempotent, single-document guard writes:
 *
 *   1. `status != completed` -> set completed        (can only happen once)
 *   2. `xpAwarded == false`  -> set xpAwarded true   (the XP claim token)
 *
 * Step 2 is the important one. If the process dies after marking the chore done
 * but before crediting XP, `xpAwarded` is still false, so a retry credits the XP
 * exactly once. If two requests race, only one wins the claim. Double-awarding
 * XP is the failure mode that would actually break the leaderboard, so the guard
 * is placed there rather than on the status write.
 */
export async function completeChoreFlow({ house, chore, actorId, houseRole }) {
  assertCanComplete(house, chore, actorId, houseRole);

  const justCompleted = await Chore.findOneAndUpdate(
    { _id: chore._id, house: house._id, status: { $ne: 'completed' } },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        completedBy: actorId,
      },
    },
    { new: true },
  );

  if (!justCompleted) {
    const current = await Chore.findById(chore._id);
    return {
      chore: current,
      alreadyCompleted: true,
      xp: null,
      newAchievements: [],
      unlockedLevel: null,
    };
  }

  // Claim the XP award. Only one caller can flip this flag.
  const claim = await Chore.findOneAndUpdate(
    { _id: chore._id, xpAwarded: false },
    { $set: { xpAwarded: true } },
    { new: true },
  );

  if (!claim) {
    logger.warn(`Chore ${chore._id} completed but XP was already claimed`);
    return {
      chore: justCompleted,
      alreadyCompleted: false,
      xp: null,
      newAchievements: [],
      unlockedLevel: null,
    };
  }

  const assigneeId = String(justCompleted.assignedTo);
  const actor = String(actorId);

  await incrementStats(assigneeId, { choresCompleted: 1 });

  // XP is credited to the ASSIGNEE (the person who did the work), which may
  // differ from whoever pressed the button if an admin completed it for them.
  const xp = await awardXp(assigneeId, justCompleted.xpReward);

  await logActivity({
    houseId: house._id,
    actorId,
    type: 'chore_completed',
    message: `completed ${justCompleted.title}`,
    meta: { choreId: String(justCompleted._id), xp: xp.awarded, title: justCompleted.title },
  });

  const creatorId = String(justCompleted.createdBy);
  if (creatorId !== actor) {
    await createNotification({
      recipientId: creatorId,
      houseId: house._id,
      actorId,
      type: 'chore_completed',
      title: 'Chore completed',
      message: `${justCompleted.title} was completed`,
      link: `/chores/${justCompleted._id}`,
      meta: { choreId: String(justCompleted._id) },
    });
  }

  if (xp.levelledUp && assigneeId !== creatorId) {
    await createNotification({
      recipientId: assigneeId,
      houseId: house._id,
      type: 'level_up',
      title: `Level ${xp.level} reached`,
      message: `You levelled up to level ${xp.level}. Keep going!`,
      link: '/profile',
      meta: { level: xp.level },
    });
  }

  if (xp.levelledUp) {
    await logActivity({
      houseId: house._id,
      actorId,
      type: 'level_up',
      message: `reached level ${xp.level}`,
      meta: { level: xp.level },
    });
  }

  const newAchievements = await evaluateAchievements(assigneeId, { houseId: house._id });

  return {
    chore: justCompleted,
    alreadyCompleted: false,
    xp,
    newAchievements: newAchievements.map((entry) => ({
      code: entry.definition.code,
      name: entry.definition.name,
      description: entry.definition.description,
      icon: entry.definition.icon,
    })),
    unlockedLevel: xp.levelledUp ? xp.level : null,
  };
}

export async function startChoreFlow({ house, chore, actorId, houseRole }) {
  assertCanComplete(house, chore, actorId, houseRole);

  if (chore.status === 'completed') {
    throw ApiError.badRequest('This chore is already completed');
  }

  const updated = await Chore.findOneAndUpdate(
    { _id: chore._id, house: house._id, status: 'pending' },
    { $set: { status: 'in_progress', startedAt: new Date() } },
    { new: true },
  );

  return updated || Chore.findById(chore._id);
}

/** Side effects for a newly created chore. */
export async function recordChoreCreated({ house, chore, actorId }) {
  await incrementStats(actorId, { choresCreated: 1 });

  await logActivity({
    houseId: house._id,
    actorId,
    type: 'chore_created',
    message: `created chore "${chore.title}"`,
    meta: { choreId: String(chore._id), title: chore.title, xp: chore.xpReward },
  });

  const assigneeId = String(chore.assignedTo?._id || chore.assignedTo);
  if (assigneeId !== String(actorId)) {
    await createNotification({
      recipientId: assigneeId,
      houseId: house._id,
      actorId,
      type: 'chore_assigned',
      title: 'New chore assigned',
      message: `${chore.title} is due ${new Date(chore.dueDate).toLocaleDateString('en-IN')}`,
      link: `/chores/${chore._id}`,
      meta: { choreId: String(chore._id), xp: chore.xpReward },
    });
  }

  await evaluateAchievements(actorId, { houseId: house._id });
}

/** Side effects when a chore is reassigned or edited. */
export async function recordChoreUpdated({ house, chore, actorId, previousAssigneeId }) {
  await logActivity({
    houseId: house._id,
    actorId,
    type: 'chore_created',
    message: `updated chore "${chore.title}"`,
    meta: { choreId: String(chore._id), title: chore.title },
  });

  const assigneeId = String(chore.assignedTo?._id || chore.assignedTo);
  if (assigneeId !== String(previousAssigneeId) && assigneeId !== String(actorId)) {
    await createNotifications([assigneeId], {
      houseId: house._id,
      actorId,
      type: 'chore_assigned',
      title: 'Chore assigned to you',
      message: `${chore.title} is now yours`,
      link: `/chores/${chore._id}`,
      meta: { choreId: String(chore._id) },
    });
  }
}

export function toResponseChore(chore) {
  return serializeChore(chore);
}

export default { completeChoreFlow, startChoreFlow, recordChoreCreated, recordChoreUpdated, assertCanComplete };

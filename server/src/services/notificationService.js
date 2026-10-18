import Notification from '../models/Notification.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Maps notification types onto the user preference that governs them.
 * A `null` mapping means "always send" (e.g. someone joined your house).
 */
const PREFERENCE_BY_TYPE = {
  chore_assigned: 'chores',
  chore_completed: 'chores',
  chore_overdue: 'chores',
  expense_added: 'expenses',
  settlement_requested: 'settlements',
  settlement_confirmed: 'settlements',
  settlement_rejected: 'settlements',
  settlement_reminder: 'settlements',
  achievement_unlocked: 'achievements',
  level_up: 'achievements',
  member_joined: null,
};

export async function createNotification({
  recipientId,
  houseId = null,
  actorId = null,
  type,
  title,
  message = '',
  link = '',
  meta = {},
}) {
  if (!recipientId) return null;

  const preferenceKey = PREFERENCE_BY_TYPE[type];
  if (preferenceKey) {
    const recipient = await User.findById(recipientId).select('notificationPrefs');
    if (recipient && recipient.notificationPrefs && recipient.notificationPrefs[preferenceKey] === false) {
      return null;
    }
  }

  return Notification.create({
    user: recipientId,
    house: houseId,
    actor: actorId,
    type,
    title,
    message,
    link,
    meta,
  });
}

/** Fan-out helper that de-duplicates recipients. */
export async function createNotifications(recipientIds, payload) {
  const unique = [...new Set((recipientIds || []).filter(Boolean).map((id) => String(id)))];
  if (unique.length === 0) return [];

  const results = await Promise.allSettled(
    unique.map((recipientId) => createNotification({ ...payload, recipientId })),
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.warn('Failed to create notification:', result.reason?.message);
    }
  }

  return results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
}

export default { createNotification, createNotifications };

import Activity from '../models/Activity.js';
import logger from '../utils/logger.js';

/**
 * Appends to the house timeline.
 *
 * Deliberately swallows its own errors: a house timeline entry is decoration,
 * and it must never be the reason a user's expense or chore action fails.
 */
export async function logActivity({ houseId, actorId = null, type, message, meta = {} }) {
  if (!houseId) return null;
  try {
    return await Activity.create({
      house: houseId,
      actor: actorId,
      type,
      message,
      meta,
    });
  } catch (error) {
    logger.warn('Failed to record activity:', error.message);
    return null;
  }
}

export async function recentActivity(houseId, limit = 10) {
  return Activity.find({ house: houseId })
    .sort({ createdAt: -1 })
    .limit(Math.min(50, Math.max(1, limit)))
    .populate('actor', 'name avatarUrl xp level');
}

export default { logActivity, recentActivity };

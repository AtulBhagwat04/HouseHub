import asyncHandler from '../utils/asyncHandler.js';
import { sendData } from '../utils/response.js';
import { serializeAchievement } from '../utils/serializers.js';
import { buildAchievementBoard } from '../services/gamificationService.js';

/**
 * The catalogue plus THIS user's progress.
 *
 * Progress is always recomputed from the server's own counters, never sent by
 * the client, so an achievement cannot be claimed by editing a request body.
 */
export const getAchievements = asyncHandler(async (req, res) => {
  const { board, unlockedCount, totalCount, xp } = await buildAchievementBoard(req.user);

  return sendData(res, {
    achievements: board.map(({ definition, progress, unlockedAt }) =>
      serializeAchievement(definition, { progress, unlockedAt }),
    ),
    unlockedCount,
    totalCount,
    xp,
  });
});

export default { getAchievements };

import Achievement from '../models/Achievement.js';
import { ACHIEVEMENT_DEFINITIONS } from '../config/achievements.js';

/**
 * Upserts the achievement catalogue from config into MongoDB.
 *
 * Idempotent, so it is safe to run on every deploy and in test setup. Using the
 * database rather than a hard-coded array means the admin area can later disable
 * an achievement without a code change.
 */
export async function syncAchievementDefinitions() {
  const operations = ACHIEVEMENT_DEFINITIONS.map((definition) => ({
    updateOne: {
      filter: { code: definition.code },
      update: { $set: definition },
      upsert: true,
    },
  }));

  const result = await Achievement.bulkWrite(operations);
  return {
    total: ACHIEVEMENT_DEFINITIONS.length,
    created: result.upsertedCount,
    updated: result.modifiedCount,
  };
}

export default { syncAchievementDefinitions };

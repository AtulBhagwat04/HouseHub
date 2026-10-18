/**
 * XP and level progression for HOUSEHUB.
 *
 * The curve is not linear, so it lives as an explicit table for the levels the
 * product spec calls out, with a closed-form extension beyond level 7. Change
 * the curve here and both the API and the UI follow automatically.
 */

/** Total XP required to *reach* a given level. */
const BASE_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1850];

export const MAX_LEVEL = 200;

/**
 * XP needed to reach `level`.
 *
 * L1 0 - L2 100 - L3 250 - L4 500 - L5 850 - L6 1300 - L7 1850
 * Beyond L7 the per-level increment keeps growing by 100:
 * L8 2500, L9 3250, L10 4100 ...
 */
export function xpForLevel(level) {
  const target = Math.floor(Number(level) || 1);
  if (target <= 1) return 0;
  if (target <= BASE_THRESHOLDS.length) return BASE_THRESHOLDS[target - 1];

  // sum of increments 150 + (n-3)*100 for n = 3..target
  const steps = target - 2;
  return 100 + 150 * steps + 100 * ((steps * (steps - 1)) / 2);
}

/** Which level does this XP total correspond to? */
export function levelFromXp(xp) {
  const total = Math.max(0, Math.floor(Number(xp) || 0));
  let level = 1;
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= total) level += 1;
  return level;
}

/**
 * The shape every XP display in the UI needs:
 *   level, xpIntoLevel, xpForNextLevel, progress (0-1), xpToNextLevel
 */
export function xpProgress(xp) {
  const total = Math.max(0, Math.floor(Number(xp) || 0));
  const level = levelFromXp(total);
  const levelStartXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const span = nextLevelXp - levelStartXp;
  const xpIntoLevel = total - levelStartXp;
  const isMax = level >= MAX_LEVEL;

  return {
    totalXp: total,
    level,
    levelStartXp,
    nextLevelXp,
    xpIntoLevel,
    xpForNextLevel: Math.max(0, nextLevelXp - levelStartXp),
    xpToNextLevel: isMax ? 0 : Math.max(0, nextLevelXp - total),
    progress: isMax || span <= 0 ? 1 : Math.min(1, Math.max(0, xpIntoLevel / span)),
    isMax,
  };
}

/**
 * Applies an XP award and reports whether a level boundary was crossed, so the
 * completion flow can fire a level-up notification and animation.
 */
export function applyXp(currentXp, award) {
  const before = Math.max(0, Math.floor(Number(currentXp) || 0));
  const amount = Math.floor(Number(award) || 0);
  const after = Math.max(0, before + amount);
  const previousLevel = levelFromXp(before);
  const level = levelFromXp(after);

  return {
    xpBefore: before,
    xpAfter: after,
    awarded: amount,
    previousLevel,
    level,
    levelledUp: level > previousLevel,
    levelsGained: Math.max(0, level - previousLevel),
    progress: xpProgress(after),
  };
}

export { BASE_THRESHOLDS };

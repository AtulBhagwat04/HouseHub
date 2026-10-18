import { describe, expect, it } from 'vitest';
import { applyXp, levelFromXp, xpForLevel, xpProgress } from '../../shared/levels.js';

describe('xpForLevel - the spec section 22 curve', () => {
  it('matches the published thresholds exactly', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((level) => xpForLevel(level))).toEqual([0, 100, 250, 500, 850, 1300, 1850]);
  });

  it('keeps growing past level 7', () => {
    expect(xpForLevel(8)).toBe(2500);
    expect(xpForLevel(9)).toBe(3250);
    expect(xpForLevel(10)).toBe(4100);
  });

  it('is strictly increasing', () => {
    let previous = -1;
    for (let level = 1; level <= 60; level += 1) {
      const threshold = xpForLevel(level);
      expect(threshold).toBeGreaterThan(previous);
      previous = threshold;
    }
  });
});

describe('levelFromXp', () => {
  it('maps boundary values to the right level', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(249)).toBe(2);
    expect(levelFromXp(250)).toBe(3);
    expect(levelFromXp(499)).toBe(3);
    expect(levelFromXp(500)).toBe(4);
    expect(levelFromXp(849)).toBe(4);
    expect(levelFromXp(850)).toBe(5);
    expect(levelFromXp(1299)).toBe(5);
    expect(levelFromXp(1300)).toBe(6);
    expect(levelFromXp(1849)).toBe(6);
    expect(levelFromXp(1850)).toBe(7);
  });

  it('is the inverse of xpForLevel', () => {
    for (let level = 1; level <= 40; level += 1) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
    }
  });

  it('treats junk input as zero', () => {
    expect(levelFromXp(null)).toBe(1);
    expect(levelFromXp(undefined)).toBe(1);
    expect(levelFromXp(-500)).toBe(1);
  });
});

describe('xpProgress - the dashboard progress bar', () => {
  it('reproduces the spec section 8 display for level 5 at 850 XP', () => {
    const progress = xpProgress(850);
    expect(progress.level).toBe(5);
    expect(progress.xpIntoLevel).toBe(0);
    expect(progress.xpForNextLevel).toBe(450);
    expect(progress.xpToNextLevel).toBe(450);
    expect(progress.progress).toBe(0);
  });

  it('shows a half-full bar at 1075 XP (level 5 -> 6)', () => {
    const progress = xpProgress(1075);
    expect(progress.level).toBe(5);
    expect(progress.xpIntoLevel).toBe(225);
    expect(progress.xpForNextLevel).toBe(450);
    expect(progress.progress).toBeCloseTo(0.5, 5);
  });

  it('never reports progress outside 0..1', () => {
    for (const xp of [0, 1, 99, 100, 850, 1299, 1300, 99999]) {
      const { progress } = xpProgress(xp);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });
});

describe('applyXp - spec section 20 and 21', () => {
  it('awards 30 XP without crossing a boundary', () => {
    const result = applyXp(850, 30);
    expect(result.xpBefore).toBe(850);
    expect(result.xpAfter).toBe(880);
    expect(result.awarded).toBe(30);
    expect(result.levelledUp).toBe(false);
    expect(result.level).toBe(5);
  });

  it('detects a level-up and reports how many levels were gained', () => {
    const result = applyXp(1290, 30);
    expect(result.xpAfter).toBe(1320);
    expect(result.previousLevel).toBe(5);
    expect(result.level).toBe(6);
    expect(result.levelledUp).toBe(true);
    expect(result.levelsGained).toBe(1);
  });

  it('can jump several levels at once from a big award', () => {
    const result = applyXp(0, 900);
    expect(result.previousLevel).toBe(1);
    expect(result.level).toBe(5);
    expect(result.levelsGained).toBe(4);
  });

  it('treats a zero or negative award as a no-op', () => {
    const result = applyXp(500, 0);
    expect(result.xpAfter).toBe(500);
    expect(result.levelledUp).toBe(false);
  });

  it('never produces negative XP', () => {
    expect(applyXp(100, -500).xpAfter).toBe(0);
  });
});

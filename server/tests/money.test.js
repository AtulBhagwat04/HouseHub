import { describe, expect, it } from 'vitest';
import {
  SplitError,
  distributeEvenly,
  formatPaise,
  splitCustom,
  splitEqual,
  splitExpense,
  splitPercentage,
  toPaise,
  toRupees,
} from '../../shared/money.js';

/**
 * These tests encode the exact examples from the product spec. If someone
 * changes the money maths and one of these goes red, it means the numbers users
 * see have changed - which is the point.
 */

const members = ['a', 'b', 'c', 'd'];

describe('rupee <-> paise conversion', () => {
  it('converts rupees to integer paise', () => {
    expect(toPaise(2400)).toBe(240000);
    expect(toPaise('1,250.50')).toBe(125050);
    expect(toPaise(0.1)).toBe(10);
    expect(toPaise(19.99)).toBe(1999);
  });

  it('never leaves floating point dust behind', () => {
    // 0.1 + 0.2 === 0.30000000000000004 in IEEE754. Paise make it exact.
    const sum = toPaise(0.1) + toPaise(0.2);
    expect(sum).toBe(30);
    expect(toRupees(sum)).toBe(0.3);
  });

  it('rejects non-numeric input', () => {
    expect(() => toPaise('not a number')).toThrow(SplitError);
  });

  it('formats paise as Indian rupees', () => {
    expect(formatPaise(240000)).toBe('\u20B92,400.00');
    expect(formatPaise(4250000)).toBe('\u20B942,500.00');
    expect(formatPaise(-85000)).toBe('-\u20B9850.00');
    expect(formatPaise(100000, { decimals: 0 })).toBe('\u20B91,000');
  });
});

describe('distributeEvenly', () => {
  it('splits a clean amount into equal parts', () => {
    expect(distributeEvenly(400000, 4)).toEqual([100000, 100000, 100000, 100000]);
  });

  it('hands the indivisible remainder out a paise at a time', () => {
    // Rs 100 across 3 people cannot be split evenly in whole paise.
    expect(distributeEvenly(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(distributeEvenly(10000, 3).reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it('always sums back to the original amount', () => {
    for (let count = 1; count <= 13; count += 1) {
      for (const total of [1, 7, 99, 1000, 123456, 999999]) {
        const parts = distributeEvenly(total, count);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        // No part may differ from another by more than one paise.
        expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('requires at least one participant', () => {
    expect(() => distributeEvenly(1000, 0)).toThrow(SplitError);
  });
});

describe('splitEqual - spec section 11', () => {
  it('splits Rs 4,000 across 4 members into Rs 1,000 each', () => {
    const result = splitEqual(
      400000,
      members.map((user) => ({ user })),
    );
    expect(result).toEqual([
      { user: 'a', share: 100000 },
      { user: 'b', share: 100000 },
      { user: 'c', share: 100000 },
      { user: 'd', share: 100000 },
    ]);
  });

  it('is order independent - the remainder follows the sorted user id', () => {
    const forward = splitEqual(10000, [{ user: 'a' }, { user: 'b' }, { user: 'c' }]);
    const reversed = splitEqual(10000, [{ user: 'c' }, { user: 'b' }, { user: 'a' }]);
    const byUser = (list) => Object.fromEntries(list.map((entry) => [entry.user, entry.share]));
    expect(byUser(forward)).toEqual(byUser(reversed));
  });
});

describe('splitCustom - spec section 11', () => {
  it('accepts shares that total exactly', () => {
    const result = splitCustom(400000, [
      { user: 'atul', share: 150000 },
      { user: 'rahul', share: 100000 },
      { user: 'aman', share: 80000 },
      { user: 'riya', share: 70000 },
    ]);
    expect(result.reduce((sum, entry) => sum + entry.share, 0)).toBe(400000);
  });

  it('rejects shares that do not total the expense', () => {
    expect(() =>
      splitCustom(400000, [
        { user: 'atul', share: 150000 },
        { user: 'rahul', share: 100000 },
      ]),
    ).toThrow(/must add up to the expense total/);
  });

  it('rejects a one paise overshoot - the classic off-by-one bug', () => {
    expect(() =>
      splitCustom(10000, [
        { user: 'a', share: 5001 },
        { user: 'b', share: 5000 },
      ]),
    ).toThrow(SplitError);
  });

  it('rejects negative shares', () => {
    expect(() =>
      splitCustom(10000, [
        { user: 'a', share: 11000 },
        { user: 'b', share: -1000 },
      ]),
    ).toThrow(SplitError);
  });
});

describe('splitPercentage', () => {
  it('applies the largest-remainder method so parts still sum exactly', () => {
    const result = splitPercentage(10000, [
      { user: 'a', percentage: 33.33 },
      { user: 'b', percentage: 33.33 },
      { user: 'c', percentage: 33.34 },
    ]);
    expect(result.reduce((sum, entry) => sum + entry.share, 0)).toBe(10000);
  });

  it('handles the spec section 11 percentage example', () => {
    const result = splitPercentage(400000, [
      { user: 'atul', percentage: 40 },
      { user: 'rahul', percentage: 30 },
      { user: 'aman', percentage: 20 },
      { user: 'riya', percentage: 10 },
    ]);
    expect(result).toEqual([
      { user: 'atul', share: 160000 },
      { user: 'rahul', share: 120000 },
      { user: 'aman', share: 80000 },
      { user: 'riya', share: 40000 },
    ]);
  });

  it('rejects percentages that do not total 100', () => {
    expect(() =>
      splitPercentage(10000, [
        { user: 'a', percentage: 40 },
        { user: 'b', percentage: 40 },
      ]),
    ).toThrow(/must add up to 100/);
  });
});

describe('splitExpense - the API entry point', () => {
  it('rejects zero, negative and non-integer amounts', () => {
    expect(() => splitExpense({ amountPaise: 0, participants: [{ user: 'a' }] })).toThrow(SplitError);
    expect(() => splitExpense({ amountPaise: -500, participants: [{ user: 'a' }] })).toThrow(SplitError);
    expect(() => splitExpense({ amountPaise: 10.5, participants: [{ user: 'a' }] })).toThrow(SplitError);
  });

  it('rejects the same member appearing twice', () => {
    expect(() =>
      splitExpense({ amountPaise: 1000, participants: [{ user: 'a' }, { user: 'a' }] }),
    ).toThrow(/cannot appear twice/);
  });

  it('rejects an unknown split type', () => {
    expect(() => splitExpense({ amountPaise: 1000, splitType: 'vibes', participants: [{ user: 'a' }] })).toThrow(
      /Unknown split type/,
    );
  });

  it('guarantees sum(shares) === amount for every split type', () => {
    const cases = [
      { amountPaise: 123457, splitType: 'equal', participants: members.map((user) => ({ user })) },
      {
        amountPaise: 10000,
        splitType: 'custom',
        participants: [
          { user: 'a', share: 5000 },
          { user: 'b', share: 5000 },
        ],
      },
      {
        amountPaise: 9999,
        splitType: 'percentage',
        participants: [
          { user: 'a', percentage: 33.33 },
          { user: 'b', percentage: 33.33 },
          { user: 'c', percentage: 33.34 },
        ],
      },
    ];

    for (const testCase of cases) {
      const shares = splitExpense(testCase);
      expect(shares.reduce((sum, entry) => sum + entry.share, 0)).toBe(testCase.amountPaise);
    }
  });
});

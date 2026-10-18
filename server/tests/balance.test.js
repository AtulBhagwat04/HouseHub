import { describe, expect, it } from 'vitest';
import {
  computeMemberTotals,
  computeNetPositions,
  computePairwiseLedger,
  minimiseTransfers,
  summarisePairwise,
  sumShares,
} from '../../shared/money.js';

/** Helper: build an expense the way the API stores it (integer paise shares). */
function expense(paidBy, shares) {
  return {
    paidBy,
    amount: shares.reduce((sum, [, share]) => sum + share, 0),
    participants: shares.map(([user, share]) => ({ user, share })),
  };
}

describe('computeNetPositions - spec section 11', () => {
  it('makes three members owe the payer Rs 1,000 each on a Rs 4,000 bill', () => {
    const members = ['rahul', 'atul', 'aman', 'riya'];
    const net = computeNetPositions({
      members,
      expenses: [expense('rahul', [['rahul', 100000], ['atul', 100000], ['aman', 100000], ['riya', 100000]])],
    });

    expect(net.get('rahul')).toBe(300000);
    expect(net.get('atul')).toBe(-100000);
    expect(net.get('aman')).toBe(-100000);
    expect(net.get('riya')).toBe(-100000);

    // The ledger must always balance to zero - money is neither created nor lost.
    expect([...net.values()].reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('takes the payer\'s own share out of the equation', () => {
    const net = computeNetPositions({
      members: ['a', 'b'],
      expenses: [expense('a', [['a', 5000], ['b', 5000]])],
    });
    expect(net.get('a')).toBe(5000);
    expect(net.get('b')).toBe(-5000);
  });
});

describe('confirmed settlements move the ledger', () => {
  const members = ['rahul', 'atul'];
  const expenses = [expense('rahul', [['rahul', 100000], ['atul', 100000]])];

  it('zeroes out the debt once Atul pays Rahul Rs 1,000', () => {
    const net = computeNetPositions({
      members,
      expenses,
      settlements: [{ from: 'atul', to: 'rahul', amount: 100000, status: 'confirmed' }],
    });
    expect(net.get('atul')).toBe(0);
    expect(net.get('rahul')).toBe(0);
  });

  it('ignores pending settlements entirely', () => {
    const net = computeNetPositions({
      members,
      expenses,
      settlements: [{ from: 'atul', to: 'rahul', amount: 100000, status: 'pending' }],
    });
    expect(net.get('atul')).toBe(-100000);
    expect(net.get('rahul')).toBe(100000);
  });

  it('ignores rejected settlements entirely', () => {
    const net = computeNetPositions({
      members,
      expenses,
      settlements: [{ from: 'atul', to: 'rahul', amount: 100000, status: 'rejected' }],
    });
    expect(net.get('atul')).toBe(-100000);
  });

  it('can flip a balance into the other direction when overpaid', () => {
    const net = computeNetPositions({
      members,
      expenses,
      settlements: [{ from: 'atul', to: 'rahul', amount: 150000, status: 'confirmed' }],
    });
    // Atul overpaid, so now Rahul owes him Rs 500.
    expect(net.get('atul')).toBe(50000);
    expect(net.get('rahul')).toBe(-50000);
  });
});

describe('computePairwiseLedger', () => {
  it('tracks who owes whom individually rather than netting everyone down', () => {
    const ledger = computePairwiseLedger({
      members: ['rahul', 'atul', 'aman', 'riya'],
      expenses: [expense('rahul', [['rahul', 100000], ['atul', 100000], ['aman', 100000], ['riya', 100000]])],
    });

    expect(ledger.get('atul').get('rahul')).toBe(100000);
    expect(ledger.get('aman').get('rahul')).toBe(100000);
    expect(ledger.get('riya').get('rahul')).toBe(100000);
    // Antisymmetric: the payer "owes" each participant a negative amount.
    expect(ledger.get('rahul').get('atul')).toBe(-100000);
  });

  it('reproduces the spec section 13 tangle', () => {
    // Atul owes Rahul 850, Aman owes Atul 400, Riya owes Rahul 250.
    const ledger = computePairwiseLedger({ members: ['atul', 'rahul', 'aman', 'riya'], expenses: [] });
    const owed = (from, to, amount) => ledger.get(from).set(to, amount);

    // Seed the raw pairwise debts the spec describes.
    owed('atul', 'rahul', 85000);
    owed('rahul', 'atul', -85000);
    owed('aman', 'atul', 40000);
    owed('atul', 'aman', -40000);
    owed('riya', 'rahul', 25000);
    owed('rahul', 'riya', -25000);

    const atul = summarisePairwise(ledger, 'atul');
    expect(atul.youOwe).toEqual([{ to: 'rahul', amount: 85000 }]);
    expect(atul.youAreOwed).toEqual([{ from: 'aman', amount: 40000 }]);
    expect(atul.netBalance).toBe(-45000);
  });

  it('lets a member both owe someone and be owed by someone else - the spec section 8 shape', () => {
    // You owe Rahul 850, while Riya owes you 1200 -> net +350.
    const ledger = computePairwiseLedger({ members: ['me', 'rahul', 'riya'], expenses: [] });
    ledger.get('me').set('rahul', 85000);
    ledger.get('rahul').set('me', -85000);
    ledger.get('riya').set('me', 120000);
    ledger.get('me').set('riya', -120000);

    const summary = summarisePairwise(ledger, 'me');
    expect(summary.youOweTotal).toBe(85000);
    expect(summary.youAreOwedTotal).toBe(120000);
    expect(summary.netBalance).toBe(35000);
  });

  it('agrees with computeNetPositions on the net figure', () => {
    const members = ['a', 'b', 'c', 'd'];
    const expenses = [
      expense('a', [['a', 50000], ['b', 50000]]),
      expense('c', [['c', 30000], ['d', 30000], ['a', 30000]]),
    ];
    const settlements = [{ from: 'b', to: 'a', amount: 20000, status: 'confirmed' }];

    const net = computeNetPositions({ members, expenses, settlements });
    const ledger = computePairwiseLedger({ members, expenses, settlements });

    for (const member of members) {
      const summary = summarisePairwise(ledger, member);
      // Two independent derivations of the same member's position must match.
      expect(summary.netBalance).toBe(net.get(member));
    }
  });

  it('reduces a member\'s debt when they settle up', () => {
    const ledger = computePairwiseLedger({
      members: ['a', 'b'],
      expenses: [expense('a', [['a', 10000], ['b', 10000]])],
      settlements: [{ from: 'b', to: 'a', amount: 4000, status: 'confirmed' }],
    });

    expect(ledger.get('b').get('a')).toBe(6000);
    expect(summarisePairwise(ledger, 'b').youOweTotal).toBe(6000);
  });

  it('ignores unsettled settlements and omits square members entirely', () => {
    const ledger = computePairwiseLedger({
      members: ['a', 'b', 'c'],
      expenses: [expense('a', [['a', 10000], ['b', 10000]])],
      settlements: [{ from: 'b', to: 'a', amount: 10000, status: 'pending' }],
    });

    expect(summarisePairwise(ledger, 'c')).toEqual({
      youOwe: [],
      youAreOwed: [],
      youOweTotal: 0,
      youAreOwedTotal: 0,
      netBalance: 0,
    });
  });
});

describe('minimiseTransfers', () => {
  it('produces one payment per debtor in the simple case', () => {
    const net = new Map([
      ['rahul', 300000],
      ['atul', -100000],
      ['aman', -100000],
      ['riya', -100000],
    ]);
    // Debtors of equal size are ordered by user id, so the output is stable
    // across requests and servers. "aman" sorts before "atul".
    expect(minimiseTransfers(net)).toEqual([
      { from: 'aman', to: 'rahul', amount: 100000 },
      { from: 'atul', to: 'rahul', amount: 100000 },
      { from: 'riya', to: 'rahul', amount: 100000 },
    ]);
  });

  it('is deterministic - the same input always yields the same order', () => {
    const build = () =>
      new Map([
        ['rahul', 300000],
        ['atul', -100000],
        ['aman', -100000],
        ['riya', -100000],
      ]);
    expect(minimiseTransfers(build())).toEqual(minimiseTransfers(build()));
  });

  it('collapses the spec section 13 tangle into three payments', () => {
    // Raw debts: Atul->Rahul 850, Aman->Atul 400, Riya->Rahul 250.
    // Net: Atul -450, Aman -400, Riya -250, Rahul +1100.
    const net = new Map([
      ['atul', -45000],
      ['aman', -40000],
      ['riya', -25000],
      ['rahul', 110000],
    ]);

    const transfers = minimiseTransfers(net);
    expect(transfers).toEqual([
      { from: 'atul', to: 'rahul', amount: 45000 },
      { from: 'aman', to: 'rahul', amount: 40000 },
      { from: 'riya', to: 'rahul', amount: 25000 },
    ]);
  });

  it('pairs debtor to creditor directly instead of routing through a middleman', () => {
    const net = new Map([
      ['a', 10000],
      ['b', -10000],
      ['c', 5000],
      ['d', -5000],
    ]);
    const transfers = minimiseTransfers(net);
    expect(transfers).toHaveLength(2);
    expect(transfers).toContainEqual({ from: 'b', to: 'a', amount: 10000 });
    expect(transfers).toContainEqual({ from: 'd', to: 'c', amount: 5000 });
  });

  it('is a no-op when everyone is square', () => {
    expect(minimiseTransfers(new Map([['a', 0], ['b', 0]]))).toEqual([]);
  });

  it('preserves every member\'s net position (the invariant the dashboard relies on)', () => {
    const net = new Map([
      ['a', 17500],
      ['b', -9000],
      ['c', 3000],
      ['d', -11500],
    ]);

    const transfers = minimiseTransfers(net);
    const rebuilt = new Map([...net.keys()].map((key) => [key, 0]));

    for (const transfer of transfers) {
      rebuilt.set(transfer.from, rebuilt.get(transfer.from) - transfer.amount);
      rebuilt.set(transfer.to, rebuilt.get(transfer.to) + transfer.amount);
    }

    for (const [user, expected] of net) {
      expect(rebuilt.get(user)).toBe(expected);
    }
  });

  it('never exceeds n-1 payments', () => {
    const net = new Map([
      ['a', 5000],
      ['b', -3000],
      ['c', 2000],
      ['d', -4000],
      ['e', 1000],
      ['f', -1000],
    ]);
    expect(minimiseTransfers(net).length).toBeLessThanOrEqual(net.size - 1);
  });
});

describe('computeMemberTotals', () => {
  it('reports what each member paid, consumed and settled', () => {
    const members = ['rahul', 'atul'];
    const totals = computeMemberTotals({
      members,
      expenses: [expense('rahul', [['rahul', 60000], ['atul', 60000]])],
      settlements: [{ from: 'atul', to: 'rahul', amount: 60000, status: 'confirmed' }],
    });

    const byUser = Object.fromEntries(totals.map((entry) => [entry.user, entry]));
    expect(byUser.rahul.paid).toBe(120000);
    expect(byUser.rahul.share).toBe(60000);
    expect(byUser.atul.share).toBe(60000);
    expect(byUser.atul.settled).toBe(60000);
    expect(byUser.rahul.net).toBe(0);
    expect(byUser.atul.net).toBe(0);
  });

  it('sums shares with sumShares consistently', () => {
    const participants = [
      { user: 'a', share: 3334 },
      { user: 'b', share: 3333 },
      { user: 'c', share: 3333 },
    ];
    expect(sumShares(participants)).toBe(10000);
  });
});

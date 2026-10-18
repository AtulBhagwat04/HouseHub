import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import Expense from '../src/models/Expense.js';
import { api, addExpense, addSettlement, authHeader, getBalances, netFor, setupHouseWithMembers } from './helpers/api.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/testDb.js';

beforeAll(connectTestDb);
beforeEach(clearTestDb);
afterAll(closeTestDb);

/** Rs 4,000 paid by the owner, split equally across all four members. */
function equalSplitPayload(owner, members) {
  return {
    title: 'Monthly Groceries',
    amount: 400000,
    category: 'groceries',
    paidBy: owner.id,
    participants: members.map((member) => ({ user: member.id })),
    splitType: 'equal',
  };
}

describe('POST /expenses with an equal split', () => {
  it('stores Rs 1,000 per member on a Rs 4,000 bill', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(4);

    const response = await addExpense(owner.token, houseId, equalSplitPayload(owner, members));

    expect(response.status).toBe(201);
    const expense = response.body.data.expense;
    expect(expense.amount).toBe(400000);
    expect(expense.amountRupees).toBe(4000);
    expect(expense.participants).toHaveLength(4);
    for (const participant of expense.participants) {
      expect(participant.share).toBe(100000);
    }
    expect(expense.participants.reduce((sum, p) => sum + p.share, 0)).toBe(400000);
  });

  it('makes three members owe the payer Rs 1,000 each in the balances view', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(4);
    await addExpense(owner.token, houseId, equalSplitPayload(owner, members));

    const balances = await getBalances(owner.token, houseId);

    expect(balances.totalExpenses).toBe(400000);
    expect(netFor(balances, owner.id)).toBe(300000);
    expect(netFor(balances, members[1].id)).toBe(-100000);
    expect(netFor(balances, members[2].id)).toBe(-100000);
    expect(netFor(balances, members[3].id)).toBe(-100000);

    // Everyone pays the payer directly, and the ledger nets to zero.
    expect(balances.suggestedTransfers).toHaveLength(3);
    expect(balances.suggestedTransfers.every((transfer) => transfer.to === owner.id)).toBe(true);
    expect(balances.members.reduce((sum, member) => sum + member.net, 0)).toBe(0);
  });
});

describe('expense validation', () => {
  it('rejects a rupee amount with decimals - amounts must be integer paise', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(2);

    const response = await addExpense(owner.token, houseId, {
      ...equalSplitPayload(owner, members),
      amount: 100.5,
    });

    expect(response.status).toBe(422);
    expect(response.body.details?.[0]?.field).toBe('amount');
  });

  it('rejects a zero or negative amount', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(2);

    const zero = await addExpense(owner.token, houseId, { ...equalSplitPayload(owner, members), amount: 0 });
    expect(zero.status).toBe(422);
  });

  it('rejects a payer who is not a house member', async () => {
    const first = await setupHouseWithMembers(2);
    const second = await setupHouseWithMembers(1);

    const response = await addExpense(first.members[0].token, first.houseId, {
      title: 'Bad payer',
      amount: 100000,
      paidBy: second.members[0].id,
      participants: [{ user: first.members[0].id }],
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/member of this house/i);
  });

  it('rejects a participant who is not a house member', async () => {
    const first = await setupHouseWithMembers(2);
    const second = await setupHouseWithMembers(1);

    const response = await addExpense(first.members[0].token, first.houseId, {
      title: 'Bad participant',
      amount: 100000,
      paidBy: first.members[0].id,
      participants: [{ user: first.members[0].id }, { user: second.members[0].id }],
    });

    expect(response.status).toBe(400);
  });

  it('rejects a custom split that does not total the amount', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(3);

    const response = await addExpense(owner.token, houseId, {
      title: 'Lopsided',
      amount: 400000,
      paidBy: owner.id,
      splitType: 'custom',
      participants: [
        { user: owner.id, share: 150000 },
        { user: members[1].id, share: 100000 },
      ],
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/add up to/i);
  });

  it('accepts a valid custom split and stores the exact shares', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(4);

    const response = await addExpense(owner.token, houseId, {
      title: 'Lopsided but valid',
      amount: 400000,
      paidBy: owner.id,
      splitType: 'custom',
      participants: [
        { user: members[0].id, share: 150000 },
        { user: members[1].id, share: 100000 },
        { user: members[2].id, share: 80000 },
        { user: members[3].id, share: 70000 },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.body.data.expense.participants.reduce((sum, p) => sum + p.share, 0)).toBe(400000);
  });

  it('splits by percentage exactly', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(3);

    const response = await addExpense(owner.token, houseId, {
      title: 'Percentage split',
      amount: 10000,
      paidBy: owner.id,
      splitType: 'percentage',
      participants: [
        { user: members[0].id, percentage: 33.33 },
        { user: members[1].id, percentage: 33.33 },
        { user: members[2].id, percentage: 33.34 },
      ],
    });

    expect(response.status).toBe(201);
    const shares = response.body.data.expense.participants.map((p) => p.share);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(10000);
  });

  it('rejects the same member listed twice', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(2);

    const response = await addExpense(owner.token, houseId, {
      title: 'Duplicated',
      amount: 100000,
      paidBy: owner.id,
      participants: [{ user: members[0].id }, { user: members[0].id }],
    });

    expect(response.status).toBe(400);
  });

  it('never lets a broken split reach the database', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(3);
    await addExpense(owner.token, houseId, {
      title: 'Bad',
      amount: 300000,
      paidBy: owner.id,
      splitType: 'custom',
      participants: [{ user: owner.id, share: 100000 }],
    });

    // Nothing could be invalid enough to sneak past the schema validator.
    const expenses = await Expense.find({});
    for (const expense of expenses) {
      const total = expense.participants.reduce((sum, participant) => sum + participant.share, 0);
      expect(total).toBe(expense.amount);
    }
  });
});

describe('settlements', () => {
  async function setupDebt() {
    const context = await setupHouseWithMembers(2);
    await addExpense(context.owner.token, context.houseId, {
      title: 'Groceries',
      amount: 200000,
      paidBy: context.owner.id,
      participants: [{ user: context.owner.id }, { user: context.members[1].id }],
    });
    return context;
  }

  it('leaves balances untouched while a settlement is pending', async () => {
    const { houseId, members, owner } = await setupDebt();
    const borrower = members[1];

    const created = await addSettlement(borrower.token, houseId, {
      from: borrower.id,
      to: owner.id,
      amount: 100000,
    });

    expect(created.status).toBe(201);
    expect(created.body.data.settlement.status).toBe('pending');

    const balances = await getBalances(owner.token, houseId);
    expect(netFor(balances, borrower.id)).toBe(-100000);
    expect(netFor(balances, owner.id)).toBe(100000);
  });

  it('clears the debt once the counterparty confirms', async () => {
    const { houseId, members, owner } = await setupDebt();
    const borrower = members[1];

    const created = await addSettlement(borrower.token, houseId, {
      from: borrower.id,
      to: owner.id,
      amount: 100000,
    });
    const settlementId = created.body.data.settlement._id;

    const confirmed = await api()
      .post(`/api/houses/${houseId}/settlements/${settlementId}/confirm`)
      .set(authHeader(owner.token));

    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.settlement.status).toBe('confirmed');

    const balances = await getBalances(owner.token, houseId);
    expect(netFor(balances, borrower.id)).toBe(0);
    expect(netFor(balances, owner.id)).toBe(0);
    expect(balances.suggestedTransfers).toHaveLength(0);
  });

  it('refuses to let the requester confirm their own settlement', async () => {
    const { houseId, members, owner } = await setupDebt();
    const borrower = members[1];

    const created = await addSettlement(borrower.token, houseId, {
      from: borrower.id,
      to: owner.id,
      amount: 100000,
    });
    const settlementId = created.body.data.settlement._id;

    const selfConfirm = await api()
      .post(`/api/houses/${houseId}/settlements/${settlementId}/confirm`)
      .set(authHeader(borrower.token));

    expect(selfConfirm.status).toBe(403);

    // Still pending, still not applied.
    const balances = await getBalances(owner.token, houseId);
    expect(netFor(balances, borrower.id)).toBe(-100000);
  });

  it('leaves balances untouched when a settlement is rejected', async () => {
    const { houseId, members, owner } = await setupDebt();
    const borrower = members[1];

    const created = await addSettlement(borrower.token, houseId, {
      from: borrower.id,
      to: owner.id,
      amount: 100000,
    });
    const settlementId = created.body.data.settlement._id;

    const rejected = await api()
      .post(`/api/houses/${houseId}/settlements/${settlementId}/reject`)
      .set(authHeader(owner.token))
      .send({ reason: 'I never received this' });

    expect(rejected.status).toBe(200);
    expect(rejected.body.data.settlement.status).toBe('rejected');

    const balances = await getBalances(owner.token, houseId);
    expect(netFor(balances, borrower.id)).toBe(-100000);
  });

  it('cannot resolve the same settlement twice', async () => {
    const { houseId, members, owner } = await setupDebt();
    const borrower = members[1];

    const created = await addSettlement(borrower.token, houseId, {
      from: borrower.id,
      to: owner.id,
      amount: 100000,
    });
    const settlementId = created.body.data.settlement._id;

    await api().post(`/api/houses/${houseId}/settlements/${settlementId}/confirm`).set(authHeader(owner.token));
    const again = await api()
      .post(`/api/houses/${houseId}/settlements/${settlementId}/reject`)
      .set(authHeader(owner.token));

    expect(again.status).toBe(400);

    // Balances must not be double-counted by the second resolution.
    const balances = await getBalances(owner.token, houseId);
    expect(netFor(balances, borrower.id)).toBe(0);
  });

  it('rejects a settlement with yourself', async () => {
    const { houseId, owner } = await setupHouseWithMembers(2);

    const response = await addSettlement(owner.token, houseId, {
      from: owner.id,
      to: owner.id,
      amount: 10000,
    });

    expect([400, 422]).toContain(response.status);
  });

  it('refuses a settlement between two other members', async () => {
    const { houseId, members } = await setupHouseWithMembers(3);

    const response = await addSettlement(members[0].token, houseId, {
      from: members[1].id,
      to: members[2].id,
      amount: 10000,
    });

    expect(response.status).toBe(403);
  });

  it('throttles reminders to one per hour', async () => {
    const { houseId, members, owner } = await setupDebt();
    const borrower = members[1];

    const created = await addSettlement(borrower.token, houseId, {
      from: borrower.id,
      to: owner.id,
      amount: 100000,
    });
    const settlementId = created.body.data.settlement._id;

    const first = await api()
      .post(`/api/houses/${houseId}/settlements/${settlementId}/remind`)
      .set(authHeader(borrower.token));
    expect(first.status).toBe(200);

    const second = await api()
      .post(`/api/houses/${houseId}/settlements/${settlementId}/remind`)
      .set(authHeader(borrower.token));
    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/already sent a reminder/i);
  });
});

describe('expense list, filters and detail', () => {
  it('paginates and reports the filtered total', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(2);

    for (let index = 0; index < 5; index += 1) {
      await addExpense(owner.token, houseId, {
        title: `Expense ${index}`,
        amount: 10000 * (index + 1),
        paidBy: owner.id,
        participants: [{ user: owner.id }, { user: members[1].id }],
      });
    }

    const page1 = await api()
      .get(`/api/houses/${houseId}/expenses?page=1&limit=2`)
      .set(authHeader(owner.token));

    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.meta.total).toBe(5);
    expect(page1.body.meta.pages).toBe(3);
    expect(page1.body.meta.hasNextPage).toBe(true);
    expect(page1.body.meta.summary.count).toBe(5);
    expect(page1.body.meta.summary.total).toBe(10000 + 20000 + 30000 + 40000 + 50000);
  });

  it('filters by category', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(2);

    await addExpense(owner.token, houseId, {
      title: 'Internet bill',
      amount: 100000,
      category: 'internet',
      paidBy: owner.id,
      participants: [{ user: owner.id }, { user: members[1].id }],
    });
    await addExpense(owner.token, houseId, {
      title: 'Electricity bill',
      amount: 200000,
      category: 'electricity',
      paidBy: owner.id,
      participants: [{ user: owner.id }, { user: members[1].id }],
    });

    const response = await api()
      .get(`/api/houses/${houseId}/expenses?category=internet`)
      .set(authHeader(owner.token));

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe('Internet bill');
  });

  it('searches the title without being confused by regex characters', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(2);

    await addExpense(owner.token, houseId, {
      title: 'Cable (re)connection',
      amount: 100000,
      paidBy: owner.id,
      participants: [{ user: owner.id }, { user: members[1].id }],
    });
    await addExpense(owner.token, houseId, {
      title: 'Groceries',
      amount: 100000,
      paidBy: owner.id,
      participants: [{ user: owner.id }, { user: members[1].id }],
    });

    // A raw RegExp would treat this as a capture group and potentially mismatch.
    const response = await api()
      .get(`/api/houses/${houseId}/expenses?q=${encodeURIComponent('(re)con')}`)
      .set(authHeader(owner.token));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it('returns per-share detail and pairwise settlement state', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(2);

    const created = await addExpense(owner.token, houseId, {
      title: 'Electricity Bill',
      amount: 240000,
      category: 'electricity',
      paidBy: owner.id,
      participants: [{ user: owner.id }, { user: members[1].id }],
    });
    const expenseId = created.body.data.expense._id;

    const detail = await api()
      .get(`/api/houses/${houseId}/expenses/${expenseId}`)
      .set(authHeader(owner.token));

    expect(detail.status).toBe(200);
    expect(detail.body.data.expense.amount).toBe(240000);
    expect(detail.body.data.expense.participants).toHaveLength(2);
    expect(detail.body.data.settlement.payerId).toBe(owner.id);
    expect(detail.body.data.settlement.pairwiseSettled).toEqual([
      { user: members[1].id, settled: 0 },
    ]);
  });

  it('lets only the creator or a manager edit an expense', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(3);
    const [, member, other] = members;

    const created = await addExpense(member.token, houseId, {
      title: 'Member expense',
      amount: 100000,
      paidBy: member.id,
      participants: [{ user: member.id }, { user: owner.id }],
    });
    const expenseId = created.body.data.expense._id;

    const forbidden = await api()
      .patch(`/api/houses/${houseId}/expenses/${expenseId}`)
      .set(authHeader(other.token))
      .send({ title: 'Hijacked' });
    expect(forbidden.status).toBe(403);

    const allowed = await api()
      .patch(`/api/houses/${houseId}/expenses/${expenseId}`)
      .set(authHeader(owner.token))
      .send({ title: 'Renamed by owner' });
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.expense.title).toBe('Renamed by owner');
  });

  it('recomputes shares when the amount changes', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(2);

    const created = await addExpense(owner.token, houseId, {
      title: 'Changeable',
      amount: 100000,
      paidBy: owner.id,
      participants: [{ user: owner.id }, { user: members[1].id }],
    });
    const expenseId = created.body.data.expense._id;

    const updated = await api()
      .patch(`/api/houses/${houseId}/expenses/${expenseId}`)
      .set(authHeader(owner.token))
      .send({ amount: 200000 });

    expect(updated.status).toBe(200);
    expect(updated.body.data.expense.participants.every((p) => p.share === 100000)).toBe(true);
    expect(updated.body.data.expense.participants.reduce((sum, p) => sum + p.share, 0)).toBe(200000);
  });

  it('restores correct balances after an expense is deleted', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(2);

    const created = await addExpense(owner.token, houseId, {
      title: 'Temporary',
      amount: 100000,
      paidBy: owner.id,
      participants: [{ user: owner.id }, { user: members[1].id }],
    });
    const expenseId = created.body.data.expense._id;

    expect(netFor(await getBalances(owner.token, houseId), members[1].id)).toBe(-50000);

    await api().delete(`/api/houses/${houseId}/expenses/${expenseId}`).set(authHeader(owner.token));

    const after = await getBalances(owner.token, houseId);
    expect(netFor(after, members[1].id)).toBe(0);
    expect(netFor(after, owner.id)).toBe(0);
    expect(after.totalExpenses).toBe(0);
  });
});

describe('dashboard financial summary', () => {
  it('shows a member owing one housemate while being owed by another', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(4);
    const [, middle, third] = members;

    // owner owes middle Rs 1,000
    await addExpense(middle.token, houseId, {
      title: 'Groceries',
      amount: 200000,
      paidBy: middle.id,
      participants: [{ user: middle.id }, { user: owner.id }],
    });

    // middle owes third Rs 300
    await addExpense(third.token, houseId, {
      title: 'Internet',
      amount: 60000,
      paidBy: third.id,
      participants: [{ user: third.id }, { user: middle.id }],
    });

    const response = await api().get(`/api/houses/${houseId}/dashboard`).set(authHeader(middle.token));
    expect(response.status).toBe(200);

    const { financials } = response.body.data;

    expect(financials.totalHouseExpenses).toBe(260000);

    // Both directions are populated at once, which is the whole reason the
    // summary reads a pairwise ledger rather than a minimised transfer list.
    expect(financials.youOwe).toBe(30000);
    expect(financials.youAreOwed).toBe(100000);
    expect(financials.netBalance).toBe(70000);

    expect(financials.youOweTo).toEqual([{ to: third.id, amount: 30000 }]);
    expect(financials.owedToYouBy).toEqual([{ from: owner.id, amount: 100000 }]);
  });

  it('nets two debts against the same person into one line', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(2);
    const borrower = members[1];

    // They owe each other: owner fronts 1000, borrower fronts 400.
    await addExpense(owner.token, houseId, {
      title: 'Owner fronts',
      amount: 100000,
      paidBy: owner.id,
      participants: [{ user: owner.id }, { user: borrower.id }],
    });
    await addExpense(borrower.token, houseId, {
      title: 'Borrower fronts',
      amount: 40000,
      paidBy: borrower.id,
      participants: [{ user: owner.id }, { user: borrower.id }],
    });

    const response = await api().get(`/api/houses/${houseId}/dashboard`).set(authHeader(borrower.token));
    const { financials } = response.body.data;

    // 500 owed out, 200 owed back, against the SAME person -> one 300 line.
    expect(financials.youOwe).toBe(30000);
    expect(financials.youAreOwed).toBe(0);
    expect(financials.youOweTo).toHaveLength(1);
    expect(financials.netBalance).toBe(-30000);
  });

  it('keeps youAreOwed - youOwe equal to netBalance', async () => {
    const { houseId, members } = await setupHouseWithMembers(3);

    await addExpense(members[0].token, houseId, {
      title: 'A',
      amount: 90000,
      paidBy: members[0].id,
      participants: members.map((member) => ({ user: member.id })),
    });
    await addExpense(members[1].token, houseId, {
      title: 'B',
      amount: 45000,
      paidBy: members[1].id,
      participants: members.map((member) => ({ user: member.id })),
    });

    for (const member of members) {
      const response = await api().get(`/api/houses/${houseId}/dashboard`).set(authHeader(member.token));
      const { financials } = response.body.data;
      expect(financials.youAreOwed - financials.youOwe).toBe(financials.netBalance);
    }
  });

  it('includes chore counts, XP, leaderboard and recent activity', async () => {
    const { houseId, owner } = await setupHouseWithMembers(2);

    await addExpense(owner.token, houseId, {
      title: 'Something',
      amount: 10000,
      paidBy: owner.id,
      participants: [{ user: owner.id }],
    });

    const response = await api().get(`/api/houses/${houseId}/dashboard`).set(authHeader(owner.token));
    const data = response.body.data;

    expect(data.houseId).toBe(houseId);
    expect(data.xp.level).toBe(1);
    expect(data.leaderboardTop).toHaveLength(2);
    expect(data.members).toHaveLength(2);
    expect(data.chores.weeklyGoal.target).toBeGreaterThan(0);
    expect(Array.isArray(data.recentActivity)).toBe(true);
    expect(data.recentActivity.length).toBeGreaterThan(0);
    expect(data.recentActivity[0].type).toBe('expense_added');
  });
});

describe('expense analytics', () => {
  it('groups by category and reports member spending', async () => {
    const { houseId, members, owner } = await setupHouseWithMembers(2);

    await addExpense(owner.token, houseId, {
      title: 'Rent',
      amount: 600000,
      category: 'rent',
      paidBy: owner.id,
      participants: members.map((member) => ({ user: member.id })),
    });
    await addExpense(owner.token, houseId, {
      title: 'Groceries',
      amount: 200000,
      category: 'groceries',
      paidBy: members[1].id,
      participants: members.map((member) => ({ user: member.id })),
    });

    const response = await api().get(`/api/houses/${houseId}/analytics`).set(authHeader(owner.token));

    expect(response.status).toBe(200);
    const { categories, memberSpending, totals } = response.body.data;

    expect(totals.total).toBe(800000);
    expect(categories[0].category).toBe('rent');
    expect(categories[0].total).toBe(600000);
    expect(categories[0].percentage).toBe(75);
    expect(categories.find((entry) => entry.category === 'groceries').percentage).toBe(25);

    const spending = Object.fromEntries(memberSpending.map((entry) => [entry.user, entry.total]));
    expect(spending[owner.id]).toBe(600000);
    expect(spending[members[1].id]).toBe(200000);
    expect(response.body.data.monthly.length).toBeGreaterThanOrEqual(1);
  });
});

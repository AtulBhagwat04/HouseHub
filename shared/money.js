/**
 * Money maths for HOUSEHUB.
 *
 * EVERY monetary value in this application is an integer number of paise
 * (1 rupee = 100 paise). Rupees are a *presentation* concern only. This module
 * is the single source of truth for turning a rupee amount into fair integer
 * shares, and it is imported by both the Express server and the React client so
 * the number the user sees is always the number the server will store.
 */

import { SPLIT_TYPES } from './constants.js';

/** Hard ceiling so a fat-fingered input cannot overflow or wreck a ledger. */
export const MAX_AMOUNT_PAISE = 100_000_000_00;

export class SplitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SplitError';
  }
}

/** Rupees (string | number) -> integer paise. */
export function toPaise(rupees) {
  const value = typeof rupees === 'string' ? Number(rupees.replace(/[,\s\u20B9]/g, '')) : Number(rupees);
  if (!Number.isFinite(value)) throw new SplitError('Amount must be a number');
  return Math.round(value * 100);
}

/** Integer paise -> rupees (number, may have 2 decimals). */
export function toRupees(paise) {
  return Math.round(Number(paise)) / 100;
}

export function isNonNegativeInt(value) {
  return Number.isInteger(value) && value >= 0;
}

/** "Rs 42,500.50" style formatting. Kept here so server logs and UI agree. */
export function formatPaise(paise, { withSymbol = true, decimals = 2 } = {}) {
  const negative = paise < 0;
  const absolute = Math.abs(Math.round(Number(paise) || 0));
  const rupees = absolute / 100;
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const symbol = withSymbol ? '\u20B9' : '';
  return `${negative ? '-' : ''}${symbol}${formatted}`;
}

/**
 * Split `totalPaise` into `count` integer parts whose sum is EXACTLY totalPaise.
 * The indivisible remainder is handed out one paise at a time, starting at
 * index 0. Callers sort participants deterministically first, so the same
 * expense always produces the same shares.
 *
 * Rs 100 / 3  ->  [3334, 3333, 3333]
 */
export function distributeEvenly(totalPaise, count) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new SplitError('At least one participant is required to split an expense');
  }
  if (!isNonNegativeInt(totalPaise)) {
    throw new SplitError('Amount must be a positive whole number of paise');
  }
  const base = Math.floor(totalPaise / count);
  const remainder = totalPaise - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

/** Deterministic ordering so shares are stable across requests and servers. */
function byUserId(a, b) {
  return String(a.user).localeCompare(String(b.user));
}

function normaliseParticipants(participants) {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new SplitError('Select at least one participant');
  }
  const seen = new Set();
  for (const participant of participants) {
    const id = String(participant?.user ?? '');
    if (!id) throw new SplitError('Every participant needs a user id');
    if (seen.has(id)) throw new SplitError('A member cannot appear twice in one expense');
    seen.add(id);
  }
  return participants;
}

export function sumShares(participants) {
  return participants.reduce((total, participant) => total + (Number(participant.share) || 0), 0);
}

/**
 * Equal split. Participants are sorted by user id before distributing the
 * remainder, so Rs 100 across three people always yields the same three shares
 * regardless of the order the client sent them in.
 */
export function splitEqual(totalPaise, participants) {
  const list = normaliseParticipants(participants);
  const ordered = [...list].sort(byUserId);
  const shares = distributeEvenly(totalPaise, ordered.length);
  const shareByUser = new Map(ordered.map((participant, index) => [String(participant.user), shares[index]]));
  return list.map((participant) => ({
    user: participant.user,
    share: shareByUser.get(String(participant.user)),
  }));
}

/** Custom split: the caller supplies exact paise per person and they must add up. */
export function splitCustom(totalPaise, participants) {
  const list = normaliseParticipants(participants);
  const result = list.map((participant) => {
    const share = Number(participant.share);
    if (!isNonNegativeInt(share)) {
      throw new SplitError('Each custom share must be a whole number of paise, zero or more');
    }
    return { user: participant.user, share };
  });
  const sum = sumShares(result);
  if (sum !== totalPaise) {
    throw new SplitError(
      `Shares must add up to the expense total (expected ${formatPaise(totalPaise)}, got ${formatPaise(sum)})`,
    );
  }
  return result;
}

/**
 * Percentage split using the largest-remainder method, so the parts still sum
 * to the total exactly even when the percentages produce fractions of a paise.
 */
export function splitPercentage(totalPaise, participants) {
  const list = normaliseParticipants(participants);
  const percentTotal = list.reduce((total, participant) => total + Number(participant.percentage || 0), 0);
  if (Math.abs(percentTotal - 100) > 0.001) {
    throw new SplitError(`Percentages must add up to 100 (got ${Math.round(percentTotal * 100) / 100})`);
  }

  const raw = list.map((participant) => ({
    user: participant.user,
    exact: (totalPaise * Number(participant.percentage || 0)) / 100,
  }));

  const floored = raw.map((entry) => ({
    user: entry.user,
    share: Math.floor(entry.exact),
    fraction: entry.exact - Math.floor(entry.exact),
    order: raw.indexOf(entry),
  }));

  let leftover = totalPaise - floored.reduce((total, entry) => total + entry.share, 0);

  const byFraction = [...floored].sort((a, b) => b.fraction - a.fraction || a.order - b.order);
  for (let index = 0; leftover > 0; index += 1) {
    byFraction[index % byFraction.length].share += 1;
    leftover -= 1;
  }

  const shareByUser = new Map(byFraction.map((entry) => [String(entry.user), entry.share]));
  return list.map((participant) => ({ user: participant.user, share: shareByUser.get(String(participant.user)) }));
}

/**
 * The one entry point the API uses. Validates the amount, dispatches to the
 * right splitter, and guarantees `sum(shares) === amountPaise` or throws.
 */
export function splitExpense({ amountPaise, splitType = 'equal', participants }) {
  const amount = Number(amountPaise);
  if (!isNonNegativeInt(amount)) {
    throw new SplitError('Amount must be a whole number of paise');
  }
  if (amount <= 0) {
    throw new SplitError('Amount must be greater than zero');
  }
  if (amount > MAX_AMOUNT_PAISE) {
    throw new SplitError('Amount is unrealistically large');
  }
  if (!SPLIT_TYPES.includes(splitType)) {
    throw new SplitError('Unknown split type');
  }

  let shares;
  if (splitType === 'equal') shares = splitEqual(amount, participants);
  else if (splitType === 'custom') shares = splitCustom(amount, participants);
  else shares = splitPercentage(amount, participants);

  const total = sumShares(shares);
  if (total !== amount) {
    // Belt and braces: this should be unreachable, and if it ever fires we want
    // a loud failure rather than silently corrupt books.
    throw new SplitError(
      `Internal split error: shares total ${formatPaise(total)} but the expense is ${formatPaise(amount)}`,
    );
  }
  return shares;
}

/**
 * Net position per member: positive means the house owes them money.
 *
 * Built purely from (a) who fronted each expense and (b) confirmed settlements.
 * Pending or rejected settlements deliberately do NOT move the ledger.
 */
export function computeNetPositions({ members, expenses = [], settlements = [] }) {
  const net = new Map();
  for (const member of members) net.set(String(member), 0);

  const bump = (userId, delta) => {
    const key = String(userId);
    net.set(key, (net.get(key) || 0) + delta);
  };

  for (const expense of expenses) {
    const payer = String(expense.paidBy);
    for (const participant of expense.participants || []) {
      const share = Number(participant.share) || 0;
      if (String(participant.user) === payer) continue;
      // Participant consumed `share` of something the payer funded.
      bump(participant.user, -share);
      bump(payer, share);
    }
  }

  for (const settlement of settlements) {
    if (settlement.status !== 'confirmed') continue;
    const amount = Number(settlement.amount) || 0;
    bump(settlement.from, amount);
    bump(settlement.to, -amount);
  }

  return net;
}

/**
 * PAIRWISE LEDGER
 *
 * A signed matrix of who owes whom, built per counterparty (NOT netted down to
 * a single balance per person).
 *
 * The distinction matters for the dashboard. Product spec section 8 shows
 * "You Owe Rs 850" and "You Are Owed Rs 1,200" at the same time - which is only
 * possible with a pairwise view. Min-cash-flow collapses each member to one
 * number, so it answers "what is the least I can pay" rather than "what do I
 * actually owe each person". Both are useful; this one is what gets displayed.
 *
 * Returns Map<userId, Map<otherUserId, paise>> where a POSITIVE value means
 * `userId` owes `otherUserId`. The matrix is kept antisymmetric, so
 * ledger[a][b] === -ledger[b][a].
 */
export function computePairwiseLedger({ members = [], expenses = [], settlements = [] }) {
  const ledger = new Map();

  const rowFor = (id) => {
    if (!ledger.has(id)) ledger.set(id, new Map());
    return ledger.get(id);
  };

  for (const member of members) rowFor(String(member));

  const addOwed = (from, to, delta) => {
    if (from === to || delta === 0) return;
    const fromRow = rowFor(from);
    fromRow.set(to, (fromRow.get(to) || 0) + delta);
    const toRow = rowFor(to);
    toRow.set(from, (toRow.get(from) || 0) - delta);
  };

  for (const expense of expenses) {
    const payer = String(expense.paidBy);
    for (const participant of expense.participants || []) {
      const user = String(participant.user);
      if (user === payer) continue;
      // The participant consumed their share of something the payer funded.
      addOwed(user, payer, Number(participant.share) || 0);
    }
  }

  for (const settlement of settlements) {
    if (settlement.status !== 'confirmed') continue;
    const amount = Number(settlement.amount) || 0;
    // `from` paid `to`, so from's debt to `to` shrinks by that amount.
    addOwed(String(settlement.from), String(settlement.to), -amount);
  }

  return ledger;
}

/**
 * Splits one member's pairwise row into the two figures the dashboard shows.
 * `netBalance` is always youAreOwedTotal - youOweTotal.
 */
export function summarisePairwise(ledger, userId) {
  const row = ledger.get(String(userId)) || new Map();

  const youOwe = [];
  const youAreOwed = [];

  for (const [other, amount] of row) {
    if (amount > 0) youOwe.push({ to: other, amount });
    else if (amount < 0) youAreOwed.push({ from: other, amount: -amount });
  }

  const byAmountThenId = (a, b) =>
    b.amount - a.amount ||
    String(a.to || a.from).localeCompare(String(b.to || b.from));

  youOwe.sort(byAmountThenId);
  youAreOwed.sort(byAmountThenId);

  const youOweTotal = youOwe.reduce((sum, entry) => sum + entry.amount, 0);
  const youAreOwedTotal = youAreOwed.reduce((sum, entry) => sum + entry.amount, 0);

  return {
    youOwe,
    youAreOwed,
    youOweTotal,
    youAreOwedTotal,
    netBalance: youAreOwedTotal - youOweTotal,
  };
}

/**
 * Greedy min-cash-flow. Collapses a tangle of mutual debts into the smallest
 * practical set of payments: whoever is owed the most collects from whoever
 * owes the most, repeatedly.
 */
export function minimiseTransfers(netPositions) {
  const creditors = [];
  const debtors = [];

  for (const [userId, amount] of netPositions) {
    if (amount > 0) creditors.push({ user: userId, amount });
    else if (amount < 0) debtors.push({ user: userId, amount: -amount });
  }

  creditors.sort((a, b) => b.amount - a.amount || String(a.user).localeCompare(String(b.user)));
  debtors.sort((a, b) => b.amount - a.amount || String(a.user).localeCompare(String(b.user)));

  const transfers = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Math.min(creditor.amount, debtor.amount);

    if (amount > 0) {
      transfers.push({ from: debtor.user, to: creditor.user, amount });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount === 0) creditorIndex += 1;
    if (debtor.amount === 0) debtorIndex += 1;
  }

  return transfers;
}

/** Per-member "paid vs consumed" breakdown, used by the Balances page. */
export function computeMemberTotals({ members, expenses = [], settlements = [] }) {
  const breakdown = new Map();
  for (const member of members) {
    breakdown.set(String(member), { user: String(member), paid: 0, share: 0, settled: 0 });
  }

  for (const expense of expenses) {
    const paidEntry = breakdown.get(String(expense.paidBy));
    if (paidEntry) paidEntry.paid += Number(expense.amount) || 0;

    for (const participant of expense.participants || []) {
      const entry = breakdown.get(String(participant.user));
      if (entry) entry.share += Number(participant.share) || 0;
    }
  }

  for (const settlement of settlements) {
    if (settlement.status !== 'confirmed') continue;
    const from = breakdown.get(String(settlement.from));
    const to = breakdown.get(String(settlement.to));
    const amount = Number(settlement.amount) || 0;
    if (from) from.settled += amount;
    if (to) to.settled -= amount;
  }

  const net = computeNetPositions({ members, expenses, settlements });
  return [...breakdown.values()].map((entry) => ({ ...entry, net: net.get(entry.user) || 0 }));
}

export { byUserId };

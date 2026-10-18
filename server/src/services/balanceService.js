import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import {
  computeMemberTotals,
  computeNetPositions,
  computePairwiseLedger,
  minimiseTransfers,
  summarisePairwise,
  formatPaise,
} from '../../../shared/money.js';

/**
 * Balances are DERIVED, never stored.
 *
 * There is no cached "Atul owes Rahul 850" anywhere in MongoDB. Every read
 * rebuilds the ledger from (a) all expenses and (b) confirmed settlements. This
 * costs one extra aggregation but makes drift structurally impossible: delete an
 * expense and every balance is instantly correct again.
 */
export async function buildHouseBalances(house) {
  const memberIds = house.members.map((member) => String(member.user?._id || member.user));

  const [expenses, settlements] = await Promise.all([
    Expense.find({ house: house._id }).select('amount paidBy participants').lean(),
    Settlement.find({ house: house._id, status: 'confirmed' }).select('from to amount status').lean(),
  ]);

  const netMap = computeNetPositions({ members: memberIds, expenses, settlements });
  const transfers = minimiseTransfers(netMap);
  const memberTotals = computeMemberTotals({ members: memberIds, expenses, settlements });
  const pairwiseLedger = computePairwiseLedger({ members: memberIds, expenses, settlements });

  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

  return {
    /** Map<userId, paise>. Positive = the house owes them. */
    netByMember: netMap,
    net: memberIds.map((user) => ({ user, net: netMap.get(user) || 0 })),
    /** Map<userId, Map<otherId, paise>>. Positive = the outer user owes the inner. */
    pairwiseLedger,
    /** Minimal set of payments that would zero the house out. */
    suggestedTransfers: transfers.map((transfer) => ({
      from: String(transfer.from),
      to: String(transfer.to),
      amount: transfer.amount,
      label: `${formatPaise(transfer.amount)}`,
    })),
    memberTotals,
    totalExpenses,
    settlementCount: settlements.length,
    expenseCount: expenses.length,
  };
}

/**
 * "You owe X" / "You are owed Y" for the dashboard summary.
 *
 * Reads the PAIRWISE ledger rather than the minimised transfer list, so a member
 * can simultaneously owe one housemate and be owed by another - which is what
 * the product spec's dashboard example shows.
 */
export function summariseForMember(balances, userId) {
  const key = String(userId);
  const net = balances.netByMember.get(key) || 0;
  const pairwise = summarisePairwise(balances.pairwiseLedger, key);

  return {
    netBalance: net,
    youOwe: pairwise.youOwe,
    youAreOwed: pairwise.youAreOwed,
    youOweTotal: pairwise.youOweTotal,
    youAreOwedTotal: pairwise.youAreOwedTotal,
  };
}

export default { buildHouseBalances, summariseForMember };

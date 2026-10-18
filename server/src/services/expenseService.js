import { incrementStats, evaluateAchievements } from './gamificationService.js';
import { createNotifications } from './notificationService.js';
import { logActivity } from './activityService.js';
import { formatPaise } from '../../../shared/money.js';

/** Members who should hear about a new/edited expense: everyone but the actor. */
function otherMemberIds(house, actorId) {
  return house.members
    .map((member) => String(member.user?._id || member.user))
    .filter((id) => id !== String(actorId));
}

export async function recordExpenseCreated({ house, expense, actorId }) {
  await incrementStats(actorId, { expensesAdded: 1 });

  const payerId = String(expense.paidBy?._id || expense.paidBy);
  if (payerId !== String(actorId)) {
    await incrementStats(payerId, { expensesPaid: 1 });
  }

  await logActivity({
    houseId: house._id,
    actorId,
    type: 'expense_added',
    message: `added ${expense.title} - ${formatPaise(expense.amount)}`,
    meta: { expenseId: String(expense._id), amount: expense.amount, title: expense.title },
  });

  await createNotifications(otherMemberIds(house, actorId), {
    houseId: house._id,
    actorId,
    type: 'expense_added',
    title: 'New expense added',
    message: `${expense.title} - ${formatPaise(expense.amount)}`,
    link: `/expenses/${expense._id}`,
    meta: { expenseId: String(expense._id), amount: expense.amount },
  });

  await evaluateAchievements(actorId, { houseId: house._id });
}

export async function recordExpenseUpdated({ house, expense, actorId }) {
  await logActivity({
    houseId: house._id,
    actorId,
    type: 'expense_updated',
    message: `updated ${expense.title} - ${formatPaise(expense.amount)}`,
    meta: { expenseId: String(expense._id), amount: expense.amount },
  });
}

export async function recordExpenseDeleted({ house, expense, actorId }) {
  await logActivity({
    houseId: house._id,
    actorId,
    type: 'expense_deleted',
    message: `deleted ${expense.title}`,
    meta: { expenseId: String(expense._id), title: expense.title },
  });
}

/** Only the person who added an expense, or a house manager, may change it. */
export function canModifyExpense(expense, userId, houseRole) {
  const creator = String(expense.createdBy?._id || expense.createdBy);
  return creator === String(userId) || houseRole === 'owner' || houseRole === 'admin';
}

export default { recordExpenseCreated, recordExpenseUpdated, recordExpenseDeleted, canModifyExpense };

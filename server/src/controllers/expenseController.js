import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendCreated, sendData, sendMessage } from '../utils/response.js';
import { serializeExpense } from '../utils/serializers.js';
import { buildMeta, parsePagination, parseSort } from '../utils/pagination.js';
import { containsMatcher } from '../utils/search.js';
import { splitExpense } from '../../../shared/money.js';
import { EXPENSE_CATEGORY_VALUES } from '../../../shared/constants.js';
import { canModifyExpense, recordExpenseCreated, recordExpenseDeleted, recordExpenseUpdated } from '../services/expenseService.js';

const EXPENSE_POPULATE = [
  { path: 'paidBy', select: 'name avatarUrl xp level' },
  { path: 'participants.user', select: 'name avatarUrl xp level' },
  { path: 'createdBy', select: 'name avatarUrl xp level' },
];

/**
 * Turns client-supplied participants into server-authoritative integer shares.
 *
 * The client is never trusted to compute shares: whatever it sends is either
 * recomputed (equal/percentage) or strictly validated to sum to the total
 * (custom). A mismatch is a 400, not a silently-wrong ledger.
 */
function resolveShares({ amount, splitType, participants, house }) {
  const memberIds = new Set(house.memberIds());

  const cleaned = (participants || []).map((participant) => {
    const user = String(participant.user?._id || participant.user || '');
    if (!user) throw ApiError.badRequest('Every participant needs a member');
    if (!memberIds.has(user)) {
      throw ApiError.badRequest('All participants must be members of this house');
    }
    return {
      user,
      ...(participant.share !== undefined ? { share: Number(participant.share) } : {}),
      ...(participant.percentage !== undefined ? { percentage: Number(participant.percentage) } : {}),
    };
  });

  try {
    return splitExpense({ amountPaise: amount, splitType, participants: cleaned });
  } catch (error) {
    throw ApiError.badRequest(error.message || 'Could not split this expense');
  }
}

function assertPayerIsMember(house, paidBy) {
  if (!house.getMember(paidBy)) {
    throw ApiError.badRequest('The payer must be a member of this house');
  }
}

export const listExpenses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { q, category, from, to, member, paidBy, sort } = req.query;

  const filter = { house: req.house._id };
  const clauses = [];

  if (category && EXPENSE_CATEGORY_VALUES.includes(category)) {
    filter.category = category;
  }

  const matcher = containsMatcher(q);
  if (matcher) clauses.push({ $or: [{ title: matcher }, { description: matcher }] });

  if (from || to) {
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(String(from));
    if (to) {
      // Inclusive end-of-day so "to=today" actually includes today.
      const end = new Date(String(to));
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    if (!Number.isNaN(dateFilter.$gte?.getTime?.() ?? 0) && !Number.isNaN(dateFilter.$lte?.getTime?.() ?? 0)) {
      filter.date = dateFilter;
    }
  }

  if (member && mongoose.isValidObjectId(member)) {
    clauses.push({ $or: [{ paidBy: member }, { 'participants.user': member }] });
  }

  const payerId = paidBy && mongoose.isValidObjectId(paidBy) ? paidBy : null;
  if (payerId) filter.paidBy = payerId;

  if (clauses.length > 0) filter.$and = clauses;

  const sortOption = parseSort(sort, ['date', 'amount', 'title', 'createdAt'], { date: -1 });

  const [items, total, totals] = await Promise.all([
    Expense.find(filter).sort(sortOption).skip(skip).limit(limit).populate(EXPENSE_POPULATE),
    Expense.countDocuments(filter),
    Expense.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
  ]);

  return res.status(200).json({
    success: true,
    data: items.map(serializeExpense),
    meta: {
      ...buildMeta({ page, limit, total }),
      summary: { total: totals[0]?.total || 0, count: totals[0]?.count || 0 },
    },
  });
});

export const createExpense = asyncHandler(async (req, res) => {
  const {
    title,
    amount,
    category = 'other',
    paidBy,
    participants,
    splitType = 'equal',
    date,
    description = '',
    receiptUrl = '',
  } = req.body;

  assertPayerIsMember(req.house, paidBy);
  const shares = resolveShares({ amount, splitType, participants, house: req.house });

  const expense = await Expense.create({
    house: req.house._id,
    title: String(title).trim(),
    amount,
    category,
    paidBy,
    participants: shares,
    splitType,
    date: date ? new Date(date) : new Date(),
    description: String(description || '').trim(),
    receiptUrl: String(receiptUrl || '').trim(),
    createdBy: req.user._id,
  });

  await recordExpenseCreated({ house: req.house, expense, actorId: req.user._id });

  const populated = await expense.populate(EXPENSE_POPULATE);
  return sendCreated(res, { expense: serializeExpense(populated) }, 'Expense added');
});

export const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.expenseId, house: req.house._id }).populate(EXPENSE_POPULATE);
  if (!expense) throw ApiError.notFound('Expense not found');

  const payerId = String(expense.paidBy?._id || expense.paidBy);
  const participantIds = expense.participants
    .map((participant) => String(participant.user?._id || participant.user))
    .filter((id) => id !== payerId);

  /**
   * Pairwise settlement totals between each participant and the payer.
   *
   * Deliberately pairwise rather than per-expense: HOUSEHUB has no concept of a
   * settlement that clears a specific bill, so pretending otherwise would show
   * numbers we cannot actually justify from the data.
   */
  const settlements = await Settlement.find({
    house: req.house._id,
    status: 'confirmed',
    to: payerId,
    from: { $in: participantIds },
  }).select('from amount');

  const settledByUser = new Map();
  for (const settlement of settlements) {
    const key = String(settlement.from);
    settledByUser.set(key, (settledByUser.get(key) || 0) + settlement.amount);
  }

  const serialized = serializeExpense(expense);

  return sendData(res, {
    expense: serialized,
    settlement: {
      payerId,
      pairwiseSettled: participantIds.map((id) => ({ user: id, settled: settledByUser.get(id) || 0 })),
    },
  });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.expenseId, house: req.house._id });
  if (!expense) throw ApiError.notFound('Expense not found');

  if (!canModifyExpense(expense, req.user._id, req.houseRole)) {
    throw ApiError.forbidden('Only the person who added this expense, an admin, or the owner can edit it');
  }

  const {
    title,
    amount,
    category,
    paidBy,
    participants,
    splitType,
    date,
    description,
    receiptUrl,
  } = req.body;

  const nextAmount = amount !== undefined ? amount : expense.amount;
  const nextSplitType = splitType !== undefined ? splitType : expense.splitType;
  const nextPaidBy = paidBy !== undefined ? paidBy : expense.paidBy;

  assertPayerIsMember(req.house, nextPaidBy);

  let nextParticipants;
  if (participants !== undefined) {
    nextParticipants = participants;
  } else if (nextSplitType === 'percentage') {
    // Percentages are not recoverable from stored shares, so an edit must resend them.
    throw ApiError.badRequest('Please resend the participants and percentages when editing a percentage split');
  } else {
    nextParticipants = expense.participants.map((participant) => ({
      user: String(participant.user),
      share: participant.share,
    }));
  }

  const shares = resolveShares({
    amount: nextAmount,
    splitType: nextSplitType,
    participants: nextParticipants,
    house: req.house,
  });

  if (title !== undefined) expense.title = String(title).trim();
  expense.amount = nextAmount;
  if (category !== undefined) expense.category = category;
  expense.paidBy = nextPaidBy;
  expense.participants = shares;
  expense.splitType = nextSplitType;
  if (date !== undefined) expense.date = new Date(date);
  if (description !== undefined) expense.description = String(description || '').trim();
  if (receiptUrl !== undefined) expense.receiptUrl = String(receiptUrl || '').trim();
  expense.updatedBy = req.user._id;

  await expense.save();
  await recordExpenseUpdated({ house: req.house, expense, actorId: req.user._id });

  const populated = await expense.populate(EXPENSE_POPULATE);
  return sendData(res, { expense: serializeExpense(populated) }, { message: 'Expense updated' });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.expenseId, house: req.house._id });
  if (!expense) throw ApiError.notFound('Expense not found');

  if (!canModifyExpense(expense, req.user._id, req.houseRole)) {
    throw ApiError.forbidden('Only the person who added this expense, an admin, or the owner can delete it');
  }

  await recordExpenseDeleted({ house: req.house, expense, actorId: req.user._id });
  await Expense.deleteOne({ _id: expense._id });

  return sendMessage(res, 'Expense deleted');
});

export default { listExpenses, createExpense, getExpense, updateExpense, deleteExpense };

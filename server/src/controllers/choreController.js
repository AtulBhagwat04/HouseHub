import mongoose from 'mongoose';
import Chore from '../models/Chore.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendCreated, sendData, sendMessage } from '../utils/response.js';
import { serializeChore } from '../utils/serializers.js';
import { buildMeta, parsePagination, parseSort } from '../utils/pagination.js';
import { containsMatcher } from '../utils/search.js';
import { CHORE_PRIORITIES, XP_REWARDS } from '../../../shared/constants.js';
import {
  completeChoreFlow,
  recordChoreCreated,
  recordChoreUpdated,
  startChoreFlow,
} from '../services/choreService.js';

const CHORE_POPULATE = [
  { path: 'assignedTo', select: 'name avatarUrl xp level' },
  { path: 'createdBy', select: 'name avatarUrl xp level' },
  { path: 'completedBy', select: 'name avatarUrl xp level' },
];

function assertAssigneeIsMember(house, assignedTo) {
  if (!house.getMember(assignedTo)) {
    throw ApiError.badRequest('The assigned member must belong to this house');
  }
}

/**
 * STATUS FILTERING - the one subtlety in this controller.
 *
 * "completed" and "in_progress" map straight onto stored values. "overdue" is
 * derived (`not completed AND dueDate < now`) because it is never stored.
 * "pending" matches the stored pending status, which *includes* chores that
 * have since become overdue - so a card can show PENDING plus an OVERDUE badge
 * instead of the chore vanishing from the pending filter on its due date.
 */
function buildStatusFilter(status) {
  const now = new Date();
  switch (status) {
    case 'pending':
      return { status: 'pending' };
    case 'in_progress':
      return { status: 'in_progress' };
    case 'completed':
      return { status: 'completed' };
    case 'overdue':
      return { status: { $ne: 'completed' }, dueDate: { $lt: now } };
    default:
      return null;
  }
}

export const listChores = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { q, status, priority, assignedTo, from, to, sort } = req.query;

  const filter = { house: req.house._id };
  const clauses = [];

  const statusFilter = buildStatusFilter(status);
  if (statusFilter) Object.assign(filter, statusFilter);

  if (priority && CHORE_PRIORITIES.includes(priority)) filter.priority = priority;

  if (assignedTo && mongoose.isValidObjectId(assignedTo)) filter.assignedTo = assignedTo;

  const matcher = containsMatcher(q);
  if (matcher) clauses.push({ $or: [{ title: matcher }, { description: matcher }] });

  if (from || to) {
    const dueFilter = {};
    if (from) dueFilter.$gte = new Date(String(from));
    if (to) {
      const end = new Date(String(to));
      end.setHours(23, 59, 59, 999);
      dueFilter.$lte = end;
    }
    filter.dueDate = dueFilter;
  }

  if (clauses.length > 0) filter.$and = clauses;

  const sortOption = parseSort(sort, ['dueDate', 'createdAt', 'priority', 'title'], { dueDate: 1 });

  const [items, total, openCount, overdueCount, completedCount] = await Promise.all([
    Chore.find(filter).sort(sortOption).skip(skip).limit(limit).populate(CHORE_POPULATE),
    Chore.countDocuments(filter),
    Chore.countDocuments({ house: req.house._id, status: { $ne: 'completed' } }),
    Chore.countDocuments({ house: req.house._id, status: { $ne: 'completed' }, dueDate: { $lt: new Date() } }),
    Chore.countDocuments({ house: req.house._id, status: 'completed' }),
  ]);

  return res.status(200).json({
    success: true,
    data: items.map(serializeChore),
    meta: {
      ...buildMeta({ page, limit, total }),
      counts: { open: openCount, overdue: overdueCount, completed: completedCount },
    },
  });
});

export const myChores = asyncHandler(async (req, res) => {
  const chores = await Chore.find({ house: req.house._id, assignedTo: req.user._id })
    .sort({ dueDate: 1 })
    .populate(CHORE_POPULATE);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);

  const buckets = { overdue: [], today: [], upcoming: [], completed: [] };

  for (const chore of chores) {
    if (chore.status === 'completed') {
      buckets.completed.push(chore);
      continue;
    }
    const due = new Date(chore.dueDate);
    if (due < startOfToday) buckets.overdue.push(chore);
    else if (due <= endOfToday) buckets.today.push(chore);
    else buckets.upcoming.push(chore);
  }

  // Most recently completed first is more useful than oldest-first.
  buckets.completed.reverse();

  const serialised = Object.fromEntries(
    Object.entries(buckets).map(([key, list]) => [key, list.map(serializeChore)]),
  );

  return sendData(res, {
    ...serialised,
    counts: {
      overdue: buckets.overdue.length,
      today: buckets.today.length,
      upcoming: buckets.upcoming.length,
      completed: buckets.completed.length,
      total: chores.length,
    },
  });
});

export const getChore = asyncHandler(async (req, res) => {
  const chore = await Chore.findOne({ _id: req.params.choreId, house: req.house._id }).populate(CHORE_POPULATE);
  if (!chore) throw ApiError.notFound('Chore not found');
  return sendData(res, { chore: serializeChore(chore) });
});

export const createChore = asyncHandler(async (req, res) => {
  const { title, description = '', assignedTo, dueDate, priority = 'medium', xpReward } = req.body;

  assertAssigneeIsMember(req.house, assignedTo);

  if (xpReward !== undefined && !XP_REWARDS.includes(Number(xpReward))) {
    throw ApiError.badRequest(`XP reward must be one of: ${XP_REWARDS.join(', ')}`);
  }

  const chore = await Chore.create({
    house: req.house._id,
    title: String(title).trim(),
    description: String(description || '').trim(),
    assignedTo,
    dueDate: new Date(dueDate),
    priority,
    ...(xpReward !== undefined ? { xpReward: Number(xpReward) } : {}),
    createdBy: req.user._id,
  });

  await recordChoreCreated({ house: req.house, chore, actorId: req.user._id });

  const populated = await chore.populate(CHORE_POPULATE);
  return sendCreated(res, { chore: serializeChore(populated) }, 'Chore created');
});

export const updateChore = asyncHandler(async (req, res) => {
  const chore = await Chore.findOne({ _id: req.params.choreId, house: req.house._id });
  if (!chore) throw ApiError.notFound('Chore not found');

  const isManager = req.houseRole === 'owner' || req.houseRole === 'admin';
  const isCreator = String(chore.createdBy) === String(req.user._id);
  const isAssignee = String(chore.assignedTo) === String(req.user._id);

  // The assignee may only progress their own chore to "in progress"; everything
  // else is a house-management action.
  const attemptedManagerFields = ['title', 'description', 'assignedTo', 'dueDate', 'priority', 'xpReward'].some(
    (field) => req.body[field] !== undefined,
  );

  if (!isManager && !isCreator && !isAssignee) {
    throw ApiError.forbidden('You cannot edit this chore');
  }
  if (attemptedManagerFields && !isManager && !isCreator) {
    throw ApiError.forbidden('Only the chore creator, an admin, or the owner can change chore details');
  }

  const previousAssigneeId = String(chore.assignedTo);
  const { title, description, assignedTo, dueDate, priority, xpReward, status } = req.body;

  if (assignedTo !== undefined) {
    assertAssigneeIsMember(req.house, assignedTo);
    chore.assignedTo = assignedTo;
  }
  if (title !== undefined) chore.title = String(title).trim();
  if (description !== undefined) chore.description = String(description || '').trim();
  if (dueDate !== undefined) chore.dueDate = new Date(dueDate);
  if (priority !== undefined) chore.priority = priority;

  if (xpReward !== undefined) {
    if (!XP_REWARDS.includes(Number(xpReward))) {
      throw ApiError.badRequest(`XP reward must be one of: ${XP_REWARDS.join(', ')}`);
    }
    // Once XP has been credited, the reward is frozen so history cannot be rewritten.
    if (chore.xpAwarded) {
      throw ApiError.badRequest('This chore is already completed, so its XP reward can no longer be changed');
    }
    chore.xpReward = Number(xpReward);
  }

  if (status !== undefined) {
    if (status === 'completed') {
      // Completion must go through the completion endpoint so XP is credited once.
      throw ApiError.badRequest('Use the complete action to mark a chore as done');
    }
    if (!['pending', 'in_progress'].includes(status)) {
      throw ApiError.badRequest('Status must be "pending" or "in_progress"');
    }
    chore.status = status;
    if (status === 'in_progress' && !chore.startedAt) chore.startedAt = new Date();
  }

  await chore.save();
  await recordChoreUpdated({ house: req.house, chore, actorId: req.user._id, previousAssigneeId });

  const populated = await chore.populate(CHORE_POPULATE);
  return sendData(res, { chore: serializeChore(populated) }, { message: 'Chore updated' });
});

export const deleteChore = asyncHandler(async (req, res) => {
  const chore = await Chore.findOne({ _id: req.params.choreId, house: req.house._id });
  if (!chore) throw ApiError.notFound('Chore not found');

  const isManager = req.houseRole === 'owner' || req.houseRole === 'admin';
  const isCreator = String(chore.createdBy) === String(req.user._id);
  if (!isManager && !isCreator) {
    throw ApiError.forbidden('Only the chore creator, an admin, or the owner can delete this chore');
  }

  await Chore.deleteOne({ _id: chore._id });
  return sendMessage(res, 'Chore deleted');
});

export const startChore = asyncHandler(async (req, res) => {
  const chore = await Chore.findOne({ _id: req.params.choreId, house: req.house._id });
  if (!chore) throw ApiError.notFound('Chore not found');

  const updated = await startChoreFlow({
    house: req.house,
    chore,
    actorId: req.user._id,
    houseRole: req.houseRole,
  });

  const populated = await updated.populate(CHORE_POPULATE);
  return sendData(res, { chore: serializeChore(populated) }, { message: 'Chore started' });
});

export const completeChore = asyncHandler(async (req, res) => {
  const chore = await Chore.findOne({ _id: req.params.choreId, house: req.house._id });
  if (!chore) throw ApiError.notFound('Chore not found');

  // NOTE: req.body is intentionally ignored. XP is read from the chore document,
  // which the server created and validated. A client cannot submit an XP amount.
  const result = await completeChoreFlow({
    house: req.house,
    chore,
    actorId: req.user._id,
    houseRole: req.houseRole,
  });

  const populated = await result.chore.populate(CHORE_POPULATE);

  return sendData(
    res,
    {
      chore: serializeChore(populated),
      alreadyCompleted: result.alreadyCompleted,
      xp: result.xp,
      newAchievements: result.newAchievements,
      unlockedLevel: result.unlockedLevel,
      message: result.alreadyCompleted
        ? 'This chore was already completed'
        : `Chore completed${result.xp ? ` - +${result.xp.awarded} XP` : ''}`,
    },
    { message: result.alreadyCompleted ? 'This chore was already completed' : 'Chore completed' },
  );
});

export default {
  listChores,
  myChores,
  getChore,
  createChore,
  updateChore,
  deleteChore,
  startChore,
  completeChore,
};

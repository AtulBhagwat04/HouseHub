import mongoose from 'mongoose';
import Settlement from '../models/Settlement.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendCreated, sendData, sendMessage } from '../utils/response.js';
import { serializeSettlement } from '../utils/serializers.js';
import { buildMeta, parsePagination, parseSort } from '../utils/pagination.js';
import { SETTLEMENT_STATUSES } from '../../../shared/constants.js';
import {
  counterpartyOf,
  recordSettlementRequested,
  recordSettlementResolved,
} from '../services/settlementService.js';
import { createNotification } from '../services/notificationService.js';
import { formatPaise } from '../../../shared/money.js';

const SETTLEMENT_POPULATE = [
  { path: 'from', select: 'name avatarUrl' },
  { path: 'to', select: 'name avatarUrl' },
  { path: 'requestedBy', select: 'name avatarUrl' },
  { path: 'resolvedBy', select: 'name avatarUrl' },
];

const REMINDER_COOLDOWN_MS = 60 * 60 * 1000; // one nudge per hour per settlement

function isParty(settlement, userId) {
  const id = String(userId);
  return String(settlement.from) === id || String(settlement.to) === id;
}

export const listSettlements = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, scope, sort } = req.query;

  const filter = { house: req.house._id };
  if (status && SETTLEMENT_STATUSES.includes(status)) filter.status = status;

  if (scope === 'mine') {
    filter.$or = [{ from: req.user._id }, { to: req.user._id }];
  }

  const sortOption = parseSort(sort, ['createdAt', 'amount', 'resolvedAt'], { createdAt: -1 });

  const [items, total, pendingTotal, confirmedAgg] = await Promise.all([
    Settlement.find(filter).sort(sortOption).skip(skip).limit(limit).populate(SETTLEMENT_POPULATE),
    Settlement.countDocuments(filter),
    Settlement.countDocuments({ house: req.house._id, status: 'pending' }),
    Settlement.aggregate([
      { $match: { house: req.house._id, status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const myPending = await Settlement.countDocuments({
    house: req.house._id,
    status: 'pending',
    $or: [{ from: req.user._id }, { to: req.user._id }],
  });

  return res.status(200).json({
    success: true,
    data: items.map(serializeSettlement),
    meta: {
      ...buildMeta({ page, limit, total }),
      counts: {
        pending: pendingTotal,
        myPending,
        confirmed: confirmedAgg[0]?.count || 0,
        confirmedTotal: confirmedAgg[0]?.total || 0,
      },
    },
  });
});

export const createSettlement = asyncHandler(async (req, res) => {
  const { from, to, amount, note = '', relatedExpense = null } = req.body;

  if (!req.house.getMember(from)) throw ApiError.badRequest('The paying member must belong to this house');
  if (!req.house.getMember(to)) throw ApiError.badRequest('The receiving member must belong to this house');
  if (String(from) === String(to)) throw ApiError.badRequest('Choose two different members');

  if (String(req.user._id) !== String(from) && String(req.user._id) !== String(to)) {
    throw ApiError.forbidden('You can only record a settlement between yourself and another member');
  }

  const settlement = await Settlement.create({
    house: req.house._id,
    from,
    to,
    amount,
    note: String(note || '').trim(),
    relatedExpense: relatedExpense && mongoose.isValidObjectId(relatedExpense) ? relatedExpense : null,
    requestedBy: req.user._id,
  });

  await recordSettlementRequested({ house: req.house, settlement, actorId: req.user._id });

  const populated = await settlement.populate(SETTLEMENT_POPULATE);
  return sendCreated(
    res,
    { settlement: serializeSettlement(populated) },
    'Settlement recorded - waiting for confirmation',
  );
});

export const confirmSettlement = asyncHandler(async (req, res) => {
  const settlement = await Settlement.findOne({ _id: req.params.settlementId, house: req.house._id });
  if (!settlement) throw ApiError.notFound('Settlement not found');

  if (settlement.status !== 'pending') {
    throw ApiError.badRequest('This settlement has already been resolved');
  }

  // Only the OTHER party confirms: you cannot approve your own payment claim.
  if (String(req.user._id) !== counterpartyOf(settlement)) {
    throw ApiError.forbidden('Only the other member can confirm this settlement');
  }

  settlement.status = 'confirmed';
  settlement.resolvedBy = req.user._id;
  settlement.resolvedAt = new Date();
  await settlement.save();

  await recordSettlementResolved({ house: req.house, settlement, actorId: req.user._id, status: 'confirmed' });

  const populated = await settlement.populate(SETTLEMENT_POPULATE);
  return sendData(res, { settlement: serializeSettlement(populated) }, { message: 'Settlement confirmed' });
});

export const rejectSettlement = asyncHandler(async (req, res) => {
  const settlement = await Settlement.findOne({ _id: req.params.settlementId, house: req.house._id });
  if (!settlement) throw ApiError.notFound('Settlement not found');

  if (settlement.status !== 'pending') {
    throw ApiError.badRequest('This settlement has already been resolved');
  }
  if (String(req.user._id) !== counterpartyOf(settlement)) {
    throw ApiError.forbidden('Only the other member can reject this settlement');
  }

  settlement.status = 'rejected';
  settlement.resolvedBy = req.user._id;
  settlement.resolvedAt = new Date();
  settlement.rejectionReason = String(req.body.reason || '').trim();
  await settlement.save();

  await recordSettlementResolved({ house: req.house, settlement, actorId: req.user._id, status: 'rejected' });

  const populated = await settlement.populate(SETTLEMENT_POPULATE);
  return sendData(res, { settlement: serializeSettlement(populated) }, { message: 'Settlement rejected' });
});

export const cancelSettlement = asyncHandler(async (req, res) => {
  const settlement = await Settlement.findOne({ _id: req.params.settlementId, house: req.house._id });
  if (!settlement) throw ApiError.notFound('Settlement not found');

  if (String(settlement.requestedBy) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the person who raised this settlement can cancel it');
  }
  if (settlement.status !== 'pending') {
    throw ApiError.badRequest('Only pending settlements can be cancelled');
  }

  await Settlement.deleteOne({ _id: settlement._id });
  return sendMessage(res, 'Settlement cancelled');
});

export const remindSettlement = asyncHandler(async (req, res) => {
  const settlement = await Settlement.findOne({ _id: req.params.settlementId, house: req.house._id });
  if (!settlement) throw ApiError.notFound('Settlement not found');

  if (!isParty(settlement, req.user._id)) {
    throw ApiError.forbidden('Only the members involved can send a reminder');
  }
  if (settlement.status !== 'pending') {
    throw ApiError.badRequest('There is nothing to remind about - this settlement is already resolved');
  }

  const lastReminded = settlement.lastRemindedAt ? new Date(settlement.lastRemindedAt).getTime() : 0;
  if (Date.now() - lastReminded < REMINDER_COOLDOWN_MS) {
    throw ApiError.badRequest('You already sent a reminder recently. Please wait before sending another.');
  }

  const recipientId = counterpartyOf(settlement);

  settlement.lastRemindedAt = new Date();
  settlement.reminderCount += 1;
  await settlement.save();

  await createNotification({
    recipientId,
    houseId: req.house._id,
    actorId: req.user._id,
    type: 'settlement_reminder',
    title: 'Settlement reminder',
    message: `Please confirm the ${formatPaise(settlement.amount)} settlement`,
    link: '/settlements',
    meta: { settlementId: String(settlement._id) },
  });

  return sendMessage(res, 'Reminder sent');
});

export default {
  listSettlements,
  createSettlement,
  confirmSettlement,
  rejectSettlement,
  cancelSettlement,
  remindSettlement,
};

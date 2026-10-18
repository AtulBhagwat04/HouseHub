import House from '../models/House.js';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Chore from '../models/Chore.js';
import Settlement from '../models/Settlement.js';
import Activity from '../models/Activity.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendCreated, sendData, sendMessage } from '../utils/response.js';
import { serializeActivity, serializeHouse, serializeMember } from '../utils/serializers.js';
import { buildInviteLink, extractInviteCode, generateInviteCode } from '../utils/inviteCode.js';
import { buildHouseBalances } from '../services/balanceService.js';
import { buildLeaderboard } from '../services/gamificationService.js';
import { buildDashboard } from '../services/dashboardService.js';
import { buildAnalytics } from '../services/analyticsService.js';
import { logActivity, recentActivity } from '../services/activityService.js';
import { createNotifications } from '../services/notificationService.js';
import { buildMeta, parsePagination } from '../utils/pagination.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Creates a house and makes the caller its owner.
 *
 * Invite-code collisions are retried explicitly rather than relying on the
 * schema hook, because a duplicate-key error leaves the pre-validate hook with
 * nothing to regenerate.
 */
export const createHouse = asyncHandler(async (req, res) => {
  if (req.user.house) {
    throw ApiError.conflict('You are already part of a house. Leave it before creating a new one.');
  }

  const { name, description = '', location = '', imageUrl = '', currency } = req.body;

  let house = null;
  let lastError = null;

  for (let attempt = 0; attempt < 5 && !house; attempt += 1) {
    try {
      house = await House.create({
        name: String(name).trim(),
        description: String(description || '').trim(),
        location: String(location || '').trim(),
        imageUrl: String(imageUrl || '').trim(),
        ...(currency ? { currency } : {}),
        inviteCode: generateInviteCode(),
        owner: req.user._id,
        members: [{ user: req.user._id, role: 'owner' }],
      });
    } catch (error) {
      lastError = error;
      if (error?.code === 11000 && error?.keyPattern?.inviteCode) continue;
      throw error;
    }
  }

  if (!house) {
    logger.error('Failed to allocate a unique invite code', lastError?.message);
    throw ApiError.internal('Could not generate a unique invite code. Please try again.');
  }

  await User.updateOne({ _id: req.user._id }, { $set: { house: house._id } });

  await logActivity({
    houseId: house._id,
    actorId: req.user._id,
    type: 'house_created',
    message: `created the house "${house.name}"`,
    meta: { houseId: String(house._id) },
  });

  return sendCreated(
    res,
    {
      house: serializeHouse(house, { membership: house.getMember(req.user._id) }),
      inviteCode: house.inviteCode,
      inviteLink: buildInviteLink(config.clientUrls[0], house.inviteCode),
    },
    `House "${house.name}" created`,
  );
});

export const joinHouse = asyncHandler(async (req, res) => {
  if (req.user.house) {
    throw ApiError.conflict('You are already part of a house. Leave it before joining another.');
  }

  const code = extractInviteCode(req.body.inviteCode);
  if (!code) throw ApiError.badRequest('Enter a valid invite code, for example HOUSE-7X92A');

  const house = await House.findOne({ inviteCode: code });
  if (!house) throw ApiError.notFound('No house matches that invite code. Double-check the code and try again.');

  if (house.settings?.allowInvites === false) {
    throw ApiError.forbidden('This house is not accepting new members right now');
  }

  if (house.getMember(req.user._id)) {
    throw ApiError.conflict('You are already a member of this house');
  }

  house.members.push({ user: req.user._id, role: 'member' });
  await house.save();

  await User.updateOne({ _id: req.user._id }, { $set: { house: house._id } });

  await logActivity({
    houseId: house._id,
    actorId: req.user._id,
    type: 'member_joined',
    message: `joined the house`,
    meta: { userId: String(req.user._id), name: req.user.name },
  });

  const others = house.members
    .map((member) => String(member.user))
    .filter((id) => id !== String(req.user._id));

  await createNotifications(others, {
    houseId: house._id,
    actorId: req.user._id,
    type: 'member_joined',
    title: 'New housemate',
    message: `${req.user.name} joined ${house.name}`,
    link: '/house/members',
    meta: { userId: String(req.user._id) },
  });

  return sendData(
    res,
    { house: serializeHouse(house, { membership: house.getMember(req.user._id) }) },
    { status: 200, message: `You joined "${house.name}"` },
  );
});

export const getHouse = asyncHandler(async (req, res) => {
  return sendData(res, {
    house: serializeHouse(req.house, { membership: req.membership }),
    inviteLink: buildInviteLink(config.clientUrls[0], req.house.inviteCode),
  });
});

export const updateHouse = asyncHandler(async (req, res) => {
  const { name, description, location, imageUrl, currency, settings } = req.body;

  if (name !== undefined) req.house.name = String(name).trim();
  if (description !== undefined) req.house.description = String(description || '').trim();
  if (location !== undefined) req.house.location = String(location || '').trim();
  if (imageUrl !== undefined) req.house.imageUrl = String(imageUrl || '').trim();
  if (currency !== undefined) req.house.currency = currency;

  if (settings && typeof settings === 'object') {
    if (settings.allowInvites !== undefined) req.house.settings.allowInvites = Boolean(settings.allowInvites);
    if (settings.notificationsEnabled !== undefined) {
      req.house.settings.notificationsEnabled = Boolean(settings.notificationsEnabled);
    }
    if (settings.weeklyChoreGoal !== undefined) {
      req.house.settings.weeklyChoreGoal = Number(settings.weeklyChoreGoal);
    }
  }

  await req.house.save();

  await logActivity({
    houseId: req.house._id,
    actorId: req.user._id,
    type: 'house_updated',
    message: `updated the house settings`,
    meta: {},
  });

  return sendData(res, { house: serializeHouse(req.house, { membership: req.membership }) }, { message: 'House updated' });
});

export const getInvite = asyncHandler(async (req, res) => {
  return sendData(res, {
    inviteCode: req.house.inviteCode,
    inviteLink: buildInviteLink(config.clientUrls[0], req.house.inviteCode),
    allowInvites: req.house.settings?.allowInvites !== false,
    memberCount: req.house.members.length,
  });
});

export const regenerateInvite = asyncHandler(async (req, res) => {
  const previous = req.house.inviteCode;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      req.house.inviteCode = generateInviteCode();
      await req.house.save();
      return sendData(
        res,
        { inviteCode: req.house.inviteCode, inviteLink: buildInviteLink(config.clientUrls[0], req.house.inviteCode) },
        { message: 'A new invite code was generated. The old link no longer works.' },
      );
    } catch (error) {
      if (error?.code === 11000 && error?.keyPattern?.inviteCode) continue;
      req.house.inviteCode = previous;
      throw error;
    }
  }

  throw ApiError.internal('Could not generate a unique invite code. Please try again.');
});

export const listMembers = asyncHandler(async (req, res) => {
  const memberIds = req.house.members.map((member) => member.user);

  const [users, balances, leaderboard] = await Promise.all([
    User.find({ _id: { $in: memberIds } }).select('name avatarUrl xp level stats createdAt'),
    buildHouseBalances(req.house),
    buildLeaderboard(req.house),
  ]);

  const userById = new Map(users.map((user) => [String(user._id), user]));
  const rankById = new Map(leaderboard.entries.map((entry) => [entry._id, entry.rank]));

  const members = req.house.members
    .map((membership) => {
      const id = String(membership.user);
      const user = userById.get(id);
      if (!user) return null;
      return {
        ...serializeMember(user, membership, { balancePaise: balances.netByMember.get(id) || 0 }),
        rank: rankById.get(id) || null,
        choresCompleted: user.stats?.choresCompleted || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.rank || 999) - (b.rank || 999));

  return sendData(res, { members, totalMembers: members.length });
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (String(userId) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot change your own role');
  }
  if (role === 'owner') {
    throw ApiError.badRequest('Use "transfer ownership" to make someone the owner');
  }
  if (role !== 'admin' && role !== 'member') {
    throw ApiError.badRequest('Role must be either "admin" or "member"');
  }

  const membership = req.house.getMember(userId);
  if (!membership) throw ApiError.notFound('That person is not a member of this house');
  if (membership.role === 'owner') throw ApiError.badRequest('The owner\'s role cannot be changed');

  membership.role = role;
  await req.house.save();

  await createNotifications([userId], {
    houseId: req.house._id,
    actorId: req.user._id,
    type: 'member_joined',
    title: 'Your role changed',
    message: `You are now ${role === 'admin' ? 'an admin' : 'a member'} of ${req.house.name}`,
    link: '/house/members',
    meta: { role },
  });

  return sendData(res, { members: req.house.members }, { message: `Role updated to ${role}` });
});

export const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (String(userId) === String(req.user._id)) {
    throw ApiError.badRequest('Use "leave house" to remove yourself');
  }

  const membership = req.house.getMember(userId);
  if (!membership) throw ApiError.notFound('That person is not a member of this house');
  if (membership.role === 'owner') throw ApiError.badRequest('The house owner cannot be removed');

  // An admin may only remove plain members - never another admin.
  if (req.houseRole === 'admin' && membership.role === 'admin') {
    throw ApiError.forbidden('Only the owner can remove another admin');
  }

  req.house.members = req.house.members.filter((member) => String(member.user) !== String(userId));
  await req.house.save();

  // Clear the ex-member's pointer so they can create or join another house.
  await User.updateOne({ _id: userId }, { $set: { house: null } });

  await logActivity({
    houseId: req.house._id,
    actorId: req.user._id,
    type: 'member_left',
    message: `was removed from the house`,
    meta: { userId: String(userId) },
  });

  return sendMessage(res, 'Member removed from the house');
});

export const transferOwnership = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const target = req.house.getMember(userId);
  if (!target) throw ApiError.notFound('That person is not a member of this house');
  if (String(userId) === String(req.user._id)) throw ApiError.badRequest('You are already the owner');

  const currentOwner = req.house.getMember(req.user._id);
  target.role = 'owner';
  if (currentOwner) currentOwner.role = 'admin';
  req.house.owner = userId;

  await req.house.save();

  await createNotifications([userId], {
    houseId: req.house._id,
    actorId: req.user._id,
    type: 'member_joined',
    title: 'You are now the house owner',
    message: `Ownership of ${req.house.name} was transferred to you`,
    link: '/house/settings',
    meta: { role: 'owner' },
  });

  return sendData(res, { house: serializeHouse(req.house, { membership: currentOwner }) }, { message: 'Ownership transferred' });
});

export const leaveHouse = asyncHandler(async (req, res) => {
  const house = req.house;
  const others = house.members.filter((member) => String(member.user) !== String(req.user._id));
  const isOwner = house.isOwner(req.user._id);

  if (isOwner && others.length > 0) {
    throw ApiError.badRequest('Transfer ownership to another member before leaving');
  }

  if (others.length === 0) {
    // Last person out turns off the lights.
    await Promise.all([
      Expense.deleteMany({ house: house._id }),
      Chore.deleteMany({ house: house._id }),
      Settlement.deleteMany({ house: house._id }),
      Activity.deleteMany({ house: house._id }),
      Notification.deleteMany({ house: house._id }),
      House.deleteOne({ _id: house._id }),
    ]);
    await User.updateOne({ _id: req.user._id }, { $set: { house: null } });
    return sendMessage(res, 'You left the house. It has been deleted because no members remained.');
  }

  house.members = others;
  await house.save();
  await User.updateOne({ _id: req.user._id }, { $set: { house: null } });

  await logActivity({
    houseId: house._id,
    actorId: req.user._id,
    type: 'member_left',
    message: `left the house`,
    meta: { userId: String(req.user._id) },
  });

  await createNotifications(
    others.map((member) => String(member.user)),
    {
      houseId: house._id,
      actorId: req.user._id,
      type: 'member_joined',
      title: 'A housemate left',
      message: `${req.user.name} left ${house.name}`,
      link: '/house/members',
      meta: {},
    },
  );

  return sendMessage(res, 'You left the house');
});

export const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await buildDashboard(req.house, req.user._id);
  return sendData(res, dashboard);
});

export const getLeaderboard = asyncHandler(async (req, res) => {
  const leaderboard = await buildLeaderboard(req.house);
  return sendData(res, {
    ...leaderboard,
    me: leaderboard.entries.find((entry) => entry._id === String(req.user._id)) || null,
  });
});

export const getActivity = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { house: req.house._id };

  if (req.query.type) filter.type = req.query.type;

  const [items, total] = await Promise.all([
    Activity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actor', 'name avatarUrl xp level'),
    Activity.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: items.map(serializeActivity),
    meta: buildMeta({ page, limit, total }),
  });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await buildAnalytics(req.house, { months: Number(req.query.months) || 6 });
  return sendData(res, analytics);
});

export const getBalances = asyncHandler(async (req, res) => {
  const balances = await buildHouseBalances(req.house);
  const memberIds = req.house.members.map((member) => String(member.user));
  const users = await User.find({ _id: { $in: memberIds } }).select('name avatarUrl xp level');
  const userById = new Map(users.map((user) => [String(user._id), user]));

  const describe = (id) => {
    const user = userById.get(String(id));
    return { _id: String(id), name: user?.name || 'Former member', avatarUrl: user?.avatarUrl || '' };
  };

  return sendData(res, {
    totalExpenses: balances.totalExpenses,
    expenseCount: balances.expenseCount,
    settlementCount: balances.settlementCount,
    members: balances.net.map((entry) => ({ ...describe(entry.user), net: entry.net })),
    suggestedTransfers: balances.suggestedTransfers.map((transfer) => ({
      ...transfer,
      fromUser: describe(transfer.from),
      toUser: describe(transfer.to),
    })),
  });
});

export default {
  createHouse,
  joinHouse,
  getHouse,
  updateHouse,
  getInvite,
  regenerateInvite,
  listMembers,
  updateMemberRole,
  removeMember,
  transferOwnership,
  leaveHouse,
  getDashboard,
  getLeaderboard,
  getActivity,
  getAnalytics,
  getBalances,
};

import User from '../models/User.js';
import House from '../models/House.js';
import Expense from '../models/Expense.js';
import Chore from '../models/Chore.js';
import Settlement from '../models/Settlement.js';
import Activity from '../models/Activity.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendCreated, sendData, sendMessage } from '../utils/response.js';
import { signToken } from '../middleware/auth.js';
import { serializeHouse, serializeSelf } from '../utils/serializers.js';
import { generateResetToken, hashResetToken } from '../utils/inviteCode.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';

/** Never reveal whether an email is registered - used by forgot-password. */
const GENERIC_RESET_MESSAGE = 'If an account exists for that email, a reset link has been sent.';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const normalisedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normalisedEmail });
  if (existing) throw ApiError.conflict('An account with that email already exists');

  const user = await User.create({
    name: String(name).trim(),
    email: normalisedEmail,
    password,
  });

  const token = signToken(user._id);
  return sendCreated(res, { token, user: serializeSelf(user) }, 'Welcome to HOUSEHUB');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalisedEmail = String(email).toLowerCase().trim();

  // `+password` because the field is select:false by default.
  const user = await User.findOne({ email: normalisedEmail }).select('+password');

  // Identical error for "no such user" and "wrong password" so the endpoint
  // cannot be used to enumerate which emails have accounts.
  const invalid = () => ApiError.unauthorized('Incorrect email or password');
  if (!user) throw invalid();

  const matches = await user.comparePassword(password);
  if (!matches) throw invalid();

  const token = signToken(user._id);
  await User.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date() } });

  return sendData(res, { token, user: serializeSelf(user) }, { message: 'Signed in successfully' });
});

export const getMe = asyncHandler(async (req, res) => {
  const house = req.user.house ? await House.findById(req.user.house) : null;
  const membership = house ? house.getMember(req.user._id) : null;

  return sendData(res, {
    user: serializeSelf(req.user),
    house: house ? serializeHouse(house, { membership }) : null,
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { name, avatarUrl, theme, notificationPrefs } = req.body;
  const update = {};

  if (name !== undefined) update.name = String(name).trim();
  if (avatarUrl !== undefined) update.avatarUrl = String(avatarUrl || '').trim();
  if (theme !== undefined) update.theme = theme;

  if (notificationPrefs && typeof notificationPrefs === 'object') {
    for (const key of ['chores', 'expenses', 'settlements', 'achievements']) {
      if (notificationPrefs[key] !== undefined) {
        update[`notificationPrefs.${key}`] = Boolean(notificationPrefs[key]);
      }
    }
  }

  if (Object.keys(update).length === 0) {
    throw ApiError.badRequest('Nothing to update');
  }

  const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true, runValidators: true });
  return sendData(res, { user: serializeSelf(user) }, { message: 'Profile updated' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw ApiError.unauthorized();

  const matches = await user.comparePassword(currentPassword);
  if (!matches) throw ApiError.badRequest('Your current password is incorrect');

  user.password = newPassword;
  await user.save();

  // Issue a fresh token so the current client stays signed in.
  return sendData(res, { token: signToken(user._id) }, { message: 'Password changed successfully' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email).toLowerCase().trim();
  const user = await User.findOne({ email });

  let devResetToken = null;

  if (user) {
    const { raw, hashed } = generateResetToken();
    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${config.clientUrls[0].replace(/\/+$/, '')}/reset-password/${raw}`;

    if (config.email.devMode) {
      // No mail provider in the MVP stack. The link is logged to the server
      // console so the flow is fully testable locally.
      logger.info(`[password reset] ${email} -> ${resetUrl}`);
      devResetToken = raw;
    }
  }

  return sendMessage(
    res,
    GENERIC_RESET_MESSAGE,
    devResetToken ? { devResetToken, note: 'Email delivery is disabled; use this token with POST /api/auth/reset-password' } : null,
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const hashed = hashResetToken(String(token).trim());

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+password');

  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return sendData(res, { token: signToken(user._id) }, { message: 'Password reset successfully' });
});

/**
 * Deletes the account and tidies up after it.
 *
 * Ownership rules exist so a house can never be left headless: an owner with
 * other members must hand over first. A sole owner takes the whole house with
 * them, because an empty house is unreachable and would just be orphaned data.
 */
export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw ApiError.unauthorized();

  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.badRequest('Password is incorrect');

  if (user.house) {
    const house = await House.findById(user.house);

    if (house) {
      const isOwner = house.isOwner(user._id);
      const others = house.members.filter((member) => String(member.user) !== String(user._id));

      if (isOwner && others.length > 0) {
        throw ApiError.badRequest(
          'Transfer ownership to another member (or remove them) before deleting your account',
        );
      }

      if (isOwner && others.length === 0) {
        await Promise.all([
          Expense.deleteMany({ house: house._id }),
          Chore.deleteMany({ house: house._id }),
          Settlement.deleteMany({ house: house._id }),
          Activity.deleteMany({ house: house._id }),
          Notification.deleteMany({ house: house._id }),
          House.deleteOne({ _id: house._id }),
        ]);
      } else {
        house.members = house.members.filter((member) => String(member.user) !== String(user._id));
        await house.save();
      }
    }
  }

  await Notification.deleteMany({ user: user._id });
  await User.deleteOne({ _id: user._id });

  return sendMessage(res, 'Your account has been permanently deleted');
});

export default {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
};

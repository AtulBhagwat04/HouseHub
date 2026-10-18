import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendData, sendMessage } from '../utils/response.js';
import { serializeNotification } from '../utils/serializers.js';
import { buildMeta, parsePagination } from '../utils/pagination.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { user: req.user._id };

  if (req.query.unread === 'true') filter.read = false;
  if (req.query.type) filter.type = req.query.type;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actor', 'name avatarUrl'),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  return res.status(200).json({
    success: true,
    data: items.map(serializeNotification),
    meta: { ...buildMeta({ page, limit, total }), unreadCount },
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
  return sendData(res, { unreadCount });
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, user: req.user._id },
    { $set: { read: true, readAt: new Date() } },
    { new: true },
  ).populate('actor', 'name avatarUrl');

  if (!notification) throw ApiError.notFound('Notification not found');

  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
  return sendData(res, { notification: serializeNotification(notification), unreadCount });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true, readAt: new Date() } },
  );

  return sendData(res, { unreadCount: 0, updated: result.modifiedCount }, { message: 'All notifications marked as read' });
});

export const removeNotification = asyncHandler(async (req, res) => {
  const deleted = await Notification.findOneAndDelete({
    _id: req.params.notificationId,
    user: req.user._id,
  });

  if (!deleted) throw ApiError.notFound('Notification not found');

  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
  return sendData(res, { unreadCount }, { message: 'Notification deleted' });
});

export const clearNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({ user: req.user._id, read: true });
  return sendData(res, { deleted: result.deletedCount }, { message: 'Read notifications cleared' });
});

export default {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  removeNotification,
  clearNotifications,
};

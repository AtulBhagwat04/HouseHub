import { http } from '@/lib/api';

const base = '/notifications';

export async function listNotifications(params = {}) {
  const body = await http.get(base, params);
  return { items: body.data, meta: body.meta };
}

export async function fetchUnreadCount() {
  const body = await http.get(`${base}/unread-count`);
  return body.data.unreadCount;
}

export async function markRead(notificationId) {
  const body = await http.patch(`${base}/${notificationId}/read`);
  return { notification: body.data.notification, unreadCount: body.data.unreadCount };
}

export async function markAllRead() {
  const body = await http.patch(`${base}/read-all`);
  return body.data.unreadCount;
}

export async function removeNotification(notificationId) {
  const body = await http.delete(`${base}/${notificationId}`);
  return body.data.unreadCount;
}

export async function clearRead() {
  const body = await http.delete(`${base}/clear`);
  return body.data.deleted;
}

export default {
  listNotifications,
  fetchUnreadCount,
  markRead,
  markAllRead,
  removeNotification,
  clearRead,
};

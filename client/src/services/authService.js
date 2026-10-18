import { http } from '@/lib/api';

/**
 * One function per API operation, each returning plain data for its page.
 *
 * Paginated endpoints return `{ items, meta }` so a page gets the rows and the
 * pagination envelope from a single call. Errors propagate as ApiError, which
 * already carries a user-safe message.
 */

const AUTH = '/auth';

export async function register({ name, email, password, confirmPassword }) {
  const body = await http.post(`${AUTH}/register`, { name, email, password, confirmPassword });
  return { token: body.data.token, user: body.data.user };
}

export async function login({ email, password }) {
  const body = await http.post(`${AUTH}/login`, { email, password });
  return { token: body.data.token, user: body.data.user };
}

export async function fetchMe() {
  const body = await http.get(`${AUTH}/me`);
  return { user: body.data.user, house: body.data.house };
}

export async function updateProfile(payload) {
  const body = await http.patch(`${AUTH}/me`, payload);
  return body.data.user;
}

export async function changePassword({ currentPassword, newPassword }) {
  const body = await http.patch(`${AUTH}/password`, { currentPassword, newPassword });
  return body.data.token;
}

export async function forgotPassword({ email }) {
  const body = await http.post(`${AUTH}/forgot-password`, { email });
  return { message: body.message, data: body.data };
}

export async function resetPassword({ token, newPassword }) {
  const body = await http.post(`${AUTH}/reset-password`, { token, newPassword });
  return body.data.token;
}

export async function deleteAccount({ password }) {
  const body = await http.delete(`${AUTH}/me`, undefined, { data: { password } });
  return body.message;
}

export default {
  register,
  login,
  fetchMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
};

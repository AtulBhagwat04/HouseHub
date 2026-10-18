import { http } from '@/lib/api';

const base = (houseId) => `/houses/${houseId}`;

export async function createHouse(payload) {
  const body = await http.post('/houses', payload);
  return { house: body.data.house, inviteCode: body.data.inviteCode, inviteLink: body.data.inviteLink };
}

export async function joinHouse(inviteCode) {
  const body = await http.post('/houses/join', { inviteCode });
  return body.data.house;
}

export async function fetchHouse(houseId) {
  const body = await http.get(base(houseId));
  return { house: body.data.house, inviteLink: body.data.inviteLink };
}

export async function updateHouse(houseId, payload) {
  const body = await http.patch(base(houseId), payload);
  return body.data.house;
}

export async function fetchInvite(houseId) {
  const body = await http.get(`${base(houseId)}/invite`);
  return body.data;
}

export async function regenerateInvite(houseId) {
  const body = await http.post(`${base(houseId)}/invite/regenerate`);
  return { ...body.data, message: body.message };
}

export async function fetchMembers(houseId) {
  const body = await http.get(`${base(houseId)}/members`);
  return { members: body.data.members, totalMembers: body.data.totalMembers };
}

export async function updateMemberRole(houseId, userId, role) {
  const body = await http.patch(`${base(houseId)}/members/${userId}`, { role });
  return body.message;
}

export async function removeMember(houseId, userId) {
  const body = await http.delete(`${base(houseId)}/members/${userId}`);
  return body.message;
}

export async function transferOwnership(houseId, userId) {
  const body = await http.post(`${base(houseId)}/transfer-ownership`, { userId });
  return body.data.house;
}

export async function leaveHouse(houseId) {
  const body = await http.post(`${base(houseId)}/leave`);
  return body.message;
}

export async function fetchDashboard(houseId) {
  const body = await http.get(`${base(houseId)}/dashboard`);
  return body.data;
}

export async function fetchBalances(houseId) {
  const body = await http.get(`${base(houseId)}/balances`);
  return body.data;
}

export async function fetchLeaderboard(houseId) {
  const body = await http.get(`${base(houseId)}/leaderboard`);
  return body.data;
}

export async function fetchActivity(houseId, params = {}) {
  const body = await http.get(`${base(houseId)}/activity`, params);
  return { items: body.data, meta: body.meta };
}

export async function fetchAnalytics(houseId, params = {}) {
  const body = await http.get(`${base(houseId)}/analytics`, params);
  return body.data;
}

export default {
  createHouse,
  joinHouse,
  fetchHouse,
  updateHouse,
  fetchInvite,
  regenerateInvite,
  fetchMembers,
  updateMemberRole,
  removeMember,
  transferOwnership,
  leaveHouse,
  fetchDashboard,
  fetchBalances,
  fetchLeaderboard,
  fetchActivity,
  fetchAnalytics,
};

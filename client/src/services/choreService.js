import { http } from '@/lib/api';

const base = (houseId) => `/houses/${houseId}/chores`;

export async function listChores(houseId, params = {}) {
  const body = await http.get(base(houseId), params);
  return { items: body.data, meta: body.meta };
}

export async function getChore(houseId, choreId) {
  const body = await http.get(`${base(houseId)}/${choreId}`);
  return body.data.chore;
}

export async function getMyChores(houseId) {
  const body = await http.get(`${base(houseId)}/mine`);
  return body.data;
}

export async function createChore(houseId, payload) {
  const body = await http.post(base(houseId), payload);
  return body.data.chore;
}

export async function updateChore(houseId, choreId, payload) {
  const body = await http.patch(`${base(houseId)}/${choreId}`, payload);
  return body.data.chore;
}

export async function deleteChore(houseId, choreId) {
  const body = await http.delete(`${base(houseId)}/${choreId}`);
  return body.message;
}

export async function startChore(houseId, choreId) {
  const body = await http.post(`${base(houseId)}/${choreId}/start`);
  return body.data.chore;
}

/**
 * Completion takes NO body on purpose: the server reads the XP reward from the
 * stored chore document, so a client cannot submit its own XP amount.
 *
 * Returns the XP delta, any level-up, and newly unlocked achievements so the UI
 * can celebrate them in one round trip.
 */
export async function completeChore(houseId, choreId) {
  const body = await http.post(`${base(houseId)}/${choreId}/complete`);
  return {
    chore: body.data.chore,
    alreadyCompleted: body.data.alreadyCompleted,
    xp: body.data.xp,
    newAchievements: body.data.newAchievements || [],
    unlockedLevel: body.data.unlockedLevel,
    message: body.data.message || body.message,
  };
}

export default {
  listChores,
  getChore,
  getMyChores,
  createChore,
  updateChore,
  deleteChore,
  startChore,
  completeChore,
};

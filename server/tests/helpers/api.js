import request from 'supertest';
import app from '../../src/app.js';

export function api() {
  return request(app);
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

let sequence = 0;

export function uniqueEmail(prefix = 'user') {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}@example.com`;
}

export async function registerUser(overrides = {}) {
  const email = overrides.email || uniqueEmail();
  const password = overrides.password || 'Password123';

  const response = await api()
    .post('/api/auth/register')
    .send({ name: 'Test User', ...overrides, email, password, confirmPassword: password });

  return {
    response,
    token: response.body?.data?.token,
    user: response.body?.data?.user,
    id: response.body?.data?.user?._id,
    email,
    password,
  };
}

export async function createHouse(token, overrides = {}) {
  const response = await api()
    .post('/api/houses')
    .set(authHeader(token))
    .send({ name: 'College Flat', description: 'Shared apartment near college', ...overrides });

  if (response.status !== 201) {
    throw new Error(`createHouse failed [${response.status}]: ${JSON.stringify(response.body)}`);
  }
  return response.body.data.house;
}

export async function joinHouse(token, inviteCode) {
  const response = await api().post('/api/houses/join').set(authHeader(token)).send({ inviteCode });
  if (response.status !== 200) {
    throw new Error(`joinHouse failed [${response.status}]: ${JSON.stringify(response.body)}`);
  }
  return response.body.data.house;
}

export async function addExpense(token, houseId, payload) {
  return api().post(`/api/houses/${houseId}/expenses`).set(authHeader(token)).send(payload);
}

export async function addChore(token, houseId, payload) {
  return api().post(`/api/houses/${houseId}/chores`).set(authHeader(token)).send(payload);
}

export async function addSettlement(token, houseId, payload) {
  return api().post(`/api/houses/${houseId}/settlements`).set(authHeader(token)).send(payload);
}

export async function getBalances(token, houseId) {
  const response = await api().get(`/api/houses/${houseId}/balances`).set(authHeader(token));
  return response.body.data;
}

/** Net paise for a given user id, from the balances payload. */
export function netFor(balances, userId) {
  return balances.members.find((member) => member._id === String(userId))?.net;
}

/**
 * Builds a house with `count` members (the first is the owner).
 * This mirrors the real onboarding path - create, then join by invite code -
 * rather than writing to Mongo directly, so the helpers exercise the API.
 */
export async function setupHouseWithMembers(count = 4) {
  const owner = await registerUser({ name: 'Owner' });
  const house = await createHouse(owner.token);

  const members = [owner];
  for (let index = 1; index < count; index += 1) {
    const member = await registerUser({ name: `Member ${index}` });
    await joinHouse(member.token, house.inviteCode);
    members.push(member);
  }

  return { house, members, owner, houseId: house._id };
}

export default {
  api,
  authHeader,
  uniqueEmail,
  registerUser,
  createHouse,
  joinHouse,
  addExpense,
  addChore,
  addSettlement,
  getBalances,
  netFor,
  setupHouseWithMembers,
};

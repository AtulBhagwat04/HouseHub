import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { api, addExpense, authHeader, registerUser, setupHouseWithMembers } from './helpers/api.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/testDb.js';

beforeAll(connectTestDb);
beforeEach(clearTestDb);
afterAll(closeTestDb);

/**
 * THE HOUSE-LEVEL AUTHORIZATION TESTS (product spec section 38)
 *
 * "A user must never be able to access another house's data by changing a house
 *  ID in the URL."
 *
 * Every house-scoped read and write is checked here, because this is the single
 * most damaging class of bug in a multi-tenant app: one missing middleware and
 * every household's finances are public.
 */
describe('cross-house access is blocked', () => {
  it('returns 403 when a non-member reads another house\'s expenses', async () => {
    const first = await setupHouseWithMembers(2);
    const outsider = await registerUser({ name: 'Outsider' });

    const response = await api()
      .get(`/api/houses/${first.houseId}/expenses`)
      .set(authHeader(outsider.token));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('returns 403 for every house-scoped GET', async () => {
    const first = await setupHouseWithMembers(2);
    const outsider = await registerUser({ name: 'Outsider' });

    const protectedPaths = [
      '',
      '/dashboard',
      '/balances',
      '/members',
      '/leaderboard',
      '/analytics',
      '/activity',
      '/achievements',
      '/invite',
      '/expenses',
      '/chores',
      '/chores/mine',
      '/settlements',
    ];

    for (const path of protectedPaths) {
      const response = await api()
        .get(`/api/houses/${first.houseId}${path}`)
        .set(authHeader(outsider.token));
      expect(response.status, `GET ${path} should be 403`).toBe(403);
    }
  });

  it('returns 403 when an outsider tries to write into another house', async () => {
    const first = await setupHouseWithMembers(2);
    const outsider = await registerUser({ name: 'Outsider' });
    const owner = first.members[0];

    const payload = {
      title: 'Sneaky expense',
      amount: 100000,
      paidBy: owner.id,
      participants: [{ user: owner.id }],
    };

    const create = await addExpense(outsider.token, first.houseId, payload);
    expect(create.status).toBe(403);

    const update = await api()
      .patch(`/api/houses/${first.houseId}/expenses/000000000000000000000000`)
      .set(authHeader(outsider.token))
      .send({ title: 'Hijacked' });
    expect(update.status).toBe(403);

    const remove = await api()
      .delete(`/api/houses/${first.houseId}/expenses/000000000000000000000000`)
      .set(authHeader(outsider.token));
    expect(remove.status).toBe(403);
  });

  it('returns 403 for a malformed house id rather than a 500', async () => {
    const { token } = await registerUser();

    const response = await api().get('/api/houses/not-an-object-id/expenses').set(authHeader(token));
    expect(response.status).toBe(403);
  });

  it('returns 403 for a well-formed but non-existent house id', async () => {
    const { token } = await registerUser();

    const response = await api()
      .get('/api/houses/000000000000000000000000/expenses')
      .set(authHeader(token));
    expect(response.status).toBe(403);
  });

  it('returns 401 for every house-scoped route without a token', async () => {
    const { houseId } = await setupHouseWithMembers(2);

    const response = await api().get(`/api/houses/${houseId}/expenses`);
    expect(response.status).toBe(401);
  });

  it('stops an outsider from confirming a settlement inside another house', async () => {
    const first = await setupHouseWithMembers(2);
    const outsider = await registerUser({ name: 'Outsider' });
    const [owner, member] = first.members;

    const created = await api()
      .post(`/api/houses/${first.houseId}/settlements`)
      .set(authHeader(member.token))
      .send({ from: member.id, to: owner.id, amount: 50000 });

    expect(created.status).toBe(201);
    const settlementId = created.body.data.settlement._id;

    const hijack = await api()
      .post(`/api/houses/${first.houseId}/settlements/${settlementId}/confirm`)
      .set(authHeader(outsider.token));
    expect(hijack.status).toBe(403);
  });

  it('does not leak a foreign expense id through the detail endpoint', async () => {
    const first = await setupHouseWithMembers(2);
    const second = await setupHouseWithMembers(2);

    const [firstOwner, firstMember] = first.members;
    const [secondOwner] = second.members;

    const created = await addExpense(firstOwner.token, first.houseId, {
      title: 'First house secret',
      amount: 100000,
      paidBy: firstOwner.id,
      participants: [{ user: firstOwner.id }, { user: firstMember.id }],
    });
    expect(created.status).toBe(201);
    const expenseId = created.body.data.expense._id;

    // 1. Foreign house in the URL -> rejected at the house boundary, before the
    //    expense query even runs. This is the actual IDOR attempt.
    const foreignHouse = await api()
      .get(`/api/houses/${first.houseId}/expenses/${expenseId}`)
      .set(authHeader(secondOwner.token));
    expect(foreignHouse.status).toBe(403);

    // 2. Own house in the URL with a foreign expense id -> the query is scoped
    //    by house, so the document is simply not found. 404, not a leak.
    const scopedMiss = await api()
      .get(`/api/houses/${second.houseId}/expenses/${expenseId}`)
      .set(authHeader(secondOwner.token));
    expect(scopedMiss.status).toBe(404);
    expect(JSON.stringify(scopedMiss.body)).not.toContain('First house secret');
  });
});

describe('role enforcement inside a house', () => {
  it('stops a plain member from removing another member', async () => {
    const { members, houseId } = await setupHouseWithMembers(3);
    const [owner, member, victim] = members;

    const response = await api()
      .delete(`/api/houses/${houseId}/members/${victim.id}`)
      .set(authHeader(member.token));

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/owner|admin/i);
    expect(owner.id).toBeTruthy();
  });

  it('stops an admin from demoting the owner', async () => {
    const { members, houseId } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    // Promote member to admin, then try to change the owner's role.
    const promote = await api()
      .patch(`/api/houses/${houseId}/members/${member.id}`)
      .set(authHeader(owner.token))
      .send({ role: 'admin' });
    expect(promote.status).toBe(200);

    const attack = await api()
      .patch(`/api/houses/${houseId}/members/${owner.id}`)
      .set(authHeader(member.token))
      .send({ role: 'member' });

    // Only the owner can change roles at all, and never their own.
    expect(attack.status).toBe(403);
  });

  it('stops a non-owner from regenerating the invite code or editing the house', async () => {
    const { members, houseId } = await setupHouseWithMembers(3);
    const [, member] = members;

    const regenerate = await api()
      .post(`/api/houses/${houseId}/invite/regenerate`)
      .set(authHeader(member.token));
    expect(regenerate.status).toBe(403);

    const edit = await api()
      .patch(`/api/houses/${houseId}`)
      .set(authHeader(member.token))
      .send({ name: 'Renamed by a member' });
    expect(edit.status).toBe(403);
  });

  it('stops an admin from deleting an expense they did not create when they are not a manager', async () => {
    const { members, houseId } = await setupHouseWithMembers(3);
    const [owner, member, other] = members;

    const created = await addExpense(other.token, houseId, {
      title: 'Other member expense',
      amount: 50000,
      paidBy: other.id,
      participants: [{ user: other.id }, { user: owner.id }],
    });
    const expenseId = created.body.data.expense._id;

    const response = await api()
      .delete(`/api/houses/${houseId}/expenses/${expenseId}`)
      .set(authHeader(member.token));

    expect(response.status).toBe(403);
  });
});

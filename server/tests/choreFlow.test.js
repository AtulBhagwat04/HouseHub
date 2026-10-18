import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import User from '../src/models/User.js';
import Chore from '../src/models/Chore.js';
import Notification from '../src/models/Notification.js';
import { api, addChore, authHeader, setupHouseWithMembers } from './helpers/api.js';
import { clearTestDb, closeTestDb, connectTestDb } from './helpers/testDb.js';
import { syncAchievementDefinitions } from '../src/services/achievementSeeder.js';

beforeAll(connectTestDb);
// The catalogue lives in the database, so it must be re-seeded after each wipe.
beforeEach(async () => {
  await clearTestDb();
  await syncAchievementDefinitions();
});
afterAll(closeTestDb);

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const yesterday = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

function completeChore(houseId, choreId, token) {
  return api()
    .post(`/api/houses/${houseId}/chores/${choreId}/complete`)
    .set(authHeader(token))
    .send();
}

/** Creates a chore and returns its id. */
async function seedChore(token, houseId, overrides = {}) {
  const response = await addChore(token, houseId, {
    title: 'Clean Kitchen',
    dueDate: tomorrow(),
    priority: 'medium',
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`seedChore failed [${response.status}]: ${JSON.stringify(response.body)}`);
  }
  return response.body.data.chore._id;
}

describe('POST /chores/:id/complete - the spec section 20 flow', () => {
  it('completes the chore, awards XP and updates stats', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const choreId = await seedChore(owner.token, houseId, { assignedTo: member.id, xpReward: 30 });
    const response = await completeChore(houseId, choreId, member.token);

    expect(response.status).toBe(200);
    expect(response.body.data.alreadyCompleted).toBe(false);
    expect(response.body.data.xp.awarded).toBe(30);
    expect(response.body.data.xp.xpBefore).toBe(0);
    expect(response.body.data.xp.xpAfter).toBe(30);
    expect(response.body.data.xp.level).toBe(1);
    expect(response.body.data.chore.status).toBe('completed');

    const user = await User.findById(member.id);
    expect(user.xp).toBe(30);
    expect(user.stats.choresCompleted).toBe(1);
  });

  it('ignores any XP amount sent in the request body', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const choreId = await seedChore(owner.token, houseId, { assignedTo: member.id, xpReward: 20 });

    // A malicious client tries to claim 9999 XP.
    const response = await api()
      .post(`/api/houses/${houseId}/chores/${choreId}/complete`)
      .set(authHeader(member.token))
      .send({ xp: 9999, xpReward: 9999, level: 50 });

    expect(response.status).toBe(200);
    expect(response.body.data.xp.awarded).toBe(20);

    const user = await User.findById(member.id);
    expect(user.xp).toBe(20);
    expect(user.level).toBe(1);
  });

  it('is idempotent - completing twice awards XP only once', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const choreId = await seedChore(owner.token, houseId, { assignedTo: member.id, xpReward: 40 });

    const first = await completeChore(houseId, choreId, member.token);
    const second = await completeChore(houseId, choreId, member.token);

    expect(first.body.data.alreadyCompleted).toBe(false);
    expect(second.status).toBe(200);
    expect(second.body.data.alreadyCompleted).toBe(true);
    expect(second.body.data.xp).toBeNull();

    const user = await User.findById(member.id);
    expect(user.xp).toBe(40);
    expect(user.stats.choresCompleted).toBe(1);
  });

  it('awards XP exactly once under five concurrent completions', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const choreId = await seedChore(owner.token, houseId, { assignedTo: member.id, xpReward: 50 });

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => completeChore(houseId, choreId, member.token)),
    );

    const awarded = responses.filter((response) => response.body.data?.xp?.awarded > 0);
    expect(awarded).toHaveLength(1);
    expect(awarded[0].body.data.xp.awarded).toBe(50);

    // THE IMPORTANT ASSERTION: no matter how many requests raced, XP moved once.
    const user = await User.findById(member.id);
    expect(user.xp).toBe(50);
    expect(user.stats.choresCompleted).toBe(1);
  });

  it('credits the assignee, not the manager who pressed the button', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const choreId = await seedChore(owner.token, houseId, { assignedTo: member.id, xpReward: 40 });
    const response = await completeChore(houseId, choreId, owner.token);

    expect(response.status).toBe(200);

    const assignee = await User.findById(member.id);
    const manager = await User.findById(owner.id);
    expect(assignee.xp).toBe(40);
    expect(manager.xp).toBe(0);
  });

  it('refuses to let a plain member complete someone else\'s chore', async () => {
    const { houseId, members } = await setupHouseWithMembers(3);
    const [owner, member, other] = members;

    const choreId = await seedChore(owner.token, houseId, { assignedTo: member.id, xpReward: 30 });
    const response = await completeChore(houseId, choreId, other.token);

    expect(response.status).toBe(403);
    const chore = await Chore.findById(choreId);
    expect(chore.status).toBe('pending');
    expect(chore.xpAwarded).toBe(false);
  });

  it('levels the member up and reports the new level', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    // 100 XP is exactly the level 2 threshold.
    const choreId = await seedChore(owner.token, houseId, { assignedTo: member.id, xpReward: 100 });
    const response = await completeChore(houseId, choreId, member.token);

    expect(response.body.data.xp.levelledUp).toBe(true);
    expect(response.body.data.unlockedLevel).toBe(2);

    const user = await User.findById(member.id);
    expect(user.level).toBe(2);
    expect(response.body.data.xp.progress.level).toBe(2);
  });

  it('unlocks the First Chore achievement and does not unlock it twice', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const firstChoreId = await seedChore(owner.token, houseId, { assignedTo: member.id, xpReward: 20 });
    const first = await completeChore(houseId, firstChoreId, member.token);

    const codes = first.body.data.newAchievements.map((entry) => entry.code);
    expect(codes).toContain('first-chore');

    const secondChoreId = await seedChore(owner.token, houseId, { assignedTo: member.id, xpReward: 20 });
    const second = await completeChore(houseId, secondChoreId, member.token);

    expect(second.body.data.newAchievements.map((entry) => entry.code)).not.toContain('first-chore');

    const user = await User.findById(member.id);
    expect(user.achievements).toHaveLength(1);
  });

  it('notifies the chore creator when someone else completes it', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const choreId = await seedChore(owner.token, houseId, { assignedTo: member.id, xpReward: 20 });
    await completeChore(houseId, choreId, member.token);

    const notifications = await Notification.find({ user: owner.id });
    expect(notifications.some((entry) => entry.type === 'chore_completed')).toBe(true);
  });
});

describe('chore creation rules', () => {
  it('rejects an XP reward outside the allowlist', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const response = await addChore(owner.token, houseId, {
      title: 'Ridiculous reward',
      assignedTo: member.id,
      dueDate: tomorrow(),
      xpReward: 9999,
    });

    expect(response.status).toBe(422);
    expect(response.body.details?.[0]?.field).toBe('xpReward');
  });

  it('rejects assigning a chore to a non-member', async () => {
    const { houseId, members } = await setupHouseWithMembers(1);
    const stranger = await User.create({ name: 'Stranger', email: 'stranger@example.com', password: 'Password123' });

    const response = await addChore(members[0].token, houseId, {
      title: 'Sneaky',
      assignedTo: String(stranger._id),
      dueDate: tomorrow(),
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/must belong to this house/i);
  });

  it('defaults the XP reward from the priority when none is given', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const high = await addChore(owner.token, houseId, {
      title: 'High priority',
      assignedTo: member.id,
      dueDate: tomorrow(),
      priority: 'high',
    });
    expect(high.body.data.chore.xpReward).toBe(40);

    const low = await addChore(owner.token, houseId, {
      title: 'Low priority',
      assignedTo: member.id,
      dueDate: tomorrow(),
      priority: 'low',
    });
    expect(low.body.data.chore.xpReward).toBe(15);
  });

  it('freezes the XP reward once the chore is completed', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const choreId = await seedChore(owner.token, houseId, { assignedTo: member.id, xpReward: 20 });
    await completeChore(houseId, choreId, member.token);

    const response = await api()
      .patch(`/api/houses/${houseId}/chores/${choreId}`)
      .set(authHeader(owner.token))
      .send({ xpReward: 100 });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/no longer/i);
  });

  it('refuses to complete a chore via the generic update endpoint', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const choreId = await seedChore(owner.token, houseId, { assignedTo: member.id });

    const response = await api()
      .patch(`/api/houses/${houseId}/chores/${choreId}`)
      .set(authHeader(member.token))
      .send({ status: 'completed' });

    expect(response.status).toBe(422);
  });
});

describe('derived status and filtering', () => {
  it('reports a past-due chore as overdue while still storing it as pending', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const choreId = await seedChore(owner.token, houseId, {
      assignedTo: member.id,
      dueDate: yesterday(),
    });

    const stored = await Chore.findById(choreId);
    expect(stored.status).toBe('pending');
    expect(stored.derivedStatus()).toBe('overdue');

    const list = await api().get(`/api/houses/${houseId}/chores`).set(authHeader(owner.token));
    expect(list.body.data[0].derivedStatus).toBe('overdue');
    expect(list.body.data[0].status).toBe('pending');
    expect(list.body.meta.counts.overdue).toBe(1);
  });

  it('filters by derived overdue status', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    await seedChore(owner.token, houseId, { title: 'Late', assignedTo: member.id, dueDate: yesterday() });
    await seedChore(owner.token, houseId, { title: 'Future', assignedTo: member.id, dueDate: tomorrow() });

    const overdue = await api()
      .get(`/api/houses/${houseId}/chores?status=overdue`)
      .set(authHeader(owner.token));

    expect(overdue.body.data).toHaveLength(1);
    expect(overdue.body.data[0].title).toBe('Late');
  });

  it('search matches on the title', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    await seedChore(owner.token, houseId, { title: 'Clean Bathroom', assignedTo: member.id });
    await seedChore(owner.token, houseId, { title: 'Wash Dishes', assignedTo: member.id });

    const response = await api()
      .get(`/api/houses/${houseId}/chores?q=bathroom`)
      .set(authHeader(owner.token));

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe('Clean Bathroom');
  });
});

describe('GET /chores/mine', () => {
  it('groups chores into overdue, today, upcoming and completed', async () => {
    const { houseId, members } = await setupHouseWithMembers(2);
    const [owner, member] = members;

    const startOfToday = new Date();
    startOfToday.setHours(12, 0, 0, 0);

    const overdueId = await seedChore(owner.token, houseId, { title: 'Overdue', assignedTo: member.id, dueDate: yesterday() });
    await seedChore(owner.token, houseId, {
      title: 'Today',
      assignedTo: member.id,
      dueDate: new Date().toISOString(),
    });
    await seedChore(owner.token, houseId, { title: 'Upcoming', assignedTo: member.id, dueDate: tomorrow() });
    const doneId = await seedChore(owner.token, houseId, { title: 'Done', assignedTo: member.id, dueDate: tomorrow() });

    await completeChore(houseId, doneId, member.token);

    const response = await api().get(`/api/houses/${houseId}/chores/mine`).set(authHeader(member.token));

    expect(response.status).toBe(200);
    expect(response.body.data.overdue.map((chore) => chore.title)).toEqual(['Overdue']);
    expect(response.body.data.today.map((chore) => chore.title)).toEqual(['Today']);
    expect(response.body.data.upcoming.map((chore) => chore.title)).toEqual(['Upcoming']);
    expect(response.body.data.completed.map((chore) => chore.title)).toEqual(['Done']);
    expect(response.body.data.counts.total).toBe(4);
    expect(overdueId).toBeTruthy();
  });
});

describe('leaderboard', () => {
  it('ranks by XP and returns roles', async () => {
    const { houseId, members } = await setupHouseWithMembers(3);
    const [owner, member, other] = members;

    // owner: 40 XP, member: 100 XP, other: 0 XP
    const ownerChore = await seedChore(owner.token, houseId, { assignedTo: owner.id, xpReward: 40 });
    await completeChore(houseId, ownerChore, owner.token);

    const memberChore = await seedChore(owner.token, houseId, { assignedTo: member.id, xpReward: 100 });
    await completeChore(houseId, memberChore, member.token);

    const response = await api().get(`/api/houses/${houseId}/leaderboard`).set(authHeader(owner.token));

    expect(response.status).toBe(200);
    const [first, second, third] = response.body.data.entries;
    expect(first._id).toBe(member.id);
    expect(first.rank).toBe(1);
    expect(second._id).toBe(owner.id);
    expect(second.rank).toBe(2);
    expect(third._id).toBe(other.id);
    expect(second.role).toBe('owner');
    expect(third.xp).toBe(0);
    expect(response.body.data.me._id).toBe(owner.id);
  });

  it('gives tied members the same rank', async () => {
    const { houseId, members } = await setupHouseWithMembers(3);
    const [owner, member, other] = members;

    for (const participant of [member, other]) {
      const choreId = await seedChore(owner.token, houseId, { assignedTo: participant.id, xpReward: 20 });
      await completeChore(houseId, choreId, participant.token);
    }

    const response = await api().get(`/api/houses/${houseId}/leaderboard`).set(authHeader(owner.token));
    const tied = response.body.data.entries.filter((entry) => entry.xp === 20);
    expect(tied).toHaveLength(2);
    expect(tied[0].rank).toBe(tied[1].rank);
  });
});

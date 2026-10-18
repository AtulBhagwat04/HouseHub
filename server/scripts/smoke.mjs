/**
 * END-TO-END SMOKE TEST - product spec section 44
 *
 *   npm run smoke
 *
 * Boots the real Express app on an ephemeral port against a scratch database,
 * then walks the entire canonical user journey over HTTP: register, create a
 * house, invite roommates, split a bill, settle up, complete a chore, level up,
 * unlock an achievement. Every financial figure is asserted against the number
 * the spec says it should be.
 *
 * This is the test that would have caught a wrong balance in production.
 */

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.SMOKE_MONGO_URI || 'mongodb://127.0.0.1:27017/househub_smoke';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-secret-0123456789abcdefghijklmnop';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4';
process.env.LOG_LEVEL = 'error';
process.env.EMAIL_DEV_MODE = 'true';
process.env.CLIENT_URL = 'http://localhost:5173';

const mongoose = (await import('mongoose')).default;
const { default: app } = await import('../src/app.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { syncAchievementDefinitions } = await import('../src/services/achievementSeeder.js');
const { formatPaise } = await import('../../shared/money.js');

/* ------------------------------------------------------------- mini runner */

let passed = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function step(label, fn) {
  const padded = label.padEnd(52, '.');
  try {
    await fn();
    passed += 1;
    console.log(`  \u2713 ${padded} ok`);
  } catch (error) {
    failures.push({ label, error });
    console.log(`  \u2717 ${padded} FAILED`);
    console.log(`      ${error.message}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/* --------------------------------------------------------------- http util */

let baseUrl = '';

function createClient(name) {
  let token = null;

  async function call(method, path, body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const payload = await response.json().catch(() => ({}));
    return { status: response.status, body: payload, data: payload.data, meta: payload.meta, message: payload.message };
  }

  return {
    name,
    post: (path, body) => call('POST', path, body),
    get: (path) => call('GET', path),
    patch: (path, body) => call('PATCH', path, body),
    remove: (path) => call('DELETE', path),
    setToken(value) {
      token = value;
    },
    get token() {
      return token;
    },
  };
}

function expectStatus(response, expected, what) {
  assert(
    response.status === expected,
    `${what}: expected HTTP ${expected}, got ${response.status} (${response.message || ''})`,
  );
}

/* -------------------------------------------------------------------- main */

async function main() {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await syncAchievementDefinitions();

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  console.log('\n' + '='.repeat(66));
  console.log('  HOUSEHUB smoke test - the section 44 end-to-end journey');
  console.log(`  ${baseUrl}`);
  console.log('='.repeat(66));

  const atul = createClient('Atul');
  const rahul = createClient('Rahul');
  const aman = createClient('Aman');
  const riya = createClient('Riya');

  let houseId = null;
  let inviteCode = null;
  let choreId = null;
  const ids = {};

  section('1. Accounts and house');

  await step('Atul registers', async () => {
    const response = await atul.post('/auth/register', {
      name: 'Atul',
      email: 'atul@smoke.dev',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    expectStatus(response, 201, 'register');
    atul.setToken(response.data.token);
    ids.atul = response.data.user._id;
  });

  await step('Rejects a duplicate email', async () => {
    const response = await atul.post('/auth/register', {
      name: 'Atul Again',
      email: 'atul@smoke.dev',
      password: 'Password123',
    });
    expectStatus(response, 409, 'duplicate email');
  });

  await step('Rejects a no-token request', async () => {
    const anonymous = createClient('Anonymous');
    const response = await anonymous.get('/auth/me');
    expectStatus(response, 401, 'unauthenticated');
  });

  await step('Atul creates "College Flat"', async () => {
    const response = await atul.post('/houses', {
      name: 'College Flat',
      description: 'Shared apartment near college',
    });
    expectStatus(response, 201, 'create house');
    houseId = response.data.house._id;
    inviteCode = response.data.inviteCode;
    assert(response.data.house.myRole === 'owner', 'the creator should be the OWNER');
    assert(/^HOUSE-[A-Z0-9]{5}$/.test(inviteCode), `invite code should look like HOUSE-7X92A, got ${inviteCode}`);
  });

  for (const [client, email, name] of [
    [rahul, 'rahul@smoke.dev', 'Rahul'],
    [aman, 'aman@smoke.dev', 'Aman'],
    [riya, 'riya@smoke.dev', 'Riya'],
  ]) {
    await step(`${name} registers and joins by invite code`, async () => {
      const registered = await client.post('/auth/register', {
        name,
        email,
        password: 'Password123',
        confirmPassword: 'Password123',
      });
      expectStatus(registered, 201, `${name} register`);
      client.setToken(registered.data.token);
      ids[name.toLowerCase()] = registered.data.user._id;

      // Join via a full invite LINK to prove the parser handles links too.
      const joined = await client.post('/houses/join', { inviteCode: `https://househub.com/join/${inviteCode}` });
      expectStatus(joined, 200, `${name} join`);
      assert(joined.data.house.myRole === 'member', `${name} should be a member`);
    });
  }

  await step('House now has 4 members', async () => {
    const response = await atul.get(`/houses/${houseId}/members`);
    expectStatus(response, 200, 'list members');
    assert(response.data.members.length === 4, `expected 4 members, got ${response.data.members.length}`);
    const owner = response.data.members.find((member) => member.role === 'owner');
    assert(owner?._id === ids.atul, 'Atul should be listed as owner');
  });

  section('2. Expenses, splitting and balances');

  await step('Rahul pays a Rs 4,000 grocery bill for all four', async () => {
    const response = await rahul.post(`/houses/${houseId}/expenses`, {
      title: 'Monthly Groceries',
      amount: 400000, // paise
      category: 'groceries',
      paidBy: ids.rahul,
      splitType: 'equal',
      participants: [ids.atul, ids.rahul, ids.aman, ids.riya].map((user) => ({ user })),
    });
    expectStatus(response, 201, 'add expense');

    const expense = response.data.expense;
    assert(expense.amount === 400000, 'amount should be stored as 400000 paise');
    assert(expense.participants.length === 4, 'four participants expected');
    for (const participant of expense.participants) {
      assert(participant.share === 100000, `every share should be Rs 1,000, got ${formatPaise(participant.share)}`);
    }
  });

  await step('The server rejects a custom split that does not total', async () => {
    const response = await rahul.post(`/houses/${houseId}/expenses`, {
      title: 'Broken split',
      amount: 400000,
      paidBy: ids.rahul,
      splitType: 'custom',
      participants: [
        { user: ids.atul, share: 150000 },
        { user: ids.rahul, share: 100000 },
      ],
    });
    expectStatus(response, 400, 'unbalanced custom split');
  });

  await step('Balances: Atul owes Rahul Rs 1,000', async () => {
    const response = await atul.get(`/houses/${houseId}/balances`);
    expectStatus(response, 200, 'balances');

    const atulNet = response.data.members.find((member) => member._id === ids.atul).net;
    assert(atulNet === -100000, `Atul's net should be -Rs 1,000, got ${formatPaise(atulNet)}`);

    const rahulNet = response.data.members.find((member) => member._id === ids.rahul).net;
    assert(rahulNet === 300000, `Rahul's net should be +Rs 3,000, got ${formatPaise(rahulNet)}`);

    const sum = response.data.members.reduce((total, member) => total + member.net, 0);
    assert(sum === 0, `the ledger must balance to zero, got ${sum}`);
  });

  await step('Dashboard shows Atul owes Rs 1,000 with net -Rs 1,000', async () => {
    const response = await atul.get(`/houses/${houseId}/dashboard`);
    expectStatus(response, 200, 'dashboard');
    const { financials } = response.data;
    assert(financials.totalHouseExpenses === 400000, 'total house expenses should be Rs 4,000');
    assert(financials.youOwe === 100000, `youOwe should be Rs 1,000, got ${formatPaise(financials.youOwe)}`);
    assert(financials.netBalance === -100000, 'net balance should be -Rs 1,000');
  });

  section('3. Settlement');

  let settlementId = null;

  await step('Atul records a Rs 1,000 settlement to Rahul', async () => {
    const response = await atul.post(`/houses/${houseId}/settlements`, {
      from: ids.atul,
      to: ids.rahul,
      amount: 100000,
      note: 'Grocery share',
    });
    expectStatus(response, 201, 'create settlement');
    settlementId = response.data.settlement._id;
    assert(response.data.settlement.status === 'pending', 'a new settlement should be pending');
  });

  await step('A pending settlement does NOT move the ledger', async () => {
    const response = await atul.get(`/houses/${houseId}/balances`);
    const atulNet = response.data.members.find((member) => member._id === ids.atul).net;
    assert(atulNet === -100000, 'Atul should still owe Rs 1,000 while the settlement is pending');
  });

  await step('Atul cannot confirm his own settlement', async () => {
    const response = await atul.post(`/houses/${houseId}/settlements/${settlementId}/confirm`);
    expectStatus(response, 403, 'self-confirmation');
  });

  await step('Rahul confirms it and the debt clears', async () => {
    const confirmed = await rahul.post(`/houses/${houseId}/settlements/${settlementId}/confirm`, {});
    expectStatus(confirmed, 200, 'confirm settlement');
    assert(confirmed.data.settlement.status === 'confirmed', 'status should now be confirmed');

    const balances = await atul.get(`/houses/${houseId}/balances`);
    const atulNet = balances.data.members.find((member) => member._id === ids.atul).net;
    assert(atulNet === 0, `Atul's net should be zero, got ${formatPaise(atulNet)}`);
  });

  section('4. Chores, XP and the leaderboard');

  await step('Atul creates "Clean Kitchen" for Aman (+30 XP)', async () => {
    const response = await atul.post(`/houses/${houseId}/chores`, {
      title: 'Clean Kitchen',
      description: 'Wipe the counters and mop the floor',
      assignedTo: ids.aman,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      priority: 'high',
      xpReward: 30,
    });
    expectStatus(response, 201, 'create chore');
    choreId = response.data.chore._id;
    assert(response.data.chore.xpReward === 30, 'XP reward should be 30');
    assert(response.data.chore.derivedStatus === 'pending', 'a fresh chore should be pending');
  });

  await step('Rejects an XP reward outside the allowlist', async () => {
    const response = await atul.post(`/houses/${houseId}/chores`, {
      title: 'Free XP exploit',
      assignedTo: ids.aman,
      dueDate: new Date().toISOString(),
      xpReward: 9999,
    });
    expectStatus(response, 422, 'bogus XP reward');
  });

  await step('Aman completes the chore and gains 30 XP', async () => {
    const response = await aman.post(`/houses/${houseId}/chores/${choreId}/complete`, {});
    expectStatus(response, 200, 'complete chore');
    assert(response.data.xp.awarded === 30, `expected +30 XP, got ${response.data.xp.awarded}`);
    assert(response.data.xp.xpAfter === 30, 'Aman should be on 30 lifetime XP');
    assert(response.data.chore.status === 'completed', 'the chore should be completed');
  });

  await step('Completing it again awards no further XP (idempotent)', async () => {
    const response = await aman.post(`/houses/${houseId}/chores/${choreId}/complete`, {});
    expectStatus(response, 200, 'second completion');
    assert(response.data.alreadyCompleted === true, 'the second call should report alreadyCompleted');
    assert(response.data.xp === null, 'no XP object should be returned the second time');

    const leaderboard = await aman.get(`/houses/${houseId}/leaderboard`);
    const amanEntry = leaderboard.data.entries.find((entry) => entry._id === ids.aman);
    assert(amanEntry.xp === 30, `Aman's XP must still be 30, got ${amanEntry.xp}`);
  });

  await step('Aman cannot complete someone else\u2019s chore', async () => {
    const created = await atul.post(`/houses/${houseId}/chores`, {
      title: 'Atul\u2019s own task',
      assignedTo: ids.atul,
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
      priority: 'low',
    });
    const response = await aman.post(`/houses/${houseId}/chores/${created.data.chore._id}/complete`, {});
    expectStatus(response, 403, 'completing a foreign chore');
  });

  await step('Aman unlocked the "First Chore" achievement', async () => {
    const response = await aman.get(`/houses/${houseId}/achievements`);
    expectStatus(response, 200, 'achievements');
    const firstChore = response.data.achievements.find((entry) => entry.code === 'first-chore');
    assert(firstChore, 'first-chore should be in the catalogue');
    assert(firstChore.unlocked === true, 'first-chore should be unlocked');
    assert(response.data.unlockedCount === 1, 'exactly one achievement should be unlocked');
  });

  await step('Aman tops the leaderboard', async () => {
    const response = await aman.get(`/houses/${houseId}/leaderboard`);
    expectStatus(response, 200, 'leaderboard');
    assert(response.data.entries[0]._id === ids.aman, 'Aman should be rank 1');
    assert(response.data.entries[0].rank === 1, 'rank should be 1');
    assert(response.data.me._id === ids.aman, 'the leaderboard should mark "me"');
    assert(response.data.entries.length === 4, 'all four members should appear, even at 0 XP');
  });

  await step('Notifies the chore creator that it was completed', async () => {
    const response = await atul.get('/notifications');
    expectStatus(response, 200, 'notifications');
    const matched = response.data.some((entry) => entry.type === 'chore_completed');
    assert(matched, 'Atul should have been notified that the chore was completed');
  });

  section('5. Cross-house isolation (spec section 38)');

  await step('An outsider cannot read this house', async () => {
    const outsider = createClient('Outsider');
    const registered = await outsider.post('/auth/register', {
      name: 'Outsider',
      email: 'outsider@smoke.dev',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    outsider.setToken(registered.data.token);

    for (const path of ['/expenses', '/chores', '/balances', '/dashboard', '/members']) {
      const response = await outsider.get(`/houses/${houseId}${path}`);
      assert(response.status === 403, `GET ${path} should be 403, got ${response.status}`);
    }
  });

  await step('An outsider cannot inject an expense', async () => {
    const outsider = createClient('Outsider2');
    const registered = await outsider.post('/auth/register', {
      name: 'Outsider Two',
      email: 'outsider2@smoke.dev',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    outsider.setToken(registered.data.token);

    const response = await outsider.post(`/houses/${houseId}/expenses`, {
      title: 'Sneaky',
      amount: 100000,
      paidBy: ids.atul,
      participants: [{ user: ids.atul }],
    });
    expectStatus(response, 403, 'foreign expense creation');
  });

  /* ------------------------------------------------------------- teardown */
  const finalDashboard = await atul.get(`/houses/${houseId}/dashboard`);

  section('Summary');
  console.log(`  House expenses : ${formatPaise(finalDashboard.data.financials.totalHouseExpenses)}`);
  console.log(`  Members        : ${finalDashboard.data.members.length}`);
  console.log(`  Open chores    : ${finalDashboard.data.chores.houseOpen}`);
  console.log(`  Leaderboard    : ${finalDashboard.data.leaderboardTop.map((entry) => `${entry.name} ${entry.xp}xp`).join(', ')}`);
  console.log(`\n  ${passed} checks passed, ${failures.length} failed`);

  server.close();
  await mongoose.connection.dropDatabase();
  await disconnectDB();

  if (failures.length > 0) {
    console.log('\n  FAILURES:');
    for (const failure of failures) {
      console.log(`   - ${failure.label}: ${failure.error.message}`);
    }
    console.log('');
    process.exit(1);
  }

  console.log('\n  The section 44 journey works end to end.\n');
  process.exit(0);
}

main().catch(async (error) => {
  console.error('\nSmoke test crashed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

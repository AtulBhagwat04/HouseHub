/**
 * Seeds a realistic demo house so the dashboard, leaderboard, charts and
 * achievement page all have something to show.
 *
 * Re-runnable: any previous demo data is removed first, so running it twice
 * gives you exactly one demo house rather than two.
 *
 *   npm run seed
 */
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import House from '../src/models/House.js';
import Expense from '../src/models/Expense.js';
import Chore from '../src/models/Chore.js';
import Settlement from '../src/models/Settlement.js';
import Activity from '../src/models/Activity.js';
import Notification from '../src/models/Notification.js';
import { syncAchievementDefinitions } from '../src/services/achievementSeeder.js';
import { completeChoreFlow } from '../src/services/choreService.js';
import { recordSettlementResolved, recordSettlementRequested } from '../src/services/settlementService.js';
import { logActivity } from '../src/services/activityService.js';
import { splitExpense } from '../../shared/money.js';
import logger from '../src/utils/logger.js';

const DEMO_PASSWORD = 'Password123';
const DEMO_EMAILS = ['atul@househub.dev', 'rahul@househub.dev', 'aman@househub.dev', 'riya@househub.dev'];

const HOUSE_NAME = 'College Flat';

const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const monthsAgo = (n, day = 8) => {
  const date = new Date();
  date.setMonth(date.getMonth() - n);
  date.setDate(day);
  date.setHours(12, 0, 0, 0);
  return date;
};

async function removePreviousDemoData() {
  const existingUsers = await User.find({ email: { $in: DEMO_EMAILS } }).select('_id house');
  const houseIds = existingUsers.map((user) => user.house).filter(Boolean);
  const alsoHouses = await House.find({ name: HOUSE_NAME }).select('_id');
  for (const house of alsoHouses) houseIds.push(house._id);

  const uniqueHouseIds = [...new Set(houseIds.map(String))];

  if (uniqueHouseIds.length > 0) {
    await Promise.all([
      Expense.deleteMany({ house: { $in: uniqueHouseIds } }),
      Chore.deleteMany({ house: { $in: uniqueHouseIds } }),
      Settlement.deleteMany({ house: { $in: uniqueHouseIds } }),
      Activity.deleteMany({ house: { $in: uniqueHouseIds } }),
      Notification.deleteMany({ house: { $in: uniqueHouseIds } }),
      House.deleteMany({ _id: { $in: uniqueHouseIds } }),
    ]);
    logger.info(`Removed ${uniqueHouseIds.length} previous demo house(s)`);
  }

  if (existingUsers.length > 0) {
    await Notification.deleteMany({ user: { $in: existingUsers.map((user) => user._id) } });
    await User.deleteMany({ email: { $in: DEMO_EMAILS } });
    logger.info(`Removed ${existingUsers.length} previous demo user(s)`);
  }
}

async function main() {
  await connectDB();
  await syncAchievementDefinitions();
  await removePreviousDemoData();

  /* ---------------------------------------------------------------- users */
  const [atul, rahul, aman, riya] = await Promise.all([
    User.create({ name: 'Atul', email: DEMO_EMAILS[0], password: DEMO_PASSWORD }),
    User.create({ name: 'Rahul', email: DEMO_EMAILS[1], password: DEMO_PASSWORD }),
    User.create({ name: 'Aman', email: DEMO_EMAILS[2], password: DEMO_PASSWORD }),
    User.create({ name: 'Riya', email: DEMO_EMAILS[3], password: DEMO_PASSWORD }),
  ]);

  const members = [atul, rahul, aman, riya];
  const memberIds = members.map((user) => user._id);

  /* ---------------------------------------------------------------- house */
  const house = await House.create({
    name: HOUSE_NAME,
    description: 'Shared apartment near college',
    location: 'Pune, Maharashtra',
    owner: atul._id,
    members: [
      { user: atul._id, role: 'owner' },
      { user: rahul._id, role: 'admin' },
      { user: aman._id, role: 'member' },
      { user: riya._id, role: 'member' },
    ],
  });

  await User.updateMany({ _id: { $in: memberIds } }, { $set: { house: house._id } });

  await logActivity({
    houseId: house._id,
    actorId: atul._id,
    type: 'house_created',
    message: `created the house "${house.name}"`,
  });

  /* ------------------------------------------------------------- expenses */
  const expensePlan = [
    { title: 'Monthly Rent', amount: 3200000, category: 'rent', paidBy: atul._id, months: 5, note: 'Five months of rent' },
    { title: 'Weekly Groceries', amount: 480000, category: 'groceries', paidBy: rahul._id, months: 5 },
    { title: 'Electricity Bill', amount: 240000, category: 'electricity', paidBy: rahul._id, months: 4 },
    { title: 'Water Bill', amount: 60000, category: 'water', paidBy: aman._id, months: 4 },
    { title: 'Broadband Recharge', amount: 119900, category: 'internet', paidBy: aman._id, months: 3 },
    { title: 'Cooking Gas Refill', amount: 110000, category: 'gas', paidBy: riya._id, months: 3 },
    { title: 'Weekend Takeaway', amount: 165000, category: 'food', paidBy: riya._id, months: 2 },
    { title: 'Plumber Visit', amount: 85000, category: 'maintenance', paidBy: atul._id, months: 2 },
    { title: 'Airport Cab', amount: 140000, category: 'transportation', paidBy: rahul._id, months: 1 },
    { title: 'Movie Night', amount: 95000, category: 'entertainment', paidBy: aman._id, months: 1 },
    { title: 'Cleaning Supplies', amount: 45000, category: 'groceries', paidBy: riya._id, months: 0, day: 4 },
    { title: 'Electricity Bill', amount: 265000, category: 'electricity', paidBy: atul._id, months: 0, day: 12 },
  ];

  const createdExpenses = [];

  for (const plan of expensePlan) {
    const shares = splitExpense({
      amountPaise: plan.amount,
      splitType: 'equal',
      participants: memberIds.map((user) => ({ user })),
    });

    const expense = await Expense.create({
      house: house._id,
      title: plan.title,
      amount: plan.amount,
      category: plan.category,
      paidBy: plan.paidBy,
      participants: shares,
      splitType: 'equal',
      date: plan.months === 0 ? days(-(plan.day || 2)) : monthsAgo(plan.months, plan.day),
      description: plan.note || '',
      createdBy: plan.paidBy,
    });

    createdExpenses.push(expense);
  }

  // Only the most recent few get a timeline entry, so the feed reads naturally
  // instead of being a wall of 12 identical rows.
  for (const expense of createdExpenses.slice(-4).reverse()) {
    const actor = members.find((user) => String(user._id) === String(expense.paidBy));
    await logActivity({
      houseId: house._id,
      actorId: expense.paidBy,
      type: 'expense_added',
      message: `added ${expense.title}`,
      meta: { expenseId: String(expense._id), amount: expense.amount },
    });
    await Expense.updateOne({ _id: expense._id }, { $set: { updatedBy: null } });
    if (actor) {
      await User.updateOne({ _id: actor._id }, { $inc: { 'stats.expensesAdded': 1 } });
    }
  }

  /* ---------------------------------------------------------------- chores */
  const chorePlan = [
    { title: 'Clean Kitchen', assignedTo: aman._id, dueDate: days(-2), priority: 'high', xpReward: 40, complete: true },
    { title: 'Take Out Trash', assignedTo: riya._id, dueDate: days(-6), priority: 'low', xpReward: 15, complete: true },
    { title: 'Wash Dishes', assignedTo: rahul._id, dueDate: days(-5), priority: 'medium', xpReward: 25, complete: true },
    { title: 'Vacuum Living Room', assignedTo: atul._id, dueDate: days(-4), priority: 'medium', xpReward: 25, complete: true },
    { title: 'Deep Clean Bathroom', assignedTo: aman._id, dueDate: days(-3), priority: 'high', xpReward: 40, complete: true },
    { title: 'Water the Plants', assignedTo: riya._id, dueDate: days(-1), priority: 'low', xpReward: 15, complete: true },
    { title: 'Grocery Run', assignedTo: rahul._id, dueDate: days(-1), priority: 'medium', xpReward: 25, complete: true },
    { title: 'Mop the Balcony', assignedTo: atul._id, dueDate: days(-1), priority: 'low', xpReward: 15, complete: true },
    { title: 'Scrub the Stove', assignedTo: aman._id, dueDate: days(0), priority: 'medium', xpReward: 25, complete: true },
    { title: 'Change Bed Sheets', assignedTo: riya._id, dueDate: days(0), priority: 'low', xpReward: 15, complete: true },

    // Still open - these drive the overdue / today / upcoming buckets.
    { title: 'Clean Bathroom', assignedTo: atul._id, dueDate: days(1), priority: 'medium', xpReward: 25 },
    { title: 'Wash Dishes', assignedTo: atul._id, dueDate: days(0), priority: 'low', xpReward: 15 },
    { title: 'Pay Electricity Bill', assignedTo: rahul._id, dueDate: days(-1), priority: 'high', xpReward: 40 },
    { title: 'Organise the Cupboard', assignedTo: riya._id, dueDate: days(3), priority: 'low', xpReward: 15 },
    { title: 'Buy Dish Soap', assignedTo: aman._id, dueDate: days(2), priority: 'medium', xpReward: 25 },
    { title: 'Fix the Doorbell', assignedTo: atul._id, dueDate: days(5), priority: 'medium', xpReward: 30 },
  ];

  let completedCount = 0;

  for (const plan of chorePlan) {
    const chore = await Chore.create({
      house: house._id,
      title: plan.title,
      description: '',
      assignedTo: plan.assignedTo,
      dueDate: plan.dueDate,
      priority: plan.priority,
      xpReward: plan.xpReward,
      createdBy: atul._id,
    });

    await User.updateOne({ _id: atul._id }, { $inc: { 'stats.choresCreated': 1 } });

    if (plan.complete) {
      // Go through the REAL completion flow so XP, levels, achievements,
      // notifications and the activity feed are all genuinely generated.
      const assignee = members.find((user) => String(user._id) === String(plan.assignedTo));
      await completeChoreFlow({
        house,
        chore,
        actorId: assignee._id,
        houseRole: 'member',
      });
      completedCount += 1;
    }
  }

  /* ----------------------------------------------------------- settlements */
  // One settled debt, and one still waiting for confirmation.
  const settled = await Settlement.create({
    house: house._id,
    from: riya._id,
    to: rahul._id,
    amount: 120000,
    note: 'Share of the electricity bill',
    requestedBy: riya._id,
  });
  settled.status = 'confirmed';
  settled.resolvedBy = rahul._id;
  settled.resolvedAt = new Date();
  await settled.save();
  await recordSettlementResolved({ house, settlement: settled, actorId: rahul._id, status: 'confirmed' });

  await Settlement.create({
    house: house._id,
    from: aman._id,
    to: atul._id,
    amount: 60000,
    note: 'Water bill share',
    requestedBy: aman._id,
  });

  const pending = await Settlement.findOne({ house: house._id, status: 'pending' });
  if (pending) {
    await recordSettlementRequested({ house, settlement: pending, actorId: aman._id });
  }

  /* --------------------------------------------------------------- summary */
  const userSummary = await User.find({ _id: { $in: memberIds } }).select('name xp level stats');

  logger.info('');
  logger.info('='.repeat(62));
  logger.info(`  Demo house ready: "${house.name}"`);
  logger.info(`  Invite code: ${house.inviteCode}`);
  logger.info('='.repeat(62));
  for (const user of userSummary) {
    logger.info(
      `  ${user.name.padEnd(7)} level ${user.level}  ${String(user.xp).padStart(4)} XP  ` +
        `${user.stats.choresCompleted} chores completed`,
    );
  }
  logger.info('-'.repeat(62));
  logger.info(`  ${createdExpenses.length} expenses  |  ${chorePlan.length} chores (${completedCount} completed)`);
  logger.info('');
  logger.info('  Sign in with any of these at http://localhost:5173/login');
  for (const email of DEMO_EMAILS) {
    logger.info(`    ${email.padEnd(24)} ${DEMO_PASSWORD}`);
  }
  logger.info('='.repeat(62));
  logger.info('');

  await disconnectDB();
  process.exit(0);
}

main().catch(async (error) => {
  logger.error('Seed failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

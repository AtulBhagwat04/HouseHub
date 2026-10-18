/**
 * Achievement catalogue. Seeded into MongoDB by scripts/seed.js so the admin
 * area can later flip `isActive` without a deploy.
 *
 * `metric` must match a counter understood by services/gamificationService.js.
 */
export const ACHIEVEMENT_DEFINITIONS = [
  {
    code: 'first-chore',
    name: 'First Chore',
    description: 'Complete your very first chore',
    icon: '\u{1F331}',
    metric: 'choresCompleted',
    target: 1,
    order: 1,
  },
  {
    code: 'bill-starter',
    name: 'Bill Starter',
    description: 'Add your first house expense',
    icon: '\u{1F4B8}',
    metric: 'expensesAdded',
    target: 1,
    order: 2,
  },
  {
    code: 'chore-master',
    name: 'Chore Master',
    description: 'Complete 25 chores',
    icon: '\u{1F9F9}',
    metric: 'choresCompleted',
    target: 25,
    order: 3,
  },
  {
    code: 'house-hero',
    name: 'House Hero',
    description: 'Complete 50 chores',
    icon: '\u{1F3C6}',
    metric: 'choresCompleted',
    target: 50,
    order: 4,
  },
  {
    code: 'settlement-pro',
    name: 'Settlement Pro',
    description: 'Confirm 10 settlements',
    icon: '\u{1F91D}',
    metric: 'settlementsCompleted',
    target: 10,
    order: 5,
  },
  {
    code: 'bill-master',
    name: 'Bill Master',
    description: 'Add 25 expenses to the house',
    icon: '\u{1F4B0}',
    metric: 'expensesAdded',
    target: 25,
    order: 6,
  },
  {
    code: 'taskmaster',
    name: 'Taskmaster',
    description: 'Create 10 chores for the house',
    icon: '\u{1F4CB}',
    metric: 'choresCreated',
    target: 10,
    order: 7,
  },
  {
    code: 'xp-master',
    name: 'XP Master',
    description: 'Earn 1,000 lifetime XP',
    icon: '\u{26A1}',
    metric: 'xp',
    target: 1000,
    order: 8,
  },
  {
    code: 'rising-star',
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: '\u{2B50}',
    metric: 'level',
    target: 5,
    order: 9,
  },
];

export default ACHIEVEMENT_DEFINITIONS;

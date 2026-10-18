/**
 * Shared constants used by both the API server and the React client.
 * Keep this file dependency-free and side-effect-free so it can be imported
 * from Node (ESM), Vite, and Vitest alike.
 */

export const ROLES = ['owner', 'admin', 'member'];

export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent', emoji: '\u{1F3E0}' },
  { value: 'groceries', label: 'Groceries', emoji: '\u{1F6D2}' },
  { value: 'electricity', label: 'Electricity', emoji: '\u{1F4A1}' },
  { value: 'water', label: 'Water', emoji: '\u{1F4A7}' },
  { value: 'internet', label: 'Internet', emoji: '\u{1F4F6}' },
  { value: 'gas', label: 'Gas', emoji: '\u{1F525}' },
  { value: 'food', label: 'Food', emoji: '\u{1F35B}' },
  { value: 'maintenance', label: 'Maintenance', emoji: '\u{1F527}' },
  { value: 'transportation', label: 'Transportation', emoji: '\u{1F697}' },
  { value: 'entertainment', label: 'Entertainment', emoji: '\u{1F3AC}' },
  { value: 'other', label: 'Other', emoji: '\u{1F4E6}' },
];

export const EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value);

/** Tailwind-safe colour tokens per category (used for chips, charts, legends). */
export const CATEGORY_COLORS = {
  rent: '#6366f1',
  groceries: '#10b981',
  electricity: '#f59e0b',
  water: '#06b6d4',
  internet: '#8b5cf6',
  gas: '#ef4444',
  food: '#f97316',
  maintenance: '#64748b',
  transportation: '#0ea5e9',
  entertainment: '#ec4899',
  other: '#94a3b8',
};

export const SPLIT_TYPES = ['equal', 'custom', 'percentage'];

export const SPLIT_TYPE_LABELS = {
  equal: 'Equally',
  custom: 'Custom amounts',
  percentage: 'Percentages',
};

export const CHORE_PRIORITIES = ['low', 'medium', 'high'];

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/** Statuses a user can explicitly set. `overdue` is NEVER stored. */
export const CHORE_STORED_STATUSES = ['pending', 'in_progress', 'completed'];

/** Statuses used for filtering/display, including the derived `overdue`. */
export const CHORE_STATUSES = ['pending', 'in_progress', 'completed', 'overdue'];

export const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
};

/**
 * The only XP values a client is allowed to request when creating a chore.
 * The server validates against this list; XP is never trusted from a request
 * body at completion time.
 */
export const XP_REWARDS = [10, 15, 20, 25, 30, 40, 50, 100];

export const DEFAULT_XP_BY_PRIORITY = {
  low: 15,
  medium: 25,
  high: 40,
};

export const SETTLEMENT_STATUSES = ['pending', 'confirmed', 'rejected'];

export const NOTIFICATION_TYPES = [
  'chore_assigned',
  'chore_completed',
  'chore_overdue',
  'expense_added',
  'settlement_requested',
  'settlement_confirmed',
  'settlement_rejected',
  'settlement_reminder',
  'achievement_unlocked',
  'level_up',
  'member_joined',
];

export const ACTIVITY_TYPES = [
  'house_created',
  'member_joined',
  'member_left',
  'expense_added',
  'expense_updated',
  'expense_deleted',
  'chore_created',
  'chore_completed',
  'settlement_requested',
  'settlement_confirmed',
  'settlement_rejected',
  'achievement_unlocked',
  'level_up',
  'house_updated',
];

export const THEME_OPTIONS = ['light', 'dark', 'system'];

export const HOUSE_NAME_MAX = 60;
export const EXPENSE_TITLE_MAX = 80;
export const CHORE_TITLE_MAX = 80;
export const MAX_PARTICIPANTS = 30;

/** Guard rail: nobody is splitting a 10 crore dinner bill by accident. */
export const MAX_EXPENSE_PAISE = 100_000_000_00; // Rs 10,00,00,000

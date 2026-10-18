import { CATEGORY_COLORS, EXPENSE_CATEGORIES } from '@shared/constants.js';

/**
 * Re-export the shared catalogue so components never hardcode category strings
 * or colour maps that could drift from what the API accepts.
 */
export {
  ROLES,
  ROLE_LABELS,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_VALUES,
  CATEGORY_COLORS,
  SPLIT_TYPES,
  SPLIT_TYPE_LABELS,
  CHORE_PRIORITIES,
  PRIORITY_LABELS,
  CHORE_STATUSES,
  STATUS_LABELS,
  XP_REWARDS,
  DEFAULT_XP_BY_PRIORITY,
  SETTLEMENT_STATUSES,
  THEME_OPTIONS,
} from '@shared/constants.js';

export { xpProgress, xpForLevel, levelFromXp } from '@shared/levels.js';

export { splitExpense, SplitError, distributeEvenly } from '@shared/money.js';

const FALLBACK_CATEGORY = { value: 'other', label: 'Other', emoji: '📦' };

/** Presentation metadata for an expense category, with a safe fallback. */
export function categoryMeta(value) {
  return EXPENSE_CATEGORIES.find((category) => category.value === value) || FALLBACK_CATEGORY;
}

export function categoryColor(value) {
  return CATEGORY_COLORS[value] || CATEGORY_COLORS.other;
}

export function categoryLabel(value) {
  return categoryMeta(value).label;
}

/** Priority presentation. `tone` maps onto the Badge component's variants. */
export const PRIORITY_STYLES = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'warning' },
  high: { label: 'High', tone: 'error' },
};

/** Chore status presentation, including the derived `overdue` state. */
export const STATUS_STYLES = {
  pending: { label: 'Pending', tone: 'neutral' },
  in_progress: { label: 'In Progress', tone: 'primary' },
  completed: { label: 'Completed', tone: 'success' },
  overdue: { label: 'Overdue', tone: 'error' },
};

export const SETTLEMENT_STYLES = {
  pending: { label: 'Pending', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'error' },
};

/** Sorted priority order, highest first - used by filter dropdowns. */
export const PRIORITY_ORDER = ['high', 'medium', 'low'];

export default {
  categoryMeta,
  categoryColor,
  categoryLabel,
  PRIORITY_STYLES,
  STATUS_STYLES,
  SETTLEMENT_STYLES,
};

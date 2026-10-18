import { formatPaise, toPaise, toRupees } from '@shared/money.js';

export { toPaise, toRupees, formatPaise };

/** "₹42,500.00" - the default for anything the user reads as a real amount. */
export function formatCurrency(paise, options = {}) {
  return formatPaise(paise ?? 0, options);
}

/** Compact form for chart axes and dense cards: ₹42.5K, ₹1.2L, ₹3.4Cr. */
export function formatCurrencyCompact(paise) {
  const value = Number(paise) || 0;
  const negative = value < 0;
  const rupees = Math.abs(value) / 100;
  const sign = negative ? '-' : '';

  if (rupees >= 1_00_00_000) return `${sign}₹${(rupees / 1_00_00_000).toFixed(1)}Cr`;
  if (rupees >= 1_00_000) return `${sign}₹${(rupees / 1_00_000).toFixed(1)}L`;
  if (rupees >= 1_000) return `${sign}₹${(rupees / 1_000).toFixed(1)}K`;
  return `${sign}₹${Math.round(rupees)}`;
}

/** Always shows the direction, for balances: "+₹350.00" / "-₹850.00". */
export function formatSignedCurrency(paise) {
  const value = Number(paise) || 0;
  if (value === 0) return formatCurrency(0);
  return `${value > 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`;
}

/** Whole rupees, for inputs and headings where paise are noise. */
export function formatRupees(paise) {
  return formatPaise(paise ?? 0, { decimals: 0 });
}

/**
 * Parses a free-text amount into paise.
 * Returns null for anything that is not a usable positive number, so the
 * caller can block submit rather than silently coercing garbage to 0.
 */
export function parseAmountToPaise(input) {
  if (input === null || input === undefined) return null;
  const cleaned = String(input).replace(/[₹,\s]/g, '');
  if (!cleaned) return null;
  if (!/^\d*\.?\d{0,2}$/.test(cleaned)) return null;

  const rupees = Number(cleaned);
  if (!Number.isFinite(rupees)) return null;

  const paise = Math.round(rupees * 100);
  return paise > 0 ? paise : null;
}

/* ------------------------------------------------------------------ dates */

function asDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const date = asDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', options);
}

export function formatDateTime(value) {
  const date = asDate(value);
  if (!date) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "just now", "12m ago", "3h ago", "2d ago", then an absolute date. */
export function formatRelativeTime(value) {
  const date = asDate(value);
  if (!date) return '—';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`;
  return formatDate(date);
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isToday(value) {
  const date = asDate(value);
  if (!date) return false;
  return startOfDay(date).getTime() === startOfDay(new Date()).getTime();
}

export function isPast(value) {
  const date = asDate(value);
  return date ? date.getTime() < Date.now() : false;
}

/** "Today", "Tomorrow", or a short date - used on chore due dates. */
export function formatDueDate(value) {
  const date = asDate(value);
  if (!date) return 'No due date';

  const today = startOfDay(new Date()).getTime();
  const target = startOfDay(date).getTime();
  const diffDays = Math.round((target - today) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return date.toLocaleDateString('en-IN', { weekday: 'long' });
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return formatDate(date);
}

/** `yyyy-mm-dd` for `<input type="date">`. */
export function toDateInputValue(value) {
  const date = asDate(value) || new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayInputValue() {
  return toDateInputValue(new Date());
}

export function addDaysInputValue(days) {
  return toDateInputValue(new Date(Date.now() + days * 86_400_000));
}

/* ------------------------------------------------------------------ misc */

export function initialsOf(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function pluralise(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function titleCase(value) {
  if (!value) return '';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Percentage as a whole number, guarding divide-by-zero. */
export function percentOf(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

import {
  Activity,
  Bell,
  CheckSquare,
  Home,
  LayoutDashboard,
  ListChecks,
  Receipt,
  Settings,
  Sparkles,
  Trophy,
  Users,
  UserRound,
  Wallet,
  ArrowLeftRight,
  ShieldCheck,
} from 'lucide-react';

/**
 * The whole navigation tree in one place.
 *
 * The sidebar, the mobile bottom bar and the mobile "more" sheet all read from
 * here, so adding a page can never leave one of the three out of date.
 *
 * `primary: true` puts an item in the mobile bottom bar (max 4 - the fifth slot
 * is the "More" button).
 * `managerOnly: true` hides it from plain members (the API enforces this too).
 */
export const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, primary: true, end: true },
      { to: '/activity', label: 'Activity', icon: Activity },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/expenses', label: 'Expenses', icon: Receipt, primary: true },
      { to: '/balances', label: 'Balances', icon: Wallet, primary: true },
      { to: '/settlements', label: 'Settlements', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Chores',
    items: [
      { to: '/chores', label: 'All Chores', icon: CheckSquare, primary: true, end: true },
      { to: '/chores/mine', label: 'My Chores', icon: ListChecks },
    ],
  },
  {
    label: 'House',
    items: [
      { to: '/house', label: 'House Overview', icon: Home, end: true },
      { to: '/house/members', label: 'Members', icon: Users },
      { to: '/house/settings', label: 'House Settings', icon: ShieldCheck, managerOnly: true },
    ],
  },
  {
    label: 'Progress',
    items: [
      { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
      { to: '/achievements', label: 'Achievements', icon: Sparkles },
    ],
  },
  {
    label: 'You',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
      { to: '/profile', label: 'Profile', icon: UserRound },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

/** Flat list, handy for route titles and the "more" sheet. */
export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

export function titleForPath(pathname) {
  const exact = ALL_NAV_ITEMS.find((item) => item.to === pathname);
  if (exact) return exact.label;

  const prefix = ALL_NAV_ITEMS.filter((item) => item.to !== '/' && pathname.startsWith(`${item.to}/`)).sort(
    (a, b) => b.to.length - a.to.length,
  )[0];

  return prefix?.label || 'HOUSEHUB';
}

/** Bottom-bar items: at most four, in nav order. */
export const PRIMARY_NAV_ITEMS = ALL_NAV_ITEMS.filter((item) => item.primary);

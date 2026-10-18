import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Moon, Settings, Sun, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { titleForPath } from './navItems';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import Tooltip from '@/components/ui/Tooltip';

/**
 * Top bar.
 *
 * On phones it carries the menu trigger + brand; from `lg` up it shows the
 * current page title instead. The theme toggle and the account menu are always
 * reachable, which is what keeps the mobile bottom bar free to stay at four
 * destinations.
 *
 * The icon-only controls are wrapped in tooltips so the bar can stay
 * label-free without leaving anything unexplained.
 */
export default function Topbar({ onOpenMenu }) {
  const { user, house, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const nextTheme = resolved === 'dark' ? 'light' : 'dark';

  const menuItems = [
    { label: 'Profile', icon: UserRound, to: '/profile' },
    { label: 'Settings', icon: Settings, to: '/settings' },
    { separator: true },
    { label: `${nextTheme === 'dark' ? 'Dark' : 'Light'} mode`, icon: nextTheme === 'dark' ? Moon : Sun, onClick: toggle },
    { separator: true },
    {
      label: 'Sign out',
      icon: LogOut,
      danger: true,
      onClick: () => {
        logout();
        navigate('/login', { replace: true });
      },
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/70 bg-surface/60 px-3 backdrop-blur-xl sm:px-5">
      <Tooltip content="Menu">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </Tooltip>

      <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
        <span className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-glow-sm">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.6V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.6" />
          </svg>
        </span>
        <span className="font-display text-sm font-extrabold tracking-tight">HOUSEHUB</span>
      </Link>

      <div className="hidden min-w-0 flex-1 lg:block">
        <h1
          key={location.pathname}
          className="animate-fade-in truncate font-display text-base font-semibold text-foreground"
        >
          {titleForPath(location.pathname)}
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5 lg:flex-none">
        {house && (
          <span className="mr-1 hidden max-w-[190px] items-center gap-1.5 rounded-full border border-border bg-surface-muted/60 px-2.5 py-1 text-xs font-medium text-foreground sm:flex">
            <span className="h-1.5 w-1.5 shrink-0 animate-glow-pulse rounded-full bg-success" aria-hidden="true" />
            <span className="truncate">{house.name}</span>
          </span>
        )}

        <Tooltip content={`Switch to ${nextTheme} mode`}>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={`Switch to ${nextTheme} mode`}>
            {resolved === 'dark' ? (
              <Sun style={{ width: 18, height: 18 }} />
            ) : (
              <Moon style={{ width: 18, height: 18 }} />
            )}
          </Button>
        </Tooltip>

        <Tooltip content="Notifications">
          <Link
            to="/notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-surface-muted"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <Bell style={{ width: 18, height: 18 }} />

            {unreadCount > 0 && (
              <span className="tabular absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-white ring-2 ring-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </Tooltip>

        <Dropdown
          align="right"
          width="w-56"
          items={menuItems}
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-transparent p-1 transition hover:border-border hover:bg-surface-muted/70"
              aria-label="Account menu"
            >
              <Avatar src={user?.avatarUrl} name={user?.name} size="sm" />
              <span className="hidden text-sm font-medium text-foreground sm:block">
                {user?.name?.split(' ')[0]}
              </span>
            </button>
          }
        />
      </div>
    </header>
  );
}

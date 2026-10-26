import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Moon, Settings, Sun, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { titleForPath } from './navItems';
import { BrandMark } from './Brand';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import Tooltip from '@/components/ui/Tooltip';

/**
 * Top bar — clean, focused application header.
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
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur-md sm:px-5">
      <Tooltip content="Menu">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </Tooltip>

      <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
        <BrandMark size="sm" />
        <span className="font-display text-sm font-bold tracking-tight text-foreground">HOUSEHUB</span>
      </Link>

      <div className="hidden min-w-0 flex-1 lg:block">
        <h1
          key={location.pathname}
          className="truncate font-display text-sm font-semibold text-foreground"
        >
          {titleForPath(location.pathname)}
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5 lg:flex-none">
        {house && (
          <span className="mr-1 hidden max-w-[200px] items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground sm:flex">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="truncate">{house.name}</span>
          </span>
        )}

        <Tooltip content={`Switch to ${nextTheme} mode`}>
          <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={`Switch to ${nextTheme} mode`}>
            {resolved === 'dark' ? (
              <Sun className="h-4 w-4 text-muted hover:text-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-muted hover:text-foreground" />
            )}
          </Button>
        </Tooltip>

        <Tooltip content="Notifications">
          <Link
            to="/notifications"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <Bell className="h-4 w-4" />

            {unreadCount > 0 && (
              <span className="tabular absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </Tooltip>

        <Dropdown
          align="right"
          width="w-52"
          items={menuItems}
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-transparent p-1 transition hover:border-border hover:bg-surface-muted"
              aria-label="Account menu"
            >
              <Avatar src={user?.avatarUrl} name={user?.name} size="sm" />
              <span className="hidden text-xs font-semibold text-foreground sm:block">
                {user?.name?.split(' ')[0]}
              </span>
            </button>
          }
        />
      </div>
    </header>
  );
}

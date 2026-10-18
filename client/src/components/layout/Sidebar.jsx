import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { NAV_SECTIONS } from './navItems';
import XpBadge from '@/components/ui/XpBadge';
import Avatar from '@/components/ui/Avatar';

/**
 * Desktop sidebar.
 *
 * Fixed width, own scroll region, and the user's XP card pinned to the bottom so
 * progress is ambient rather than something you have to go and look for.
 */
export default function Sidebar() {
  const { user, house, isManager } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-fg shadow-sm">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.6V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.6" />
          </svg>
        </span>

        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-foreground">HOUSEHUB</p>
          <p className="truncate text-2xs text-muted" title={house?.name}>
            {house?.name || 'No house yet'}
          </p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => !item.managerOnly || isManager);
          if (items.length === 0) return null;

          return (
            <div key={section.label} className="mb-5">
              <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-wider text-muted/80">
                {section.label}
              </p>

              <ul className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                          isActive
                            ? 'bg-primary-soft text-primary'
                            : 'text-muted hover:bg-surface-muted hover:text-foreground',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>

                          {item.badge === 'unread' && unreadCount > 0 && (
                            <span className="tabular flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-2xs font-semibold text-white">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}

                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <NavLink
          to="/profile"
          className="block rounded-xl p-2.5 transition hover:bg-surface-muted"
        >
          <div className="flex items-center gap-2.5">
            <Avatar src={user?.avatarUrl} name={user?.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
              <p className="truncate text-xs text-muted">{house?.name || 'No house'}</p>
            </div>
          </div>

          {user && <XpBadge xp={user.xp} level={user.level} className="mt-2.5" />}
        </NavLink>
      </div>
    </aside>
  );
}

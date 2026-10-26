import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { NAV_SECTIONS } from './navItems';
import { BrandMark } from './Brand';
import XpBadge from '@/components/ui/XpBadge';
import Avatar from '@/components/ui/Avatar';

const spring = { type: 'spring', stiffness: 450, damping: 35 };

/**
 * Desktop sidebar — clean, structured, dependable navigation.
 * No neon glows or radioactive drop-shadows.
 */
export default function Sidebar() {
  const { user, house, isManager } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <aside className="relative hidden w-[16rem] shrink-0 flex-col border-r border-border bg-surface lg:flex">
      {/* Brand header */}
      <div className="relative flex h-14 items-center gap-3 border-b border-border px-5">
        <BrandMark size="sm" />
        <div className="min-w-0">
          <p className="font-display text-sm font-bold tracking-tight text-foreground">HOUSEHUB</p>
          <p className="truncate text-2xs text-muted" title={house?.name}>
            {house?.name || 'No house yet'}
          </p>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => !item.managerOnly || isManager);
          if (items.length === 0) return null;

          return (
            <div key={section.label} className="mb-5">
              <p className="mb-1.5 px-3 text-3xs font-semibold uppercase tracking-wider text-muted/70">
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
                          'group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'text-primary font-semibold'
                            : 'text-muted hover:bg-surface-muted hover:text-foreground',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.span
                              layoutId="sidebar-nav-pill"
                              transition={spring}
                              className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20"
                            />
                          )}

                          <item.icon
                            className={cn(
                              'relative h-4 w-4 shrink-0 transition-colors',
                              isActive ? 'text-primary' : 'text-muted group-hover:text-foreground',
                            )}
                            aria-hidden="true"
                          />
                          <span className="relative min-w-0 flex-1 truncate">{item.label}</span>

                          {item.badge === 'unread' && unreadCount > 0 && (
                            <span className="tabular relative flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
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

      {/* User profile card pinned at bottom */}
      <div className="border-t border-border p-3">
        <NavLink
          to="/profile"
          className="block rounded-xl border border-transparent p-2.5 transition-all hover:border-border hover:bg-surface-muted"
        >
          <div className="flex items-center gap-2.5">
            <Avatar src={user?.avatarUrl} name={user?.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{user?.name}</p>
              <p className="truncate text-2xs text-muted">{house?.name || 'No house'}</p>
            </div>
          </div>
          {user && <XpBadge xp={user.xp} level={user.level} className="mt-2.5" />}
        </NavLink>
      </div>
    </aside>
  );
}

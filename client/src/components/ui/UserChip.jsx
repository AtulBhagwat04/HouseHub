import { Link } from 'react-router-dom';
import { Crown, Shield } from 'lucide-react';
import { cn } from '@/lib/cn';
import Avatar from './Avatar';
import { ROLE_LABELS } from '@/lib/catalogue';

/**
 * Avatar + name (+ role), used in tables, member lists and activity feeds.
 * Renders as a link to the member's row on the members page when `linkTo` is set.
 */
export default function UserChip({
  user,
  name,
  avatarUrl,
  role,
  to,
  size = 'sm',
  subtitle,
  className,
  truncate = false,
}) {
  const resolvedName = user?.name ?? name ?? 'Former member';
  const resolvedAvatar = user?.avatarUrl ?? avatarUrl;
  const resolvedRole = user?.role ?? role;
  const resolvedId = user?._id ?? user;

  const body = (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Avatar src={resolvedAvatar} name={resolvedName} size={size} />

      <span className="min-w-0">
        <span className={cn('flex items-center gap-1.5 text-sm font-medium text-foreground', truncate && 'truncate')}>
          {resolvedName}

          {resolvedRole === 'owner' && (
            <Crown className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Owner" />
          )}
          {resolvedRole === 'admin' && (
            <Shield className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Admin" />
          )}
        </span>

        {(subtitle || (resolvedRole && ROLE_LABELS[resolvedRole])) && (
          <span className="block truncate text-xs text-muted">
            {subtitle || ROLE_LABELS[resolvedRole]}
          </span>
        )}
      </span>
    </span>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex max-w-full transition hover:opacity-80">
        {body}
      </Link>
    );
  }

  return <span data-user-id={resolvedId} className="inline-flex max-w-full">{body}</span>;
}

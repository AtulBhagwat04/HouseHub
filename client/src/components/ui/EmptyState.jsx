import { cn } from '@/lib/cn';

/**
 * Empty state.
 *
 * Every list in the app uses this rather than a bare "No data" so the user
 * always gets a next step: an explanation, and usually a button.
 */
export default function EmptyState({
  icon: Icon,
  title = 'Nothing here yet',
  description,
  action,
  className,
  compact = false,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 py-8' : 'gap-3 py-14',
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-surface-muted text-muted',
            compact ? 'h-10 w-10' : 'h-14 w-14',
          )}
        >
          <Icon style={{ width: compact ? 18 : 24, height: compact ? 18 : 24 }} aria-hidden="true" />
        </span>
      )}

      <div className="max-w-sm space-y-1">
        <h3 className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>{title}</h3>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>

      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

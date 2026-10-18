import { cn } from '@/lib/cn';

/**
 * Controlled tab bar.
 *
 * `tabs` is `[{ value, label, icon?, count? }]`. Styling is a segmented control
 * on mobile and an underline row from `sm` up, which keeps eight filter tabs
 * scrollable instead of wrapping into a wall of buttons.
 */
export default function Tabs({ tabs = [], value, onChange, className, variant = 'underline', size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  if (variant === 'pills') {
    return (
      <div
        role="tablist"
        className={cn('scrollbar-none flex gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1', className)}
      >
        {tabs.map((tab) => {
          const active = tab.value === value;
          return (
            <button
              key={tab.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onChange?.(tab.value)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg font-medium transition',
                sizeClasses,
                active ? 'bg-surface text-foreground shadow-card' : 'text-muted hover:text-foreground',
              )}
            >
              {tab.icon && <tab.icon className="h-4 w-4" aria-hidden="true" />}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'tabular rounded-full px-1.5 text-2xs',
                    active ? 'bg-primary-soft text-primary' : 'bg-border/60 text-muted',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={cn('scrollbar-none flex gap-1 overflow-x-auto border-b border-border', className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange?.(tab.value)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium transition',
              sizeClasses,
              active ? 'text-primary' : 'text-muted hover:text-foreground',
            )}
          >
            {tab.icon && <tab.icon className="h-4 w-4" aria-hidden="true" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className="tabular rounded-full bg-surface-muted px-1.5 text-2xs text-muted">{tab.count}</span>
            )}
            {active && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}

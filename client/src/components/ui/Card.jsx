import { cn } from '@/lib/cn';

/**
 * Surface primitives.
 *
 * `Card` is the plain container; `SectionCard` is the one used by almost every
 * page - a titled panel with an optional action on the right (usually a link or
 * "View all" button) so pages don't re-invent their own heading markup.
 */
export function Card({ as: Component = 'div', padded = true, className, children, ...rest }) {
  return (
    <Component
      className={cn('rounded-xl border border-border bg-surface shadow-card', padded && 'p-4 sm:p-5', className)}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ title, description, action, className, children }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionCard({ title, description, action, headerClassName, className, bodyClassName, children }) {
  return (
    <Card className={className}>
      {(title || action) && (
        <CardHeader title={title} description={description} action={action} className={headerClassName} />
      )}
      <div className={cn(title || action ? 'mt-4' : '', bodyClassName)}>{children}</div>
    </Card>
  );
}

export function CardFooter({ className, children }) {
  return (
    <div className={cn('mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4', className)}>
      {children}
    </div>
  );
}

/** A single headline number - the shape used across the dashboard. */
export function StatCard({ label, value, sub, icon: Icon, tone = 'default', className, valueClassName }) {
  const toneClasses = {
    default: 'text-foreground',
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    primary: 'text-primary',
  };

  return (
    <Card className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className={cn('tabular mt-1.5 text-xl font-semibold sm:text-2xl', toneClasses[tone], valueClassName)}>
          {value}
        </p>
        {sub && <p className="mt-1 truncate text-xs text-muted">{sub}</p>}
      </div>

      {Icon && (
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            tone === 'success' && 'bg-success-soft text-success',
            tone === 'error' && 'bg-error-soft text-error',
            tone === 'warning' && 'bg-warning-soft text-warning',
            (tone === 'primary' || tone === 'default') && 'bg-primary-soft text-primary',
          )}
        >
          <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} aria-hidden="true" />
        </span>
      )}
    </Card>
  );
}

export default Card;

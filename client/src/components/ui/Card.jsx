import { cn } from '@/lib/cn';

/**
 * Surface primitives.
 *
 * `Card` is the plain container; `SectionCard` is the one used by almost every
 * page - a titled panel with an optional action on the right (usually a link or
 * "View all" button) so pages don't re-invent their own heading markup.
 *
 * The `card` class (see index.css) supplies the translucent surface and the
 * hairline highlight, so the glass treatment is defined once rather than
 * repeated in every component.
 */
export function Card({ as: Component = 'div', padded = true, className, children, ...rest }) {
  return (
    <Component className={cn('card', padded && 'p-4 sm:p-5', className)} {...rest}>
      {children}
    </Component>
  );
}

export function CardHeader({ title, description, action, className, children }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {title && <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>}
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

/**
 * A single headline number - the shape used across the dashboard.
 *
 * The icon sits in a tinted tile and a soft radial glow bleeds out of the top
 * right corner, which is what stops a row of four stat cards from reading as a
 * spreadsheet.
 */
export function StatCard({ label, value, sub, icon: Icon, tone = 'default', className, valueClassName }) {
  const toneClasses = {
    default: 'text-foreground',
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    primary: 'text-primary',
  };

  const iconTone = {
    default: 'bg-primary-soft text-primary',
    primary: 'bg-primary-soft text-primary',
    success: 'bg-success-soft text-success',
    error: 'bg-error-soft text-error',
    warning: 'bg-warning-soft text-warning',
  }[tone];

  const glowTone = {
    default: 'bg-primary/20',
    primary: 'bg-primary/20',
    success: 'bg-success/20',
    error: 'bg-error/20',
    warning: 'bg-warning/20',
  }[tone];

  return (
    <Card className={cn('group overflow-hidden', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full blur-2xl transition-opacity duration-500',
          'opacity-60 group-hover:opacity-100',
          glowTone,
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
          <p
            className={cn(
              'tabular mt-2 font-display text-2xl font-semibold leading-none sm:text-[1.75rem]',
              toneClasses[tone],
              valueClassName,
            )}
          >
            {value}
          </p>
          {sub && <p className="mt-1.5 truncate text-xs text-muted">{sub}</p>}
        </div>

        {Icon && (
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
              iconTone,
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        )}
      </div>
    </Card>
  );
}

export default Card;

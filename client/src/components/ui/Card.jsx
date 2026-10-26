import { cn } from '@/lib/cn';

/**
 * Surface primitives — solid, tactile, dependable cards.
 * No neon aurora or blurry glass highlights.
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
        {title && <h2 className="font-display text-sm font-semibold text-foreground sm:text-base">{title}</h2>}
        {description && <p className="mt-0.5 text-xs text-muted sm:text-sm">{description}</p>}
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
 * A clean, crisp metric card.
 * High clarity, balanced typography, and tasteful icons — no neon glow blur blobs.
 */
export function StatCard({ label, value, sub, icon: Icon, tone = 'default', className, valueClassName }) {
  const toneClasses = {
    default: 'text-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-rose-600 dark:text-rose-400',
    warning: 'text-amber-600 dark:text-amber-400',
    primary: 'text-primary',
  };

  const iconTone = {
    default: 'bg-surface-muted text-muted',
    primary: 'bg-primary-soft text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    error: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  }[tone];

  return (
    <Card className={cn('group transition-all hover:border-border/80', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted">{label}</p>
          <p
            className={cn(
              'tabular mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-[1.65rem]',
              toneClasses[tone],
              valueClassName,
            )}
          >
            {value}
          </p>
          {sub && <p className="mt-1 truncate text-xs text-muted">{sub}</p>}
        </div>

        {Icon && (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 transition-transform group-hover:scale-105',
              iconTone,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </Card>
  );
}

export default Card;

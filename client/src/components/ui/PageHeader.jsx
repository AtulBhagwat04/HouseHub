import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Consistent page heading: breadcrumb, title, description, actions.
 * Sticky on mobile so the primary action stays reachable while scrolling a list.
 */
export default function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  backTo,
  className,
  children,
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3 opacity-60" aria-hidden="true" />}
              {crumb.to && index < breadcrumbs.length - 1 ? (
                <Link to={crumb.to} className="transition hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {backTo && (
            <Link
              to={backTo}
              className="mb-1 inline-flex items-center gap-1 text-xs text-muted transition hover:text-foreground"
            >
              <ChevronRight className="h-3 w-3 rotate-180" aria-hidden="true" />
              Back
            </Link>
          )}

          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          {children}
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

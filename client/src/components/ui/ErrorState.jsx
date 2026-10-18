import { RefreshCw, ServerCrash, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from './Button';

/**
 * Failure state for a failed fetch.
 *
 * Shows the server's own human-readable message. 403 and 404 get a distinct
 * treatment so it is obvious that retrying will not help.
 */
export default function ErrorState({ error, onRetry, className, title }) {
  const status = error?.status;
  const isPermission = status === 403 || status === 401;
  const isMissing = status === 404;

  const Icon = isPermission ? ShieldAlert : ServerCrash;

  const heading =
    title ||
    (isPermission
      ? 'You do not have access to this'
      : isMissing
        ? 'We could not find that'
        : 'Something went wrong');

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <span
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full',
          isPermission ? 'bg-warning-soft text-warning' : 'bg-error-soft text-error',
        )}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>

      <div className="max-w-sm space-y-1">
        <h3 className="font-semibold text-foreground">{heading}</h3>
        <p className="text-sm text-muted">
          {error?.message || 'The request could not be completed. Please try again.'}
        </p>
      </div>

      {onRetry && !isPermission && (
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

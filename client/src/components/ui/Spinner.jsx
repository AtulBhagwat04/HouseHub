import { cn } from '@/lib/cn';

const SIZES = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-9 w-9',
};

const RING = {
  xs: 'border-[1.5px]',
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-[3px]',
};

/** Gradient ring spinner - two stacked borders with only the top edge lit. */
export function Spinner({ size = 'md', className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('relative inline-flex shrink-0', SIZES[size], className)}
    >
      <span className={cn('absolute inset-0 rounded-full border-primary/20', RING[size])} />
      <span
        className={cn(
          'absolute inset-0 animate-spin rounded-full border-transparent border-t-primary border-r-primary/60',
          RING[size],
        )}
      />
    </span>
  );
}

/** Centred spinner with optional caption - the default page/section loading state. */
export function LoadingState({ message = 'Loading...', className, minHeight = 'min-h-[200px]' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-muted', minHeight, className)}>
      <Spinner />
      <p className="text-sm">{message}</p>
    </div>
  );
}

/** Inline spinner + text, for buttons and small areas. */
export function InlineLoading({ message = 'Loading...', className }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm text-muted', className)}>
      <Spinner size="sm" />
      {message}
    </span>
  );
}

export default Spinner;

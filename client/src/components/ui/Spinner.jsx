import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const SIZES = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-9 w-9',
};

export function Spinner({ size = 'md', className }) {
  return <Loader2 className={cn('animate-spin text-primary', SIZES[size], className)} aria-hidden="true" />;
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

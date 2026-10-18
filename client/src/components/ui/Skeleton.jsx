import { cn } from '@/lib/cn';

/**
 * Shimmering placeholder block. The shimmer animation lives in index.css so a
 * column of skeletons animates in sync instead of each one restarting.
 */
export function Skeleton({ className, rounded = 'rounded-md' }) {
  return <div className={cn('skeleton', rounded, className)} aria-hidden="true" />;
}

/** Common "list of rows" placeholder. */
export function SkeletonList({ rows = 4, className }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" rounded="rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-16" rounded="rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder grid matching the dashboard's card rows. */
export function SkeletonCards({ count = 4, className }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-surface p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;

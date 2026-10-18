import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from './Button';
import { pluralise } from '@/lib/format';

/**
 * Compact pagination.
 *
 * On phones it collapses to "Page 2 of 7" with prev/next, because a row of ten
 * tappable page numbers is unusable at that width.
 */
export default function Pagination({ meta, onChange, className, itemLabel = 'item' }) {
  if (!meta) return null;

  const { page = 1, pages = 1, total = 0, hasNextPage, hasPrevPage } = meta;
  if (pages <= 1 && total <= (meta.limit || 20)) return null;

  const go = (nextPage) => {
    if (nextPage < 1 || nextPage > pages || nextPage === page) return;
    onChange?.(nextPage);
  };

  const windowPages = [];
  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const to = Math.min(pages, Math.max(page + 2, 5));
  for (let index = from; index <= to; index += 1) windowPages.push(index);

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-xs text-muted">
        {pluralise(total, itemLabel)} &middot; page {page} of {pages}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => go(page - 1)}
          disabled={!hasPrevPage && page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="hidden items-center gap-1 sm:flex">
          {from > 1 && <span className="px-1 text-xs text-muted">...</span>}

          {windowPages.map((entry) => (
            <Button
              key={entry}
              variant={entry === page ? 'primary' : 'ghost'}
              size="icon-sm"
              onClick={() => go(entry)}
              aria-current={entry === page ? 'page' : undefined}
              className="tabular"
            >
              {entry}
            </Button>
          ))}

          {to < pages && <span className="px-1 text-xs text-muted">...</span>}
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => go(page + 1)}
          disabled={!hasNextPage && page >= pages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

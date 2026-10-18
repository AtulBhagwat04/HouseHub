import { cn } from '@/lib/cn';
import { SkeletonList } from './Skeleton';

/* -------------------------------------------------------------------------- */
/* Primitive table pieces, for the rare page that needs full control.          */
/* -------------------------------------------------------------------------- */

export function Table({ className, children }) {
  return (
    <div className="scrollbar-thin w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)}>{children}</table>
    </div>
  );
}

export function THead({ children, className }) {
  return <thead className={cn('border-b border-border', className)}>{children}</thead>;
}

export function TBody({ children, className }) {
  return <tbody className={cn('divide-y divide-border/70', className)}>{children}</tbody>;
}

export function TR({ className, children, ...rest }) {
  return (
    <tr className={className} {...rest}>
      {children}
    </tr>
  );
}

export function TH({ align = 'left', className, children }) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-3 py-3 text-2xs font-semibold uppercase tracking-[0.08em] text-muted',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TD({ align = 'left', className, children }) {
  return (
    <td
      className={cn(
        'px-3 py-3.5 align-middle text-foreground',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

/**
 * Data-driven table that is genuinely usable on a phone.
 *
 * One column is nominated as `mobilePrimary`; on small screens each row becomes
 * a card led by that cell, with the remaining columns rendered as label/value
 * pairs. Columns marked `mobileTrailing` sit top-right of the card (statuses,
 * amounts), and `mobileHidden` columns are dropped entirely.
 *
 * This exists so list pages don't have to maintain two separate markups - the
 * desktop table and the mobile card list - which is where they always drift.
 */
export default function DataTable({
  columns = [],
  rows = [],
  getRowKey = (row, index) => row?._id || index,
  onRowClick,
  loading = false,
  emptyState = null,
  className,
  rowClassName,
  footnote,
}) {
  if (loading) {
    return (
      <div className={cn('py-2', className)}>
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <div className={className}>{emptyState}</div>;
  }

  const primaryColumn = columns.find((column) => column.mobilePrimary) || columns[0];
  const trailingColumn = columns.find((column) => column.mobileTrailing);
  const detailColumns = columns.filter(
    (column) => column !== primaryColumn && column !== trailingColumn && !column.mobileHidden,
  );

  return (
    <div className={className}>
      {/* Desktop ---------------------------------------------------------- */}
      <div className="scrollbar-thin hidden w-full overflow-x-auto sm:block">
        <table className="w-full border-collapse text-sm">
          <THead>
            <TR>
              {columns.map((column) => (
                <TH key={column.key} align={column.align} className={cn(column.hideBelow && 'hidden lg:table-cell', column.headerClassName)}>
                  {column.header}
                </TH>
              ))}
            </TR>
          </THead>

          <TBody>
            {rows.map((row, index) => (
              <TR
                key={getRowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'transition-colors hover:bg-primary/[0.04]',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(row),
                )}
              >
                {columns.map((column) => (
                  <TD
                    key={column.key}
                    align={column.align}
                    className={cn(column.hideBelow && 'hidden lg:table-cell', column.className)}
                  >
                    {column.cell(row, index)}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </table>
      </div>

      {/* Mobile ----------------------------------------------------------- */}
      <ul className="flex flex-col gap-2.5 sm:hidden">
        {rows.map((row, index) => (
          <li key={getRowKey(row, index)}>
            <div
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'card p-4',
                onRowClick && 'cursor-pointer transition-colors active:bg-surface-muted/60',
                rowClassName?.(row),
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">{primaryColumn.cell(row, index)}</div>
                {trailingColumn && <div className="shrink-0 text-right">{trailingColumn.cell(row, index)}</div>}
              </div>

              {detailColumns.length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3">
                  {detailColumns.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-2xs font-medium uppercase tracking-[0.08em] text-muted">
                        {column.mobileLabel || column.header}
                      </dt>
                      <dd className={cn('mt-0.5 truncate text-sm text-foreground')}>{column.cell(row, index)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </li>
        ))}
      </ul>

      {footnote && <div className="mt-3 text-xs text-muted">{footnote}</div>}
    </div>
  );
}

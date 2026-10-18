import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useClickOutside } from '@/hooks';

/**
 * Click-to-open menu, used for row actions and the account menu.
 *
 * Items are either `{ label, icon, onClick }`, `{ label, icon, to }` for a router
 * link, or `{ separator: true }`. Items marked `danger` render in red and the
 * whole menu auto-closes after a click.
 */
export default function Dropdown({
  trigger,
  items = [],
  align = 'right',
  width = 'w-52',
  className,
  panelClassName,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(close);

  const alignment = {
    left: 'left-0',
    right: 'right-0',
  }[align] || 'right-0';

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div
        onClick={() => {
          if (!disabled) setOpen((value) => !value);
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-disabled={disabled || undefined}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!disabled) setOpen((value) => !value);
          }
        }}
        className={cn('inline-flex cursor-pointer', disabled && 'cursor-not-allowed opacity-50')}
      >
        {typeof trigger === 'function' ? trigger({ open }) : trigger}
      </div>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-40 mt-1.5 origin-top animate-slide-up overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-pop',
            alignment,
            width,
            panelClassName,
          )}
        >
          {items.map((item, index) => {
            if (item.separator) {
              return <div key={`sep-${index}`} className="my-1 h-px bg-border" />;
            }

            const itemClasses = cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition',
              item.danger
                ? 'text-error hover:bg-error-soft'
                : 'text-foreground hover:bg-surface-muted',
              item.disabled && 'pointer-events-none opacity-50',
            );

            const content = (
              <>
                {item.icon && <item.icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="shrink-0 text-xs text-muted">{item.hint}</span>}
              </>
            );

            if (item.to) {
              return (
                <Link key={item.label} to={item.to} className={itemClasses} role="menuitem" onClick={close}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={itemClasses}
                onClick={() => {
                  close();
                  item.onClick?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

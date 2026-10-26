import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * Click-to-open menu, used for row actions and the account menu.
 *
 * Items are either `{ label, icon, onClick }`, `{ label, icon, to }` for a router
 * link, or `{ separator: true }`. Items marked `danger` render in red and the
 * whole menu auto-closes after a click.
 *
 * Backed by Radix DropdownMenu so roving focus, type-ahead, Escape and
 * click-outside are handled by the primitive. Animation uses Radix's own
 * `data-state` attribute, which means there is no exit-animation bookkeeping to
 * get wrong.
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

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild disabled={disabled} className={className}>
        {typeof trigger === 'function' ? trigger({ open }) : trigger}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align === 'left' ? 'start' : 'end'}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            'z-50 origin-top animate-pop-in overflow-hidden rounded-xl border border-border p-1 shadow-dropdown',
            'bg-surface',
            width,
            panelClassName,
          )}
        >
          {items.map((item, index) => {
            if (item.separator) {
              return <DropdownMenu.Separator key={`sep-${index}`} className="my-1.5 h-px bg-border" />;
            }

            const itemClasses = cn(
              'flex w-full cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm outline-none transition',
              item.danger
                ? 'text-error data-[highlighted]:bg-error-soft'
                : 'text-foreground data-[highlighted]:bg-surface-muted',
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
                <DropdownMenu.Item key={item.label} asChild disabled={item.disabled}>
                  <Link to={item.to} className={itemClasses}>
                    {content}
                  </Link>
                </DropdownMenu.Item>
              );
            }

            return (
              <DropdownMenu.Item
                key={item.label}
                disabled={item.disabled}
                className={itemClasses}
                onSelect={() => item.onClick?.()}
              >
                {content}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from './Button';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Modal dialog rendered into a portal.
 *
 * Handles the things that are easy to forget: Escape to close, background
 * scroll lock, focus moved into the dialog on open and restored on close, and a
 * simple Tab cycle so keyboard users cannot tab out into the page behind.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer = null,
  children,
  closeOnBackdrop = true,
  showClose = true,
  className,
}) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the first control after paint so the dialog is immediately usable.
    const timer = setTimeout(() => {
      const target = panelRef.current?.querySelector(
        'input:not([type="hidden"]), textarea, select, button:not([data-modal-close])',
      );
      (target || panelRef.current)?.focus();
    }, 0);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full animate-slide-up rounded-t-2xl border border-border bg-surface shadow-pop sm:animate-pop-in sm:rounded-2xl',
          SIZES[size] || SIZES.md,
          className,
        )}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>}
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>

            {showClose && (
              <Button
                variant="ghost"
                size="icon-sm"
                data-modal-close
                onClick={onClose}
                aria-label="Close dialog"
                className="-mr-1 -mt-1 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-5">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4 sm:p-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

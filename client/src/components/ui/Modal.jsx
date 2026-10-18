import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
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
 * Modal dialog.
 *
 * Built on Radix Dialog rather than a hand-rolled portal: focus trapping, focus
 * restore, `aria-modal`, scroll locking and the Escape handling all come from the
 * primitive and stay correct. The only thing layered on top is the animation.
 *
 * The panel is wrapped in a fixed positioning container instead of using
 * `-translate-x-1/2` utilities, because Framer Motion writes `transform` inline
 * and would otherwise clobber the centering.
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
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? undefined : onClose?.())}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md"
              />
            </DialogPrimitive.Overlay>

            {/* Positioning shell: bottom sheet on phones, centred card from sm up. */}
            <div className="scrollbar-thin fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
              <DialogPrimitive.Content
                asChild
                forceMount
                onEscapeKeyDown={(event) => {
                  if (!closeOnBackdrop) event.preventDefault();
                }}
                onPointerDownOutside={(event) => {
                  if (!closeOnBackdrop) event.preventDefault();
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 28, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.7 }}
                  className={cn(
                    'card relative w-full overflow-hidden rounded-b-none rounded-t-3xl border-border shadow-pop sm:rounded-3xl',
                    SIZES[size] || SIZES.md,
                    className,
                  )}
                >
                  {(title || showClose) && (
                    <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
                      <div className="min-w-0">
                        {title ? (
                          <DialogPrimitive.Title className="font-display text-base font-semibold text-foreground sm:text-lg">
                            {title}
                          </DialogPrimitive.Title>
                        ) : (
                          <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title>
                        )}

                        {description ? (
                          <DialogPrimitive.Description className="mt-1 text-sm text-muted">
                            {description}
                          </DialogPrimitive.Description>
                        ) : null}
                      </div>

                      {showClose && (
                        <DialogPrimitive.Close asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            data-modal-close
                            aria-label="Close dialog"
                            className="-mr-1 -mt-1 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </DialogPrimitive.Close>
                      )}
                    </div>
                  )}

                  <div className="scrollbar-thin max-h-[70vh] overflow-y-auto p-4 sm:p-5">{children}</div>

                  {footer && (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-muted/40 p-4 sm:p-5">
                      {footer}
                    </div>
                  )}
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

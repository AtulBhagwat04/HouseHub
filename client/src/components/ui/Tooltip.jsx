import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/cn';

/**
 * Small hover/focus label.
 *
 * Used to replace visible helper text around icon-only controls, so the shell can
 * stay text-light without leaving buttons unexplained.
 *
 * Renders its child untouched when there is no `content`, which lets callers pass
 * a tooltip unconditionally in a responsive layout.
 */
export default function Tooltip({ content, children, side = 'top', align = 'center', delay = 150, className }) {
  if (!content) return children;

  return (
    <TooltipPrimitive.Provider delayDuration={delay} skipDelayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={7}
            className={cn(
              'z-[70] animate-pop-in rounded-xl border border-border bg-surface-raised/95 px-2.5 py-1.5',
              'text-xs font-medium text-foreground shadow-pop backdrop-blur-xl',
              className,
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-surface-raised" width={11} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

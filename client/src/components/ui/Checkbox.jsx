import { forwardRef, useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Checkbox with a real input underneath (so it stays keyboard- and
 * screen-reader-friendly) plus a styled box on top.
 *
 * `variant="switch"` renders the same control as a toggle. It is still a native
 * checkbox, which is why callers keep using `onChange` with
 * `event.target.checked` in either variant - no API split to remember.
 */
const Checkbox = forwardRef(function Checkbox(
  {
    id,
    label,
    description,
    error,
    variant = 'checkbox',
    className,
    containerClassName,
    disabled,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id || autoId;
  const isSwitch = variant === 'switch';

  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      <label
        htmlFor={fieldId}
        className={cn(
          'group flex cursor-pointer items-start gap-3 select-none',
          isSwitch && 'items-center justify-between',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
      >
        {/* Text first for the switch so the track sits on the trailing edge. */}
        {isSwitch ? (
          <>
            {(label || description) && (
              <span className="min-w-0">
                {label && <span className="block text-sm font-medium text-foreground">{label}</span>}
                {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
              </span>
            )}

            <span className="relative flex h-6 w-11 shrink-0 items-center">
              <input
                ref={ref}
                id={fieldId}
                type="checkbox"
                role="switch"
                disabled={disabled}
                className="peer h-6 w-11 cursor-pointer appearance-none rounded-full border border-border bg-surface-muted transition
                  checked:border-transparent checked:bg-primary
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                  disabled:cursor-not-allowed"
                {...rest}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-swift peer-checked:translate-x-5"
              />
            </span>
          </>
        ) : (
          <>
            <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
              <input
                ref={ref}
                id={fieldId}
                type="checkbox"
                disabled={disabled}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-[7px] border border-border bg-surface transition checked:border-transparent checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"
                {...rest}
              />
              <Check
                className="pointer-events-none absolute h-3.5 w-3.5 scale-50 text-white opacity-0 transition duration-150 peer-checked:scale-100 peer-checked:opacity-100"
                aria-hidden="true"
              />
            </span>

            {(label || description) && (
              <span className="min-w-0">
                {label && <span className="block text-sm text-foreground">{label}</span>}
                {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
              </span>
            )}
          </>
        )}
      </label>

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
});

export default Checkbox;

import { forwardRef, useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Checkbox with a real input underneath (so it stays keyboard- and
 * screen-reader-friendly) plus a styled box on top.
 */
const Checkbox = forwardRef(function Checkbox(
  { id, label, description, error, className, containerClassName, disabled, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      <label
        htmlFor={fieldId}
        className={cn(
          'group flex cursor-pointer items-start gap-2.5 select-none',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
      >
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            disabled={disabled}
            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-border bg-surface transition checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"
            {...rest}
          />
          <Check
            className="pointer-events-none absolute h-3.5 w-3.5 text-primary-fg opacity-0 transition peer-checked:opacity-100"
            aria-hidden="true"
          />
        </span>

        {(label || description) && (
          <span className="min-w-0">
            {label && <span className="block text-sm text-foreground">{label}</span>}
            {description && <span className="block text-xs text-muted">{description}</span>}
          </span>
        )}
      </label>

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
});

export default Checkbox;

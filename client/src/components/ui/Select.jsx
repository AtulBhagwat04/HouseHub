import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import FormField, { controlClasses } from './FormField';

/**
 * Native <select>.
 *
 * Deliberately not a custom listbox: the native control brings keyboard
 * navigation, type-ahead and the OS mobile picker for free, which matters far
 * more here than pixel-perfect styling.
 *
 * `options` is `[{ value, label, disabled? }]`; `children` can be passed instead
 * for grouped options.
 */
const Select = forwardRef(function Select(
  {
    id,
    label,
    error,
    hint,
    required,
    options = [],
    placeholder,
    className,
    containerClassName,
    size = 'md',
    children,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id || autoId;
  const sizeClasses = size === 'lg' ? 'h-12 text-base' : size === 'sm' ? 'h-9 text-sm' : 'h-11';

  return (
    <FormField
      label={label}
      htmlFor={fieldId}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <div className="relative flex items-center">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(
            controlClasses({ error }),
            sizeClasses,
            'cursor-pointer appearance-none pr-10 font-medium',
            className,
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
          {children}
        </select>

        <span className="pointer-events-none absolute right-3 flex h-6 w-6 items-center justify-center rounded-md bg-surface-muted text-muted">
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </FormField>
  );
});

export default Select;

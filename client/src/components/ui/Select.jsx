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
  const sizeClasses = size === 'lg' ? 'h-11 text-base' : size === 'sm' ? 'h-9 text-sm' : '';

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
            'cursor-pointer appearance-none pr-9',
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

        <ChevronDown
          className="pointer-events-none absolute right-3 h-4 w-4 text-muted"
          aria-hidden="true"
        />
      </div>
    </FormField>
  );
});

export default Select;

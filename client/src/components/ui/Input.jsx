import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';
import FormField, { controlClasses } from './FormField';

/**
 * Text input with optional leading icon, prefix/suffix slots, and built-in
 * label/error plumbing. `prefix` is used heavily by money fields to pin the
 * rupee sign inside the control rather than beside it.
 */
const Input = forwardRef(function Input(
  {
    id,
    label,
    error,
    hint,
    required,
    icon: Icon = null,
    prefix = null,
    suffix = null,
    className,
    containerClassName,
    inputClassName,
    size = 'md',
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
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 h-4 w-4 text-muted"
            aria-hidden="true"
          />
        )}

        {prefix && (
          <span className="pointer-events-none absolute left-3 text-sm font-medium text-muted">
            {prefix}
          </span>
        )}

        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(
            controlClasses({ error }),
            Icon || prefix ? 'pl-9' : null,
            suffix ? 'pr-12' : null,
            sizeClasses,
            inputClassName,
            className,
          )}
          {...rest}
        />

        {suffix && (
          <span className="pointer-events-none absolute right-3 text-sm text-muted">{suffix}</span>
        )}
      </div>
    </FormField>
  );
});

export default Input;

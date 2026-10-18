import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';
import FormField, { controlClasses } from './FormField';

const Textarea = forwardRef(function Textarea(
  { id, label, error, hint, required, rows = 3, className, containerClassName, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <FormField
      label={label}
      htmlFor={fieldId}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(controlClasses({ error }), 'resize-y leading-relaxed', className)}
        {...rest}
      />
    </FormField>
  );
});

export default Textarea;

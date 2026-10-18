import { cn } from '@/lib/cn';

/**
 * Label + control + hint/error wrapper.
 *
 * Every form control in the app sits inside one of these so labels, required
 * markers, help text and validation errors always line up the same way. The
 * error text is wired to the control with `aria-describedby`.
 */
export default function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  className,
  children,
}) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {required && (
            <span className="ml-0.5 text-error" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {children}

      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}

      {describedBy ? null : null}
    </div>
  );
}

/** Shared by Input/Select/Textarea so every control has the same border/error look. */
export function controlClasses({ error, className } = {}) {
  return cn(
    'input-base',
    error && 'border-error focus:border-error focus:ring-error/25',
    className,
  );
}

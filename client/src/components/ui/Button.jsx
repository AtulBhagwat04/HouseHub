import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const VARIANTS = {
  primary:
    'bg-primary text-primary-fg hover:bg-primary/90 active:bg-primary/95 shadow-sm',
  secondary:
    'bg-secondary text-white hover:bg-secondary/90 active:bg-secondary/95 shadow-sm',
  outline:
    'border border-border bg-surface text-foreground hover:bg-surface-muted active:bg-surface-muted/70',
  ghost: 'text-foreground hover:bg-surface-muted active:bg-surface-muted/70',
  subtle: 'bg-primary-soft text-primary hover:bg-primary-soft/70',
  danger: 'bg-error text-white hover:bg-error/90 active:bg-error/95 shadow-sm',
  success: 'bg-success text-white hover:bg-success/90 active:bg-success/95 shadow-sm',
  link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
};

const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-lg',
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-base gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
  'icon-sm': 'h-8 w-8 rounded-lg',
  'icon-lg': 'h-11 w-11 rounded-xl',
};

/**
 * The single button in the app.
 *
 * `as` lets it render as a react-router <Link> or an <a> while keeping the same
 * styling, so navigation and actions look identical without duplicating classes.
 * `loading` also disables the button, which is what actually prevents the
 * double-submit that a fast double-click would otherwise cause.
 */
const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon = null,
    iconPosition = 'left',
    fullWidth = false,
    className,
    children,
    type,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const iconSize = size === 'lg' || size === 'icon-lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <Component
      ref={ref}
      // Only set type on real buttons - an <a> with type="button" is invalid.
      {...(Component === 'button' ? { type: type || 'button' } : {})}
      {...(isDisabled && Component === 'button' ? { disabled: true } : {})}
      {...(isDisabled && Component !== 'button' ? { 'aria-disabled': true, tabIndex: -1 } : {})}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        SIZES[size],
        VARIANTS[variant],
        fullWidth && 'w-full',
        isDisabled && 'pointer-events-none opacity-55',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className={cn(iconSize, 'animate-spin')} aria-hidden="true" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className={iconSize} aria-hidden="true" />
      )}

      {children}

      {!loading && Icon && iconPosition === 'right' && <Icon className={iconSize} aria-hidden="true" />}
    </Component>
  );
});

export default Button;

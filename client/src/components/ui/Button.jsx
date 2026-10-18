import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Variants.
 *
 * `danger` and `success` use literal palette values instead of the semantic
 * tokens on purpose: the token flips to a light red/emerald in dark mode (where
 * it is used as *text*), and light-on-white-text buttons need the saturated
 * version in both themes.
 */
const VARIANTS = {
  primary: 'bg-brand-gradient text-white shadow-glow-sm hover:brightness-110 active:brightness-100',
  secondary: 'bg-secondary-soft text-secondary border border-secondary/25 hover:border-secondary/50',
  outline: 'border border-border bg-surface-muted/40 text-foreground hover:border-primary/40 hover:bg-surface-muted',
  ghost: 'text-foreground hover:bg-surface-muted',
  subtle: 'bg-primary-soft text-primary hover:bg-primary-soft/70',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-500 active:bg-red-600',
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-600',
  link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
};

const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-lg',
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-base gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-xl',
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
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-[background-color,border-color,box-shadow,filter,transform] duration-150',
        'active:scale-[0.98]',
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

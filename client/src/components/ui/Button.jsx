import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Clean, tactile, authentic button variants.
 * No neon glowing halos or generic AI styling.
 */
const VARIANTS = {
  primary:
    'bg-primary text-primary-fg shadow-subtle hover:bg-primary/90 active:scale-[0.98] font-semibold ring-1 ring-black/5 dark:ring-white/10',
  secondary:
    'bg-surface-muted text-foreground border border-border hover:bg-surface-muted/80 active:scale-[0.98]',
  outline:
    'border border-border bg-surface text-foreground shadow-subtle hover:bg-surface-muted hover:border-border active:scale-[0.98]',
  ghost: 'text-muted hover:text-foreground hover:bg-surface-muted active:scale-[0.98]',
  subtle: 'bg-primary-soft text-primary hover:bg-primary/15 active:scale-[0.98]',
  danger: 'bg-rose-600 text-white shadow-subtle hover:bg-rose-700 active:scale-[0.98]',
  success: 'bg-emerald-600 text-white shadow-subtle hover:bg-emerald-700 active:scale-[0.98]',
  link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
};

const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-lg',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl font-semibold',
  icon: 'h-9 w-9 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-lg',
  'icon-lg': 'h-11 w-11 rounded-xl',
};

/**
 * Universal Button primitive.
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
  const iconSize = size === 'lg' || size === 'icon-lg' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <Component
      ref={ref}
      {...(Component === 'button' ? { type: type || 'button' } : {})}
      {...(isDisabled && Component === 'button' ? { disabled: true } : {})}
      {...(isDisabled && Component !== 'button' ? { 'aria-disabled': true, tabIndex: -1 } : {})}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        SIZES[size],
        VARIANTS[variant],
        fullWidth && 'w-full',
        isDisabled && 'pointer-events-none opacity-50',
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

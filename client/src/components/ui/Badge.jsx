import { cn } from '@/lib/cn';

/**
 * Small status pill.
 *
 * Tones map onto the semantic tokens so the same "this is fine / this needs
 * attention" language is used for chores, settlements and balances alike.
 */
const TONES = {
  neutral: 'bg-surface-muted text-muted border-border',
  primary: 'bg-primary-soft text-primary border-primary/20',
  success: 'bg-success-soft text-success border-success/25',
  warning: 'bg-warning-soft text-warning border-warning/30',
  error: 'bg-error-soft text-error border-error/25',
  secondary: 'bg-secondary-soft text-secondary border-secondary/25',
  gold: 'bg-gold/12 text-gold border-gold/30',
};

const SIZES = {
  sm: 'h-5 px-1.5 text-2xs gap-1',
  md: 'h-6 px-2 text-xs gap-1',
  lg: 'h-7 px-2.5 text-sm gap-1.5',
};

export default function Badge({ tone = 'neutral', size = 'md', icon: Icon, dot = false, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border font-medium',
        SIZES[size],
        TONES[tone] || TONES.neutral,
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {Icon && <Icon aria-hidden="true" style={{ width: 12, height: 12 }} />}
      {children}
    </span>
  );
}

export { TONES as BADGE_TONES };

import { cn } from '@/lib/cn';

/**
 * Status and category badge.
 * Clean, subtle container with crisp border and high text legibility.
 */
const TONES = {
  neutral: 'bg-surface-muted text-muted border-border',
  primary: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  error: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  secondary: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  gold: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
};

const SIZES = {
  sm: 'h-5 px-1.5 text-2xs gap-1',
  md: 'h-6 px-2 text-xs gap-1',
  lg: 'h-7 px-2.5 text-xs gap-1.5 font-medium',
};

export default function Badge({ tone = 'neutral', size = 'md', icon: Icon, dot = false, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-md border font-medium',
        SIZES[size],
        TONES[tone] || TONES.neutral,
        className,
      )}
    >
      {dot && (
        <span className="flex h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {Icon && <Icon aria-hidden="true" style={{ width: 12, height: 12 }} />}
      {children}
    </span>
  );
}

export { TONES as BADGE_TONES };

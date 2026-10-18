import { cn } from '@/lib/cn';

/**
 * Gradient fills per tone.
 *
 * `primary` reuses the shared `.bg-brand-gradient` class so the level bar, the
 * primary button and the hero accent are literally the same gradient.
 */
const TONES = {
  primary: 'bg-brand-gradient',
  success: 'bg-gradient-to-r from-emerald-500 to-teal-400',
  warning: 'bg-gradient-to-r from-amber-500 to-orange-400',
  error: 'bg-gradient-to-r from-red-500 to-rose-400',
  gold: 'bg-gradient-to-r from-amber-400 to-yellow-300',
  secondary: 'bg-gradient-to-r from-violet-500 to-fuchsia-400',
};

const SIZES = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

/**
 * Progress bar.
 *
 * `max` defaults to 1 so callers can pass a ready-made 0..1 ratio from the
 * shared XP helpers without re-deriving percentages in the UI.
 */
export default function ProgressBar({
  value = 0,
  max = 1,
  tone = 'primary',
  size = 'md',
  label,
  showValue = false,
  className,
  trackClassName,
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">{label}</span>
          {showValue && <span className="tabular shrink-0">{percent}%</span>}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || undefined}
        className={cn('w-full overflow-hidden rounded-full bg-surface-muted', SIZES[size], trackClassName)}
      >
        <div
          className={cn(
            'h-full rounded-full shadow-[0_0_12px_-2px_currentColor] transition-[width] duration-700 ease-out',
            TONES[tone] || TONES.primary,
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

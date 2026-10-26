import { cn } from '@/lib/cn';

/**
 * Clean progress fills per tone.
 * Crisp, authentic colors without neon glow halos.
 */
const TONES = {
  primary: 'bg-primary',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-rose-500',
  gold: 'bg-amber-500',
  secondary: 'bg-teal-500',
};

const SIZES = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-2.5',
};

/**
 * Progress bar primitive.
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
            'h-full rounded-full transition-[width] duration-500 ease-out',
            TONES[tone] || TONES.primary,
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

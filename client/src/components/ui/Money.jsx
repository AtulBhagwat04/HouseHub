import { cn } from '@/lib/cn';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';

/**
 * A paise amount, rendered as rupees.
 *
 * This is the only place the "positive = you are owed = green" colouring rule is
 * applied, because getting it backwards in one page and right in another is the
 * classic way a money UI loses trust.
 *
 * `tone="auto"` colours by sign; any other tone is used verbatim.
 */
export default function Money({
  paise,
  tone = 'auto',
  signed = false,
  compact = false,
  className,
  as: Component = 'span',
}) {
  const value = Number(paise) || 0;

  const autoTone = value > 0 ? 'success' : value < 0 ? 'error' : 'muted';
  const resolvedTone = tone === 'auto' ? autoTone : tone;

  const toneClasses = {
    default: 'text-foreground',
    success: 'text-success',
    error: 'text-error',
    muted: 'text-muted',
    primary: 'text-primary',
    warning: 'text-warning',
  };

  const magnitude = compact ? formatCurrencyCompact(Math.abs(value)) : formatCurrency(Math.abs(value));
  const sign = value < 0 ? '-' : value > 0 ? '+' : '';
  const display = signed ? `${sign}${magnitude}` : `${value < 0 ? '-' : ''}${magnitude}`;

  return (
    <Component
      className={cn('tabular font-medium', toneClasses[resolvedTone] || toneClasses.default, className)}
    >
      {display}
    </Component>
  );
}

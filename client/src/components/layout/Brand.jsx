import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

const MARK_SIZES = {
  sm: { box: 'h-8 w-8 rounded-lg', icon: 16 },
  md: { box: 'h-9 w-9 rounded-xl', icon: 18 },
  lg: { box: 'h-10 w-10 rounded-xl', icon: 20 },
  xl: { box: 'h-14 w-14 rounded-2xl', icon: 28 },
};

/**
 * Architectural home glyph — clean, balanced, modern.
 */
const GLYPH = (
  <>
    <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v6H4a1 1 0 0 1-1-1V10Z" />
    <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
  </>
);

/**
 * The HOUSEHUB brand mark.
 * Clean, tactile, authentic — no neon glow or fluorescent drop-shadows.
 */
export function BrandMark({ size = 'md', className }) {
  const { box, icon } = MARK_SIZES[size] || MARK_SIZES.md;

  return (
    <span
      className={cn(
        'bg-primary flex shrink-0 items-center justify-center text-primary-fg shadow-subtle ring-1 ring-black/5 dark:ring-white/10',
        box,
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        style={{ width: icon, height: icon }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {GLYPH}
      </svg>
    </span>
  );
}

/** Mark + wordmark, linked to the given route. */
export function Brand({ to = '/', size = 'md', subtitle, className }) {
  return (
    <Link to={to} className={cn('group flex min-w-0 items-center gap-2.5', className)}>
      <BrandMark size={size} />

      <span className="min-w-0">
        <span className="block font-display text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
          HOUSEHUB
        </span>
        {subtitle && <span className="block truncate text-2xs text-muted">{subtitle}</span>}
      </span>
    </Link>
  );
}

export default BrandMark;

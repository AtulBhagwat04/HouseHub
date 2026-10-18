import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

const MARK_SIZES = {
  sm: { box: 'h-8 w-8 rounded-xl', icon: 16 },
  md: { box: 'h-9 w-9 rounded-xl', icon: 18 },
  lg: { box: 'h-11 w-11 rounded-2xl', icon: 22 },
  xl: { box: 'h-16 w-16 rounded-3xl', icon: 30 },
};

const GLYPH = (
  <>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.6V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.6" />
  </>
);

/**
 * The HOUSEHUB mark.
 *
 * One component so the gradient tile, the corner radius and the glyph cannot
 * drift between the sidebar, the top bar, the splash and the landing page.
 */
export function BrandMark({ size = 'md', glow = true, className }) {
  const { box, icon } = MARK_SIZES[size] || MARK_SIZES.md;

  return (
    <span
      className={cn(
        'bg-brand-gradient flex shrink-0 items-center justify-center text-white',
        box,
        glow && 'shadow-glow-sm',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        style={{ width: icon, height: icon }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
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
    <Link to={to} className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <BrandMark size={size} />

      <span className="min-w-0">
        <span className="block font-display text-sm font-extrabold tracking-tight text-foreground">
          HOUSEHUB
        </span>
        {subtitle && <span className="block truncate text-2xs text-muted">{subtitle}</span>}
      </span>
    </Link>
  );
}

export default BrandMark;

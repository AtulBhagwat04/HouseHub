import { cn } from '@/lib/cn';
import { categoryColor, categoryMeta } from '@/lib/catalogue';

const SIZES = {
  sm: 'h-7 w-7 text-sm',
  md: 'h-9 w-9 text-base',
  lg: 'h-11 w-11 text-lg',
  xl: 'h-14 w-14 text-2xl',
};

/**
 * Category glyph.
 *
 * Uses the shared catalogue's emoji rather than an icon map so a new category
 * only ever has to be added in one place (shared/constants.js) and it appears
 * here, in filters and in charts at the same time.
 */
export default function CategoryIcon({ category, size = 'md', tinted = true, className }) {
  const meta = categoryMeta(category);
  const color = categoryColor(category);

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg',
        SIZES[size],
        !tinted && 'bg-surface-muted',
        className,
      )}
      style={tinted ? { backgroundColor: `${color}1f`, color } : undefined}
      title={meta.label}
      aria-hidden="true"
    >
      {meta.emoji}
    </span>
  );
}

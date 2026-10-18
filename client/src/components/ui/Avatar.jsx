import { cn } from '@/lib/cn';
import { initialsOf } from '@/lib/format';

/**
 * Deterministic avatar colour.
 *
 * The same person gets the same gradient on every screen and every device
 * because the hue is derived from their name rather than from render order.
 *
 * The fill is a gradient with white initials rather than a tinted disc with
 * coloured text: a tinted disc has to pick its text colour per theme, whereas a
 * saturated gradient holds up in both, which keeps this a pure function of the
 * name with no theme lookup.
 */
const HUES = [222, 262, 291, 330, 12, 32, 45, 160, 180, 199];

function hueFor(seed = '') {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000;
  }
  return HUES[hash % HUES.length];
}

function gradientFor(seed) {
  const hue = hueFor(seed);
  return `linear-gradient(135deg, hsl(${hue} 72% 56%) 0%, hsl(${(hue + 42) % 360} 74% 40%) 100%)`;
}

const SIZES = {
  xs: 'h-6 w-6 text-2xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-2xl',
};

export default function Avatar({
  src,
  name = '',
  size = 'md',
  ring = false,
  className,
  title,
}) {
  const label = title || name || 'Member';

  if (src) {
    return (
      <img
        src={src}
        alt={label}
        title={label}
        className={cn(
          'shrink-0 rounded-full object-cover',
          SIZES[size],
          ring && 'ring-2 ring-surface',
          className,
        )}
      />
    );
  }

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm',
        SIZES[size],
        ring && 'ring-2 ring-surface',
        className,
      )}
      style={{ backgroundImage: gradientFor(name || src || '') }}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Overlapping row of avatars, e.g. "who is in this house". */
export function AvatarGroup({ members = [], max = 4, size = 'sm', className }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;

  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {shown.map((member) => (
        <Avatar key={member._id || member.name} src={member.avatarUrl} name={member.name} size={size} ring />
      ))}

      {extra > 0 && (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full border-2 border-surface bg-surface-muted font-semibold text-muted',
            SIZES[size],
            'ring-2 ring-surface',
          )}
          title={`${extra} more`}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

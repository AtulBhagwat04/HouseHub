import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * `cn('p-2', 'p-4')` -> "p-4".
 *
 * clsx handles the conditional shapes; tailwind-merge resolves the conflicts
 * that appear once components accept a `className` override. Without the merge,
 * `cn('p-4', className)` with `className="p-6"` would emit both and the winner
 * would depend on CSS source order rather than on the caller.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default cn;

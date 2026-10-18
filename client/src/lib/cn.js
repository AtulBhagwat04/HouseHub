import clsx from 'clsx';

/** `cn('a', condition && 'b', { c: true })` -> "a b c" */
export function cn(...inputs) {
  return clsx(inputs);
}

export default cn;

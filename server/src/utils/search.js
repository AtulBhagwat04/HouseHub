/** Escapes a user string so it cannot be interpreted as a regular expression. */
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Case-insensitive "contains" matcher for search boxes.
 *
 * Input is length-capped and escaped, which closes off regex-injection and the
 * catastrophic-backtracking (ReDoS) class of attacks that a raw `RegExp(query)`
 * would open up.
 */
export function containsMatcher(value, maxLength = 60) {
  const trimmed = String(value || '').trim().slice(0, maxLength);
  if (!trimmed) return null;
  return new RegExp(escapeRegex(trimmed), 'i');
}

export default { escapeRegex, containsMatcher };

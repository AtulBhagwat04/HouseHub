const PREFIX = 'HOUSE';

/**
 * Normalises whatever a user pastes into a tidy invite code.
 *
 * Mirrors the server's own normaliser (which remains the authority) so the value
 * shown back to the user, the value put in the URL, and the value the API
 * receives all look the same. The alphabet deliberately excludes 0/O/1/I/L.
 */
export function normalizeInviteInput(input) {
  if (!input) return '';
  const cleaned = String(input).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith(`${PREFIX}-`)) return cleaned;
  if (cleaned.startsWith(PREFIX)) return `${PREFIX}-${cleaned.slice(PREFIX.length)}`;
  return `${PREFIX}-${cleaned}`;
}

export default normalizeInviteInput;

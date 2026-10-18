import crypto from 'node:crypto';

/**
 * Invite codes look like HOUSE-7X92A.
 *
 * The alphabet omits 0/O/1/I/L so a code read off someone's screen cannot be
 * mistyped into a different valid code.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const INVITE_PREFIX = 'HOUSE';
const CODE_LENGTH = 5;

export function generateInviteCode(prefix = INVITE_PREFIX) {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return `${prefix}-${code}`;
}

/** Accepts "HOUSE-7x92a", "house 7x92a" or "7x92a" and normalises to HOUSE-7X92A. */
export function normaliseInviteCode(input) {
  if (!input) return '';
  const cleaned = String(input).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return '';

  const body = cleaned.startsWith(INVITE_PREFIX) ? cleaned.slice(INVITE_PREFIX.length) : cleaned;
  if (!body) return '';
  return `${INVITE_PREFIX}-${body}`;
}

/** Extracts a code from a full invite URL: https://househub.com/join/HOUSE-7X92A */
export function extractInviteCode(input) {
  if (!input) return '';
  const value = String(input).trim();
  const fromPath = value.match(/join\/([^/?#\s]+)/i);
  if (fromPath) return normaliseInviteCode(decodeURIComponent(fromPath[1]));
  return normaliseInviteCode(value);
}

/** Used to build the shareable https://.../join/HOUSE-7X92A link. */
export function buildInviteLink(clientUrl, inviteCode) {
  const base = (clientUrl || 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}/join/${inviteCode}`;
}

export function generateResetToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  return {
    raw,
    hashed: crypto.createHash('sha256').update(raw).digest('hex'),
  };
}

export function hashResetToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

export default { generateInviteCode, normaliseInviteCode, extractInviteCode, buildInviteLink };

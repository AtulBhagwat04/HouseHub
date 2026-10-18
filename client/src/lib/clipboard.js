/**
 * Clipboard helper.
 *
 * `navigator.clipboard` needs a secure context (https or localhost) and can be
 * blocked by permissions. The textarea fallback keeps "copy invite link" working
 * when the app is served over plain http on a LAN address, which is exactly how
 * people test this on a phone.
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export default copyToClipboard;

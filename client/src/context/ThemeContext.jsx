import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { THEME_OPTIONS } from '@shared/constants.js';

const STORAGE_KEY = 'househub.theme';
const ThemeContext = createContext(null);

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEME_OPTIONS.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Light / dark / system theming.
 *
 * The `dark` class is applied to <html> (see the inline script in index.html,
 * which does the same thing before first paint so there is no white flash on a
 * cold load). Preference is mirrored to the server on the Settings page so it
 * follows the user between devices; localStorage is the fast local cache.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme);
  const [resolved, setResolved] = useState(() =>
    readStoredTheme() === 'dark' || (readStoredTheme() === 'system' && systemPrefersDark()) ? 'dark' : 'light',
  );

  const applyResolved = useCallback((mode) => {
    const isDark = mode === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    setResolved(isDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    applyResolved(theme === 'dark' || (theme === 'system' && systemPrefersDark()) ? 'dark' : 'light');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable - the choice just won't persist */
    }
  }, [theme, applyResolved]);

  // Follow the OS while in "system" mode, without a reload.
  useEffect(() => {
    if (theme !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => applyResolved(event.matches ? 'dark' : 'light');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme, applyResolved]);

  const value = useMemo(
    () => ({
      theme,
      resolved,
      setTheme,
      toggle: () => setTheme(resolved === 'dark' ? 'light' : 'dark'),
    }),
    [theme, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}

export default ThemeContext;

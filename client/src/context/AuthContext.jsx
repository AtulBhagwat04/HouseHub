import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getStoredToken, setStoredToken, setUnauthorizedHandler } from '@/lib/api';
import * as authService from '@/services/authService';

const AuthContext = createContext(null);

/**
 * Session state: who is signed in, and which house they belong to.
 *
 * The token lives in localStorage and travels as a Bearer header. On boot we
 * call `GET /auth/me`, which is the single source of truth for both the profile
 * and the house - so a user who leaves a house elsewhere is corrected on the
 * next load rather than seeing a stale house shell.
 *
 * `status` drives routing:
 *   loading       -> show a splash, never flash the login page at a signed-in user
 *   anonymous     -> /login, /register
 *   authenticated -> needs a house; if `house` is null, route to onboarding
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [house, setHouse] = useState(null);
  const [status, setStatus] = useState(() => (getStoredToken() ? 'loading' : 'anonymous'));

  const clearSession = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    setHouse(null);
    setStatus('anonymous');
  }, []);

  const applySession = useCallback(({ user: nextUser, house: nextHouse }) => {
    setUser(nextUser);
    setHouse(nextHouse);
    setStatus('authenticated');
  }, []);

  const refresh = useCallback(async () => {
    if (!getStoredToken()) {
      setStatus('anonymous');
      return null;
    }
    try {
      const session = await authService.fetchMe();
      applySession(session);
      return session;
    } catch {
      clearSession();
      return null;
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getStoredToken()) {
        setStatus('anonymous');
        return;
      }
      try {
        const session = await authService.fetchMe();
        if (!cancelled) applySession(session);
      } catch {
        if (!cancelled) clearSession();
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  /**
   * A single 401 handler for the whole app. When any request anywhere comes
   * back 401 (expired token, deleted account) the session is dropped once,
   * rather than each page trying to interpret the error.
   */
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(
    async (credentials) => {
      const { token, user: nextUser } = await authService.login(credentials);
      setStoredToken(token);
      // fetchMe() rather than trusting the login payload, so `house` is correct
      // even if this is a user who joined a house since their last visit.
      const session = await authService.fetchMe().catch(() => ({ user: nextUser, house: null }));
      applySession(session);
      return session;
    },
    [applySession],
  );

  const register = useCallback(
    async (payload) => {
      const { token, user: nextUser } = await authService.register(payload);
      setStoredToken(token);
      const session = await authService.fetchMe().catch(() => ({ user: nextUser, house: null }));
      applySession(session);
      return session;
    },
    [applySession],
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const updateUser = useCallback((patch) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo(
    () => ({
      user,
      house,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      hasHouse: Boolean(house),
      houseId: house?._id || null,
      role: house?.myRole || null,
      isOwner: house?.myRole === 'owner',
      isManager: house?.myRole === 'owner' || house?.myRole === 'admin',
      login,
      register,
      logout,
      refresh,
      updateUser,
      setHouse,
      applySession,
    }),
    [user, house, status, login, register, logout, refresh, updateUser, applySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

export default AuthContext;

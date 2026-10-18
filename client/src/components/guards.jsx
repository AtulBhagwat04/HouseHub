import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Splash from '@/components/Splash';

/**
 * Route guards.
 *
 * The rules live in exactly one place:
 *   - still restoring the session -> splash, so we never flash /login at a
 *     signed-in user (and never bounce them off a deep link)
 *   - signed out -> /login, remembering where they were headed
 *   - signed in but house-less -> /onboarding, because every app screen needs a house
 *   - signed in with a house, on /login or /register -> straight into the app
 *
 * Everything is enforced by the API as well; this is purely about not showing
 * people screens they cannot use.
 */

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Splash message="Restoring your session..." />;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}

/** Auth is required AND a house must exist. */
export function RequireHouse() {
  const { status, hasHouse } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Splash message="Loading your house..." />;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!hasHouse) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}

/** /login, /register, /forgot-password - bounce away if already signed in. */
export function RedirectIfAuthenticated() {
  const { status, hasHouse } = useAuth();

  if (status === 'loading') return <Splash message="Restoring your session..." />;
  if (status === 'authenticated') {
    return <Navigate to={hasHouse ? '/dashboard' : '/onboarding'} replace />;
  }

  return <Outlet />;
}

/** Signed in but already in a house: /onboarding, /join and /create-house are dead ends. */
export function RequireNoHouse() {
  const { status, hasHouse } = useAuth();

  if (status === 'loading') return <Splash message="Loading your house..." />;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  if (hasHouse) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

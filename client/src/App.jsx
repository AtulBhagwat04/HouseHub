import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { RedirectIfAuthenticated, RequireAuth, RequireHouse, RequireNoHouse } from '@/components/guards';

import AppLayout from '@/layouts/AppLayout';
import AuthLayout from '@/layouts/AuthLayout';

/* Public ------------------------------------------------------------------- */
import Landing from '@/pages/Landing';
import NotFound from '@/pages/NotFound';

/* Auth --------------------------------------------------------------------- */
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';

/* Onboarding --------------------------------------------------------------- */
import Onboarding from '@/pages/Onboarding';
import JoinHouse from '@/pages/JoinHouse';

/* App ---------------------------------------------------------------------- */
import Dashboard from '@/pages/Dashboard';
import Activity from '@/pages/Activity';

import Expenses from '@/pages/expenses/Expenses';
import ExpenseNew from '@/pages/expenses/ExpenseNew';
import ExpenseDetails from '@/pages/expenses/ExpenseDetails';
import ExpenseEdit from '@/pages/expenses/ExpenseEdit';
import Balances from '@/pages/Balances';
import Settlements from '@/pages/Settlements';

import Chores from '@/pages/chores/Chores';
import MyChores from '@/pages/chores/MyChores';
import ChoreNew from '@/pages/chores/ChoreNew';
import ChoreDetails from '@/pages/chores/ChoreDetails';
import ChoreEdit from '@/pages/chores/ChoreEdit';

import Leaderboard from '@/pages/Leaderboard';
import Achievements from '@/pages/Achievements';

import HouseOverview from '@/pages/house/HouseOverview';
import Members from '@/pages/house/Members';
import HouseSettings from '@/pages/house/HouseSettings';

import Notifications from '@/pages/Notifications';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';

/** Reset the scroll position on every navigation - a long list scrolled down should not carry over. */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    // The shell scrolls <main>, not the window.
    document.querySelector('main')?.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
}

/**
 * Provider nesting, outermost first:
 *   ThemeProvider     - applies the dark class before anything renders
 *   ToastProvider     - everything below can raise a toast
 *   AuthProvider      - session + house; registers the global 401 handler
 *   NotificationProvider - needs to know whether we are signed in
 */
export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <ScrollToTop />

            <Routes>
              {/* Public ---------------------------------------------------- */}
              <Route path="/" element={<Landing />} />

              {/* Signed out only ------------------------------------------- */}
              <Route element={<RedirectIfAuthenticated />}>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />
                </Route>
              </Route>

              {/* Signed in, no house yet ---------------------------------- */}
              <Route element={<RequireNoHouse />}>
                <Route element={<AuthLayout />}>
                  <Route path="/onboarding" element={<Onboarding />} />
                </Route>
              </Route>

              {/* Invite links. Reachable signed out too, because the whole point
                  of clicking an invite link is that you may not have an account
                  yet - JoinHouse handles all three states itself. */}
              <Route path="/join" element={<JoinHouse />} />
              <Route path="/join/:code" element={<JoinHouse />} />

              {/* The app shell ------------------------------------------- */}
              <Route element={<RequireHouse />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/activity" element={<Activity />} />

                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/expenses/new" element={<ExpenseNew />} />
                  <Route path="/expenses/:expenseId" element={<ExpenseDetails />} />
                  <Route path="/expenses/:expenseId/edit" element={<ExpenseEdit />} />

                  <Route path="/balances" element={<Balances />} />
                  <Route path="/settlements" element={<Settlements />} />

                  <Route path="/chores" element={<Chores />} />
                  <Route path="/chores/mine" element={<MyChores />} />
                  <Route path="/chores/new" element={<ChoreNew />} />
                  <Route path="/chores/:choreId" element={<ChoreDetails />} />
                  <Route path="/chores/:choreId/edit" element={<ChoreEdit />} />

                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/achievements" element={<Achievements />} />

                  <Route path="/house" element={<HouseOverview />} />
                  <Route path="/house/members" element={<Members />} />
                  <Route path="/house/settings" element={<HouseSettings />} />

                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>

              {/* A signed-in user hitting /create-house is sent to onboarding. */}
              <Route element={<RequireAuth />}>
                <Route path="/create-house" element={<Navigate to="/onboarding" replace />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

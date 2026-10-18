import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Activity, Eye, KeyRound, Monitor, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react';
import * as authService from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { useDocumentTitle } from '@/hooks';
import { THEME_OPTIONS } from '@/lib/catalogue';
import { titleCase } from '@/lib/format';
import { Badge, Button, Card, Checkbox, PageHeader, SectionCard, Tabs } from '@/components/ui';

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };

/** How each notification preference is described to the user. */
const PREFERENCE_COPY = {
  chores: {
    label: 'Chores',
    description: 'Assigned to you, completed by you, or about to go overdue.',
  },
  expenses: {
    label: 'Expenses',
    description: 'When someone adds a bill you are part of.',
  },
  settlements: {
    label: 'Settlements',
    description: 'Requests to settle up, confirmations and reminders.',
  },
  achievements: {
    label: 'Achievements',
    description: 'Achievements unlocked and levels gained.',
  },
};

const DEFAULT_PREFS = { chores: true, expenses: true, settlements: true, achievements: true };

// Kept in step with client/package.json by hand - the app version is not worth a
// build-time import for one line of text.
const APP_VERSION = '1.0.0';

/**
 * Account settings.
 *
 * Every control here saves the moment it changes and mirrors the server's
 * response back into AuthContext - there is no "Save" button because an
 * unsaved theme looks broken rather than thoughtful.
 */
export default function Settings() {
  useDocumentTitle('Settings');

  const { user, isManager, updateUser } = useAuth();
  const toast = useToast();
  const { theme, resolved, setTheme } = useTheme();

  const [savingTheme, setSavingTheme] = useState(false);
  const [prefs, setPrefs] = useState(() => ({ ...DEFAULT_PREFS, ...(user?.notificationPrefs || {}) }));
  const [pendingPref, setPendingPref] = useState(null);

  async function chooseTheme(next) {
    if (next === theme || savingTheme) return;

    const previous = theme;
    // Optimistic: the dark class flips immediately, and only the server write
    // can actually fail - which is the only case worth undoing.
    setTheme(next);
    setSavingTheme(true);

    try {
      const updated = await authService.updateProfile({ theme: next });
      updateUser(updated);
      toast.success(`Theme set to ${titleCase(next)}`);
    } catch (error) {
      setTheme(previous);
      toast.fromError(error);
    } finally {
      setSavingTheme(false);
    }
  }

  async function togglePreference(key, value) {
    if (pendingPref) return;

    const previous = prefs[key];
    setPrefs((current) => ({ ...current, [key]: value }));
    setPendingPref(key);

    try {
      const updated = await authService.updateProfile({ notificationPrefs: { [key]: value } });
      updateUser(updated);
      toast.success('Notification preferences saved');
    } catch (error) {
      setPrefs((current) => ({ ...current, [key]: previous }));
      toast.fromError(error);
    } finally {
      setPendingPref(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Settings' }]}
        title="Settings"
        description="Appearance, notifications and everything else that belongs to you rather than the house."
      />

      {/* Appearance ---------------------------------------------------- */}
      <SectionCard title="Appearance" description="Light, dark, or whatever your device is set to.">
        <div className={savingTheme ? 'pointer-events-none opacity-60' : undefined}>
          <Tabs
            variant="pills"
            value={theme}
            onChange={chooseTheme}
            tabs={THEME_OPTIONS.map((value) => ({
              value,
              label: titleCase(value),
              icon: THEME_ICONS[value],
            }))}
          />
        </div>

        <p className="mt-3 text-xs text-muted">
          Showing {resolved} right now. This preference is saved to your account, so it follows you to any device
          you sign in on.
        </p>
      </SectionCard>

      {/* Notifications -------------------------------------------------- */}
      <SectionCard
        title="Notifications"
        description="What HOUSEHUB is allowed to tell you about. Changes save as you make them."
      >
        <div className="space-y-4">
          {Object.entries(PREFERENCE_COPY).map(([key, copy]) => (
            <Checkbox
              key={key}
              label={copy.label}
              description={copy.description}
              checked={Boolean(prefs[key])}
              disabled={Boolean(pendingPref)}
              onChange={(event) => togglePreference(key, event.target.checked)}
            />
          ))}
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs text-muted">
          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Turning a category off stops new notifications of that kind. Anything already in your list stays there.
        </p>
      </SectionCard>

      {/* House ---------------------------------------------------------- */}
      <SectionCard title="House" description="Shared settings do not live here.">
        <p className="text-sm text-muted">
          The house name, invite rules and the weekly chore goal belong to everyone you live with, so they are
          edited on the house pages rather than on your own account.
        </p>

        <div className="mt-4">
          {isManager ? (
            <Button as={Link} to="/house/settings" variant="outline" size="sm" icon={ShieldCheck}>
              House settings
            </Button>
          ) : (
            <Button as={Link} to="/house" variant="outline" size="sm" icon={Eye}>
              House overview
            </Button>
          )}
        </div>
      </SectionCard>

      {/* Account -------------------------------------------------------- */}
      <SectionCard title="Account" description="Both of these live on your profile page.">
        <ul className="divide-y divide-border">
          <li>
            <Link
              to="/profile"
              className="flex items-center gap-3 py-3 transition hover:opacity-80"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">Change password</span>
                <span className="block text-xs text-muted">Update the password on this account</span>
              </span>

              <Badge tone="neutral" size="sm">
                Profile
              </Badge>
            </Link>
          </li>

          <li>
            <Link to="/profile" className="flex items-center gap-3 py-3 transition hover:opacity-80">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-error-soft text-error">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">Delete account</span>
                <span className="block text-xs text-muted">
                  Permanent, and it takes your history with it
                </span>
              </span>

              <Badge tone="neutral" size="sm">
                Profile
              </Badge>
            </Link>
          </li>
        </ul>
      </SectionCard>

      {/* About --------------------------------------------------------- */}
      <Card>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">HOUSEHUB</h2>
            <p className="mt-0.5 text-sm text-muted">
              Shared-house expenses, chores and balances. Version {APP_VERSION}, built on MongoDB, Express,
              React and Node.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

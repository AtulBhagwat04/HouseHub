import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import * as authService from '@/services/authService';
import { setStoredToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

/** Matches the server's own floor (`passwordValidators.new` rejects under 8). */
const MIN_PASSWORD = 8;

/**
 * Choose a new password from an emailed reset link.
 *
 * On success the server issues a fresh token, so the user is signed straight in
 * rather than being bounced to the login form to type the password they just set.
 */
export default function ResetPassword() {
  useDocumentTitle('Reset your password');

  const { token } = useParams();
  const { refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = {};
    if (!form.password) errors.password = 'Choose a new password';
    else if (form.password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters`;
    if (form.confirmPassword !== form.password) errors.confirmPassword = 'Both passwords must match';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const freshToken = await authService.resetPassword({ token, newPassword: form.password });
      setStoredToken(freshToken);

      // Pull the profile with the new token so the app is signed in immediately.
      const session = await refresh();

      toast.success('Password updated. You are signed in.');
      navigate(session?.house ? '/dashboard' : '/onboarding', { replace: true });
    } catch (requestError) {
      setFieldErrors(requestError.fieldErrors || {});
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <LockKeyhole className="h-6 w-6" aria-hidden="true" />
      </span>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted">
          This link can only be used once, and it expires thirty minutes after it was requested.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-error/30 bg-error-soft px-3.5 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="relative">
          <Input
            label="New password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD} characters`}
            value={form.password}
            onChange={(event) => {
              setForm((current) => ({ ...current, password: event.target.value }));
              setFieldErrors((current) => ({ ...current, password: undefined }));
              setError('');
            }}
            error={fieldErrors.password}
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2.5 top-[30px] rounded-md p-1.5 text-muted transition hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Input
          label="Confirm new password"
          type={showPassword ? 'text' : 'password'}
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat your new password"
          value={form.confirmPassword}
          onChange={(event) => {
            setForm((current) => ({ ...current, confirmPassword: event.target.value }));
            setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
          }}
          error={fieldErrors.confirmPassword}
          required
        />

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Set new password
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

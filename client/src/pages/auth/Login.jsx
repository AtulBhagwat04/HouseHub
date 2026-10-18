import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks';
import { Button, Input } from '@/components/ui';

/**
 * Sign in.
 *
 * On success we deliberately fetch the profile again (AuthContext does this) and
 * then send the user where they were actually going, or to the dashboard - or to
 * onboarding if they do not have a house yet.
 */
export default function Login() {
  useDocumentTitle('Sign in');

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormError('');
  };

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Enter your email address';
    if (!form.password) nextErrors.password = 'Enter your password';

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const session = await login({ email: form.email.trim(), password: form.password });
      toast.success(`Welcome back, ${session.user?.name?.split(' ')[0] || 'there'}`);

      const from = location.state?.from;
      navigate(from || (session.house ? '/dashboard' : '/onboarding'), { replace: true });
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>

      {formError && (
        <div role="alert" className="animate-fade-in rounded-xl border border-error/30 bg-error-soft px-3.5 py-2.5 text-sm text-error">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          error={fieldErrors.email}
          required
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={form.password}
            onChange={update('password')}
            error={fieldErrors.password}
            inputClassName="pr-11"
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-1.5 top-[30px] flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-muted hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-medium text-primary transition hover:underline">
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" icon={LogIn} loading={submitting}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        New to HOUSEHUB?{' '}
        <Link to="/register" className="font-medium text-primary transition hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

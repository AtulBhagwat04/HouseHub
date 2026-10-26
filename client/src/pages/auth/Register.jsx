import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks';
import { Button, Input } from '@/components/ui';

/**
 * Minimum password policy.
 *
 * Must match the server exactly (`authRoutes.js` rejects anything under 8 with a
 * 422). If this were lower, the form would accept a password and then hand the
 * user a server error for input it had already blessed.
 */
const MIN_PASSWORD = 8;

export default function Register() {
  useDocumentTitle('Create your account');

  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormError('');
  };

  function validate() {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Enter your name';
    else if (form.name.trim().length < 2) errors.name = 'Your name must be at least 2 characters';

    if (!form.email.trim()) errors.email = 'Enter your email address';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';

    if (!form.password) errors.password = 'Choose a password';
    else if (form.password.length < MIN_PASSWORD) {
      errors.password = `Use at least ${MIN_PASSWORD} characters`;
    }

    if (form.confirmPassword !== form.password) errors.confirmPassword = 'Both passwords must match';

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const session = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      toast.success(`Welcome to HOUSEHUB, ${session.user?.name?.split(' ')[0] || 'there'}!`);
      // A brand new account never has a house, so onboarding is the only sensible next step.
      navigate('/onboarding', { replace: true });
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted">It takes about thirty seconds.</p>
      </div>

      {formError && (
        <div role="alert" className="animate-fade-in rounded-xl border border-error/30 bg-error-soft px-3.5 py-2.5 text-sm text-error">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Atul Bhagwat"
          value={form.name}
          onChange={update('name')}
          error={fieldErrors.name}
          required
        />

        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="atul@roomly.com"
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
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD} characters`}
            value={form.password}
            onChange={update('password')}
            error={fieldErrors.password}
            hint={!fieldErrors.password ? `Use at least ${MIN_PASSWORD} characters.` : undefined}
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

        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          error={fieldErrors.confirmPassword}
          required
        />

        <Button type="submit" fullWidth size="lg" icon={UserPlus} loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary transition hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

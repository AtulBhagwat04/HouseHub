import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react';
import * as authService from '@/services/authService';
import { useDocumentTitle } from '@/hooks';
import { Button, Input } from '@/components/ui';

/**
 * Request a password reset.
 *
 * The response is always the same generic message whether or not the address
 * exists - that is the server's choice and the UI does not undo it, because
 * "no account with that email" is an account-enumeration leak.
 *
 * With EMAIL_DEV_MODE=true (the local default) the server returns the reset
 * token so the flow is testable without a mail provider; it is shown here as a
 * clearly-labelled development shortcut.
 */
export default function ForgotPassword() {
  useDocumentTitle('Forgot password');

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim()) {
      setError('Enter your email address');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await authService.forgotPassword({ email: email.trim() });
      setSent(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    const devToken = sent.data?.devResetToken;

    return (
      <div className="space-y-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </span>

        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Check your inbox</h1>
          <p className="mt-1 text-sm text-muted">{sent.message}</p>
        </div>

        {devToken && (
          <div className="rounded-2xl border border-warning/30 bg-warning-soft p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
              Development mode
            </p>
            <p className="mt-1 text-sm text-foreground">
              Email delivery is disabled, so here is the reset token from the server log:
            </p>
            <code className="mt-2 block break-all rounded-lg bg-surface px-2.5 py-2 font-mono text-xs text-foreground">
              {devToken}
            </code>
            <Button
              as={Link}
              to={`/reset-password/${devToken}`}
              size="sm"
              variant="outline"
              className="mt-2.5"
            >
              Open the reset page
            </Button>
          </div>
        )}

        <Button as={Link} to="/login" variant="outline" fullWidth icon={ArrowLeft}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <KeyRound className="h-6 w-6" aria-hidden="true" />
      </span>

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Forgot your password?</h1>
        <p className="mt-1 text-sm text-muted">
          Enter your email and we will send you a link to choose a new one.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError('');
          }}
          error={error}
          required
        />

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        <Link to="/login" className="font-medium text-primary transition hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Home, LogIn, UserPlus } from 'lucide-react';
import { normalizeInviteInput } from '@/lib/inviteInput';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks';
import AuthLayout from '@/layouts/AuthLayout';
import Splash from '@/components/Splash';
import { Button, Card, Input } from '@/components/ui';

/**
 * Invite-link landing.
 *
 * Deliberately NOT behind the auth guard: the entire point of an invite link is
 * that the person clicking it may not have an account yet. This page therefore
 * handles three states itself:
 *
 *   anonymous       -> offer register / sign in, carrying the invite through
 *   already housed  -> explain that they are already in a house
 *   no house yet    -> the join form, pre-filled from the URL
 *
 * The code arrives either as a path segment (/join/HOUSE-7X92A) or a query
 * parameter (?code=...), because chat apps mangle one or the other depending on
 * how the link was shared.
 */
export default function JoinHouse() {
  useDocumentTitle('Join a house');

  const { code: codeParam } = useParams();
  const [searchParams] = useSearchParams();
  const { status, hasHouse, user, applySession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const initialCode = codeParam || searchParams.get('code') || searchParams.get('invite') || '';
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  async function handleJoin(event) {
    event.preventDefault();

    if (!code.trim()) {
      setError('Enter an invite code or paste the invite link');
      return;
    }

    setJoining(true);
    setError('');

    try {
      const house = await houseService.joinHouse(code.trim());
      applySession({ user, house });
      toast.success(`You joined "${house.name}"`);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setJoining(false);
    }
  }

  if (status === 'loading') return <Splash message="Checking your invitation..." />;

  /* Signed out --------------------------------------------------------- */
  if (status !== 'authenticated') {
    const nextTarget = initialCode ? `/join/${normalizeInviteInput(initialCode)}` : '/join';

    return (
      <AuthLayout>
        <Card className="space-y-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Home className="h-6 w-6" aria-hidden="true" />
          </span>

          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">You have been invited</h1>
            <p className="mt-1 text-sm text-muted">
              {initialCode ? (
                <>
                  Join the house with code{' '}
                  <span className="font-mono font-semibold text-foreground">{normalizeInviteInput(initialCode)}</span>.
                  Create an account to accept, or sign in if you already have one.
                </>
              ) : (
                'Create an account or sign in to accept the invitation.'
              )}
            </p>
          </div>

          <div className="space-y-2.5">
            <Button as={Link} to="/register" state={{ from: nextTarget }} fullWidth size="lg" icon={UserPlus}>
              Create an account
            </Button>

            <Button as={Link} to="/login" state={{ from: nextTarget }} variant="outline" fullWidth size="lg" icon={LogIn}>
              I already have an account
            </Button>
          </div>

          <p className="text-center text-sm text-muted">
            <Link to="/" className="font-medium text-primary transition hover:underline">
              Back to home
            </Link>
          </p>
        </Card>
      </AuthLayout>
    );
  }

  /* Already in a house ------------------------------------------------- */
  if (hasHouse) {
    return (
      <AuthLayout>
        <Card className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">You are already in a house</h1>
            <p className="mt-1 text-sm text-muted">
              HOUSEHUB supports one house per account. Leave your current house before joining another.
            </p>
          </div>

          <Button as={Link} to="/dashboard" fullWidth size="lg" icon={ArrowLeft}>
            Back to dashboard
          </Button>
        </Card>
      </AuthLayout>
    );
  }

  /* Ready to join ------------------------------------------------------ */
  return (
    <AuthLayout>
      <Card className="space-y-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Home className="h-6 w-6" aria-hidden="true" />
        </span>

        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Join your house</h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as {user?.email || user?.name}. Confirm the invite code to join.
          </p>
        </div>

        <form onSubmit={handleJoin} noValidate className="space-y-4">
          <Input
            label="Invite code or link"
            name="inviteCode"
            placeholder="HOUSE-7X92A"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError('');
            }}
            error={error}
            required
          />

          <Button type="submit" fullWidth size="lg" icon={LogIn} loading={joining}>
            Join house
          </Button>
        </form>

        <p className="text-center text-sm text-muted">
          <Link to="/onboarding" className="font-medium text-primary transition hover:underline">
            Create your own house instead
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}

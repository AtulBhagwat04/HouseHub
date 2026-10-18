import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, LogIn, Plus } from 'lucide-react';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks';
import { HOUSE_NAME_MAX } from '@shared/constants.js';
import { Button, Card, Input, Tabs, Textarea } from '@/components/ui';

/**
 * First-run screen for a signed-in user with no house.
 *
 * Both paths live on one page because the choice is binary and the user already
 * knows which one they want - making them pick "create" or "join" from a landing
 * screen first would just be an extra click.
 */
export default function Onboarding() {
  useDocumentTitle('Set up your house');

  const { user, applySession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('create');

  const [createForm, setCreateForm] = useState({ name: '', location: '', description: '' });
  const [createErrors, setCreateErrors] = useState({});
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [joining, setJoining] = useState(false);

  async function handleCreate(event) {
    event.preventDefault();

    if (!createForm.name.trim() || createForm.name.trim().length < 2) {
      setCreateErrors({ name: 'Give your house a name (at least 2 characters)' });
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const result = await houseService.createHouse({
        name: createForm.name.trim(),
        location: createForm.location.trim(),
        description: createForm.description.trim(),
      });

      applySession({ user, house: result.house });
      toast.success(`"${result.house.name}" is ready. Invite your housemates next.`);
      navigate('/house', { replace: true, state: { justCreated: true } });
    } catch (error) {
      setCreateErrors(error.fieldErrors || {});
      setCreateError(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(event) {
    event.preventDefault();

    if (!code.trim()) {
      setCodeError('Enter an invite code or paste the invite link');
      return;
    }

    setJoining(true);

    try {
      const house = await houseService.joinHouse(code.trim());
      applySession({ user, house });
      toast.success(`You joined "${house.name}"`);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setCodeError(error.message);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Welcome, {user?.name?.split(' ')[0] || 'housemate'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          HOUSEHUB works per house. Create one, or join the house your housemates already set up.
        </p>
      </div>

      <Card className="space-y-4">
        <Tabs
          variant="pills"
          className="w-full"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'create', label: 'Create a house', icon: Plus },
            { value: 'join', label: 'Join a house', icon: LogIn },
          ]}
        />

        {tab === 'create' ? (
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            {createError && (
              <div role="alert" className="animate-fade-in rounded-xl border border-error/30 bg-error-soft px-3.5 py-2.5 text-sm text-error">
                {createError}
              </div>
            )}

            <Input
              label="House name"
              name="name"
              placeholder="College Flat"
              value={createForm.name}
              maxLength={HOUSE_NAME_MAX}
              onChange={(event) => {
                setCreateForm((current) => ({ ...current, name: event.target.value }));
                setCreateErrors({});
                setCreateError('');
              }}
              error={createErrors.name}
              hint={!createErrors.name ? 'Something your housemates will recognise.' : undefined}
              required
            />

            <Input
              label="Location"
              name="location"
              placeholder="Koramangala, Bengaluru"
              value={createForm.location}
              onChange={(event) => setCreateForm((current) => ({ ...current, location: event.target.value }))}
              hint="Optional. Helps if you have more than one place."
            />

            <Textarea
              label="Description"
              name="description"
              rows={2}
              placeholder="Second floor, green gate, buzzer 4B"
              value={createForm.description}
              onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
              hint="Optional."
            />

            <Button type="submit" fullWidth size="lg" icon={Home} loading={creating}>
              Create house
            </Button>
          </form>
        ) : (
          <form onSubmit={handleJoin} noValidate className="space-y-4">
            <Input
              label="Invite code or link"
              name="inviteCode"
              placeholder="HOUSE-7X92A"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setCodeError('');
              }}
              error={codeError}
              hint={!codeError ? 'Paste the whole link if you have it - we will find the code.' : undefined}
              required
            />

            <Button type="submit" fullWidth size="lg" icon={LogIn} loading={joining}>
              Join house
            </Button>

            <p className="text-center text-xs text-muted">
              Ask a housemate for the code, or open the invite link they sent you.
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}

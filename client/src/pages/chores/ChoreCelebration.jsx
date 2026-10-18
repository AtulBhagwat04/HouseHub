import { Trophy } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

/**
 * Completion feedback, shared by the chore board, My chores and the detail page.
 *
 * The three screens receive the same completion payload, so keeping one copy
 * here is what stops the wording and the celebration drifting apart between
 * them. The dialog is dismissible and never blocks the refetch that follows.
 */

/**
 * Turns a completion response into a toast and, when it is worth shouting
 * about, a celebration modal.
 */
export function reportCompletion(result, toast, onCelebrate) {
  if (result.alreadyCompleted) {
    toast.info('This chore was already completed.');
    return;
  }

  const awarded = result.xp?.awarded;
  if (awarded) toast.success(`+${awarded} XP`);

  const achievements = result.newAchievements || [];
  if (result.unlockedLevel || achievements.length > 0) {
    onCelebrate({ level: result.unlockedLevel, achievements });
  }
}

/** Level-up and achievement fanfare shown after a successful completion. */
export default function ChoreCelebration({ celebration, onClose }) {
  const achievements = celebration?.achievements || [];
  const level = celebration?.level;

  return (
    <Modal
      open={Boolean(celebration)}
      onClose={onClose}
      size="sm"
      title={level ? `Level ${level} reached` : 'Achievement unlocked'}
      description={level ? 'Your XP crossed a level boundary.' : 'You unlocked something new.'}
      footer={
        <Button onClick={onClose} fullWidth>
          Nice
        </Button>
      }
    >
      <div className="space-y-3">
        {level && (
          <div className="animate-pop-in relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-gold/40 bg-gold/10 p-3.5 shadow-glow-gold">
            <span
              aria-hidden="true"
              className="animate-glow-pulse pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-gold/30 blur-2xl"
            />

            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-gold text-white shadow-glow-gold">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>

            <p className="relative min-w-0 font-display text-sm font-semibold text-foreground">
              You are now level {level}
            </p>
          </div>
        )}

        {achievements.map((entry) => {
          // The API may send either the flat definition or `{ definition }`.
          const definition = entry.definition || entry;

          return (
            <div
              key={definition.code || definition.name}
              className="animate-pop-in flex items-start gap-3.5 rounded-2xl border border-primary/25 bg-primary-soft/40 p-3.5 shadow-glow-sm"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-lg text-white shadow-glow-sm">
                {definition.icon ? (
                  <span aria-hidden="true">{definition.icon}</span>
                ) : (
                  <Trophy className="h-5 w-5" aria-hidden="true" />
                )}
              </span>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{definition.name}</p>
                {definition.description && <p className="text-xs text-muted">{definition.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

import { Trophy } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

/**
 * Completion feedback, shared by the chore board, My chores and the detail page.
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
          <div className="animate-pop-in relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 shadow-subtle">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-subtle">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>

            <p className="min-w-0 font-display text-sm font-semibold text-foreground">
              You are now level {level}
            </p>
          </div>
        )}

        {achievements.map((entry) => {
          const definition = entry.definition || entry;

          return (
            <div
              key={definition.code || definition.name}
              className="animate-pop-in flex items-start gap-3.5 rounded-2xl border border-primary/20 bg-primary-soft/40 p-3.5 shadow-subtle"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-base text-primary-fg shadow-subtle">
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

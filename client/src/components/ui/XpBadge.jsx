import { Star, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import Badge from './Badge';
import ProgressBar from './ProgressBar';
import { xpProgress } from '@/lib/catalogue';

/**
 * Level + XP display.
 * Clear, gamified but clean and grounded — no neon glow artifacts.
 */
export default function XpBadge({ xp = 0, level, rank, variant = 'chip', className }) {
  const progress = xpProgress(xp);
  const resolvedLevel = level ?? progress.level;

  if (variant === 'chip') {
    return (
      <Badge tone="gold" className={className}>
        <Zap className="h-3 w-3" aria-hidden="true" />
        Lv {resolvedLevel} &middot; {progress.totalXp.toLocaleString('en-IN')} XP
      </Badge>
    );
  }

  if (variant === 'rank') {
    return (
      <Badge tone={rank === 1 ? 'gold' : 'primary'} className={className}>
        <Trophy className="h-3 w-3" aria-hidden="true" />
        Rank #{rank ?? '--'}
      </Badge>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Star className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-xs font-semibold text-foreground">Level {resolvedLevel}</p>
          <p className="tabular text-xs text-muted">
            {progress.xpIntoLevel} / {progress.xpForNextLevel} XP
          </p>
        </div>

        <ProgressBar value={progress.progress} tone="gold" size="sm" className="mt-1.5" />

        <p className="mt-1 text-2xs text-muted">
          {progress.xpToNextLevel} XP to level {resolvedLevel + 1}
        </p>
      </div>
    </div>
  );
}

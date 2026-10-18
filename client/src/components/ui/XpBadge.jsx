import { Star, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import Badge from './Badge';
import ProgressBar from './ProgressBar';
import { xpProgress } from '@/lib/catalogue';

/**
 * Level + XP display.
 *
 * Two modes: a compact inline `level` chip (leaderboards, member lists) and a
 * full progress block with the bar to the next level (profile, dashboard).
 */
export default function XpBadge({ xp = 0, level, rank, variant = 'chip', className }) {
  const progress = xpProgress(xp);
  const resolvedLevel = level ?? progress.level;

  if (variant === 'chip') {
    return (
      <Badge tone="gold" className={className}>
        <Zap className="h-3 w-3" aria-hidden="true" />
        Lv {resolvedLevel} &middot; {xpProgress(xp).totalXp.toLocaleString('en-IN')} XP
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
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
        <Star className="h-5 w-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Level {resolvedLevel}</p>
          <p className="tabular text-xs text-muted">
            {progress.xpIntoLevel} / {progress.xpForNextLevel} XP
          </p>
        </div>

        <ProgressBar value={progress.progress} tone="gold" size="sm" className="mt-1.5" />

        <p className="mt-1 text-xs text-muted">
          {progress.xpToNextLevel} XP to level {resolvedLevel + 1}
        </p>
      </div>
    </div>
  );
}

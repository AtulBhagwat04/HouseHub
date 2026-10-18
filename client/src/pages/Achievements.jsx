import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import * as achievementService from '@/services/achievementService';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { cn } from '@/lib/cn';
import { formatDate, percentOf, pluralise } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  ProgressBar,
  SkeletonCards,
  SkeletonList,
  Tabs,
  XpBadge,
} from '@/components/ui';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unlocked', label: 'Unlocked' },
  { value: 'locked', label: 'Locked' },
];

/**
 * Achievements.
 *
 * Progress is recomputed by the server from the user's own counters, so this
 * page never decides whether something is earned - it only groups and renders.
 *
 * The catalogue lives in the database: if it has not been seeded, the response
 * is a genuinely empty list and the page says so rather than showing a blank
 * grid that looks broken.
 */
export default function Achievements() {
  useDocumentTitle('Achievements');

  const { houseId } = useAuth();
  const { data, error, loading, refetch } = useFetch(() => achievementService.fetchAchievements(houseId), [houseId]);
  const [filter, setFilter] = useState('all');

  const header = (
    <PageHeader
      title="Achievements"
      description="Milestones you pick up by doing your share around the house."
    />
  );

  if (loading) {
    return (
      <div className="page-stagger space-y-5">
        {header}
        <Card>
          <SkeletonList rows={2} />
        </Card>
        <SkeletonCards count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stagger space-y-5">
        {header}
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  if (!data) return <div className="page-stagger space-y-5">{header}</div>;

  const { achievements, unlockedCount, totalCount, xp } = data;

  if (achievements.length === 0) {
    return (
      <div className="page-stagger space-y-5">
        {header}

        <Card>
          <EmptyState
            icon={Sparkles}
            title="No achievements to show yet"
            description="The achievement catalogue has not been seeded on this server, so there is nothing to unlock. An administrator can run the seed script to load it."
            action={
              <Button as={Link} to="/chores" size="sm" variant="outline" icon={Plus}>
                Go to chores
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const unlocked = achievements.filter((entry) => entry.unlocked);
  const inProgress = achievements.filter((entry) => !entry.unlocked && entry.current > 0);
  const locked = achievements.filter((entry) => !entry.unlocked && entry.current === 0);

  const unlockedRatio = totalCount > 0 ? unlockedCount / totalCount : 0;

  // Which groups to show for the active filter. "Locked" covers everything not
  // yet earned, so in-progress ones stay visible there too.
  const sections = [];

  if (filter !== 'locked' && unlocked.length > 0) {
    sections.push({ key: 'unlocked', title: 'Unlocked', items: unlocked });
  }
  if (filter !== 'unlocked') {
    if (inProgress.length > 0) sections.push({ key: 'in-progress', title: 'In progress', items: inProgress });
    if (locked.length > 0) sections.push({ key: 'locked', title: 'Locked', items: locked });
  }

  const filterTabs = [
    { ...FILTERS[0], count: totalCount },
    { ...FILTERS[1], count: unlockedCount },
    { ...FILTERS[2], count: totalCount - unlockedCount },
  ];

  return (
    <div className="page-stagger space-y-5">
      {header}

      <Card className="relative overflow-hidden">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-gold/15 blur-3xl"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">Unlocked</p>
            <p className="tabular mt-1.5 font-display text-2xl font-semibold leading-none text-foreground">
              {unlockedCount}
              <span className="text-base font-normal text-muted"> / {totalCount}</span>
            </p>
            <div className="mt-2.5 w-full max-w-[11rem]">
              <ProgressBar value={unlockedRatio} tone="gold" size="sm" />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {pluralise(totalCount - unlockedCount, 'achievement')} still to earn
            </p>
          </div>

          <XpBadge
            xp={xp?.totalXp ?? 0}
            level={xp?.level}
            variant="full"
            className="w-full sm:max-w-xs"
          />
        </div>
      </Card>

      <Tabs value={filter} onChange={setFilter} tabs={filterTabs} />

      {sections.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon={Sparkles}
            title={filter === 'unlocked' ? 'Nothing unlocked yet' : 'Everything is unlocked'}
            description={
              filter === 'unlocked'
                ? 'Complete chores, add expenses and settle up to start ticking these off.'
                : 'You have earned every achievement in the catalogue. Impressive.'
            }
          />
        </Card>
      ) : (
        sections.map((section) => (
          <section key={section.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-foreground">{section.title}</h2>
              <Badge tone="neutral" size="sm">
                {section.items.length}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((achievement) => (
                <AchievementCard key={achievement._id} achievement={achievement} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Local pieces                                                               */
/* -------------------------------------------------------------------------- */

function AchievementCard({ achievement }) {
  const { unlocked, progress, current, target, icon, name, description, unlockedAt } = achievement;
  const remaining = Math.max(0, target - current);
  const inProgress = !unlocked && current > 0;

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border p-4 shadow-card transition sm:p-5',
        unlocked
          ? 'border-gold/40 bg-gold/5 shadow-glow-gold hover:-translate-y-0.5'
          : inProgress
            ? 'border-border bg-surface hover:-translate-y-0.5 hover:border-primary/40'
            : // Not started: desaturated and dimmed so it cannot be mistaken
              // for something earned.
              'border-border bg-surface/60 opacity-70 saturate-50 hover:opacity-100 hover:saturate-100',
      )}
    >
      {unlocked && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full bg-gold/20 blur-2xl"
        />
      )}

      <div className="relative flex items-start gap-3">
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl',
            unlocked
              ? 'bg-gradient-gold text-white shadow-glow-gold'
              : inProgress
                ? 'bg-primary-soft'
                : 'bg-surface-muted',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-sm font-semibold text-foreground">{name}</p>
            {unlocked && (
              <Badge tone="gold" size="sm">
                Unlocked
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-snug text-muted">{description}</p>
        </div>
      </div>

      <div className="relative mt-4 flex-1">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
          <span className="tabular">{unlocked ? 'Complete' : `${current} of ${target}`}</span>
          <span className="tabular">{percentOf(current, target)}%</span>
        </div>

        <ProgressBar value={progress} tone={unlocked ? 'gold' : 'primary'} size="sm" />
      </div>

      <p className="relative mt-2 text-xs text-muted">
        {unlocked ? `Unlocked ${formatDate(unlockedAt)}` : `${remaining} to go`}
      </p>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Medal, Trophy, Users } from 'lucide-react';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { cn } from '@/lib/cn';
import { pluralise } from '@/lib/format';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  SectionCard,
  SkeletonCards,
  SkeletonList,
} from '@/components/ui';

/** Gold, silver, bronze - the only place in the app that gets to be loud. */
const MEDALS = {
  1: { plinth: 'bg-gold/20', text: 'text-gold', ring: 'ring-2 ring-gold/50' },
  2: { plinth: 'bg-surface-muted', text: 'text-muted', ring: 'ring-2 ring-border' },
  3: { plinth: 'bg-warning-soft', text: 'text-warning', ring: 'ring-2 ring-warning/40' },
};

/**
 * The leaderboard.
 *
 * Ranking is the server's job: XP descending, then chores completed, then name.
 * This page only renders the order it is given, so the podium and the table can
 * never disagree with the rank stored elsewhere in the app.
 */
export default function Leaderboard() {
  useDocumentTitle('Leaderboard');

  const { houseId, user } = useAuth();
  const { data, error, loading, refetch } = useFetch(() => houseService.fetchLeaderboard(houseId), [houseId]);

  const header = (
    <PageHeader
      title="Leaderboard"
      description="Who has put the most into the house this term."
    />
  );

  if (loading) {
    return (
      <div className="space-y-5">
        {header}
        <Card>
          <SkeletonList rows={3} />
        </Card>
        <SkeletonCards count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        {header}
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  const entries = data?.entries || [];
  const totalMembers = data?.totalMembers ?? entries.length;

  // A leaderboard of one is not a leaderboard - encourage the user to fill it.
  if (entries.length <= 1) {
    return (
      <div className="space-y-5">
        {header}

        <Card>
          <EmptyState
            icon={Users}
            title="It is quiet in here"
            description="Completing chores earns XP. Invite a housemate and there will be somebody to race."
            action={
              <Button as={Link} to="/house" size="sm" variant="outline" icon={Users}>
                Invite housemates
              </Button>
            }
          />
        </Card>

        <TieBreakCard />
      </div>
    );
  }

  const [first, second, third] = entries;

  const columns = [
    {
      key: 'rank',
      header: 'Rank',
      align: 'center',
      cell: (row) => (
        <span className={cn('tabular text-sm font-semibold', MEDALS[row.rank]?.text || 'text-muted')}>
          {row.rank}
        </span>
      ),
    },
    {
      key: 'member',
      header: 'Member',
      mobilePrimary: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar src={row.avatarUrl} name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
              {row.name}
              {row._id === user?._id && (
                <Badge tone="primary" size="sm">
                  You
                </Badge>
              )}
            </p>
            {row._id === user?._id && <p className="text-2xs text-muted">This is your row</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      mobileLabel: 'Level',
      cell: (row) => <span className="tabular text-sm text-foreground">Lv {row.level}</span>,
    },
    {
      key: 'chores',
      header: 'Chores done',
      mobileLabel: 'Chores done',
      cell: (row) => <span className="tabular text-sm text-foreground">{row.choresCompleted}</span>,
    },
    {
      key: 'xp',
      header: 'XP',
      align: 'right',
      mobileLabel: 'XP',
      cell: (row) => <span className="tabular text-sm font-semibold text-gold">{row.xp} XP</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leaderboard"
        description={`${pluralise(totalMembers, 'member')} in the house, ranked by XP.`}
      />

      <Card>
        <div className="mb-4 flex items-center justify-center gap-2 text-sm font-medium text-foreground">
          <Trophy className="h-4 w-4 text-gold" aria-hidden="true" />
          Top of the house
        </div>

        <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
          {second ? <PodiumColumn entry={second} place={2} /> : <div aria-hidden="true" />}
          {first ? <PodiumColumn entry={first} place={1} /> : <div aria-hidden="true" />}
          {third ? <PodiumColumn entry={third} place={3} /> : <div aria-hidden="true" />}
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={entries}
        rowClassName={(row) => (row._id === user?._id ? 'bg-primary-soft/60' : undefined)}
        className="sm:rounded-xl sm:border sm:border-border sm:bg-surface sm:p-4 sm:shadow-card"
      />

      <TieBreakCard />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Local pieces                                                               */
/* -------------------------------------------------------------------------- */

function PodiumColumn({ entry, place }) {
  const medal = MEDALS[place] || MEDALS[3];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Avatar src={entry.avatarUrl} name={entry.name} size={place === 1 ? 'lg' : 'md'} className={medal.ring} />

      <p className="w-full truncate text-center text-xs font-medium text-foreground">{entry.name}</p>
      <p className="tabular text-2xs text-muted">
        Lv {entry.level} &middot; {entry.xp} XP
      </p>

      <div
        className={cn(
          'flex w-full items-center justify-center rounded-t-xl',
          medal.plinth,
          place === 1 ? 'h-20' : 'h-14',
        )}
      >
        <span className={cn('tabular text-lg font-bold', medal.text)}>{place}</span>
      </div>
    </div>
  );
}

/** The rules, stated exactly as the server applies them. */
function TieBreakCard() {
  return (
    <SectionCard title="How ranking works">
      <ul className="space-y-2.5 text-sm text-muted">
        <li className="flex gap-2">
          <Medal className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          Members are ordered by XP, highest first.
        </li>
        <li className="flex gap-2">
          <Medal className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          Members on the same XP are ordered by chores completed, and then by name.
        </li>
        <li className="flex gap-2">
          <Medal className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          Members tied on XP share a rank. The next member takes the rank matching their position, so a tie
          for first is followed by third.
        </li>
      </ul>
    </SectionCard>
  );
}

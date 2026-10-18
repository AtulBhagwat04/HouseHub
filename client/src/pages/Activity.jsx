import { useSearchParams } from 'react-router-dom';
import { Activity as ActivityIcon } from 'lucide-react';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { ACTIVITY_TYPES } from '@shared/constants.js';
import { formatRelativeTime, titleCase } from '@/lib/format';
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  SectionCard,
  SkeletonList,
  Tabs,
} from '@/components/ui';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 20;

const TYPE_TABS = [
  { value: '', label: 'All activity' },
  ...ACTIVITY_TYPES.map((value) => ({ value, label: titleCase(value) })),
];

/** Coarse tone per event type, so the timeline reads as good/bad/neutral at a glance. */
function toneFor(type) {
  if (type.endsWith('_completed') || type.endsWith('_confirmed') || type === 'member_joined') return 'success';
  if (type.endsWith('_deleted') || type.endsWith('_rejected') || type === 'member_left') return 'error';
  if (type.endsWith('_updated')) return 'warning';
  if (type === 'level_up' || type === 'achievement_unlocked') return 'gold';
  return 'primary';
}

const DOT_CLASSES = {
  primary: 'bg-primary',
  success: 'bg-success',
  error: 'bg-error',
  warning: 'bg-warning',
  gold: 'bg-gold',
};

/**
 * The house timeline.
 *
 * `message` is deliberately a sentence fragment that follows the actor's name
 * ("added the expense ..."), so the two are rendered together rather than the
 * server sending a whole pre-baked sentence.
 */
export default function Activity() {
  useDocumentTitle('Activity');

  const { houseId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1);
  const type = searchParams.get('type') || '';

  const { data, error, loading, refetch } = useFetch(
    () => houseService.fetchActivity(houseId, { page, limit: PAGE_SIZE, ...(type ? { type } : {}) }),
    [houseId, page, type],
  );

  const items = data?.items || [];
  const meta = data?.meta;

  function goToPage(next) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(next));
    setSearchParams(params);
  }

  function changeType(next) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('type', next);
    else params.delete('type');
    // A different filter is a different list, so start it from the first page.
    params.delete('page');
    setSearchParams(params);
  }

  return (
    <div className="space-y-5 page-stagger">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Activity' }]}
        title="Activity"
        description="The house history: expenses, chores, settlements and achievements, newest first."
      />

      <Tabs
        variant="pills"
        tabs={TYPE_TABS}
        value={type}
        onChange={changeType}
      />

      {loading ? (
        <SectionCard>
          <SkeletonList rows={6} />
        </SectionCard>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={ActivityIcon}
            title={type ? 'Nothing of this type yet' : 'No activity yet'}
            description={
              type
                ? 'Try a different filter, or clear it to see the whole timeline.'
                : 'Activity appears here as the house gets used - the first expense, chore or settlement will show up.'
            }
          />
        </SectionCard>
      ) : (
        <SectionCard>
          <ol className="space-y-0">
            {items.map((item) => {
              const tone = toneFor(item.type);
              const actorName = item.actor?.name || 'Someone';

              return (
                <li key={item._id} className="relative flex gap-3 pb-5 last:pb-0">
                  {/* Rail: a full-height hairline behind a dot, which is what makes
                      a stack of rows read as a single timeline. */}
                  <div className="relative flex w-6 shrink-0 justify-center" aria-hidden="true">
                    <span className="absolute inset-y-0 w-px bg-border" />
                    <span
                      className={cn(
                        'relative z-10 mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface',
                        DOT_CLASSES[tone] || DOT_CLASSES.primary,
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2.5">
                      <Avatar src={item.actor?.avatarUrl} name={actorName} size="sm" className="mt-0.5" />

                      <p className="min-w-0 text-sm leading-snug text-foreground">
                        <strong className="font-semibold">{actorName}</strong> {item.message}
                      </p>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-10">
                      <Badge tone={tone} size="sm">
                        {titleCase(item.type)}
                      </Badge>
                      <span className="text-2xs text-muted">{formatRelativeTime(item.createdAt)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </SectionCard>
      )}

      {!loading && !error && <Pagination meta={meta} onChange={goToPage} />}
    </div>
  );
}

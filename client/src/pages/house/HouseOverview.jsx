import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  MapPin,
  Plus,
  Receipt,
  Settings as SettingsIcon,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { categoryMeta, ROLE_LABELS } from '@/lib/catalogue';
import { formatCurrency, formatCurrencyCompact, formatDate, pluralise } from '@/lib/format';
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Card,
  CategoryIcon,
  EmptyState,
  ErrorState,
  PageHeader,
  ProgressBar,
  SectionCard,
  SkeletonCards,
  SkeletonList,
  StatCard,
  XpBadge,
} from '@/components/ui';
import InviteCard from '@/components/InviteCard';

/** Badge tones per role. Kept local because only this page and Members show them. */
const ROLE_TONES = { owner: 'gold', admin: 'primary', member: 'neutral' };

/**
 * The house overview.
 *
 * Three independent requests so a slow analytics aggregate never blocks the
 * house header or the invite card. `fetchHouse` only returns a member count, so
 * the members strip needs its own call - there is no way to derive names and
 * avatars from the house payload.
 */
export default function HouseOverview() {
  useDocumentTitle('House overview');

  const { houseId, house: sessionHouse, role, user } = useAuth();
  const location = useLocation();

  const { data, error, loading, refetch } = useFetch(() => houseService.fetchHouse(houseId), [houseId]);
  const {
    data: analytics,
    error: analyticsError,
    loading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useFetch(() => houseService.fetchAnalytics(houseId, { months: 6 }), [houseId]);
  const { data: memberData, loading: membersLoading, error: membersError, refetch: refetchMembers } = useFetch(
    () => houseService.fetchMembers(houseId),
    [houseId],
  );

  // Read once from the router state that Onboarding sets. Nothing is persisted:
  // a reload or a later visit simply does not show the banner again.
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const justCreated = Boolean(location.state?.justCreated);

  const house = data?.house;
  const members = memberData?.members || [];

  const viewerRole = house?.myRole || role;
  const viewerIsManager = viewerRole === 'owner' || viewerRole === 'admin';

  const totals = analytics?.totals;
  const monthly = analytics?.monthly || [];
  const categories = analytics?.categories || [];

  return (
    <div className="page-stagger space-y-5">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'House' }]}
        title={house?.name || sessionHouse?.name || 'House'}
        description={house?.description || 'Everything about this house in one place.'}
        actions={
          <>
            <Button as={Link} to="/expenses/new" size="sm" icon={Plus}>
              Add expense
            </Button>
            <Button as={Link} to="/chores/new" variant="outline" size="sm" icon={Plus}>
              Add chore
            </Button>
            {viewerIsManager && (
              <Button as={Link} to="/house/settings" variant="ghost" size="sm" icon={SettingsIcon}>
                House settings
              </Button>
            )}
          </>
        }
      />

      {loading ? (
        <div className="space-y-5">
          <SkeletonCards count={3} />
          <Card>
            <SkeletonList rows={4} />
          </Card>
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !house ? null : (
        <>
          {justCreated && !welcomeDismissed && (
            <Card className="animate-fade-in border-primary/30 bg-primary-soft/60">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">&ldquo;{house.name}&rdquo; is ready</p>
                  <p className="mt-0.5 text-sm text-muted text-pretty">
                    Share the invite link below so your housemates can join.
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWelcomeDismissed(true)}
                  aria-label="Dismiss the welcome message"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Hero ---------------------------------------------------------- */}
          <Card className="overflow-hidden">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
            />

            <div className="relative flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">{house.name}</h2>
              <Badge tone={ROLE_TONES[viewerRole] || 'neutral'}>
                {ROLE_LABELS[viewerRole] || 'Member'}
              </Badge>
            </div>

            <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              {house.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {house.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {pluralise(house.memberCount, 'member')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Created {formatDate(house.createdAt)}
              </span>
            </div>

            {house.description && (
              <p className="relative mt-3 max-w-2xl text-sm text-foreground/90 text-pretty">{house.description}</p>
            )}
          </Card>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Analytics ------------------------------------------------- */}
            <div className="space-y-5 lg:col-span-2">
              {analyticsLoading ? (
                <div className="space-y-5">
                  <SkeletonCards count={3} />
                  <Card>
                    <SkeletonList rows={4} />
                  </Card>
                </div>
              ) : analyticsError ? (
                <Card>
                  <ErrorState error={analyticsError} onRetry={refetchAnalytics} />
                </Card>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                      label="Total spend"
                      value={formatCurrency(totals?.total)}
                      sub={`across ${pluralise(totals?.expenseCount || 0, 'expense')}`}
                      icon={Receipt}
                      tone="primary"
                    />
                    <StatCard
                      label="Expenses"
                      value={totals?.expenseCount ?? 0}
                      sub="recorded in this house"
                      icon={BarChart3}
                    />
                    <StatCard
                      label="Average expense"
                      value={formatCurrency(totals?.average)}
                      sub="per bill"
                      icon={TrendingUp}
                    />
                  </div>

                  <SectionCard title="Monthly spend" description="The last six months, oldest first.">
                    {monthly.length === 0 || !totals?.expenseCount ? (
                      <EmptyState
                        compact
                        icon={BarChart3}
                        title="Nothing to chart yet"
                        description="Add the first expense and this chart starts filling in."
                        action={
                          <Button as={Link} to="/expenses/new" size="sm" variant="outline" icon={Plus}>
                            Add expense
                          </Button>
                        }
                      />
                    ) : (
                      // Fixed height on the wrapper: ResponsiveContainer collapses
                      // to nothing when its parent has no height of its own.
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-border))" vertical={false} />
                            <XAxis
                              dataKey="label"
                              tick={{ fill: 'rgb(var(--c-muted))', fontSize: 12 }}
                              tickLine={false}
                              axisLine={{ stroke: 'rgb(var(--c-border))' }}
                            />
                            <YAxis
                              tickFormatter={formatCurrencyCompact}
                              tick={{ fill: 'rgb(var(--c-muted))', fontSize: 12 }}
                              tickLine={false}
                              axisLine={false}
                              width={64}
                            />
                            <Tooltip
                              cursor={{ fill: 'rgb(var(--c-surface-muted))' }}
                              formatter={(value) => [formatCurrency(value), 'Spent']}
                              contentStyle={{
                                backgroundColor: 'rgb(var(--c-surface))',
                                border: '1px solid rgb(var(--c-border))',
                                borderRadius: 12,
                                fontSize: 12,
                              }}
                              labelStyle={{ color: 'rgb(var(--c-foreground))', fontWeight: 600 }}
                              itemStyle={{ color: 'rgb(var(--c-foreground))' }}
                            />
                            <Bar dataKey="total" fill="rgb(var(--c-primary))" radius={[6, 6, 0, 0]} maxBarSize={44} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Where the money goes" description="Every category, largest first.">
                    {categories.length === 0 ? (
                      <EmptyState
                        compact
                        icon={Receipt}
                        title="No expenses yet"
                        description="Add the first bill and HOUSEHUB will work out who owes what."
                        action={
                          <Button as={Link} to="/expenses/new" size="sm" variant="outline" icon={Plus}>
                            Add expense
                          </Button>
                        }
                      />
                    ) : (
                      <ul className="space-y-3.5">
                        {categories.map((entry) => (
                          <li key={entry.category}>
                            <div className="flex items-center gap-3">
                              <CategoryIcon category={entry.category} size="sm" />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="truncate text-sm font-medium text-foreground">
                                    {categoryMeta(entry.category).label}
                                  </span>
                                  <span className="tabular shrink-0 text-sm font-semibold text-foreground">
                                    {formatCurrency(entry.total)}
                                  </span>
                                </div>

                                <ProgressBar value={entry.percentage / 100} size="sm" className="mt-1.5" />

                                <div className="mt-1 flex items-center justify-between gap-2 text-2xs text-muted">
                                  <span className="tabular">{entry.percentage}%</span>
                                  <span className="truncate">{pluralise(entry.count, 'expense')}</span>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                </>
              )}
            </div>

            {/* Right column ---------------------------------------------- */}
            <div className="space-y-5">
              <InviteCard
                houseId={houseId}
                inviteCode={house.inviteCode}
                inviteLink={data?.inviteLink}
                allowInvites={house.settings?.allowInvites !== false}
                canManage={viewerIsManager}
              />

              <SectionCard
                title="Housemates"
                description={pluralise(house.memberCount, 'member')}
                action={
                  <Button as={Link} to="/house/members" variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
                    All
                  </Button>
                }
              >
                {membersLoading ? (
                  <SkeletonList rows={3} />
                ) : membersError ? (
                  <ErrorState error={membersError} onRetry={refetchMembers} title="Could not load members" />
                ) : members.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Users}
                    title="Nobody else yet"
                    description="Share the invite link to bring your housemates in."
                  />
                ) : (
                  <>
                    <AvatarGroup members={members} max={6} className="mb-4" />

                    <ul className="divide-y divide-border">
                      {members.slice(0, 5).map((member) => (
                        <li key={member._id}>
                          <Link
                            to="/house/members"
                            className="group flex items-center gap-3 py-3 transition hover:opacity-80"
                          >
                            <Avatar src={member.avatarUrl} name={member.name} size="sm" />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {member.name}
                                {member._id === user?._id && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                              </p>
                              <p className="truncate text-2xs text-muted">
                                {ROLE_LABELS[member.role] || 'Member'}
                              </p>
                            </div>

                            <XpBadge xp={member.xp} level={member.level} variant="chip" className="shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </SectionCard>

              <SectionCard
                title="House preferences"
                action={
                  viewerIsManager ? (
                    <Button as={Link} to="/house/settings" variant="ghost" size="sm">
                      Edit
                    </Button>
                  ) : null
                }
              >
                <ul className="divide-y divide-border">
                  <PreferenceRow label="Invites" enabled={house.settings?.allowInvites !== false} />
                  <PreferenceRow label="Notifications" enabled={house.settings?.notificationsEnabled !== false} />
                  <li className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm text-foreground">Weekly chore goal</span>
                    <span className="tabular text-sm font-medium text-foreground">
                      {house.settings?.weeklyChoreGoal ?? '—'}
                    </span>
                  </li>
                </ul>
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** One boolean house setting, shown as a tick or a cross rather than "true"/"false". */
function PreferenceRow({ label, enabled }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 text-sm font-medium ${enabled ? 'text-success' : 'text-muted'}`}
      >
        {enabled ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
        {enabled ? 'On' : 'Off'}
      </span>
    </li>
  );
}

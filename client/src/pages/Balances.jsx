import { useState } from 'react';
import { ArrowRight, CheckCircle2, HandCoins, Receipt, Scale, TrendingUp, Wallet } from 'lucide-react';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { formatCurrency, pluralise } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Money,
  PageHeader,
  SectionCard,
  SkeletonCards,
  SkeletonList,
  StatCard,
  Tooltip,
  UserChip,
} from '@/components/ui';
import SettlementDialog from '@/components/SettlementDialog';

/** Positive net means the house owes this person; negative means they owe the house. */
function netStatus(net) {
  if (net > 0) return { label: 'Owed', tone: 'success' };
  if (net < 0) return { label: 'Owes', tone: 'error' };
  return { label: 'Settled', tone: 'neutral' };
}

/**
 * Balances.
 *
 * Nothing on this page is stored: the server rebuilds every figure from the real
 * expenses and the confirmed settlements on each request, so deleting an expense
 * (or rejecting a settlement) corrects the whole picture immediately. The
 * suggested transfers are the smallest set of payments that would zero everyone.
 */
export default function Balances() {
  useDocumentTitle('Balances');

  const { houseId, user } = useAuth();
  const { data, error, loading, refetch } = useFetch(() => houseService.fetchBalances(houseId), [houseId]);

  const [dialog, setDialog] = useState({ open: false });

  const openDialog = (defaults = {}) => setDialog({ open: true, ...defaults });
  const closeDialog = () => setDialog((current) => ({ ...current, open: false }));

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Balances" />
        <SkeletonCards count={3} />
        <Card>
          <SkeletonList rows={4} />
        </Card>
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const { members = [], suggestedTransfers = [], totalExpenses = 0, settlementCount = 0 } = data;

  const me = members.find((member) => member._id === user?._id);
  const myNet = me?.net ?? 0;
  const outstanding = members.reduce((sum, member) => sum + (member.net > 0 ? member.net : 0), 0);
  const unsettledCount = members.filter((member) => member.net !== 0).length;

  const iOwe = suggestedTransfers.filter((transfer) => transfer.from === user?._id);
  const owedToMe = suggestedTransfers.filter((transfer) => transfer.to === user?._id);
  const settledUp = iOwe.length === 0 && owedToMe.length === 0;

  const columns = [
    {
      key: 'member',
      header: 'Member',
      mobilePrimary: true,
      cell: (member) => (
        <UserChip user={member} subtitle={member._id === user?._id ? 'You' : undefined} truncate />
      ),
    },
    {
      key: 'net',
      header: 'Balance',
      align: 'right',
      mobileLabel: 'Balance',
      cell: (member) => <Money paise={member.net} signed tone="auto" />,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      mobileLabel: 'Status',
      cell: (member) => {
        const status = netStatus(member.net);
        return (
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 page-stagger">
      <PageHeader
        title="Balances"
        description="Recalculated from real expenses and confirmed settlements every time this page loads - nothing here is stored."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Balances' }]}
        actions={
          <Button icon={HandCoins} onClick={() => openDialog()}>
            Record a settlement
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total house spend"
          value={formatCurrency(totalExpenses)}
          sub={`${pluralise(members.length, 'member')} · ${pluralise(settlementCount, 'settlement')}`}
          icon={Receipt}
          tone="primary"
        />
        <StatCard
          label="Your net"
          value={<Money paise={myNet} signed tone={myNet > 0 ? 'success' : myNet < 0 ? 'error' : 'muted'} />}
          sub={myNet > 0 ? 'the house owes you' : myNet < 0 ? 'you owe the house' : 'you are all square'}
          icon={Wallet}
          tone={myNet > 0 ? 'success' : myNet < 0 ? 'error' : 'default'}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          sub={outstanding > 0 ? `${pluralise(unsettledCount, 'person', 'people')} not settled` : 'everyone is settled up'}
          icon={Scale}
          tone={outstanding > 0 ? 'warning' : 'success'}
        />
      </div>

      <SectionCard
        title="Your position"
        description="Based on the suggested settlements - the fewest payments that would clear the house."
      >
        {settledUp ? (
          <EmptyState
            compact
            icon={CheckCircle2}
            title="You are all settled up"
            description="Nothing is outstanding between you and your housemates right now."
          />
        ) : (
          <ul className="space-y-2.5">
            {iOwe.map((transfer) => (
              <li
                key={`owe-${transfer.to}`}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-error/20 bg-error-soft/50 px-3 py-2.5"
              >
                <TrendingUp className="h-4 w-4 shrink-0 rotate-180 text-error" aria-hidden="true" />
                <span className="text-sm text-muted">You owe</span>
                <UserChip user={transfer.toUser} size="sm" />
                <Money paise={transfer.amount} tone="error" className="ml-auto" />
              </li>
            ))}

            {owedToMe.map((transfer) => (
              <li
                key={`owed-${transfer.from}`}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-success/20 bg-success-soft/50 px-3 py-2.5"
              >
                <TrendingUp className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <UserChip user={transfer.fromUser} size="sm" />
                <span className="text-sm text-muted">owes you</span>
                <Money paise={transfer.amount} tone="success" className="ml-auto" />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Member balances" description="A positive balance means the house owes that person.">
        <DataTable columns={columns} rows={members} getRowKey={(member) => member._id} />
      </SectionCard>

      <SectionCard
        title="Suggested settlements"
        description="Paying these exact amounts would leave everyone square with the smallest number of transfers."
      >
        {suggestedTransfers.length === 0 ? (
          <EmptyState
            compact
            icon={CheckCircle2}
            title="Nothing to settle"
            description="Every balance is already at zero."
          />
        ) : (
          <ul className="divide-y divide-border">
            {suggestedTransfers.map((transfer) => {
              const mine = transfer.from === user?._id || transfer.to === user?._id;

              return (
                <li
                  key={`${transfer.from}-${transfer.to}`}
                  className="-mx-2 flex flex-wrap items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-primary/[0.04]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <UserChip user={transfer.fromUser} size="sm" truncate />
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                    <UserChip user={transfer.toUser} size="sm" truncate />
                  </div>

                  <Money paise={transfer.amount} tone="default" />

                  <Tooltip content={mine ? undefined : 'This payment is between two other housemates'}>
                    <span className="inline-flex">
                      <Button
                        size="sm"
                        variant={mine ? 'secondary' : 'outline'}
                        icon={HandCoins}
                        disabled={!mine}
                        onClick={() =>
                          openDialog({ from: transfer.from, to: transfer.to, amount: transfer.amount })
                        }
                      >
                        Settle up
                      </Button>
                    </span>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SettlementDialog
        open={dialog.open}
        onClose={closeDialog}
        onCreated={() => {
          refetch();
        }}
        defaultFrom={dialog.from}
        defaultTo={dialog.to}
        defaultAmount={dialog.amount}
        houseId={houseId}
        members={members}
      />
    </div>
  );
}

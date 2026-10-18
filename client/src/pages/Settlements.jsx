import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  HandCoins,
  MoreVertical,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import * as settlementService from '@/services/settlementService';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { SETTLEMENT_STYLES } from '@/lib/catalogue';
import { formatRelativeTime } from '@/lib/format';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Dropdown,
  EmptyState,
  ErrorState,
  Modal,
  Money,
  PageHeader,
  Pagination,
  Tabs,
  Textarea,
  UserChip,
} from '@/components/ui';
import SettlementDialog from '@/components/SettlementDialog';

const PAGE_SIZE = 20;

/** A populated reference serialises as an object; an unpopulated one as an id. */
function idOf(value) {
  return typeof value === 'object' && value !== null ? value._id : value;
}

/**
 * Settlements.
 *
 * The confirmation rule is the whole point of this page: whoever asked for the
 * settlement cannot approve it, so the confirm/reject actions are shown only to
 * the receiving person. Until they act, the amount does not move any balance.
 */
export default function Settlements() {
  useDocumentTitle('Settlements');

  const { houseId, user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') || '';
  const onlyMine = searchParams.get('scope') === 'mine';
  const page = Number(searchParams.get('page')) || 1;

  const params = useMemo(() => {
    const next = { page, limit: PAGE_SIZE };
    if (status) next.status = status;
    if (onlyMine) next.scope = 'mine';
    return next;
  }, [page, status, onlyMine]);

  const { data, error, loading, refetch } = useFetch(
    () => settlementService.listSettlements(houseId, params),
    [houseId, page, status, onlyMine],
  );

  const { data: memberData } = useFetch(() => houseService.fetchMembers(houseId), [houseId]);
  const members = useMemo(() => memberData?.members ?? [], [memberData]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectBusy, setRejectBusy] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const setParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const items = data?.items ?? [];
  const meta = data?.meta;
  const counts = meta?.counts ?? {};
  const hasFilters = Boolean(status) || onlyMine;

  async function handleConfirm(settlement) {
    setBusyId(settlement._id);
    try {
      await settlementService.confirmSettlement(houseId, settlement._id);
      toast.success('Settlement confirmed');
      refetch();
    } catch (actionError) {
      toast.fromError(actionError);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemind(settlement) {
    setBusyId(settlement._id);
    try {
      const message = await settlementService.remindSettlement(houseId, settlement._id);
      toast.success(message || 'Reminder sent');
      refetch();
    } catch (actionError) {
      toast.fromError(actionError);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setRejectBusy(true);
    try {
      await settlementService.rejectSettlement(houseId, rejectTarget._id, rejectReason.trim());
      toast.success('Settlement rejected');
      setRejectTarget(null);
      setRejectReason('');
      refetch();
    } catch (actionError) {
      toast.fromError(actionError);
    } finally {
      setRejectBusy(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      const message = await settlementService.cancelSettlement(houseId, cancelTarget._id);
      toast.success(message || 'Settlement cancelled');
      setCancelTarget(null);
      refetch();
    } catch (actionError) {
      toast.fromError(actionError);
    } finally {
      setCancelBusy(false);
    }
  }

  const tabs = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending', count: counts.pending },
    { value: 'confirmed', label: 'Confirmed', count: counts.confirmed },
    { value: 'rejected', label: 'Rejected' },
  ];

  const columns = [
    {
      key: 'route',
      header: 'Between',
      mobilePrimary: true,
      cell: (settlement) => (
        <div className="flex items-center gap-2">
          <UserChip user={settlement.from} size="sm" truncate />
          <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <UserChip user={settlement.to} size="sm" truncate />
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      mobileLabel: 'Amount',
      cell: (settlement) => <Money paise={settlement.amount} tone="default" />,
    },
    {
      key: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: (settlement) => {
        const style = SETTLEMENT_STYLES[settlement.status] || SETTLEMENT_STYLES.pending;
        return <Badge tone={style.tone}>{style.label}</Badge>;
      },
    },
    {
      key: 'note',
      header: 'Note',
      mobileLabel: 'Note',
      cell: (settlement) => <span className="text-sm text-muted">{settlement.note || '—'}</span>,
    },
    {
      key: 'created',
      header: 'Created',
      mobileLabel: 'Created',
      cell: (settlement) => <span className="text-xs text-muted">{formatRelativeTime(settlement.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      mobileTrailing: true,
      cell: (settlement) => {
        const toId = idOf(settlement.to);
        const requesterId = idOf(settlement.requestedBy);
        const pending = settlement.status === 'pending';
        const isRecipient = toId === user?._id;
        const isRequester = requesterId === user?._id;

        const actions = [];
        if (pending && isRecipient) {
          actions.push({ label: 'Confirm', icon: CheckCircle2, onClick: () => handleConfirm(settlement) });
          actions.push({
            label: 'Reject',
            icon: XCircle,
            danger: true,
            onClick: () => {
              setRejectTarget(settlement);
              setRejectReason('');
            },
          });
        }
        if (pending && isRequester) {
          actions.push({ label: 'Cancel request', icon: Trash2, danger: true, onClick: () => setCancelTarget(settlement) });
          actions.push({ label: 'Send reminder', icon: Bell, onClick: () => handleRemind(settlement) });
        }

        if (actions.length === 0) return null;

        return (
          <Dropdown
            align="right"
            disabled={busyId === settlement._id}
            items={actions}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Settlement actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-5 page-stagger">
      <PageHeader
        title="Settlements"
        description="Money moving between housemates. A settlement only affects balances once the receiving person confirms it."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Settlements' }]}
        actions={
          <Button icon={HandCoins} onClick={() => setDialogOpen(true)}>
            Record settlement
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          variant="pills"
          className="flex-1"
          tabs={tabs}
          value={status}
          onChange={(value) => setParam('status', value)}
        />

        <Checkbox
          label="Only mine"
          checked={onlyMine}
          onChange={(event) => setParam('scope', event.target.checked ? 'mine' : '')}
          description={counts.myPending ? `${counts.myPending} pending involving you` : undefined}
          containerClassName="shrink-0"
        />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            emptyState={
              <EmptyState
                icon={HandCoins}
                title={hasFilters ? 'No settlements match this view' : 'No settlements yet'}
                description={
                  hasFilters
                    ? 'Try a different status, or turn off "Only mine".'
                    : 'A settlement records money moving between housemates. Balances only change once the receiving person confirms it.'
                }
                action={
                  hasFilters ? (
                    <Button variant="outline" size="sm" icon={RotateCcw} onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button size="sm" icon={HandCoins} onClick={() => setDialogOpen(true)}>
                      Record settlement
                    </Button>
                  )
                }
              />
            }
            // No outer card on phones - the stacked rows already look like
            // cards, and nesting them would double up the borders.
            className="sm:rounded-xl sm:border sm:border-border sm:bg-surface sm:p-4 sm:shadow-card"
          />

          <Pagination meta={meta} onChange={(next) => setParam('page', String(next))} itemLabel="settlement" />
        </>
      )}

      <SettlementDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          refetch();
        }}
        houseId={houseId}
        members={members}
      />

      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Reject settlement"
        description="The other person will be told. A reason is optional but helpful."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejectBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} loading={rejectBusy}>
              Reject settlement
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason"
          rows={3}
          placeholder="I have not received this payment yet"
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          hint="Optional."
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel this request?"
        description={
          cancelTarget
            ? `The request for ${formatRelativeTime(cancelTarget.createdAt)} will be withdrawn. Nobody's balance changes.`
            : undefined
        }
        confirmLabel="Cancel request"
        cancelLabel="Keep it"
        loading={cancelBusy}
      />
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { SmsHubDelivery, SmsHubDeliveryOutcome } from '../types/hotel';
import { formatDateTime } from '../lib/format';
import { Card, Empty, ErrorNote, Icon, inputClass, Loading, Modal, PageHeader, StatCard } from '../components/ui';

const OUTCOME_BADGE: Record<SmsHubDeliveryOutcome, string> = {
  SENT: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  SKIPPED: 'bg-[#e7ddd0] text-[#786f62]',
};

function OutcomePill({ outcome }: { outcome: SmsHubDeliveryOutcome }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${OUTCOME_BADGE[outcome]}`}>
      {outcome}
    </span>
  );
}

function formatMsisdn(to: string) {
  if (/^233\d{9}$/.test(to)) {
    const local = `0${to.slice(3)}`;
    return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return to;
}

export const SmsDeliveriesView: React.FC = () => {
  const { property } = useHotel();
  const [outcome, setOutcome] = useState<SmsHubDeliveryOutcome | ''>('');
  const [phone, setPhone] = useState('');
  const [appliedPhone, setAppliedPhone] = useState('');
  const [selected, setSelected] = useState<SmsHubDelivery | null>(null);

  const status = useApi(() => api.smsStatus(), [], true);
  const deliveries = useApi(
    () =>
      api.smsDeliveries({
        outcome: outcome || undefined,
        phone: appliedPhone || undefined,
        limit: 100,
      }),
    [outcome, appliedPhone],
    true,
  );

  const stats = useMemo(() => {
    const s = status.data?.stats;
    return {
      enabled: status.data?.enabled ?? false,
      total: s?.TOTAL ?? 0,
      sent: s?.SENT ?? 0,
      failed: s?.FAILED ?? 0,
      skipped: s?.SKIPPED ?? 0,
    };
  }, [status.data]);

  const items = deliveries.data?.items || [];
  const tz = property?.timezone;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-16 sm:p-8">
      <PageHeader
        title="SMS Deliveries"
        subtitle="Live Hubtel send log from Redis — success, failures, and skips"
        actions={
          <button
            type="button"
            onClick={() => {
              void status.reload();
              void deliveries.reload();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e7ddd0] bg-white px-3.5 py-2 text-xs font-bold text-[#161410] hover:bg-[#f4efe6]"
          >
            <Icon name="refresh" className="text-[18px]" />
            Refresh
          </button>
        }
      />

      <ErrorNote
        message={status.error || deliveries.error}
        onRetry={() => {
          void status.reload();
          void deliveries.reload();
        }}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Provider"
          icon="cell_tower"
          value={stats.enabled ? 'On' : 'Off'}
          detail={stats.enabled ? 'Hubtel SMS ready' : 'Check .env credentials'}
        />
        <StatCard label="Total logged" icon="sms" value={stats.total} detail="Last 30 days" />
        <StatCard label="Sent" icon="mark_chat_read" value={stats.sent} detail="Hubtel accepted" />
        <StatCard label="Failed" icon="sms_failed" value={stats.failed} detail="Needs attention" />
        <StatCard label="Skipped" icon="block" value={stats.skipped} detail="Dry-run / unconfigured" />
      </div>

      <Card className="p-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedPhone(phone.trim());
          }}
        >
          <label className="min-w-[140px] flex-1 text-[11px] font-semibold text-[#786f62]">
            Outcome
            <select
              className={`${inputClass} mt-1`}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as SmsHubDeliveryOutcome | '')}
            >
              <option value="">All</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="SKIPPED">Skipped</option>
            </select>
          </label>
          <label className="min-w-[180px] flex-[2] text-[11px] font-semibold text-[#786f62]">
            Phone
            <input
              className={`${inputClass} mt-1`}
              placeholder="054 633 5113"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-[#006194] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#007bb9]"
          >
            Filter
          </button>
          {(outcome || appliedPhone) && (
            <button
              type="button"
              onClick={() => {
                setOutcome('');
                setPhone('');
                setAppliedPhone('');
              }}
              className="rounded-lg border border-[#e7ddd0] bg-white px-3.5 py-2 text-xs font-bold text-[#786f62]"
            >
              Clear
            </button>
          )}
        </form>
      </Card>

      {deliveries.loading && !deliveries.data ? (
        <Loading label="Loading SMS deliveries…" />
      ) : items.length === 0 ? (
        <Empty
          icon="sms"
          title="No SMS deliveries logged yet"
          detail="Send a Golden Ticket or SMS campaign — results appear here automatically."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-[#e7ddd0] bg-[#faf7f2] text-[10px] uppercase tracking-wide text-[#786f62]">
                <tr>
                  <th className="px-4 py-3 font-bold">When</th>
                  <th className="px-4 py-3 font-bold">To</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Hubtel</th>
                  <th className="px-4 py-3 font-bold">Message</th>
                  <th className="px-4 py-3 font-bold" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-[#f0ebe3] last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-[#786f62]">{formatDateTime(row.createdAt, tz)}</td>
                    <td className="px-4 py-3 font-semibold text-[#161410]">{formatMsisdn(row.to)}</td>
                    <td className="px-4 py-3">
                      <OutcomePill outcome={row.outcome} />
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-[#786f62]">
                      <p className="truncate">
                        {row.hubtelStatus != null ? `status ${row.hubtelStatus}` : '—'}
                        {row.statusDescription ? ` · ${row.statusDescription}` : ''}
                      </p>
                      {row.messageId ? (
                        <p className="mt-0.5 truncate font-mono text-[10px] text-[#9a9186]">{row.messageId}</p>
                      ) : null}
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-[#786f62]">
                      <p className="truncate">{row.contentPreview}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="text-[11px] font-bold text-[#006194] hover:underline"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-[#e7ddd0] px-4 py-2 text-[10px] text-[#9a9186]">
            Showing {items.length} of {deliveries.data?.total ?? items.length} · retained 30 days in Redis
          </p>
        </Card>
      )}

      {selected ? (
        <Modal title="SMS delivery details" icon="sms" onClose={() => setSelected(null)} width="max-w-2xl">
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <OutcomePill outcome={selected.outcome} />
              <span className="text-xs text-[#786f62]">{formatDateTime(selected.createdAt, tz)}</span>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#9a9186]">To</dt>
                <dd className="mt-0.5 font-semibold">{formatMsisdn(selected.to)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#9a9186]">From</dt>
                <dd className="mt-0.5 font-semibold">{selected.from}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#9a9186]">Hubtel status</dt>
                <dd className="mt-0.5">
                  {selected.hubtelStatus ?? '—'}
                  {selected.statusDescription ? ` · ${selected.statusDescription}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#9a9186]">Message ID</dt>
                <dd className="mt-0.5 break-all font-mono text-xs">{selected.messageId || '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#9a9186]">Network / rate</dt>
                <dd className="mt-0.5">
                  {selected.networkId || '—'}
                  {selected.rate != null ? ` · GHS ${selected.rate}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#9a9186]">Reference</dt>
                <dd className="mt-0.5 break-all font-mono text-xs">{selected.clientReference || '—'}</dd>
              </div>
            </dl>
            {selected.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {selected.error}
              </div>
            ) : null}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a9186]">Full message</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-[#e7ddd0] bg-[#faf7f2] p-3 text-xs text-[#161410]">
                {selected.content}
              </pre>
            </div>
            {selected.meta && Object.keys(selected.meta).length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a9186]">Meta</p>
                <pre className="mt-1 overflow-x-auto rounded-lg border border-[#e7ddd0] bg-[#faf7f2] p-3 text-[11px] text-[#786f62]">
                  {JSON.stringify(selected.meta, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

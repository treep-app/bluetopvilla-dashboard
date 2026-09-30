import React, { useEffect, useMemo, useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import type {
  GoldenTicket,
  GoldenTicketCampaign,
  GoldenTicketRecipient,
  GoldenTicketStatus,
  IssueGoldenTicketInput,
  SmsDeliveryStatus,
} from '../types/hotel';
import { formatDateTime } from '../lib/format';
import { Card, Empty, ErrorNote, Icon, inputClass, Loading, PageHeader, StatCard } from '../components/ui';

const STATUSES: Array<GoldenTicketStatus | ''> = ['', 'ISSUED', 'REVEALED', 'REDEEMED', 'EXPIRED', 'CANCELLED'];

const STATUS_BADGE: Record<GoldenTicketStatus, string> = {
  ISSUED: 'bg-[#cce5ff] text-[#006194]',
  REVEALED: 'bg-[#ffdcc3] text-[#2f1500]',
  REDEEMED: 'bg-emerald-100 text-emerald-800',
  EXPIRED: 'bg-[#e7ddd0] text-[#786f62]',
  CANCELLED: 'bg-[#ffdad6] text-[#93000a]',
};

const SMS_BADGE: Record<SmsDeliveryStatus, string> = {
  NONE: 'bg-[#e7ddd0] text-[#786f62]',
  PENDING: 'bg-[#fff3cd] text-[#7a5b00]',
  SENT: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-[#ffdad6] text-[#93000a]',
  SKIPPED: 'bg-[#e7ddd0] text-[#5c5346]',
};

function StatusPill({ status }: { status: GoldenTicketStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${STATUS_BADGE[status]}`}>
      {status}
    </span>
  );
}

function SmsPill({ status }: { status: SmsDeliveryStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${SMS_BADGE[status]}`}>
      SMS {status}
    </span>
  );
}

function validateGhanaPhone(raw: string): { ok: true; display: string } | { ok: false; error: string } {
  const digits = raw.replace(/\D/g, '');
  let msisdn = digits;
  if (digits.startsWith('0') && digits.length === 10) msisdn = `233${digits.slice(1)}`;
  else if (digits.length === 9) msisdn = `233${digits}`;
  if (!/^233[2-9]\d{8}$/.test(msisdn)) {
    return { ok: false, error: 'Enter a valid Ghana mobile number (e.g. 055 917 1787).' };
  }
  const local = `0${msisdn.slice(3)}`;
  return { ok: true, display: `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` };
}

function validityLabel(campaign: GoldenTicketCampaign) {
  return `${campaign.expiryDays} day${campaign.expiryDays === 1 ? '' : 's'} from send`;
}

/** How the Golden Ticket SMS appears on a customer's phone. */
const PhoneSmsPreview: React.FC<{
  body: string;
  toLabel?: string;
  compact?: boolean;
}> = ({ body, toLabel, compact }) => (
  <div className={`mx-auto w-full ${compact ? 'max-w-[260px]' : 'max-w-[280px]'}`}>
    <div className="rounded-[2rem] border-[3px] border-[#1b2c38] bg-[#0f1a22] p-2 shadow-xl shadow-black/20">
      <div className="overflow-hidden rounded-[1.55rem] bg-[#e8eef2]">
        <div className="flex items-center gap-2 bg-[#1b2c38] px-3 py-2.5 text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d99d26]/90 text-[11px] font-bold text-[#161410]">
            BT
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold leading-tight">BlueTop</p>
            <p className="truncate text-[9px] text-white/55">{toLabel || 'SMS · Ghana'}</p>
          </div>
        </div>
        <div className={`space-y-2 bg-[#dfe7ec] px-3 ${compact ? 'py-3' : 'py-4'}`}>
          <p className="text-center text-[9px] font-medium uppercase tracking-wide text-[#5c6670]">Today</p>
          <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-white px-3 py-2.5 text-[11px] leading-relaxed text-[#161410] shadow-sm">
            <p className="whitespace-pre-wrap">{body}</p>
          </div>
          <p className="pl-1 text-[9px] text-[#5c6670]">Blue Top Villa · SMS</p>
        </div>
      </div>
    </div>
  </div>
);

type WizardStep = 1 | 2 | 3;

type IssueFormState = {
  phone: string;
  guestName: string;
  email: string;
  campaignId: string;
  sendEmail: boolean;
  resend: boolean;
};

const emptyForm = (campaignId = ''): IssueFormState => ({
  phone: '',
  guestName: '',
  email: '',
  campaignId,
  sendEmail: false,
  resend: false,
});

export const GoldenTicketsView: React.FC = () => {
  const { hasPermission, property } = useHotel();
  const canManage = hasPermission('canManagePromotions');
  const [status, setStatus] = useState<GoldenTicketStatus | ''>('');
  const [q, setQ] = useState('');
  const [draftQ, setDraftQ] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<IssueFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recipientQ, setRecipientQ] = useState('');
  const [debouncedRecipientQ, setDebouncedRecipientQ] = useState('');
  const [smsPreview, setSmsPreview] = useState<string | null>(null);
  const [previewTicket, setPreviewTicket] = useState<GoldenTicket | null>(null);

  const campaigns = useApi(() => api.goldenTicketCampaigns(), [], true);
  const listKey = useMemo(() => ({ status, q, campaignFilter }), [status, q, campaignFilter]);
  const tickets = useApi(
    () =>
      api.goldenTickets({
        status: status || undefined,
        q: q || undefined,
        campaignId: campaignFilter || undefined,
        limit: 50,
      }),
    [listKey],
    true,
  );
  const recipients = useApi(
    () => api.goldenTicketRecipients(debouncedRecipientQ || undefined),
    [debouncedRecipientQ],
    issueOpen && step === 1,
  );
  const issue = useMutation(api.issueGoldenTicket);
  const cancel = useMutation(api.cancelGoldenTicket);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedRecipientQ(recipientQ.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [recipientQ]);

  useEffect(() => {
    if (!form.campaignId && campaigns.data?.length) {
      const def = campaigns.data.find((c) => c.isDefault) || campaigns.data[0];
      setForm((prev) => ({ ...prev, campaignId: def.id }));
    }
  }, [campaigns.data, form.campaignId]);

  const selectedCampaign = useMemo(
    () => (campaigns.data || []).find((c) => c.id === form.campaignId) || null,
    [campaigns.data, form.campaignId],
  );

  const stats = useMemo(() => {
    const items = tickets.data?.items || [];
    return {
      total: tickets.data?.total ?? items.length,
      smsSent: items.filter((t) => t.smsStatus === 'SENT').length,
      smsFailed: items.filter((t) => t.smsStatus === 'FAILED').length,
      redeemed: items.filter((t) => t.status === 'REDEEMED').length,
    };
  }, [tickets.data]);

  const openIssue = (preset?: Partial<IssueFormState>) => {
    const def = campaigns.data?.find((c) => c.isDefault) || campaigns.data?.[0];
    setForm({ ...emptyForm(def?.id || ''), ...preset });
    setFormError(null);
    setSmsPreview(null);
    setRecipientQ('');
    setStep(1);
    setIssueOpen(true);
  };

  const pickRecipient = (recipient: GoldenTicketRecipient) => {
    setForm((prev) => ({
      ...prev,
      phone: recipient.displayPhone,
      guestName: recipient.guestName || prev.guestName,
      email: recipient.email || prev.email,
    }));
    setRecipientQ('');
  };

  const goToCouponStep = () => {
    setFormError(null);
    const phoneCheck = validateGhanaPhone(form.phone);
    if (!phoneCheck.ok) {
      setFormError(phoneCheck.error);
      return;
    }
    setForm((prev) => ({ ...prev, phone: phoneCheck.display }));
    setStep(2);
  };

  const goToConfirmStep = () => {
    setFormError(null);
    if (!form.campaignId || !selectedCampaign) {
      setFormError('Select a Golden Ticket coupon to send.');
      return;
    }
    const name = form.guestName.trim() || 'Guest';
    const expires = new Date(Date.now() + selectedCampaign.expiryDays * 24 * 60 * 60 * 1000).toLocaleDateString(
      'en-GB',
      { day: 'numeric', month: 'short', year: 'numeric' },
    );
    setSmsPreview(
      [
        `Hi ${name}, enjoy ${selectedCampaign.offerTitle} your next stay/event booking!`,
        `Code: ★★★★★ | Valid: ${expires}`,
        `🎟️ Reveal: https://www.bluetopvilla.com/golden-ticket?token=…`,
        `Single use. WhatsApp: 055 917 1787`,
      ].join('\n'),
    );
    setStep(3);
  };

  const submitIssue = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const phoneCheck = validateGhanaPhone(form.phone);
    if (!phoneCheck.ok) {
      setFormError(phoneCheck.error);
      setStep(1);
      return;
    }
    if (!form.campaignId) {
      setFormError('Select a coupon.');
      setStep(2);
      return;
    }

    const body: IssueGoldenTicketInput = {
      phone: form.phone.trim(),
      guestName: form.guestName.trim() || undefined,
      email: form.email.trim() || undefined,
      campaignId: form.campaignId,
      sendEmail: form.sendEmail && Boolean(form.email.trim()),
      sendSms: true,
      resend: form.resend,
      refreshExpiry: true,
    };

    try {
      const result = await issue.run(body);
      if (!result) {
        setFormError(issue.error || 'Unable to send Golden Ticket.');
        return;
      }
      if (result.alreadyExists && !result.smsSent && !form.resend) {
        setForm((prev) => ({ ...prev, resend: true }));
        setFormError(
          result.tip ||
            'This customer already has this coupon. Confirm below to resend the SMS.',
        );
        if (result.smsPreview) setSmsPreview(result.smsPreview);
        return;
      }
      if (result.smsFailed) {
        setFormError(result.smsError || 'SMS delivery failed. The ticket was recorded — try resend after fixing Hubtel credentials.');
        setSmsPreview(result.smsPreview || null);
        await tickets.reload();
        return;
      }
      if (result.smsSkipped) {
        setNotice(
          `Ticket ${result.ticket.promoCode} created, but SMS was skipped (Hubtel SMS not configured). Add HUBTEL_SMS_CLIENT_ID / SECRET in backend .env.`,
        );
        setIssueOpen(false);
        await tickets.reload();
        return;
      }

      setNotice(
        result.smsSent
          ? `Golden Ticket ${result.ticket.promoCode} sent by SMS to ${result.ticket.phone}.`
          : `Golden Ticket ${result.ticket.promoCode} issued.`,
      );
      setIssueOpen(false);
      await tickets.reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to send Golden Ticket.');
    }
  };

  const onCancel = async (ticket: GoldenTicket) => {
    if (!window.confirm(`Cancel promo ${ticket.promoCode}? This cannot be undone.`)) return;
    try {
      await cancel.run(ticket.id);
      setNotice(`Cancelled ${ticket.promoCode}`);
      await tickets.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to cancel ticket.');
    }
  };

  const tz = property?.timezone;
  const activeCampaigns = (campaigns.data || []).filter((c) => c.status === 'ACTIVE');

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-16 sm:p-8">
      <PageHeader
        title="Golden Tickets"
        subtitle="Send branded coupon SMS to guests in a few taps — tracked end to end"
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => openIssue()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#006194] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#007bb9]"
            >
              <Icon name="sms" className="text-[18px]" />
              Send Golden Ticket
            </button>
          ) : null
        }
      />

      {notice ? (
        <div className="rounded-xl border border-[#006194]/20 bg-[#cce5ff]/30 px-4 py-3 text-xs text-[#001d31]">{notice}</div>
      ) : null}

      <ErrorNote
        message={tickets.error || campaigns.error}
        onRetry={() => {
          void tickets.reload();
          void campaigns.reload();
        }}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Issued" icon="confirmation_number" value={stats.total} detail="In current list" />
        <StatCard label="SMS sent" icon="mark_chat_read" value={stats.smsSent} detail="Delivered via Hubtel" />
        <StatCard label="SMS failed" icon="sms_failed" value={stats.smsFailed} detail="Needs attention" />
        <StatCard label="Redeemed" icon="verified" value={stats.redeemed} detail="Guest redeemed" />
      </div>

      <Card className="p-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setQ(draftQ.trim());
          }}
        >
          <label className="text-xs font-semibold text-[#786f62]">
            Search customers / codes
            <input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder="Phone, name, email, promo code"
              className={`${inputClass} mt-1 w-64 max-w-full`}
            />
          </label>
          <label className="text-xs font-semibold text-[#786f62]">
            Redemption
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as GoldenTicketStatus | '')}
              className={`${inputClass} mt-1 w-40`}
            >
              {STATUSES.map((value) => (
                <option key={value || 'all'} value={value}>
                  {value || 'All statuses'}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#786f62]">
            Coupon
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className={`${inputClass} mt-1 w-52`}
            >
              <option value="">All coupons</option>
              {(campaigns.data || []).map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                  {campaign.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-[#161410] px-3.5 py-2 text-xs font-bold text-[#f4efe6]">
            Apply
          </button>
          <button
            type="button"
            className="rounded-lg border border-[#cfc4b4] px-3.5 py-2 text-xs font-bold text-[#786f62]"
            onClick={() => {
              setDraftQ('');
              setQ('');
              setStatus('');
              setCampaignFilter('');
            }}
          >
            Clear
          </button>
        </form>
      </Card>

      {tickets.loading && !tickets.data ? (
        <Loading label="Loading ticket history…" />
      ) : !tickets.data?.items.length ? (
        <Card>
          <Empty
            icon="sms"
            title="No Golden Tickets sent yet"
            detail={canManage ? 'Send your first coupon SMS to a guest.' : undefined}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[#e7ddd0] px-4 py-3">
            <h2 className="text-sm font-bold text-[#161410]">Sent Golden Tickets</h2>
            <p className="text-[11px] text-[#786f62]">Phone, coupon, code, SMS delivery, and redemption status</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4efe6] text-[10px] uppercase tracking-[0.14em] text-[#786f62]">
                <tr>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Coupon</th>
                  <th className="px-4 py-3 font-bold">Code</th>
                  <th className="px-4 py-3 font-bold">SMS</th>
                  <th className="px-4 py-3 font-bold">Redemption</th>
                  <th className="px-4 py-3 font-bold">Sent / expires</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.data.items.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-[#e7ddd0]">
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-[#161410]">{ticket.guestName || 'Guest'}</div>
                      <div className="mt-0.5 space-y-0.5 text-[11px] text-[#786f62]">
                        {ticket.phone ? <div className="font-medium text-[#161410]">{ticket.phone}</div> : null}
                        {ticket.email ? <div>{ticket.email}</div> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold">{ticket.offerTitle}</div>
                      <div className="text-[11px] text-[#786f62]">{ticket.campaignName}</div>
                    </td>
                    <td className="px-4 py-3 align-top font-mono font-bold text-[#006194]">{ticket.promoCode}</td>
                    <td className="px-4 py-3 align-top">
                      <SmsPill status={ticket.smsStatus || 'NONE'} />
                      <div className="mt-1 text-[10px] text-[#786f62]">
                        {ticket.smsSentAt ? formatDateTime(ticket.smsSentAt, tz) : ticket.smsError || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusPill status={ticket.status} />
                    </td>
                    <td className="px-4 py-3 align-top text-[11px] text-[#786f62]">
                      <div>Created {formatDateTime(ticket.createdAt, tz)}</div>
                      <div>Expires {formatDateTime(ticket.expiresAt, tz)}</div>
                    </td>
                    <td className="space-x-2 whitespace-nowrap px-4 py-3 align-top text-right">
                      <button
                        type="button"
                        className="text-[11px] font-bold text-[#006194] hover:underline"
                        onClick={() => setPreviewTicket(ticket)}
                      >
                        Preview SMS
                      </button>
                      {canManage && ticket.status !== 'REDEEMED' && ticket.status !== 'CANCELLED' ? (
                        <>
                          <button
                            type="button"
                            className="text-[11px] font-bold text-[#006194] hover:underline"
                            onClick={() =>
                              openIssue({
                                phone: ticket.phone || '',
                                guestName: ticket.guestName || '',
                                email: ticket.email || '',
                                campaignId: ticket.campaignId,
                                resend: true,
                                sendEmail: false,
                              })
                            }
                          >
                            Resend SMS
                          </button>
                          <button
                            type="button"
                            className="text-[11px] font-bold text-[#ba1a1a] hover:underline"
                            onClick={() => void onCancel(ticket)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#e7ddd0] px-4 py-2 text-[11px] text-[#786f62]">
            Showing {tickets.data.items.length} of {tickets.data.total}
          </div>
        </Card>
      )}

      {issueOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button type="button" className="absolute inset-0 bg-[#161410]/45" aria-label="Close" onClick={() => setIssueOpen(false)} />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#cfc4b4] bg-white shadow-xl sm:rounded-2xl">
            <div className="border-b border-[#e7ddd0] px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#161410]">Send Golden Ticket</h2>
                  <p className="mt-1 text-sm text-[#786f62]">Customer → coupon → branded SMS</p>
                </div>
                <button type="button" onClick={() => setIssueOpen(false)} className="rounded-lg p-1.5 text-[#786f62] hover:bg-[#f4efe6]">
                  <Icon name="close" className="text-[18px]" />
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                {([1, 2, 3] as WizardStep[]).map((n) => (
                  <div
                    key={n}
                    className={`h-1.5 flex-1 rounded-full ${step >= n ? 'bg-[#006194]' : 'bg-[#e7ddd0]'}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#786f62]">
                {step === 1 ? '1 · Customer phone' : step === 2 ? '2 · Choose coupon' : '3 · Confirm & send'}
              </p>
            </div>

            <form onSubmit={(e) => void submitIssue(e)} className="flex-1 overflow-y-auto px-5 py-4 text-xs sm:px-6">
              {formError ? (
                <div className="mb-4 rounded-lg border border-[#ba1a1a]/25 bg-[#ffdad6]/50 px-3 py-2 text-[#ba1a1a]">{formError}</div>
              ) : null}

              {step === 1 ? (
                <div className="space-y-4">
                  <label className="block font-bold text-[#161410]">
                    Customer phone number
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className={`${inputClass} mt-1.5 text-base sm:text-xs`}
                      placeholder="055 917 1787"
                      inputMode="tel"
                      autoFocus
                      required
                    />
                  </label>
                  <label className="block font-bold text-[#161410]">
                    Guest name <span className="font-normal text-[#786f62]">(optional)</span>
                    <input
                      value={form.guestName}
                      onChange={(e) => setForm((prev) => ({ ...prev, guestName: e.target.value }))}
                      className={`${inputClass} mt-1.5`}
                      placeholder="Ama Mensah"
                    />
                  </label>
                  <div>
                    <label className="block font-bold text-[#161410]">
                      Find an existing customer
                      <input
                        value={recipientQ}
                        onChange={(e) => setRecipientQ(e.target.value)}
                        className={`${inputClass} mt-1.5`}
                        placeholder="Search phone or name…"
                      />
                    </label>
                    <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[#e7ddd0] bg-[#f4efe6]/50 p-2">
                      {recipients.loading ? (
                        <p className="px-2 py-3 text-[11px] text-[#786f62]">Searching…</p>
                      ) : !(recipients.data || []).length ? (
                        <p className="px-2 py-3 text-[11px] text-[#786f62]">
                          No matches — enter a new number above.
                        </p>
                      ) : (
                        (recipients.data || []).map((recipient) => (
                          <button
                            key={recipient.phone}
                            type="button"
                            onClick={() => pickRecipient(recipient)}
                            className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left hover:bg-[#cce5ff]/40"
                          >
                            <span>
                              <span className="block font-semibold text-[#161410]">
                                {recipient.guestName || 'Guest'}
                              </span>
                              <span className="text-[11px] text-[#786f62]">{recipient.displayPhone}</span>
                            </span>
                            <span className="text-[10px] uppercase tracking-wide text-[#786f62]">{recipient.source}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-3">
                  <p className="text-[11px] text-[#786f62]">
                    Sending to <span className="font-semibold text-[#161410]">{form.phone}</span>
                    {form.guestName ? ` · ${form.guestName}` : ''}
                  </p>
                  {(activeCampaigns.length ? activeCampaigns : campaigns.data || []).map((campaign) => {
                    const selected = form.campaignId === campaign.id;
                    return (
                      <button
                        key={campaign.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, campaignId: campaign.id }))}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          selected
                            ? 'border-[#006194] bg-[#cce5ff]/35 ring-2 ring-[#006194]/30'
                            : 'border-[#e7ddd0] bg-white hover:border-[#006194]/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#786f62]">
                              {campaign.name}
                            </p>
                            <p className="mt-1 text-2xl font-bold tracking-tight text-[#006194] sm:text-[1.65rem]">
                              {campaign.offerTitle}
                            </p>
                            {campaign.offerSubtitle ? (
                              <p className="mt-1 text-xs text-[#3c3832]">{campaign.offerSubtitle}</p>
                            ) : null}
                          </div>
                          {selected ? <Icon name="check_circle" className="text-[22px] text-[#006194]" /> : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#786f62]">
                          <span className="rounded-full bg-[#f4efe6] px-2.5 py-1 font-semibold">
                            Valid {validityLabel(campaign)}
                          </span>
                          {campaign.isDefault ? (
                            <span className="rounded-full bg-[#ffdcc3] px-2.5 py-1 font-semibold text-[#2f1500]">
                              Default
                            </span>
                          ) : null}
                        </div>
                        {campaign.offerTerms ? (
                          <p className="mt-3 text-[10px] leading-relaxed text-[#786f62]">{campaign.offerTerms}</p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#e7ddd0] bg-[#f4efe6]/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#786f62]">Recipient</p>
                    <p className="mt-1 text-sm font-semibold text-[#161410]">
                      {form.guestName || 'Guest'} · {form.phone}
                    </p>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#786f62]">Coupon</p>
                    <p className="mt-1 text-sm font-semibold text-[#006194]">
                      {selectedCampaign?.offerTitle} — {selectedCampaign?.name}
                    </p>
                  </div>

                  <div>
                    <p className="mb-3 text-center font-bold text-[#161410]">How it looks on their phone</p>
                    <PhoneSmsPreview
                      body={smsPreview || ''}
                      toLabel={form.phone || undefined}
                    />
                  </div>

                  <label className="flex items-start gap-2 font-semibold text-[#161410]">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={form.resend}
                      onChange={(e) => setForm((prev) => ({ ...prev, resend: e.target.checked }))}
                    />
                    <span>
                      Resend if this customer already has this coupon
                      <span className="mt-0.5 block font-normal text-[#786f62]">
                        Prevents accidental duplicates unless you confirm.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-2 font-semibold text-[#161410]">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={form.sendEmail}
                      onChange={(e) => setForm((prev) => ({ ...prev, sendEmail: e.target.checked }))}
                    />
                    <span>
                      Also email (Brevo)
                      <span className="mt-0.5 block font-normal text-[#786f62]">Optional — requires an email address.</span>
                    </span>
                  </label>

                  {form.sendEmail ? (
                    <label className="block font-bold text-[#161410]">
                      Email
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        className={`${inputClass} mt-1.5`}
                        placeholder="guest@example.com"
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6 flex gap-2 border-t border-[#e7ddd0] pt-4">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((prev) => (prev === 3 ? 2 : 1))}
                    className="rounded-lg border border-[#cfc4b4] px-3.5 py-2.5 text-xs font-bold text-[#786f62]"
                  >
                    Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIssueOpen(false)}
                    className="rounded-lg border border-[#cfc4b4] px-3.5 py-2.5 text-xs font-bold text-[#786f62]"
                  >
                    Cancel
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => (step === 1 ? goToCouponStep() : goToConfirmStep())}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#006194] py-2.5 text-xs font-bold text-white"
                  >
                    Continue
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={issue.pending}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#006194] py-2.5 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {issue.pending ? (
                      <>
                        <Icon name="progress_activity" className="animate-spin text-[18px]" />
                        Sending SMS…
                      </>
                    ) : (
                      <>
                        <Icon name="send" className="text-[18px]" />
                        Send Golden Ticket
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {previewTicket ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-[#161410]/45"
            aria-label="Close"
            onClick={() => setPreviewTicket(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-t-2xl border border-[#cfc4b4] bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#161410]">SMS on customer phone</h2>
                <p className="mt-1 text-sm text-[#786f62]">
                  {previewTicket.guestName || 'Guest'}
                  {previewTicket.phone ? ` · ${previewTicket.phone}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTicket(null)}
                className="rounded-lg p-1.5 text-[#786f62] hover:bg-[#f4efe6]"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>
            <PhoneSmsPreview
              body={
                previewTicket.smsBody ||
                [
                  `Hi ${previewTicket.guestName || 'Guest'}, enjoy ${previewTicket.offerTitle} your next stay/event booking!`,
                  `Code: ${previewTicket.promoCode} | Valid: ${new Date(previewTicket.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
                  `🎟️ Reveal: ${previewTicket.scratchUrl}`,
                  'Single use. WhatsApp: 055 917 1787',
                ].join('\n')
              }
              toLabel={previewTicket.phone || undefined}
            />
            <button
              type="button"
              onClick={() => setPreviewTicket(null)}
              className="mt-5 w-full rounded-lg border border-[#cfc4b4] py-2.5 text-xs font-bold text-[#786f62]"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

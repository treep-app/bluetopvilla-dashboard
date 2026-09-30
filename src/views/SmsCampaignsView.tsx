import React, { useEffect, useMemo, useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import type { SmsCampaign, SmsCampaignDetail } from '../types/hotel';
import { formatDateTime } from '../lib/format';
import { Card, Empty, ErrorNote, Icon, inputClass, Loading, Modal, PageHeader, StatCard } from '../components/ui';

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-[#cce5ff] text-[#006194]',
  SENDING: 'bg-[#fff3cd] text-[#7a5b00]',
  SENT: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-[#e7ddd0] text-[#786f62]',
};

export const SmsCampaignsView: React.FC = () => {
  const { hasPermission, property } = useHotel();
  const canManage = hasPermission('canManagePromotions');
  const campaigns = useApi(() => api.smsCampaigns(), [], true);
  const templates = useApi(() => api.smsTemplates(), [], true);
  const coupons = useApi(() => api.goldenTicketCampaigns(), [], true);
  const contacts = useApi(() => api.marketingContacts({ limit: 200 }), [], true);

  const create = useMutation(api.createSmsCampaign);
  const send = useMutation(api.sendSmsCampaign);
  const cancel = useMutation(api.cancelSmsCampaign);
  const createCoupon = useMutation(api.createCouponCampaign);

  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [detail, setDetail] = useState<SmsCampaignDetail | null>(null);
  const [sendTarget, setSendTarget] = useState<SmsCampaign | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    templateId: '',
    body: '',
    goldenTicketCampaignId: '',
    contactIds: [] as string[],
  });
  const [contactSearch, setContactSearch] = useState('');
  const [couponForm, setCouponForm] = useState({
    name: '',
    offerTitle: '50% OFF',
    offerSubtitle: 'On your next overnight stay or event booking',
    offerTerms: '',
    expiryDays: 7,
    discountPercent: 50,
    isDefault: false,
  });

  useEffect(() => {
    if (!form.templateId && templates.data?.length) {
      const def = templates.data.find((t) => t.isDefault) || templates.data[0];
      setForm((prev) => ({ ...prev, templateId: def.id, body: prev.body || def.body }));
    }
  }, [templates.data, form.templateId]);

  const stats = useMemo(() => {
    const items = campaigns.data || [];
    return {
      total: items.length,
      draft: items.filter((c) => c.status === 'DRAFT').length,
      sent: items.filter((c) => c.status === 'SENT').length,
      contacts: contacts.data?.total ?? 0,
    };
  }, [campaigns.data, contacts.data]);

  const contactItems = contacts.data?.items || [];
  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contactItems;
    return contactItems.filter((c) => {
      const hay = `${c.name || ''} ${c.displayPhone} ${c.phone} ${c.email || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [contactItems, contactSearch]);

  const selectedCount = form.contactIds.length;
  const allFilteredSelected =
    filteredContacts.length > 0 && filteredContacts.every((c) => form.contactIds.includes(c.id));

  const openCreate = () => {
    const def = templates.data?.find((t) => t.isDefault) || templates.data?.[0];
    const allIds = (contacts.data?.items || []).map((c) => c.id);
    setForm({
      name: '',
      description: '',
      templateId: def?.id || '',
      body: def?.body || '',
      goldenTicketCampaignId: coupons.data?.find((c) => c.isDefault)?.id || '',
      contactIds: allIds,
    });
    setContactSearch('');
    setError(null);
    setCreateOpen(true);
  };

  const toggleContact = (id: string) => {
    setForm((p) => ({
      ...p,
      contactIds: p.contactIds.includes(id) ? p.contactIds.filter((x) => x !== id) : [...p.contactIds, id],
    }));
  };

  const selectAllFiltered = () => {
    setForm((p) => {
      const next = new Set(p.contactIds);
      for (const c of filteredContacts) next.add(c.id);
      return { ...p, contactIds: Array.from(next) };
    });
  };

  const deselectAllFiltered = () => {
    const remove = new Set(filteredContacts.map((c) => c.id));
    setForm((p) => ({ ...p, contactIds: p.contactIds.filter((id) => !remove.has(id)) }));
  };

  const submitCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError('Campaign name is required.');
      return;
    }
    if (!form.contactIds.length) {
      setError('Select at least one contact to send to.');
      return;
    }
    const result = await create.run({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      templateId: form.templateId || undefined,
      body: form.body.trim() || undefined,
      goldenTicketCampaignId: form.goldenTicketCampaignId || undefined,
      contactIds: form.contactIds,
    });
    if (!result) {
      setError(create.error || 'Could not create campaign.');
      return;
    }
    setNotice(`Draft campaign “${result.name}” ready with ${result.recipientCount} recipients.`);
    setCreateOpen(false);
    await campaigns.reload();
  };

  const submitCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const result = await createCoupon.run({
      name: couponForm.name.trim(),
      offerTitle: couponForm.offerTitle.trim(),
      offerSubtitle: couponForm.offerSubtitle.trim() || undefined,
      offerTerms: couponForm.offerTerms.trim() || undefined,
      expiryDays: couponForm.expiryDays,
      discountPercent: couponForm.discountPercent,
      isDefault: couponForm.isDefault,
    });
    if (!result) {
      setError(createCoupon.error || 'Could not create coupon campaign.');
      return;
    }
    setNotice(`Coupon campaign “${result.name}” created.`);
    setCouponOpen(false);
    await coupons.reload();
  };

  const openSendDialog = (campaign: SmsCampaign) => {
    setSendError(null);
    setSendTarget(campaign);
  };

  const confirmSend = async () => {
    if (!sendTarget) return;
    setSendError(null);
    const result = await send.run(sendTarget.id);
    if (!result) {
      setSendError(send.error || 'Send failed. Check Hubtel SMS credentials and try again.');
      return;
    }
    setNotice(
      `“${sendTarget.name}” sent · ${result.sent} delivered · ${result.failed} failed · ${result.skipped} skipped`,
    );
    setSendTarget(null);
    await campaigns.reload();
  };

  const onCancel = async (campaign: SmsCampaign) => {
    if (!window.confirm(`Cancel draft “${campaign.name}”?`)) return;
    await cancel.run(campaign.id);
    setNotice('Campaign cancelled.');
    await campaigns.reload();
  };

  const openDetail = async (id: string) => {
    try {
      setDetail(await api.smsCampaign(id));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not load campaign.');
    }
  };

  const tz = property?.timezone;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-16 sm:p-8">
      <PageHeader
        title="SMS Campaigns"
        subtitle="Create campaigns from templates, attach a Golden Ticket coupon, and send to contacts"
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCouponForm({
                    name: '',
                    offerTitle: '50% OFF',
                    offerSubtitle: 'On your next overnight stay or event booking',
                    offerTerms: '',
                    expiryDays: 7,
                    discountPercent: 50,
                    isDefault: false,
                  });
                  setError(null);
                  setCouponOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfc4b4] bg-white px-3.5 py-2 text-xs font-bold text-[#161410]"
              >
                <Icon name="sell" className="text-[18px]" />
                New coupon offer
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#006194] px-3.5 py-2 text-xs font-bold text-white"
              >
                <Icon name="campaign" className="text-[18px]" />
                New SMS campaign
              </button>
            </div>
          ) : null
        }
      />

      {notice ? (
        <div className="rounded-xl border border-[#006194]/20 bg-[#cce5ff]/30 px-4 py-3 text-xs text-[#001d31]">{notice}</div>
      ) : null}

      <ErrorNote
        message={campaigns.error || templates.error || contacts.error}
        onRetry={() => {
          void campaigns.reload();
          void templates.reload();
          void contacts.reload();
        }}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Campaigns" icon="campaign" value={stats.total} />
        <StatCard label="Drafts" icon="edit_note" value={stats.draft} />
        <StatCard label="Sent" icon="mark_chat_read" value={stats.sent} />
        <StatCard label="Contacts" icon="contacts" value={stats.contacts} />
      </div>

      {campaigns.loading && !campaigns.data ? (
        <Loading />
      ) : !(campaigns.data || []).length ? (
        <Card>
          <Empty
            icon="campaign"
            title="No SMS campaigns yet"
            detail="Add contacts and a template, then create your first campaign."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4efe6] text-[10px] uppercase tracking-[0.14em] text-[#786f62]">
                <tr>
                  <th className="px-4 py-3 font-bold">Campaign</th>
                  <th className="px-4 py-3 font-bold">Template</th>
                  <th className="px-4 py-3 font-bold">Recipients</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Created</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(campaigns.data || []).map((campaign) => (
                  <tr key={campaign.id} className="border-t border-[#e7ddd0]">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{campaign.name}</div>
                      {campaign.description ? <div className="text-[11px] text-[#786f62]">{campaign.description}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-[#786f62]">{campaign.templateName || 'Custom'}</td>
                    <td className="px-4 py-3">
                      <div>{campaign.recipientCount}</div>
                      <div className="text-[10px] text-[#786f62]">
                        {campaign.sentCount} sent · {campaign.failedCount} failed · {campaign.skippedCount} skipped
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#786f62]">{formatDateTime(campaign.createdAt, tz)}</td>
                    <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
                      <button type="button" className="text-[11px] font-bold text-[#006194]" onClick={() => void openDetail(campaign.id)}>
                        View
                      </button>
                      {canManage && campaign.status === 'DRAFT' ? (
                        <>
                          <button type="button" className="text-[11px] font-bold text-[#006194]" onClick={() => openSendDialog(campaign)}>
                            Send now
                          </button>
                          <button type="button" className="text-[11px] font-bold text-[#ba1a1a]" onClick={() => void onCancel(campaign)}>
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
        </Card>
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button type="button" className="absolute inset-0 bg-[#161410]/40" aria-label="Close" onClick={() => setCreateOpen(false)} />
          <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#cfc4b4] bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <h2 className="text-lg font-semibold">New SMS campaign</h2>
            <form onSubmit={(e) => void submitCampaign(e)} className="mt-4 space-y-3 text-xs">
              {error ? (
                <div className="rounded-lg border border-[#ba1a1a]/25 bg-[#ffdad6]/50 px-3 py-2 text-[#ba1a1a]">{error}</div>
              ) : null}
              <label className="block font-bold">
                Campaign name
                <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block font-bold">
                Description
                <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block font-bold">
                SMS template
                <select
                  value={form.templateId}
                  onChange={(e) => {
                    const template = templates.data?.find((t) => t.id === e.target.value);
                    setForm((p) => ({ ...p, templateId: e.target.value, body: template?.body || p.body }));
                  }}
                  className={`${inputClass} mt-1.5`}
                >
                  {(templates.data || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block font-bold">
                Message body
                <textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} className={`${inputClass} mt-1.5 min-h-[120px]`} />
              </label>
              <label className="block font-bold">
                Attach Golden Ticket coupon (optional)
                <select
                  value={form.goldenTicketCampaignId}
                  onChange={(e) => setForm((p) => ({ ...p, goldenTicketCampaignId: e.target.value }))}
                  className={`${inputClass} mt-1.5`}
                >
                  <option value="">No coupon — plain SMS</option>
                  {(coupons.data || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.offerTitle}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-xl border border-[#e7ddd0] bg-[#f4efe6]/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-[#161410]">
                    Recipients · {selectedCount} selected
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="text-[11px] font-bold text-[#006194] hover:underline"
                    >
                      {contactSearch ? 'Select filtered' : 'Select all'}
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllFiltered}
                      className="text-[11px] font-bold text-[#786f62] hover:underline"
                    >
                      {contactSearch ? 'Deselect filtered' : 'Deselect all'}
                    </button>
                  </div>
                </div>
                <input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className={`${inputClass} mt-2`}
                  placeholder="Search contacts by name or phone…"
                />
                <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-lg border border-[#e7ddd0] bg-white p-1.5">
                  {!contactItems.length ? (
                    <p className="px-2 py-3 text-[11px] text-[#786f62]">
                      No contacts yet. Add some under Marketing → Contacts first.
                    </p>
                  ) : !filteredContacts.length ? (
                    <p className="px-2 py-3 text-[11px] text-[#786f62]">No contacts match your search.</p>
                  ) : (
                    filteredContacts.map((contact) => {
                      const checked = form.contactIds.includes(contact.id);
                      return (
                        <label
                          key={contact.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-[#f4efe6] ${
                            checked ? 'bg-[#cce5ff]/35' : ''
                          }`}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleContact(contact.id)} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-[#161410]">{contact.name || 'Guest'}</span>
                            <span className="text-[11px] text-[#786f62]">{contact.displayPhone}</span>
                          </span>
                          {checked ? (
                            <Icon name="check_circle" className="text-[16px] text-[#006194]" />
                          ) : null}
                        </label>
                      );
                    })
                  )}
                </div>
                {filteredContacts.length > 0 ? (
                  <label className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-[#786f62]">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={() => (allFilteredSelected ? deselectAllFiltered() : selectAllFiltered())}
                    />
                    {allFilteredSelected ? 'All shown contacts selected' : 'Select all shown contacts'}
                  </label>
                ) : null}
              </div>

              <button type="submit" disabled={create.pending} className="w-full rounded-lg bg-[#006194] py-2.5 text-xs font-bold text-white disabled:opacity-60">
                Create draft campaign
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {couponOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button type="button" className="absolute inset-0 bg-[#161410]/40" aria-label="Close" onClick={() => setCouponOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-[#cfc4b4] bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <h2 className="text-lg font-semibold">New coupon offer</h2>
            <form onSubmit={(e) => void submitCoupon(e)} className="mt-4 space-y-3 text-xs">
              {error ? (
                <div className="rounded-lg border border-[#ba1a1a]/25 bg-[#ffdad6]/50 px-3 py-2 text-[#ba1a1a]">{error}</div>
              ) : null}
              <label className="block font-bold">
                Campaign name
                <input required value={couponForm.name} onChange={(e) => setCouponForm((p) => ({ ...p, name: e.target.value }))} className={`${inputClass} mt-1.5`} placeholder="Easter promo" />
              </label>
              <label className="block font-bold">
                Offer title
                <input required value={couponForm.offerTitle} onChange={(e) => setCouponForm((p) => ({ ...p, offerTitle: e.target.value }))} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block font-bold">
                Subtitle
                <input value={couponForm.offerSubtitle} onChange={(e) => setCouponForm((p) => ({ ...p, offerSubtitle: e.target.value }))} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block font-bold">
                Terms
                <textarea value={couponForm.offerTerms} onChange={(e) => setCouponForm((p) => ({ ...p, offerTerms: e.target.value }))} className={`${inputClass} mt-1.5 min-h-[72px]`} />
              </label>
              <label className="block font-bold">
                Discount percent
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={couponForm.discountPercent}
                  onChange={(e) => setCouponForm((p) => ({ ...p, discountPercent: Number(e.target.value) || 50 }))}
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="block font-bold">
                Validity (days from send)
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={couponForm.expiryDays}
                  onChange={(e) => setCouponForm((p) => ({ ...p, expiryDays: Number(e.target.value) || 7 }))}
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={couponForm.isDefault} onChange={(e) => setCouponForm((p) => ({ ...p, isDefault: e.target.checked }))} />
                Set as default coupon
              </label>
              <button type="submit" disabled={createCoupon.pending} className="w-full rounded-lg bg-[#006194] py-2.5 text-xs font-bold text-white disabled:opacity-60">
                Create coupon campaign
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button type="button" className="absolute inset-0 bg-[#161410]/40" aria-label="Close" onClick={() => setDetail(null)} />
          <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#cfc4b4] bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{detail.name}</h2>
                <p className="mt-1 text-xs text-[#786f62]">{detail.status} · {detail.recipientCount} recipients</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="rounded-lg p-1.5 text-[#786f62] hover:bg-[#f4efe6]">
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-[#1b2c38] p-3 font-sans text-[11px] text-[#f4efe6]">{detail.body}</pre>
            <div className="mt-4 space-y-2">
              {detail.recipients.map((r) => (
                <div key={r.id} className="rounded-lg border border-[#e7ddd0] px-3 py-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">{r.name || 'Guest'} · {r.phone}</span>
                    <span className="text-[10px] font-bold text-[#786f62]">{r.status}</span>
                  </div>
                  {r.error ? <p className="mt-1 text-[10px] text-[#ba1a1a]">{r.error}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {sendTarget ? (
        <Modal
          title="Send SMS campaign"
          subtitle="Review before messages go out"
          icon="send"
          width="max-w-md"
          onClose={() => {
            if (!send.pending) setSendTarget(null);
          }}
          footer={
            <>
              <button
                type="button"
                disabled={send.pending}
                onClick={() => setSendTarget(null)}
                className="rounded-lg border border-[#cfc4b4] px-3.5 py-2 text-xs font-bold text-[#786f62] disabled:opacity-50"
              >
                Not now
              </button>
              <button
                type="button"
                disabled={send.pending}
                onClick={() => void confirmSend()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#006194] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                {send.pending ? (
                  <>
                    <Icon name="progress_activity" className="animate-spin text-[16px]" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Icon name="sms" className="text-[16px]" />
                    Send to {sendTarget.recipientCount} contacts
                  </>
                )}
              </button>
            </>
          }
        >
          {sendError ? (
            <div className="rounded-lg border border-[#ba1a1a]/25 bg-[#ffdad6]/50 px-3 py-2 text-[#ba1a1a]">{sendError}</div>
          ) : null}

          <div className="rounded-xl border border-[#e7ddd0] bg-[#f4efe6]/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#786f62]">Campaign</p>
            <p className="mt-1 text-sm font-bold text-[#161410]">{sendTarget.name}</p>
            {sendTarget.description ? <p className="mt-1 text-[11px] text-[#786f62]">{sendTarget.description}</p> : null}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-white px-3 py-2">
                <p className="text-[#786f62]">Recipients</p>
                <p className="mt-0.5 text-base font-bold text-[#161410]">{sendTarget.recipientCount}</p>
              </div>
              <div className="rounded-lg bg-white px-3 py-2">
                <p className="text-[#786f62]">Template</p>
                <p className="mt-0.5 font-semibold text-[#161410]">{sendTarget.templateName || 'Custom message'}</p>
              </div>
            </div>
            {sendTarget.goldenTicketCampaignId ? (
              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-[#006194]">
                <Icon name="confirmation_number" className="text-[16px]" />
                Golden Ticket coupons will be issued with each SMS
              </p>
            ) : (
              <p className="mt-3 text-[11px] text-[#786f62]">Plain SMS — no coupon attached</p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#786f62]">Message preview</p>
            <div className="rounded-2xl border border-[#1b2c38]/15 bg-[#1b2c38] p-4 text-[11px] leading-relaxed text-[#f4efe6]">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-[#d99d26]">BlueTop · SMS</p>
              <p className="whitespace-pre-wrap">{sendTarget.body}</p>
            </div>
            <p className="mt-2 text-[10px] text-[#786f62]">
              Placeholders like {'{{name}}'} and {'{{code}}'} are filled per contact when sending.
            </p>
          </div>

          <div className="rounded-xl border border-[#ffdcc3] bg-[#fff8f0] px-3 py-2.5 text-[11px] text-[#2f1500]">
            <span className="font-bold">This cannot be undone.</span> Hubtel will charge for each delivered message.
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

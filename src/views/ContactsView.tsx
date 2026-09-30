import React, { useMemo, useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import type { MarketingContact } from '../types/hotel';
import { formatDateTime } from '../lib/format';
import { Card, Empty, ErrorNote, Icon, inputClass, Loading, PageHeader } from '../components/ui';

export const ContactsView: React.FC = () => {
  const { hasPermission, property } = useHotel();
  const canManage = hasPermission('canManagePromotions');
  const [q, setQ] = useState('');
  const [draftQ, setDraftQ] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingContact | null>(null);
  const [form, setForm] = useState({ phone: '', name: '', email: '', notes: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const listKey = useMemo(() => ({ q }), [q]);
  const contacts = useApi(() => api.marketingContacts({ q: q || undefined, limit: 100 }), [listKey], true);
  const create = useMutation(api.createMarketingContact);
  const update = useMutation(api.updateMarketingContact);
  const remove = useMutation(api.deleteMarketingContact);

  const openCreate = () => {
    setEditing(null);
    setForm({ phone: '', name: '', email: '', notes: '' });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (contact: MarketingContact) => {
    setEditing(contact);
    setForm({
      phone: contact.displayPhone || contact.phone,
      name: contact.name || '',
      email: contact.email || '',
      notes: contact.notes || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }
    try {
      if (editing) {
        const result = await update.run(editing.id, {
          phone: form.phone.trim(),
          name: form.name.trim() || null,
          email: form.email.trim() || null,
          notes: form.notes.trim() || null,
        });
        if (!result) {
          setFormError(update.error || 'Could not update contact.');
          return;
        }
        setNotice(`Updated ${result.displayPhone}`);
      } else {
        const result = await create.run({
          phone: form.phone.trim(),
          name: form.name.trim() || undefined,
          email: form.email.trim() || undefined,
          notes: form.notes.trim() || undefined,
        });
        if (!result) {
          setFormError(create.error || 'Could not add contact.');
          return;
        }
        setNotice(`Added ${result.displayPhone}`);
      }
      setFormOpen(false);
      await contacts.reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Save failed.');
    }
  };

  const onImport = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    setNotice(null);
    try {
      const result = await api.importMarketingContactsFile(file);
      setNotice(
        `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped (${result.total} rows).`,
      );
      await contacts.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const onDelete = async (contact: MarketingContact) => {
    if (!window.confirm(`Remove ${contact.displayPhone}?`)) return;
    await remove.run(contact.id);
    setNotice(`Removed ${contact.displayPhone}`);
    await contacts.reload();
  };

  const tz = property?.timezone;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-16 sm:p-8">
      <PageHeader
        title="Contacts"
        subtitle="Customer phones for Golden Ticket and SMS campaigns — add one by one or upload Excel"
        actions={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#cfc4b4] bg-white px-3.5 py-2 text-xs font-bold text-[#161410] hover:bg-[#f4efe6]">
                <Icon name="upload_file" className="text-[18px]" />
                {importing ? 'Importing…' : 'Upload Excel / CSV'}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  className="hidden"
                  disabled={importing}
                  onChange={(e) => void onImport(e.target.files?.[0] || null)}
                />
              </label>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#006194] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#007bb9]"
              >
                <Icon name="person_add" className="text-[18px]" />
                Add contact
              </button>
            </div>
          ) : null
        }
      />

      {notice ? (
        <div className="rounded-xl border border-[#006194]/20 bg-[#cce5ff]/30 px-4 py-3 text-xs text-[#001d31]">{notice}</div>
      ) : null}

      <ErrorNote message={contacts.error} onRetry={() => void contacts.reload()} />

      <Card className="p-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(draftQ.trim());
          }}
        >
          <label className="text-xs font-semibold text-[#786f62]">
            Search
            <input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder="Name, phone, email"
              className={`${inputClass} mt-1 w-64 max-w-full`}
            />
          </label>
          <button type="submit" className="rounded-lg bg-[#161410] px-3.5 py-2 text-xs font-bold text-[#f4efe6]">
            Apply
          </button>
          <p className="text-[11px] text-[#786f62]">
            Excel columns: <span className="font-semibold">phone</span>, name, email, tags
          </p>
        </form>
      </Card>

      {contacts.loading && !contacts.data ? (
        <Loading />
      ) : !contacts.data?.items.length ? (
        <Card>
          <Empty icon="contacts" title="No contacts yet" detail="Add a guest phone or upload an Excel sheet." />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4efe6] text-[10px] uppercase tracking-[0.14em] text-[#786f62]">
                <tr>
                  <th className="px-4 py-3 font-bold">Name</th>
                  <th className="px-4 py-3 font-bold">Phone</th>
                  <th className="px-4 py-3 font-bold">Email</th>
                  <th className="px-4 py-3 font-bold">Source</th>
                  <th className="px-4 py-3 font-bold">Updated</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.data.items.map((contact) => (
                  <tr key={contact.id} className="border-t border-[#e7ddd0]">
                    <td className="px-4 py-3 font-semibold">{contact.name || '—'}</td>
                    <td className="px-4 py-3 font-medium">{contact.displayPhone}</td>
                    <td className="px-4 py-3 text-[#786f62]">{contact.email || '—'}</td>
                    <td className="px-4 py-3 text-[#786f62]">{contact.source}</td>
                    <td className="px-4 py-3 text-[11px] text-[#786f62]">{formatDateTime(contact.updatedAt, tz)}</td>
                    <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
                      {canManage ? (
                        <>
                          <button type="button" className="text-[11px] font-bold text-[#006194]" onClick={() => openEdit(contact)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-[11px] font-bold text-[#ba1a1a]"
                            onClick={() => void onDelete(contact)}
                          >
                            Remove
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
            {contacts.data.items.length} of {contacts.data.total} contacts
          </div>
        </Card>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button type="button" className="absolute inset-0 bg-[#161410]/40" aria-label="Close" onClick={() => setFormOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-[#cfc4b4] bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <h2 className="text-lg font-semibold">{editing ? 'Edit contact' : 'Add contact'}</h2>
            <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3 text-xs">
              {formError ? (
                <div className="rounded-lg border border-[#ba1a1a]/25 bg-[#ffdad6]/50 px-3 py-2 text-[#ba1a1a]">{formError}</div>
              ) : null}
              <label className="block font-bold">
                Phone
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className={`${inputClass} mt-1.5`}
                  placeholder="055 917 1787"
                  inputMode="tel"
                />
              </label>
              <label className="block font-bold">
                Name
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block font-bold">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="block font-bold">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className={`${inputClass} mt-1.5 min-h-[72px]`}
                />
              </label>
              <button
                type="submit"
                disabled={create.pending || update.pending}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#006194] py-2.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {editing ? 'Save changes' : 'Add contact'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

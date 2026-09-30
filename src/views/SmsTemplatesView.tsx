import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import type { SmsTemplate } from '../types/hotel';
import { Card, Empty, ErrorNote, Icon, inputClass, Loading, PageHeader } from '../components/ui';

const PLACEHOLDERS = ['{{name}}', '{{offer}}', '{{code}}', '{{link}}', '{{expires}}', '{{phone}}'];

export const SmsTemplatesView: React.FC = () => {
  const { hasPermission } = useHotel();
  const canManage = hasPermission('canManagePromotions');
  const templates = useApi(() => api.smsTemplates(), [], true);
  const create = useMutation(api.createSmsTemplate);
  const update = useMutation(api.updateSmsTemplate);
  const remove = useMutation(api.deleteSmsTemplate);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SmsTemplate | null>(null);
  const [form, setForm] = useState({ name: '', body: '', description: '', isDefault: false });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      body: 'Hi {{name}}, enjoy {{offer}} your next stay/event booking!\nCode: {{code}} | Valid: {{expires}}\n🎟️ Reveal: {{link}}\nSingle use. WhatsApp: 055 917 1787',
      description: '',
      isDefault: false,
    });
    setError(null);
    setOpen(true);
  };

  const openEdit = (template: SmsTemplate) => {
    setEditing(template);
    setForm({
      name: template.name,
      body: template.body,
      description: template.description || '',
      isDefault: template.isDefault,
    });
    setError(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.name.trim().length < 2 || form.body.trim().length < 10) {
      setError('Name and message body are required.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      body: form.body.trim(),
      description: form.description.trim() || undefined,
      isDefault: form.isDefault,
    };
    const result = editing ? await update.run(editing.id, payload) : await create.run(payload);
    if (!result) {
      setError((editing ? update.error : create.error) || 'Could not save template.');
      return;
    }
    setNotice(editing ? 'Template updated.' : 'Template created.');
    setOpen(false);
    await templates.reload();
  };

  const onDelete = async (template: SmsTemplate) => {
    if (template.isDefault) return;
    if (!window.confirm(`Delete “${template.name}”?`)) return;
    await remove.run(template.id);
    setNotice('Template deleted.');
    await templates.reload();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-16 sm:p-8">
      <PageHeader
        title="SMS Templates"
        subtitle="Reusable branded message copy for campaigns and Golden Tickets"
        actions={
          canManage ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#006194] px-3.5 py-2 text-xs font-bold text-white"
            >
              <Icon name="note_add" className="text-[18px]" />
              New template
            </button>
          ) : null
        }
      />

      {notice ? (
        <div className="rounded-xl border border-[#006194]/20 bg-[#cce5ff]/30 px-4 py-3 text-xs text-[#001d31]">{notice}</div>
      ) : null}

      <ErrorNote message={templates.error} onRetry={() => void templates.reload()} />

      <Card className="p-4">
        <p className="text-xs font-semibold text-[#161410]">Available placeholders</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PLACEHOLDERS.map((token) => (
            <code key={token} className="rounded-md bg-[#f4efe6] px-2 py-1 text-[11px] font-semibold text-[#006194]">
              {token}
            </code>
          ))}
        </div>
      </Card>

      {templates.loading && !templates.data ? (
        <Loading />
      ) : !(templates.data || []).length ? (
        <Card>
          <Empty icon="sms" title="No templates yet" />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(templates.data || []).map((template) => (
            <Card key={template.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#161410]">{template.name}</h3>
                  {template.description ? <p className="mt-1 text-[11px] text-[#786f62]">{template.description}</p> : null}
                </div>
                {template.isDefault ? (
                  <span className="rounded-full bg-[#ffdcc3] px-2 py-0.5 text-[10px] font-bold text-[#2f1500]">Default</span>
                ) : null}
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-[#1b2c38] p-3 font-sans text-[11px] leading-relaxed text-[#f4efe6]">
                {template.body}
              </pre>
              {canManage ? (
                <div className="mt-3 flex gap-3">
                  <button type="button" className="text-[11px] font-bold text-[#006194]" onClick={() => openEdit(template)}>
                    Edit
                  </button>
                  {!template.isDefault ? (
                    <button type="button" className="text-[11px] font-bold text-[#ba1a1a]" onClick={() => void onDelete(template)}>
                      Delete
                    </button>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button type="button" className="absolute inset-0 bg-[#161410]/40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-t-2xl border border-[#cfc4b4] bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <h2 className="text-lg font-semibold">{editing ? 'Edit template' : 'New SMS template'}</h2>
            <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3 text-xs">
              {error ? (
                <div className="rounded-lg border border-[#ba1a1a]/25 bg-[#ffdad6]/50 px-3 py-2 text-[#ba1a1a]">{error}</div>
              ) : null}
              <label className="block font-bold">
                Name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="block font-bold">
                Description
                <input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="block font-bold">
                Message body
                <textarea
                  required
                  value={form.body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                  className={`${inputClass} mt-1.5 min-h-[140px]`}
                />
              </label>
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
                />
                Set as default template
              </label>
              <button
                type="submit"
                disabled={create.pending || update.pending}
                className="w-full rounded-lg bg-[#006194] py-2.5 text-xs font-bold text-white disabled:opacity-60"
              >
                Save template
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

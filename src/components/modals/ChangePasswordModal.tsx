import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { passwordProblem } from '../SetupScreen';
import { buttonClass, ErrorNote, Field, Icon, inputClass, Modal } from '../ui';

export const ChangePasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = passwordProblem(form.next);
    if (problem) return setError(problem);
    if (form.next !== form.confirm) return setError('The new passwords do not match.');

    setSubmitting(true);
    setError(null);
    try {
      await authService.changePassword(form.current, form.next);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: event.target.value });

  return (
    <Modal title="Change password" icon="password" onClose={onClose} width="max-w-md">
      {done ? (
        <div className="text-center space-y-3 py-4">
          <Icon name="check_circle" className="text-4xl text-emerald-600" />
          <div className="font-bold text-sm text-[#161410]">Password changed</div>
          <button onClick={onClose} className={`${buttonClass.primary} mx-auto`}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <ErrorNote message={error} />
          <Field label="Current password">
            <input required type="password" autoComplete="current-password" className={inputClass} value={form.current} onChange={set('current')} />
          </Field>
          <Field label="New password">
            <input required type="password" autoComplete="new-password" className={inputClass} value={form.next} onChange={set('next')} />
          </Field>
          <Field label="Confirm new password">
            <input required type="password" autoComplete="new-password" className={inputClass} value={form.confirm} onChange={set('confirm')} />
          </Field>
          <p className="text-[11px] text-[#786f62]">At least 10 characters, including a letter and a number.</p>
          <div className="pt-2 flex justify-between">
            <button type="button" onClick={onClose} className={buttonClass.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={buttonClass.primary}>
              {submitting ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

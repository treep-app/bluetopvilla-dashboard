import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { AuthApiError } from '../services/authService';
import { ErrorNote, Field, Icon, inputClass } from './ui';

/** Password rule shared with the backend (auth.rules.ts): 10+ characters with a letter and a number. */
export function passwordProblem(password: string) {
  if (password.length < 10) return 'Use at least 10 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number.';
  return null;
}

/** First-run: creates the first super administrator. Only shown while the backend reports no staff accounts. */
export const SetupScreen: React.FC<{ onAlreadyDone: () => void }> = ({ onAlreadyDone }) => {
  const { completeSetup } = useHotel();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = passwordProblem(form.password);
    if (problem) return setError(problem);
    if (form.password !== form.confirm) return setError('The passwords do not match.');

    setSubmitting(true);
    setError(null);
    try {
      await completeSetup({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password });
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 403) {
        onAlreadyDone();
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: event.target.value });

  return (
    <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#bfc7d2]/40 overflow-hidden">
        <div className="p-8 bg-[#262f4c] text-[#eff0ff] text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#007bb9] flex items-center justify-center mx-auto">
            <Icon name="admin_panel_settings" className="text-white text-[28px]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Create the first administrator</h1>
          <p className="text-xs text-[#bfc7d2]">
            No staff accounts exist yet. This account becomes the Super Administrator and can add everyone else.
          </p>
        </div>

        <form onSubmit={submit} className="p-8 space-y-4 text-xs">
          <ErrorNote message={error} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <input required maxLength={80} autoComplete="given-name" className={inputClass} value={form.firstName} onChange={set('firstName')} />
            </Field>
            <Field label="Last name">
              <input required maxLength={80} autoComplete="family-name" className={inputClass} value={form.lastName} onChange={set('lastName')} />
            </Field>
          </div>
          <Field label="Email">
            <input required type="email" autoComplete="username" className={inputClass} value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Password">
            <input required type="password" autoComplete="new-password" className={inputClass} value={form.password} onChange={set('password')} />
          </Field>
          <Field label="Confirm password">
            <input required type="password" autoComplete="new-password" className={inputClass} value={form.confirm} onChange={set('confirm')} />
          </Field>
          <p className="text-[11px] text-[#707881]">At least 10 characters, including a letter and a number.</p>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-[#006194] hover:bg-[#007bb9] disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Icon name={submitting ? 'progress_activity' : 'person_add'} className={`text-[18px] ${submitting ? 'animate-spin' : ''}`} />
            {submitting ? 'Creating account…' : 'Create administrator & sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

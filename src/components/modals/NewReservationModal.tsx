import React, { useState } from 'react';
import { useApi, useMutation } from '../../hooks/useApi';
import { api } from '../../services/api';
import { addDays, formatMoney } from '../../lib/format';
import { buttonClass, ErrorNote, Field, inputClass, Loading, Modal } from '../ui';

interface NewReservationModalProps {
  onClose: () => void;
  onCreated: (bookingId: string) => void;
}

export const NewReservationModal: React.FC<NewReservationModalProps> = ({ onClose, onCreated }) => {
  const overview = useApi(() => api.overview());
  const today = overview.data?.today ?? '';
  const [stay, setStay] = useState({ checkIn: '', checkOut: '', adults: 1, children: 0 });
  const checkIn = stay.checkIn || today;
  const checkOut = stay.checkOut || (today ? addDays(today, 1) : '');
  const validDates = Boolean(checkIn && checkOut && checkOut > checkIn && checkIn >= today);

  const availability = useApi(
    () => api.availability({ checkIn, checkOut, adults: stay.adults, children: stay.children, rooms: 1 }),
    [checkIn, checkOut, stay.adults, stay.children],
    validDates,
  );
  const [roomTypeId, setRoomTypeId] = useState('');
  const [guest, setGuest] = useState({ firstName: '', lastName: '', phone: '', email: '', specialRequests: '' });
  const [source, setSource] = useState<'desk' | 'phone'>('desk');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ promoCode: string; offerTitle: string; discountPercent: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const create = useMutation(api.createBooking);

  const options = availability.data?.results ?? [];
  const selected = options.find((option) => option.id === roomTypeId) ?? options[0];
  const currency = availability.data?.currency ?? 'GHS';
  const promoPercent = promo?.discountPercent ?? 0;
  // Backend discounts the room subtotal only (nightly × nights), not taxes/fees.
  const subtotal = selected && availability.data ? Number(selected.nightly) * availability.data.nights : 0;
  const discountedTotal = selected ? Math.max(0, Number(selected.total) - (subtotal * promoPercent) / 100) : 0;

  const applyPromo = async () => {
    const code = promoInput.trim();
    setPromoError(null);
    setPromo(null);
    if (!code) return;
    setPromoChecking(true);
    try {
      const result = await api.validatePromo(code);
      setPromo({ promoCode: result.promoCode, offerTitle: result.offerTitle, discountPercent: result.discountPercent });
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'That coupon code is not valid.');
    } finally {
      setPromoChecking(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const booking = await create.run({
      roomTypeId: selected.id,
      checkIn,
      checkOut,
      adults: stay.adults,
      children: stay.children,
      firstName: guest.firstName,
      lastName: guest.lastName,
      phone: guest.phone,
      email: guest.email || undefined,
      specialRequests: guest.specialRequests || undefined,
      source,
      promoCode: promo?.promoCode,
    });
    if (booking) onCreated(booking.id);
  };

  return (
    <Modal title="New reservation" subtitle="Walk-in or phone booking — the balance is collected at the desk" icon="add_task" onClose={onClose} width="max-w-2xl">
      {!today ? (
        <Loading />
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <ErrorNote message={create.error} />

          <div className="space-y-3">
            <div className="text-[11px] font-bold text-[#786f62] uppercase tracking-wider">1. Stay</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Check-in">
                <input type="date" min={today} required className={inputClass} value={checkIn} onChange={(e) => setStay({ ...stay, checkIn: e.target.value })} />
              </Field>
              <Field label="Check-out">
                <input type="date" min={addDays(checkIn, 1)} required className={inputClass} value={checkOut} onChange={(e) => setStay({ ...stay, checkOut: e.target.value })} />
              </Field>
              <Field label="Adults">
                <input type="number" min={1} max={20} required className={inputClass} value={stay.adults} onChange={(e) => setStay({ ...stay, adults: Number(e.target.value) })} />
              </Field>
              <Field label="Children">
                <input type="number" min={0} max={20} required className={inputClass} value={stay.children} onChange={(e) => setStay({ ...stay, children: Number(e.target.value) })} />
              </Field>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-bold text-[#786f62] uppercase tracking-wider">2. Room type</div>
            {!validDates ? (
              <p className="text-[#ba1a1a]">Choose a check-out after check-in, starting today or later.</p>
            ) : availability.loading ? (
              <Loading label="Checking availability…" />
            ) : availability.error ? (
              <ErrorNote message={availability.error} onRetry={availability.reload} />
            ) : !options.length ? (
              <p className="text-[#ba1a1a] font-semibold">Nothing is available for these dates and guest numbers.</p>
            ) : (
              <div className="grid gap-2">
                {options.map((option) => (
                  <label
                    key={option.id}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between ${
                      selected?.id === option.id ? 'border-[#d99d26] bg-[#e7ddd0]/30 ring-1 ring-[#d99d26]' : 'border-[#cfc4b4]/40 hover:bg-[#e7ddd0]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input type="radio" name="roomType" checked={selected?.id === option.id} onChange={() => setRoomTypeId(option.id)} />
                      <span>
                        <span className="font-bold text-[#161410]">{option.name}</span>
                        <span className="block text-[11px] text-[#786f62]">
                          Sleeps {option.occupancy} · {option.availableUnits} available · {formatMoney(option.nightly, availability.data!.currency)}/night
                        </span>
                      </span>
                    </span>
                    <span className="font-bold text-sm tabular-nums">{formatMoney(option.total, availability.data!.currency)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-[11px] font-bold text-[#786f62] uppercase tracking-wider">3. Guest</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="First name *">
                <input required maxLength={80} className={inputClass} value={guest.firstName} onChange={(e) => setGuest({ ...guest, firstName: e.target.value })} />
              </Field>
              <Field label="Last name *">
                <input required maxLength={80} className={inputClass} value={guest.lastName} onChange={(e) => setGuest({ ...guest, lastName: e.target.value })} />
              </Field>
              <Field label="Phone *">
                <input required minLength={7} maxLength={20} type="tel" className={inputClass} value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
              </Field>
              <Field label="Email">
                <input type="email" className={inputClass} value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
              </Field>
              <Field label="Booked via">
                <select className={inputClass} value={source} onChange={(e) => setSource(e.target.value as 'desk' | 'phone')}>
                  <option value="desk">Walk-in at the desk</option>
                  <option value="phone">Phone</option>
                </select>
              </Field>
              <Field label="Special requests">
                <input maxLength={1000} className={inputClass} value={guest.specialRequests} onChange={(e) => setGuest({ ...guest, specialRequests: e.target.value })} />
              </Field>
            </div>

            <div className="rounded-xl border border-[#e7ddd0] bg-[#f4efe6]/40 p-3">
              <Field label="Coupon / promo code (optional)">
                <div className="flex gap-2">
                  <input
                    className={`${inputClass} flex-1 uppercase`}
                    placeholder="e.g. 27869"
                    maxLength={32}
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onBlur={() => void applyPromo()}
                  />
                  <button
                    type="button"
                    onClick={() => void applyPromo()}
                    disabled={promoChecking || !promoInput.trim()}
                    className="shrink-0 rounded-lg bg-[#1b2c38] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {promoChecking ? 'Checking…' : 'Apply'}
                  </button>
                </div>
              </Field>
              {promoError ? (
                <p className="mt-2 text-[11px] font-semibold text-[#ba1a1a]">{promoError}</p>
              ) : promo ? (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-[#0b6b3a]">
                  <span className="text-[14px]">🎟️</span>
                  {promo.promoCode} applied — {promo.offerTitle}: {promo.discountPercent}% off
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-[#786f62]">
                  The 5-digit code from the guest's Golden Ticket SMS or email.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#e7ddd0] flex items-center justify-between gap-3">
            <button type="button" onClick={onClose} className={buttonClass.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={!selected || create.pending || !validDates} className={buttonClass.primary}>
              {create.pending ? (
                'Creating…'
              ) : selected ? (
                promo ? (
                  <>Create booking · {formatMoney(discountedTotal, currency)} <span className="line-through opacity-60">{formatMoney(selected.total, currency)}</span></>
                ) : (
                  `Create booking · ${formatMoney(selected.total, currency)}`
                )
              ) : (
                'Create booking'
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

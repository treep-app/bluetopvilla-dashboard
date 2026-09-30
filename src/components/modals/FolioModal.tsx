import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { useApi, useMutation } from '../../hooks/useApi';
import { api } from '../../services/api';
import type { DeskPaymentMethod } from '../../types/hotel';
import { formatDateTime, formatDay, formatMoney, PAYMENT_METHOD_LABELS, SOURCE_LABELS, STAGE_BADGE, STAGE_LABELS } from '../../lib/format';
import { buttonClass, ErrorNote, Field, Icon, inputClass, Loading, Modal } from '../ui';

interface FolioModalProps {
  bookingId: string;
  onClose: () => void;
  onCheckIn: (bookingId: string) => void;
}

const PROVIDER_LABELS = { STRIPE: 'Card (online)', HUBTEL: 'Mobile money (online)', MANUAL: 'Desk' } as const;

export const FolioModal: React.FC<FolioModalProps> = ({ bookingId, onClose, onCheckIn }) => {
  const { hasPermission, property } = useHotel();
  const canFrontDesk = hasPermission('canFrontDesk');
  const booking = useApi(() => api.booking(bookingId), [bookingId]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<DeskPaymentMethod>('cash');
  const pay = useMutation(api.recordPayment);
  const checkOut = useMutation(api.checkOut);
  const cancel = useMutation(api.cancelBooking);

  const b = booking.data;
  const money = (value: string | number) => formatMoney(value, b?.currency ?? 'GHS');
  const balance = Number(b?.balance ?? 0);
  const canPay = canFrontDesk && b && balance > 0 && !['cancelled', 'expired', 'no_show'].includes(b.stage);

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!b) return;
    if (await pay.run(b.id, Number(amount || balance), method)) setAmount('');
  };

  const confirmCancel = () => {
    if (b && window.confirm(`Cancel ${b.reference}? The room is released for sale. Payments already taken are not refunded automatically.`)) {
      void cancel.run(b.id);
    }
  };

  return (
    <Modal
      title={b ? `Folio · ${b.reference}` : 'Folio'}
      subtitle={b ? `${b.guest.name} · ${SOURCE_LABELS[b.source] ?? b.source} booking` : undefined}
      icon="receipt_long"
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <button onClick={() => window.print()} className={buttonClass.secondary}>
            <Icon name="print" className="text-[16px]" />
            Print
          </button>
          <div className="flex items-center gap-2">
            {b && canFrontDesk && b.stage === 'arriving' ? (
              <button onClick={() => onCheckIn(b.id)} className={buttonClass.primary}>
                Check in
              </button>
            ) : null}
            {b && canFrontDesk && b.stage === 'in_house' ? (
              <button onClick={() => void checkOut.run(b.id)} disabled={balance > 0 || checkOut.pending} className={buttonClass.primary}>
                {balance > 0 ? 'Settle balance to check out' : 'Check out'}
              </button>
            ) : null}
            {b && hasPermission('canCancelBookings') && ['pending_payment', 'upcoming', 'arriving'].includes(b.stage) ? (
              <button onClick={confirmCancel} disabled={cancel.pending} className={buttonClass.danger}>
                Cancel booking
              </button>
            ) : null}
            <button onClick={onClose} className={buttonClass.secondary}>
              Close
            </button>
          </div>
        </>
      }
    >
      <ErrorNote message={booking.error || pay.error || checkOut.error || cancel.error} onRetry={booking.error ? booking.reload : undefined} />
      {!b ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#e7ddd0] border border-[#cfc4b4]/30">
            <div>
              <div className="text-[#786f62]">Status</div>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${STAGE_BADGE[b.stage]}`}>
                {STAGE_LABELS[b.stage]}
              </span>
            </div>
            <div>
              <div className="text-[#786f62]">Stay</div>
              <div className="font-semibold">
                {formatDay(b.checkIn)} → {formatDay(b.checkOut)}
              </div>
            </div>
            <div>
              <div className="text-[#786f62]">Guests</div>
              <div className="font-semibold">
                {b.adults} adult(s){b.children ? `, ${b.children} child(ren)` : ''}
              </div>
            </div>
            <div>
              <div className="text-[#786f62]">Contact</div>
              <div className="font-semibold truncate">{b.guest.phone}</div>
              {b.guest.email ? <div className="truncate text-[#786f62]">{b.guest.email}</div> : null}
            </div>
          </div>

          {b.stage === 'pending_payment' && b.holdExpiresAt ? (
            <p className="text-amber-800 font-semibold">
              Online payment pending — the room is held until {formatDateTime(b.holdExpiresAt, property?.timezone)}. Recording a desk payment confirms it.
            </p>
          ) : null}
          {b.specialRequests ? <p className="text-[#3c3832]"><strong>Requests:</strong> {b.specialRequests}</p> : null}

          <table className="w-full text-left border border-[#cfc4b4]/40 rounded-xl overflow-hidden">
            <thead className="bg-[#e7ddd0] text-[#786f62] text-[11px] uppercase font-bold">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3">Room</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7ddd0]">
              {b.lines.map((line) => (
                <tr key={line.id}>
                  <td className="p-3 font-medium">
                    {line.roomTypeName} · {line.nights} night(s) × {money(line.nightly)}
                  </td>
                  <td className="p-3 text-[#786f62]">{line.roomName ?? 'Not assigned'}</td>
                  <td className="p-3 text-right font-bold tabular-nums">{money(line.lineTotal)}</td>
                </tr>
              ))}
              {Number(b.taxes) > 0 && (
                <tr><td className="p-3" colSpan={2}>Taxes</td><td className="p-3 text-right tabular-nums">{money(b.taxes)}</td></tr>
              )}
              {Number(b.fees) > 0 && (
                <tr><td className="p-3" colSpan={2}>Fees</td><td className="p-3 text-right tabular-nums">{money(b.fees)}</td></tr>
              )}
              {Number(b.discount) > 0 && (
                <tr><td className="p-3" colSpan={2}>Discount</td><td className="p-3 text-right tabular-nums">−{money(b.discount)}</td></tr>
              )}
            </tbody>
          </table>

          <div>
            <div className="font-bold text-[#161410] mb-1.5">Payments</div>
            {b.payments.length === 0 ? (
              <p className="text-[#786f62]">No payments yet.</p>
            ) : (
              <div className="space-y-1">
                {b.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between p-2 rounded-lg bg-[#f4efe6] border border-[#e7ddd0]">
                    <span>
                      {PROVIDER_LABELS[payment.provider]}
                      {payment.method ? ` · ${PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}` : ''}
                      <span className="text-[#786f62]">
                        {' '}
                        · {payment.status.toLowerCase().replace('_', ' ')} ·{' '}
                        {formatDateTime(payment.paidAt ?? payment.createdAt, property?.timezone)}
                      </span>
                    </span>
                    <span className="font-bold tabular-nums">{money(payment.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#f4efe6] border border-[#cfc4b4]/30 space-y-1.5">
            <div className="flex justify-between text-[#786f62]">
              <span>Total</span>
              <span className="font-semibold text-[#161410] tabular-nums">{money(b.total)}</span>
            </div>
            <div className="flex justify-between text-[#786f62]">
              <span>Paid</span>
              <span className="font-semibold text-emerald-700 tabular-nums">{money(b.paid)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#e7ddd0]">
              <span>Balance</span>
              {['cancelled', 'expired', 'no_show'].includes(b.stage) ? (
                <span className="text-[#786f62]">Not due ({STAGE_LABELS[b.stage].toLowerCase()})</span>
              ) : (
                <span className={balance > 0 ? 'text-[#ba1a1a]' : 'text-emerald-700'}>{money(b.balance)}</span>
              )}
            </div>
          </div>

          {canPay ? (
            <form onSubmit={submitPayment} className="p-4 rounded-xl bg-[#e7ddd0]/20 border border-[#d99d26]/30 space-y-3">
              <div className="font-bold text-[#d99d26]">Record a payment taken at the desk</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Amount (${b.currency})`}>
                  <input
                    type="number"
                    min="0.01"
                    max={balance}
                    step="0.01"
                    placeholder={b.balance}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Method">
                  <select value={method} onChange={(event) => setMethod(event.target.value as DeskPaymentMethod)} className={inputClass}>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <button type="submit" disabled={pay.pending} className={`${buttonClass.primary} w-full`}>
                <Icon name="payments" className="text-[16px]" />
                {pay.pending ? 'Recording…' : `Record ${money(amount || balance)}`}
              </button>
            </form>
          ) : null}
        </>
      )}
    </Modal>
  );
};

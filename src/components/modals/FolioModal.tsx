import React, { useEffect, useState } from 'react';
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
  const [momoChannel, setMomoChannel] = useState('mtn-gh');
  const [momoMsisdn, setMomoMsisdn] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [momo, setMomo] = useState<{ paymentId: string; amount: number; status: string } | null>(null);
  const [momoError, setMomoError] = useState<string | null>(null);
  const [momoSuccess, setMomoSuccess] = useState<string | null>(null);
  const [momoChecking, setMomoChecking] = useState(false);
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
    const payAmount = Number(amount || balance);
    if (method === 'mobile_money') {
      setMomoError(null);
      setMomoSuccess(null);
      setMomoChecking(true);
      try {
        const result = await api.initiateDeskMomo(b.id, {
          amount: payAmount,
          channel: momoChannel,
          msisdn: momoMsisdn.trim() || undefined,
        });
        setMomo({ paymentId: result.paymentId, amount: result.amount, status: 'PROCESSING' });
      } catch (err) {
        setMomoError(err instanceof Error ? err.message : 'Could not send the payment prompt.');
      } finally {
        setMomoChecking(false);
      }
      return;
    }
    if (method === 'card' || method === 'bank_transfer') {
      if (!paymentRef.trim()) {
        setMomoError(
          method === 'card'
            ? 'Enter the terminal approval code (or last 4 digits of the card).'
            : 'Enter the bank transaction reference from the slip or app.',
        );
        return;
      }
    }
    if (await pay.run(b.id, payAmount, method, paymentRef.trim() || undefined)) {
      setAmount('');
      setPaymentRef('');
      setMomoError(null);
    }
  };

  const checkMomo = async () => {
    if (!b || !momo) return;
    setMomoChecking(true);
    try {
      const result = await api.checkDeskMomo(b.id, momo.paymentId);
      setMomo((prev) => (prev ? { ...prev, status: result.status } : prev));
      if (result.status === 'PAID') {
        setMomoSuccess(`Payment of ${money(result.amount)} approved and recorded.`);
        setMomo(null);
        await booking.reload();
      } else if (result.status === 'FAILED') {
        setMomoError('The guest declined or the payment failed. You can try again.');
        setMomo(null);
      }
    } catch (err) {
      setMomoError(err instanceof Error ? err.message : 'Could not check payment status.');
    } finally {
      setMomoChecking(false);
    }
  };

  // Poll Hubtel while a mobile money payment awaits guest approval.
  useEffect(() => {
    if (!momo || momo.status !== 'PROCESSING') return;
    const timer = setInterval(() => void checkMomo(), 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momo?.paymentId, momo?.status, b?.id]);

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
                      {payment.reference ? (
                        <span className="block font-mono text-[10px] text-[#786f62]">Ref: {payment.reference}</span>
                      ) : null}
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

          {momo ? (
            <div className="p-4 rounded-xl bg-[#cce5ff]/40 border border-[#006194]/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#006194]">
                <Icon name="phone_iphone" className="text-[18px] animate-pulse" />
                Waiting for guest approval…
              </div>
              <p className="text-xs text-[#001d31]">
                A payment prompt for <strong>{money(momo.amount)}</strong> was sent to the guest's phone. The guest must
                enter their mobile money PIN to approve. This panel updates automatically.
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void checkMomo()} disabled={momoChecking} className={buttonClass.secondary}>
                  {momoChecking ? 'Checking…' : 'Check now'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMomo(null);
                    setMomoError(null);
                  }}
                  className={buttonClass.secondary}
                >
                  Cancel prompt
                </button>
              </div>
            </div>
          ) : null}

          {momoSuccess ? (
            <div className="rounded-xl border border-[#0b6b3a]/25 bg-[#d9f2e5] px-3.5 py-2.5 text-xs font-bold text-[#0b6b3a]">
              ✓ {momoSuccess}
            </div>
          ) : null}

          {canPay && !momo ? (
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
              {method === 'mobile_money' ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Network">
                    <select value={momoChannel} onChange={(event) => setMomoChannel(event.target.value)} className={inputClass}>
                      <option value="mtn-gh">MTN MoMo</option>
                      <option value="vodafone-gh">Telecel Cash</option>
                      <option value="tigo-gh">AirtelTigo Money</option>
                    </select>
                  </Field>
                  <Field label="Number to charge">
                    <input
                      type="tel"
                      placeholder={b.guest.phone}
                      value={momoMsisdn}
                      onChange={(event) => setMomoMsisdn(event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              ) : null}
              {method === 'card' ? (
                <Field label="Terminal approval code (required)">
                  <input
                    className={inputClass}
                    placeholder="e.g. APPROVED 0054321 or •••• 4242"
                    maxLength={120}
                    value={paymentRef}
                    onChange={(event) => setPaymentRef(event.target.value)}
                  />
                </Field>
              ) : null}
              {method === 'bank_transfer' ? (
                <Field label="Bank transaction reference (required)">
                  <input
                    className={inputClass}
                    placeholder="e.g. GTB-882134501"
                    maxLength={120}
                    value={paymentRef}
                    onChange={(event) => setPaymentRef(event.target.value)}
                  />
                </Field>
              ) : null}
              <ErrorNote message={momoError} />
              <button type="submit" disabled={pay.pending || momoChecking} className={`${buttonClass.primary} w-full`}>
                <Icon name={method === 'mobile_money' ? 'phone_iphone' : 'payments'} className="text-[16px]" />
                {momoChecking
                  ? 'Sending prompt…'
                  : method === 'mobile_money'
                    ? `Charge ${money(amount || balance)} — send prompt to guest`
                    : pay.pending
                      ? 'Recording…'
                      : `Record ${money(amount || balance)}`}
              </button>
              {method === 'mobile_money' ? (
                <p className="text-[11px] text-[#786f62]">
                  The guest gets a prompt on their phone and approves with their MoMo PIN. Payment is recorded automatically
                  once approved.
                </p>
              ) : null}
              {method === 'card' || method === 'bank_transfer' ? (
                <p className="text-[11px] text-[#786f62]">
                  {method === 'card'
                    ? 'Type the approval code shown on the terminal receipt so the payment can be traced later.'
                    : 'The reference lets you match this payment against the bank statement later.'}
                </p>
              ) : null}
            </form>
          ) : null}
        </>
      )}
    </Modal>
  );
};

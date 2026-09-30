import React, { useState } from 'react';
import { useApi, useMutation } from '../../hooks/useApi';
import { api } from '../../services/api';
import { formatDay, formatMoney, ROOM_STATUS_LABELS } from '../../lib/format';
import { buttonClass, Empty, ErrorNote, Field, inputClass, Loading, Modal } from '../ui';

interface CheckInModalProps {
  /** Booking to check in, or null to pick from confirmed arrivals. */
  bookingId: string | null;
  onClose: () => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({ bookingId, onClose }) => {
  const confirmed = useApi(() => api.bookings({ status: 'CONFIRMED' }), [], !bookingId);
  const arrivals = (confirmed.data ?? []).filter((booking) => booking.stage === 'arriving');
  const [pickedId, setPickedId] = useState<string | null>(bookingId);
  const activeId = pickedId ?? arrivals[0]?.id ?? null;
  const booking = useApi(() => api.booking(activeId!), [activeId], Boolean(activeId));
  const rooms = useApi(() => api.rooms());
  const [assigned, setAssigned] = useState<Record<number, string>>({});
  const checkIn = useMutation(api.checkIn);

  const detail = booking.data?.id === activeId ? booking.data : null;
  const lines = detail?.rooms ?? [];
  const candidates = (roomTypeId: string) =>
    (rooms.data ?? []).filter((room) => room.roomTypeId === roomTypeId && room.status !== 'occupied' && room.status !== 'oos');
  const roomFor = (index: number, roomTypeId: string) => assigned[index] ?? candidates(roomTypeId).find((room) => room.status === 'clean')?.id ?? '';
  const roomIds = lines.map((line, index) => roomFor(index, line.roomTypeId));
  const ready = detail?.stage === 'arriving' && roomIds.every(Boolean) && new Set(roomIds).size === roomIds.length;

  const submit = async () => {
    if (!detail || !ready) return;
    if (await checkIn.run(detail.id, roomIds)) onClose();
  };

  return (
    <Modal
      title="Check in"
      subtitle="Assign rooms and mark the guest as in house"
      icon="how_to_reg"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button onClick={() => void submit()} disabled={!ready || checkIn.pending} className={buttonClass.primary}>
            {checkIn.pending ? 'Checking in…' : 'Complete check-in'}
          </button>
        </>
      }
    >
      <ErrorNote message={checkIn.error || confirmed.error || booking.error || rooms.error} />

      {!bookingId ? (
        confirmed.loading && !confirmed.data ? (
          <Loading />
        ) : !arrivals.length ? (
          <Empty icon="flight_land" title="No confirmed arrivals waiting" detail="Bookings awaiting payment must be paid before check-in." />
        ) : (
          <Field label={`Arriving guests (${arrivals.length})`}>
            <select className={inputClass} value={activeId ?? ''} onChange={(event) => { setPickedId(event.target.value); setAssigned({}); }}>
              {arrivals.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.guest.name} · {item.reference} · {formatDay(item.checkIn)}
                </option>
              ))}
            </select>
          </Field>
        )
      ) : null}

      {activeId && !detail ? <Loading /> : null}

      {detail ? (
        <>
          <div className="p-3.5 rounded-xl bg-[#e7ddd0] border border-[#cfc4b4]/30 space-y-1">
            <div className="font-bold text-[#161410] flex justify-between">
              <span>{detail.guest.name}</span>
              <span className="text-[#d99d26]">{detail.reference}</span>
            </div>
            <div className="text-[#786f62]">
              {formatDay(detail.checkIn)} → {formatDay(detail.checkOut)} · {detail.nights} night(s) · {detail.adults + detail.children} guest(s)
            </div>
            {Number(detail.balance) > 0 ? (
              <div className="text-[#ba1a1a] font-semibold">
                Balance due {formatMoney(detail.balance, detail.currency)} — collect it from the folio before check-out.
              </div>
            ) : (
              <div className="text-emerald-700 font-semibold">Paid in full</div>
            )}
          </div>

          {detail.stage !== 'arriving' ? (
            <p className="text-[#ba1a1a] font-semibold">
              This booking can't be checked in right now ({detail.stage.replace('_', ' ')}).
            </p>
          ) : (
            lines.map((line, index) => {
              const options = candidates(line.roomTypeId);
              return (
                <Field key={index} label={`Room for ${line.roomTypeName}`}>
                  {options.length ? (
                    <select
                      className={inputClass}
                      value={roomFor(index, line.roomTypeId)}
                      onChange={(event) => setAssigned({ ...assigned, [index]: event.target.value })}
                    >
                      <option value="">Choose a room…</option>
                      {options.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} — {ROOM_STATUS_LABELS[room.status]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[#ba1a1a]">No {line.roomTypeName} is free — every room is occupied or out of service.</p>
                  )}
                </Field>
              );
            })
          )}
          {roomIds.some((id) => (rooms.data ?? []).find((room) => room.id === id)?.status !== 'clean') && detail.stage === 'arriving' ? (
            <p className="text-amber-800">The selected room hasn't been marked clean yet.</p>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
};

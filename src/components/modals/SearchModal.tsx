import React, { useEffect, useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { formatDay, ROOM_STATUS_BADGE, ROOM_STATUS_LABELS, STAGE_BADGE, STAGE_LABELS } from '../../lib/format';
import { Icon, Loading } from '../ui';

interface SearchModalProps {
  onClose: () => void;
  onSelectRoom: (roomId: string) => void;
  onSelectBooking: (bookingId: string) => void;
  onOpenNewReservation: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ onClose, onSelectRoom, onSelectBooking, onOpenNewReservation }) => {
  const { hasPermission } = useHotel();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setQ(text.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const bookings = useApi(() => api.bookings({ q }), [q], q.length >= 2);
  const rooms = useApi(() => api.rooms());
  const matchingRooms = q
    ? (rooms.data ?? []).filter((room) =>
        [room.name, room.roomTypeName, room.code ?? '', room.currentStay?.guestName ?? ''].some((value) =>
          value.toLowerCase().includes(q.toLowerCase()),
        ),
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-[#262f4c]/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#bfc7d2]/40 overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="p-3 border-b border-[#ebedff] flex items-center gap-2.5">
          <Icon name="search" className="text-[#006194] text-[20px]" />
          <input
            autoFocus
            type="text"
            placeholder="Guest name, reference, email, phone or room…"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="w-full text-sm text-[#111a36] placeholder:text-[#707881] focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] text-[#707881] bg-[#f2f3ff] rounded border">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-4 text-xs">
          {hasPermission('canFrontDesk') ? (
            <button
              onClick={() => {
                onClose();
                onOpenNewReservation();
              }}
              className="w-full p-2 rounded-lg hover:bg-[#f2f3ff] text-left flex items-center gap-2 font-medium"
            >
              <Icon name="add_circle" className="text-[#006194] text-[18px]" />
              New reservation
            </button>
          ) : null}

          {q.length < 2 ? (
            <p className="text-[#707881] px-2">Type at least two characters.</p>
          ) : (
            <>
              <div>
                <div className="text-[10px] font-bold text-[#707881] uppercase tracking-wider mb-1.5">
                  Bookings ({bookings.data?.length ?? 0})
                </div>
                {bookings.loading ? <Loading /> : null}
                {bookings.error ? <p className="text-[#ba1a1a]">{bookings.error}</p> : null}
                {(bookings.data ?? []).slice(0, 8).map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => {
                      onClose();
                      onSelectBooking(booking.id);
                    }}
                    className="w-full p-2.5 rounded-lg hover:bg-[#cce5ff]/30 text-left flex items-center justify-between"
                  >
                    <span>
                      <span className="font-bold text-[#111a36]">{booking.guest.name}</span>{' '}
                      <span className="text-[10px] text-[#006194]">{booking.reference}</span>
                      <span className="block text-[11px] text-[#707881]">
                        {booking.rooms[0]?.roomTypeName} · {formatDay(booking.checkIn)} → {formatDay(booking.checkOut)}
                      </span>
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${STAGE_BADGE[booking.stage]}`}>
                      {STAGE_LABELS[booking.stage]}
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <div className="text-[10px] font-bold text-[#707881] uppercase tracking-wider mb-1.5">Rooms ({matchingRooms.length})</div>
                <div className="grid grid-cols-2 gap-2">
                  {matchingRooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => {
                        onClose();
                        onSelectRoom(room.id);
                      }}
                      className="p-2 rounded-lg border border-[#bfc7d2]/40 hover:border-[#006194] text-left flex items-center justify-between"
                    >
                      <span className="font-bold text-[#006194] truncate">{room.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ROOM_STATUS_BADGE[room.status]}`}>
                        {ROOM_STATUS_LABELS[room.status]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

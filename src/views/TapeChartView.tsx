import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useHotel } from '../context/HotelContext';
import { api } from '../services/api';
import type { Booking } from '../types/hotel';
import { addDays, formatDay, ROOM_STATUS_BADGE, ROOM_STATUS_LABELS } from '../lib/format';
import { buttonClass, Card, ErrorNote, Icon, Loading, PageHeader } from '../components/ui';

interface TapeChartViewProps {
  onSelectRoom: (roomId: string) => void;
  onOpenFolio: (bookingId: string) => void;
  onOpenNewReservation: () => void;
}

const DAYS = 14;
const LIVE_STAGES = new Set(['pending_payment', 'upcoming', 'arriving', 'in_house', 'departed']);

const barClass = (booking: Booking) =>
  booking.stage === 'in_house'
    ? 'bg-[#d99d26] text-white'
    : booking.stage === 'pending_payment'
      ? 'bg-amber-100 text-amber-900 border border-amber-300'
      : booking.stage === 'departed'
        ? 'bg-[#e7ddd0] text-[#786f62]'
        : 'bg-[#2a3540] text-white';

export const TapeChartView: React.FC<TapeChartViewProps> = ({ onSelectRoom, onOpenFolio, onOpenNewReservation }) => {
  const { hasPermission } = useHotel();
  const overview = useApi(() => api.overview());
  const [offset, setOffset] = useState(0);
  const today = overview.data?.today;
  const start = today ? addDays(today, offset) : '';
  const end = start ? addDays(start, DAYS) : '';
  const dates = start ? Array.from({ length: DAYS }, (_, index) => addDays(start, index)) : [];

  const rooms = useApi(() => api.rooms());
  const types = useApi(() => api.roomTypes());
  const bookings = useApi(() => api.bookings({ from: start, to: end }), [start, end], Boolean(start));

  const live = (bookings.data ?? []).filter((booking) => LIVE_STAGES.has(booking.stage));
  const covering = (list: Booking[], date: string) => list.filter((booking) => booking.checkIn <= date && date < booking.checkOut);
  const onRoom = (roomId: string) => live.filter((booking) => booking.rooms.some((line) => line.roomId === roomId));
  const unassigned = (roomTypeId: string) =>
    live.filter((booking) => booking.rooms.some((line) => line.roomTypeId === roomTypeId && !line.roomId));

  const cell = (list: Booking[], date: string, emptyAction?: () => void) => {
    const hits = covering(list, date);
    if (!hits.length) {
      return (
        <td
          key={date}
          onClick={emptyAction}
          className={`p-1 border-r border-[#cfc4b4]/20 ${emptyAction ? 'cursor-pointer hover:bg-[#e7ddd0]/60' : ''}`}
        />
      );
    }
    return (
      <td key={date} className="p-1 border-r border-[#cfc4b4]/20 align-top space-y-1">
        {hits.map((booking) => (
          <button
            key={booking.id}
            onClick={() => onOpenFolio(booking.id)}
            title={`${booking.guest.name} · ${booking.reference}`}
            className={`w-full p-1.5 rounded-md text-left ${barClass(booking)}`}
          >
            <div className="font-bold truncate text-[11px]">
              {booking.checkIn === date || date === start ? booking.guest.name : '·'}
            </div>
            {booking.checkIn === date ? <div className="text-[9px] opacity-80 truncate">{booking.nights}n</div> : null}
          </button>
        ))}
      </td>
    );
  };

  const error = overview.error || rooms.error || types.error || bookings.error;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Tape chart"
        subtitle={start ? `${formatDay(start)} – ${formatDay(addDays(end, -1))}` : 'Room calendar'}
        actions={
          <>
            <button onClick={() => setOffset(offset - 7)} className={buttonClass.secondary}>
              <Icon name="chevron_left" />
            </button>
            <button onClick={() => setOffset(0)} className={buttonClass.secondary}>
              Today
            </button>
            <button onClick={() => setOffset(offset + 7)} className={buttonClass.secondary}>
              <Icon name="chevron_right" />
            </button>
            {hasPermission('canFrontDesk') ? (
              <button onClick={onOpenNewReservation} className={buttonClass.primary}>
                <Icon name="add" />
                Book room
              </button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-4 text-xs bg-white p-3 rounded-xl border border-[#cfc4b4]/30">
        <span className="font-bold text-[#161410]">Legend:</span>
        {[
          ['bg-[#d99d26]', 'In house'],
          ['bg-[#2a3540]', 'Confirmed'],
          ['bg-amber-100 border border-amber-300', 'Awaiting payment'],
          ['bg-[#e7ddd0]', 'Departed'],
        ].map(([color, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${color}`} />
            {label}
          </span>
        ))}
      </div>

      <ErrorNote message={error} />

      <Card className="overflow-hidden">
        {!rooms.data || !types.data || !start ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#e7ddd0] border-b border-[#cfc4b4]/40">
                  <th className="p-3 w-44 text-left font-bold text-[#786f62] uppercase text-[11px] sticky left-0 bg-[#e7ddd0] z-10 border-r border-[#cfc4b4]/30">
                    Room
                  </th>
                  {dates.map((date) => (
                    <th
                      key={date}
                      className={`p-2 text-center min-w-[88px] font-bold border-r border-[#cfc4b4]/20 ${
                        date === today ? 'bg-[#e7ddd0]/40 text-[#d99d26]' : 'text-[#786f62]'
                      }`}
                    >
                      {formatDay(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7ddd0]">
                {types.data.map((type) => {
                  const typeRooms = rooms.data!.filter((room) => room.roomTypeId === type.id);
                  const pending = unassigned(type.id);
                  return (
                    <React.Fragment key={type.id}>
                      <tr className="bg-[#f4efe6]">
                        <td colSpan={DAYS + 1} className="px-3 py-1.5 text-[11px] font-bold uppercase text-[#786f62] tracking-wider">
                          {type.name}
                        </td>
                      </tr>
                      {typeRooms.map((room) => (
                        <tr key={room.id}>
                          <td
                            onClick={() => onSelectRoom(room.id)}
                            className="p-3 sticky left-0 bg-white hover:bg-[#e7ddd0] cursor-pointer z-10 border-r border-[#cfc4b4]/30"
                          >
                            <div className="font-bold text-[#d99d26]">{room.name}</div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${ROOM_STATUS_BADGE[room.status]}`}>
                              {ROOM_STATUS_LABELS[room.status]}
                            </span>
                          </td>
                          {dates.map((date) => cell(onRoom(room.id), date))}
                        </tr>
                      ))}
                      {pending.length > 0 && (
                        <tr>
                          <td className="p-3 sticky left-0 bg-white z-10 border-r border-[#cfc4b4]/30 text-[11px] text-[#786f62] font-semibold">
                            Not yet assigned
                          </td>
                          {dates.map((date) => cell(pending, date))}
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

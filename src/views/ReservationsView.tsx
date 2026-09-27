import React, { useEffect, useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api, BookingQuery } from '../services/api';
import type { Booking, BookingStatus } from '../types/hotel';
import { formatDay, formatMoney, SOURCE_LABELS, STAGE_BADGE, STAGE_LABELS } from '../lib/format';
import { buttonClass, Card, Empty, ErrorNote, Icon, inputClass, Loading, PageHeader, Tabs } from '../components/ui';

interface ReservationsViewProps {
  mode: 'all' | 'arrivals';
  onOpenNewReservation: () => void;
  onOpenCheckIn: (bookingId?: string) => void;
  onOpenFolio: (bookingId: string) => void;
  onSelectRoom: (roomId: string) => void;
}

const STATUS_OPTIONS: Array<{ value: '' | BookingStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PENDING_PAYMENT', label: 'Awaiting payment' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

type DayView = 'arrivals' | 'departures' | 'in_house';

export const ReservationsView: React.FC<ReservationsViewProps> = ({
  mode,
  onOpenNewReservation,
  onOpenCheckIn,
  onOpenFolio,
  onSelectRoom,
}) => {
  const { hasPermission } = useHotel();
  const canFrontDesk = hasPermission('canFrontDesk');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | BookingStatus>('');
  const [dayView, setDayView] = useState<DayView>('arrivals');
  const overview = useApi(() => api.overview(), [], mode === 'arrivals');
  const [date, setDate] = useState('');
  const day = date || overview.data?.today || '';
  const checkOut = useMutation(api.checkOut);

  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params: BookingQuery =
    mode === 'all' ? { view: 'all', q, status } : { view: dayView, date: dayView === 'in_house' ? undefined : day, q };
  const bookings = useApi(() => api.bookings(params), [mode, q, status, dayView, day], mode === 'all' || Boolean(day));

  const rowAction = (booking: Booking) => {
    if (!canFrontDesk) return null;
    if (booking.stage === 'arriving') {
      return (
        <button onClick={() => onOpenCheckIn(booking.id)} className={buttonClass.primary}>
          Check in
        </button>
      );
    }
    if (booking.stage === 'in_house') {
      return Number(booking.balance) > 0 ? (
        <button onClick={() => onOpenFolio(booking.id)} className={buttonClass.danger}>
          Collect
        </button>
      ) : (
        <button
          disabled={checkOut.pending}
          onClick={() => void checkOut.run(booking.id)}
          className="px-3 py-2 rounded-lg bg-[#565d79] hover:bg-[#262f4c] text-white text-xs font-semibold disabled:opacity-50"
        >
          Check out
        </button>
      );
    }
    return null;
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title={mode === 'all' ? 'Reservations' : 'Arrivals & departures'}
        subtitle={
          mode === 'all'
            ? 'Every booking from the website, phone and front desk'
            : 'Who is arriving, leaving and staying on a given day'
        }
        actions={
          canFrontDesk ? (
            <button onClick={onOpenNewReservation} className={buttonClass.primary}>
              <Icon name="add_task" />
              New reservation
            </button>
          ) : null
        }
      />

      <Card className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Icon name="search" className="absolute left-3 top-2 text-[#707881] text-[18px]" />
          <input
            type="search"
            placeholder="Search by guest, reference, email or phone…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
        {mode === 'all' ? (
          <select value={status} onChange={(event) => setStatus(event.target.value as '' | BookingStatus)} className={`${inputClass} w-48`}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <Tabs
              value={dayView}
              onChange={setDayView}
              options={[
                { value: 'arrivals', label: 'Arrivals' },
                { value: 'departures', label: 'Departures' },
                { value: 'in_house', label: 'In house' },
              ]}
            />
            {dayView !== 'in_house' ? (
              <input type="date" value={day} onChange={(event) => setDate(event.target.value)} className={`${inputClass} w-40`} />
            ) : null}
          </div>
        )}
      </Card>

      <ErrorNote message={bookings.error} onRetry={bookings.reload} />
      <ErrorNote message={checkOut.error} />

      <Card className="overflow-hidden">
        {bookings.loading && !bookings.data ? (
          <Loading />
        ) : !bookings.data?.length ? (
          <Empty
            icon="event_busy"
            title="No reservations found"
            detail={q || status ? 'Try a different search or status.' : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f2f3ff] text-[#707881] uppercase text-[10px] font-bold border-b border-[#bfc7d2]/30 tracking-wider">
                <tr>
                  <th className="p-3.5">Guest / reference</th>
                  <th className="p-3.5">Room</th>
                  <th className="p-3.5">Stay</th>
                  <th className="p-3.5">Source</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebedff]">
                {bookings.data.map((booking) => (
                  <tr key={booking.id} className="hover:bg-[#faf8ff] transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-[#111a36]">{booking.guest.name}</div>
                      <div className="text-[11px] text-[#707881] mt-0.5">
                        <span className="font-semibold text-[#006194]">{booking.reference}</span> · {booking.guest.phone}
                      </div>
                    </td>
                    <td className="p-3.5">
                      {booking.rooms.map((room, index) => (
                        <div key={index}>
                          {room.roomId ? (
                            <button onClick={() => onSelectRoom(room.roomId!)} className="font-bold text-[#006194] hover:underline">
                              {room.roomName}
                            </button>
                          ) : (
                            <span className="text-[#707881]">Unassigned</span>
                          )}
                          <span className="text-[11px] text-[#707881] block">{room.roomTypeName}</span>
                        </div>
                      ))}
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-[#111a36]">
                        {formatDay(booking.checkIn)} → {formatDay(booking.checkOut)}
                      </div>
                      <div className="text-[11px] text-[#707881]">
                        {booking.nights} night(s) · {booking.adults + booking.children} guest(s)
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ebedff] text-[#3f4850]">
                        {SOURCE_LABELS[booking.source] ?? booking.source}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#111a36] tabular-nums">{formatMoney(booking.total, booking.currency)}</div>
                      {['cancelled', 'expired', 'no_show'].includes(booking.stage) ? (
                        <span className="text-[11px] text-[#707881]">
                          {Number(booking.paid) > 0 ? `Paid ${formatMoney(booking.paid, booking.currency)}` : 'Not charged'}
                        </span>
                      ) : Number(booking.balance) > 0 ? (
                        <span className="text-[11px] text-[#ba1a1a] font-bold">
                          Due {formatMoney(booking.balance, booking.currency)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-semibold">Paid</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STAGE_BADGE[booking.stage]}`}>
                        {STAGE_LABELS[booking.stage]}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => onOpenFolio(booking.id)} className={buttonClass.secondary}>
                          Folio
                        </button>
                        {rowAction(booking)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

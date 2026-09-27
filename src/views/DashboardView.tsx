import React, { useState } from 'react';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import type { Booking } from '../types/hotel';
import { formatDay, formatMoney, ROOM_STATUS_BADGE, ROOM_STATUS_LABELS, STAGE_BADGE, STAGE_LABELS } from '../lib/format';
import { buttonClass, Card, Empty, ErrorNote, Icon, Loading, StatCard, Tabs } from '../components/ui';
import type { NavScreen } from '../components/Sidebar';

interface DashboardViewProps {
  onOpenNewReservation: () => void;
  onOpenCheckIn: (bookingId?: string) => void;
  onOpenAssignCleaning: () => void;
  onSelectRoom: (roomId: string) => void;
  onOpenFolio: (bookingId: string) => void;
  onNavigate: (screen: NavScreen) => void;
}

const RANGES = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
] as const;

const TILE_STYLE: Record<string, string> = {
  occupied: 'bg-[#006194] text-white',
  clean: 'bg-[#f2f3ff] text-[#111a36] border border-[#bfc7d2]/30',
  cleaning: 'bg-[#ffdcc3] text-[#2f1500] border border-[#8d4b00]/30',
  dirty: 'bg-[#ebedff] text-[#8d4b00] border border-[#bfc7d2]/30',
  oos: 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/30',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewReservation,
  onOpenCheckIn,
  onOpenAssignCleaning,
  onSelectRoom,
  onOpenFolio,
  onNavigate,
}) => {
  const { currentUser, property, hasPermission } = useHotel();
  const canFrontDesk = hasPermission('canFrontDesk');
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('7');
  const [feed, setFeed] = useState<'arrivals' | 'departures'>('arrivals');

  const overview = useApi(() => api.overview());
  const rooms = useApi(() => api.rooms());
  const revenue = useApi(() => api.revenue(Number(range)), [range]);
  const arrivals = useApi(() => api.bookings({ view: 'arrivals' }));
  const departures = useApi(() => api.bookings({ view: 'departures' }));
  const checkOut = useMutation(api.checkOut);

  const o = overview.data;
  const currency = o?.currency ?? property?.currency ?? 'GHS';
  const money = (value: string | number) => formatMoney(value, currency);
  const occupancy = o && o.rooms.total ? Math.round((o.rooms.occupied / o.rooms.total) * 100) : 0;
  const revenueTotal = (revenue.data ?? []).reduce(
    (acc, row) => ({
      online: acc.online + row.online,
      mobileMoney: acc.mobileMoney + row.mobileMoney,
      desk: acc.desk + row.desk,
      total: acc.total + row.total,
    }),
    { online: 0, mobileMoney: 0, desk: 0, total: 0 },
  );
  const donut = o
    ? [
        { name: 'Occupied', value: o.rooms.occupied, color: '#006194' },
        { name: 'Clean', value: o.rooms.clean, color: '#565d79' },
        { name: 'Dirty / cleaning', value: o.rooms.dirty + o.rooms.cleaning, color: '#8d4b00' },
        { name: 'Out of service', value: o.rooms.outOfService, color: '#ba1a1a' },
      ]
    : [];

  const feedList = (feed === 'arrivals' ? arrivals.data : departures.data) ?? [];
  const oosRooms = (rooms.data ?? []).filter((room) => room.status === 'oos');
  const turnoverRooms = (rooms.data ?? []).filter((room) => room.status === 'dirty' || room.status === 'cleaning');

  const renderAction = (booking: Booking) => {
    if (!canFrontDesk) return null;
    if (feed === 'arrivals' && booking.stage === 'arriving') {
      return (
        <button onClick={() => onOpenCheckIn(booking.id)} className={buttonClass.primary}>
          <Icon name="how_to_reg" className="text-[16px]" />
          Check in
        </button>
      );
    }
    if (feed === 'departures' && booking.stage === 'in_house') {
      return Number(booking.balance) > 0 ? (
        <button onClick={() => onOpenFolio(booking.id)} className={buttonClass.danger}>
          <Icon name="payments" className="text-[16px]" />
          Collect {money(booking.balance)}
        </button>
      ) : (
        <button
          disabled={checkOut.pending}
          onClick={() => void checkOut.run(booking.id)}
          className="px-3 py-1.5 rounded-lg bg-[#565d79] hover:bg-[#262f4c] text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
        >
          <Icon name="logout" className="text-[16px]" />
          Check out
        </button>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="px-8 py-3.5 bg-white border-b border-[#bfc7d2]/30 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div>
          <div className="font-bold text-xl text-[#111a36] tracking-tight">
            Welcome, {currentUser?.name.split(' ')[0]}
          </div>
          <p className="text-xs text-[#3f4850]">
            {o ? formatDay(o.today) : '…'} · {property?.name}
            {o ? (
              <>
                {' '}
                · <span className="font-bold text-[#006194]">{o.rooms.clean} of {o.rooms.total} rooms</span> clean and
                vacant
              </>
            ) : null}
          </p>
        </div>
        {canFrontDesk ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onOpenAssignCleaning} className={buttonClass.secondary}>
              <Icon name="cleaning_services" className="text-[17px] text-[#8d4b00]" />
              Assign cleaning
            </button>
            <button onClick={() => onOpenCheckIn()} className={buttonClass.secondary}>
              <Icon name="how_to_reg" className="text-[17px]" />
              Check in
            </button>
            <button onClick={onOpenNewReservation} className={buttonClass.primary}>
              <Icon name="add_task" className="text-[17px]" />
              New reservation
            </button>
          </div>
        ) : null}
      </div>

      <div className="p-8 space-y-6">
        <ErrorNote message={overview.error} onRetry={overview.reload} />
        <ErrorNote message={checkOut.error} />

        {!o && overview.loading ? (
          <Loading label="Loading today's figures…" />
        ) : o ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <StatCard
              label="Occupancy"
              icon="pie_chart"
              value={`${occupancy}%`}
              detail={`${o.rooms.occupied} of ${o.rooms.total} rooms occupied`}
            />
            <StatCard
              label="Collected today"
              icon="payments"
              value={money(o.revenueToday)}
              detail="Payments received today"
            />
            <StatCard
              label="Arrivals"
              icon="flight_land"
              value={o.arrivals.total}
              detail={`${o.arrivals.checkedIn} checked in · ${o.arrivals.total - o.arrivals.checkedIn} to come`}
              onClick={() => onNavigate('arrivals')}
            />
            <StatCard
              label="Departures"
              icon="flight_takeoff"
              value={o.departures.total}
              detail={`${o.departures.checkedOut} checked out · ${o.inHouse} in house`}
              onClick={() => onNavigate('arrivals')}
            />
            <StatCard
              label="Housekeeping"
              icon="cleaning_services"
              value={`${o.rooms.clean} ready`}
              detail={`${o.rooms.dirty} dirty · ${o.rooms.cleaning} cleaning · ${o.rooms.outOfService} OOS`}
              onClick={() => onNavigate('housekeeping')}
            />
            <StatCard
              label="Balances due"
              icon="receipt_long"
              value={money(o.outstanding.amount)}
              detail={`${o.outstanding.count} confirmed booking(s) · ${o.pendingPayment} awaiting online payment`}
              onClick={() => onNavigate('reservations')}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-7 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
              <div>
                <h2 className="text-base font-bold text-[#111a36]">Payments collected</h2>
                <p className="text-xs text-[#707881]">By payment channel, per day</p>
              </div>
              <Tabs value={range} options={[...RANGES]} onChange={setRange} />
            </div>
            <div className="grid grid-cols-4 gap-2 py-2.5 my-2 bg-[#f2f3ff] rounded-lg px-4 border border-[#bfc7d2]/20">
              {[
                ['Total', revenueTotal.total, 'text-[#111a36]'],
                ['Card (online)', revenueTotal.online, 'text-[#006194]'],
                ['Mobile money', revenueTotal.mobileMoney, 'text-[#565d79]'],
                ['At the desk', revenueTotal.desk, 'text-[#8d4b00]'],
              ].map(([label, value, color]) => (
                <div key={label as string}>
                  <div className="text-[11px] text-[#707881]">{label}</div>
                  <div className={`text-sm font-bold tabular-nums ${color}`}>{money(value as number)}</div>
                </div>
              ))}
            </div>
            <ErrorNote message={revenue.error} onRetry={revenue.reload} />
            <div className="w-full h-52 mt-3">
              {revenueTotal.total === 0 && !revenue.loading ? (
                <Empty icon="monitoring" title="No payments in this period" detail="Collected payments will chart here." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue.data ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value: string) => value.slice(5)}
                      tick={{ fontSize: 11, fill: '#707881' }}
                      stroke="#bfc7d2"
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#707881' }} stroke="#bfc7d2" />
                    <Tooltip
                      formatter={(value) => money(Number(value))}
                      labelFormatter={(label) => formatDay(String(label))}
                      contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #bfc7d2' }}
                    />
                    <Area type="monotone" stackId="1" dataKey="online" name="Card (online)" stroke="#006194" fill="#006194" fillOpacity={0.25} />
                    <Area type="monotone" stackId="1" dataKey="mobileMoney" name="Mobile money" stroke="#565d79" fill="#565d79" fillOpacity={0.2} />
                    <Area type="monotone" stackId="1" dataKey="desk" name="At the desk" stroke="#8d4b00" fill="#8d4b00" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-5 p-5">
            <h2 className="text-base font-bold text-[#111a36]">Inventory status</h2>
            <p className="text-xs text-[#707881]">Occupancy and readiness right now</p>
            {o ? (
              <>
                <div className="flex items-center gap-4 py-3">
                  <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donut} innerRadius={32} outerRadius={48} paddingAngle={3} dataKey="value">
                          {donut.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center pointer-events-none">
                      <span className="text-lg font-bold text-[#111a36] tabular-nums">{o.rooms.total}</span>
                      <span className="text-[9px] text-[#707881] uppercase font-bold">Rooms</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 text-xs">
                    {donut.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[#111a36] font-medium">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                          {entry.name}
                        </span>
                        <span className="font-bold tabular-nums">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 pt-3 border-t border-[#ebedff]">
                  {o.roomTypes.map((type) => {
                    const percent = type.units ? Math.round((type.occupied / type.units) * 100) : 0;
                    return (
                      <div key={type.id}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-[#111a36]">{type.name}</span>
                          <span className="text-[#006194] tabular-nums">
                            {type.occupied} / {type.units} occupied
                          </span>
                        </div>
                        <div className="w-full bg-[#ebedff] rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#006194] h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <Loading />
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-7 overflow-hidden">
            <div className="p-5 border-b border-[#ebedff] flex items-center justify-between gap-3">
              <Tabs
                value={feed}
                onChange={setFeed}
                options={[
                  { value: 'arrivals', label: `Today's arrivals (${arrivals.data?.length ?? 0})` },
                  { value: 'departures', label: `Today's departures (${departures.data?.length ?? 0})` },
                ]}
              />
              <button onClick={() => onNavigate('arrivals')} className="text-xs text-[#006194] font-bold">
                View all
              </button>
            </div>
            <ErrorNote message={(feed === 'arrivals' ? arrivals : departures).error} />
            <div className="divide-y divide-[#ebedff]">
              {feedList.length === 0 ? (
                <Empty
                  icon={feed === 'arrivals' ? 'flight_land' : 'flight_takeoff'}
                  title={feed === 'arrivals' ? 'No arrivals today' : 'No departures today'}
                />
              ) : (
                feedList.map((booking) => (
                  <div key={booking.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => onOpenFolio(booking.id)} className="font-bold text-sm text-[#111a36] hover:underline">
                          {booking.guest.name}
                        </button>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STAGE_BADGE[booking.stage]}`}>
                          {STAGE_LABELS[booking.stage]}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#707881] mt-0.5">
                        {booking.reference} · {booking.rooms.map((room) => room.roomName ?? room.roomTypeName).join(', ')} ·{' '}
                        {booking.nights} night(s) · {booking.guest.phone}
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {Number(booking.balance) > 0 ? (
                          <span className="text-[#ba1a1a] font-bold">Balance {money(booking.balance)}</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Paid {money(booking.paid)}</span>
                        )}
                        {booking.specialRequests ? <span className="text-[#707881]"> · {booking.specialRequests}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => onOpenFolio(booking.id)} className={buttonClass.secondary}>
                        Folio
                      </button>
                      {renderAction(booking)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <div className="lg:col-span-5 space-y-6">
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="notifications_active" className="text-[#b15f00] text-[22px]" />
                <h2 className="text-base font-bold text-[#111a36]">Needs attention</h2>
              </div>
              {oosRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className="w-full text-left p-3 rounded-xl bg-[#ffdad6]/40 border border-[#ba1a1a]/30"
                >
                  <div className="text-xs font-bold text-[#111a36] flex items-center gap-1.5">
                    <Icon name="build_circle" className="text-[#ba1a1a] text-[18px]" />
                    {room.name} is out of service
                  </div>
                  <p className="text-xs text-[#3f4850] mt-1">{room.maintenanceNote || 'No note recorded.'}</p>
                </button>
              ))}
              {turnoverRooms.length > 0 && (
                <button
                  onClick={() => onNavigate('housekeeping')}
                  className="w-full text-left p-3 rounded-xl bg-[#ffdcc3]/40 border border-[#8d4b00]/30"
                >
                  <div className="text-xs font-bold text-[#111a36] flex items-center gap-1.5">
                    <Icon name="cleaning_services" className="text-[#8d4b00] text-[18px]" />
                    {turnoverRooms.length} room(s) awaiting turnover
                  </div>
                  <p className="text-xs text-[#3f4850] mt-1">
                    {turnoverRooms
                      .map((room) => `${room.name}${room.housekeeper ? ` (${room.housekeeper})` : ''}`)
                      .join(', ')}
                  </p>
                </button>
              )}
              {o && o.enquiries.total > 0 && (
                <button
                  onClick={() => onNavigate('enquiries')}
                  className="w-full text-left p-3 rounded-xl bg-[#f2f3ff] border border-[#bfc7d2]/30"
                >
                  <div className="text-xs font-bold text-[#111a36] flex items-center gap-1.5">
                    <Icon name="mail" className="text-[#006194] text-[18px]" />
                    {o.enquiries.total} enquiry/message(s) waiting
                  </div>
                  <p className="text-xs text-[#707881] mt-1">
                    {o.enquiries.venue} venue · {o.enquiries.events} event · {o.enquiries.contact} unread message(s)
                  </p>
                </button>
              )}
              {o && o.pendingPayment > 0 && (
                <button
                  onClick={() => onNavigate('reservations')}
                  className="w-full text-left p-3 rounded-xl bg-amber-50 border border-amber-300"
                >
                  <div className="text-xs font-bold text-[#111a36]">
                    {o.pendingPayment} online booking(s) awaiting payment
                  </div>
                  <p className="text-xs text-[#707881] mt-1">Rooms are held until the payment window expires.</p>
                </button>
              )}
              {o && !oosRooms.length && !turnoverRooms.length && !o.enquiries.total && !o.pendingPayment ? (
                <p className="text-xs text-[#707881]">Nothing needs attention right now.</p>
              ) : null}
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#111a36]">Room rack</h2>
                <button onClick={() => onNavigate('rooms')} className="text-xs text-[#006194] font-bold">
                  Full matrix
                </button>
              </div>
              <ErrorNote message={rooms.error} onRetry={rooms.reload} />
              <div className="grid grid-cols-3 gap-2">
                {(rooms.data ?? []).map((room) => (
                  <button
                    key={room.id}
                    onClick={() => onSelectRoom(room.id)}
                    title={ROOM_STATUS_LABELS[room.status]}
                    className={`p-2 rounded-lg flex flex-col justify-between h-16 text-left transition-all active:scale-95 ${TILE_STYLE[room.status]}`}
                  >
                    <span className="font-bold text-xs truncate">{room.name}</span>
                    <span className="text-[10px] truncate font-medium">
                      {room.currentStay?.guestName ?? ROOM_STATUS_LABELS[room.status]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {(['occupied', 'clean', 'cleaning', 'dirty', 'oos'] as const).map((status) => (
                  <span key={status} className={`px-1.5 py-0.5 rounded font-semibold ${ROOM_STATUS_BADGE[status]}`}>
                    {ROOM_STATUS_LABELS[status]}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

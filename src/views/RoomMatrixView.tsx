import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { RoomStatus } from '../types/hotel';
import { formatDateTime, formatMoney, ROOM_STATUS_BADGE, ROOM_STATUS_LABELS } from '../lib/format';
import { buttonClass, Card, Empty, ErrorNote, Icon, Loading, PageHeader } from '../components/ui';
import { AddRoomModal } from '../components/modals/AddRoomModal';

interface RoomMatrixViewProps {
  mode: 'all' | 'housekeeping' | 'maintenance';
  onSelectRoom: (roomId: string) => void;
  onOpenAssignCleaning: () => void;
}

const TITLES = {
  all: ['Room matrix', 'Every room with live occupancy, housekeeping and maintenance state'],
  housekeeping: ['Housekeeping', 'Rooms that need turning over after check-out'],
  maintenance: ['Out of service', 'Rooms blocked from sale until maintenance is resolved'],
} as const;

const DEFAULT_FILTER: Record<RoomMatrixViewProps['mode'], RoomStatus | 'all' | 'turnover'> = {
  all: 'all',
  housekeeping: 'turnover',
  maintenance: 'oos',
};

export const RoomMatrixView: React.FC<RoomMatrixViewProps> = ({ mode, onSelectRoom, onOpenAssignCleaning }) => {
  const { property, hasPermission } = useHotel();
  const rooms = useApi(() => api.rooms());
  const [filter, setFilter] = useState(DEFAULT_FILTER[mode]);
  const [adding, setAdding] = useState(false);
  const list = rooms.data ?? [];
  const count = (status: RoomStatus) => list.filter((room) => room.status === status).length;

  const visible = list.filter((room) =>
    filter === 'all'
      ? true
      : filter === 'turnover'
        ? room.status === 'dirty' || room.status === 'cleaning'
        : room.status === filter,
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title={TITLES[mode][0]}
        subtitle={TITLES[mode][1]}
        actions={
          <>
            {hasPermission('canManageRooms') && mode === 'all' ? (
              <button onClick={() => setAdding(true)} className={buttonClass.secondary}>
                <Icon name="add_home" />
                Add room
              </button>
            ) : null}
            {hasPermission('canFrontDesk') && mode !== 'maintenance' ? (
              <button onClick={onOpenAssignCleaning} className={buttonClass.primary}>
                <Icon name="cleaning_services" />
                Assign cleaning
              </button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        {(['clean', 'occupied', 'dirty', 'cleaning', 'oos'] as const).map((status) => (
          <Card key={status} className="p-3">
            <span className="text-[#707881]">{ROOM_STATUS_LABELS[status]}</span>
            <div className="text-lg font-bold text-[#111a36]">{count(status)}</div>
          </Card>
        ))}
      </div>

      <Card className="p-3.5 flex flex-wrap items-center gap-1 text-xs">
        <span className="text-[#707881] font-semibold mr-1">Show:</span>
        {(
          [
            ['all', 'All'],
            ['turnover', 'Needs turnover'],
            ['clean', 'Clean'],
            ['occupied', 'Occupied'],
            ['oos', 'Out of service'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              filter === value ? 'bg-[#111a36] text-white' : 'bg-[#f2f3ff] text-[#3f4850] hover:bg-[#ebedff]'
            }`}
          >
            {label}
          </button>
        ))}
      </Card>

      <ErrorNote message={rooms.error} onRetry={rooms.reload} />

      {rooms.loading && !rooms.data ? (
        <Loading />
      ) : !visible.length ? (
        <Card>
          <Empty
            icon={mode === 'maintenance' ? 'build' : 'meeting_room'}
            title={mode === 'maintenance' ? 'No rooms are out of service' : 'No rooms match this filter'}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {visible.map((room) => (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className="p-4 rounded-xl bg-white border border-[#bfc7d2]/40 hover:border-[#006194] hover:shadow-md text-left transition-all flex flex-col justify-between min-h-40 shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-lg font-bold text-[#006194]">{room.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ROOM_STATUS_BADGE[room.status]}`}>
                    {ROOM_STATUS_LABELS[room.status]}
                  </span>
                </div>
                <div className="text-[11px] text-[#707881]">
                  {room.roomTypeName}
                  {room.floor ? ` · ${room.floor}` : ''}
                  {room.code ? ` · #${room.code}` : ''}
                </div>
              </div>
              <div className="space-y-1 pt-2 mt-2 border-t border-[#ebedff] text-[11px]">
                {room.currentStay ? (
                  <div className="text-[#111a36] truncate">
                    <strong>{room.currentStay.guestName}</strong> · out {room.currentStay.checkOut}
                  </div>
                ) : null}
                {room.status === 'cleaning' ? (
                  <div className="text-[#8d4b00] font-semibold">Assigned to {room.housekeeper ?? 'unassigned'}</div>
                ) : null}
                {room.status === 'oos' ? (
                  <div className="text-[#ba1a1a] font-semibold line-clamp-2">{room.maintenanceNote || 'No note recorded'}</div>
                ) : null}
                {room.status === 'clean' && room.lastCleanedAt ? (
                  <div className="text-emerald-700">Cleaned {formatDateTime(room.lastCleanedAt, property?.timezone)}</div>
                ) : null}
                <div className="flex items-center justify-between text-[#707881]">
                  <span>Rate / night</span>
                  <span className="font-bold text-[#111a36]">{formatMoney(room.basePrice, room.currency)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {adding ? <AddRoomModal onClose={() => setAdding(false)} /> : null}
    </div>
  );
};

import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { useApi, useMutation } from '../../hooks/useApi';
import { api } from '../../services/api';
import type { HousekeepingStatus } from '../../types/hotel';
import { formatDateTime, formatDay, formatMoney, ROOM_STATUS_BADGE, ROOM_STATUS_LABELS } from '../../lib/format';
import { HousekeeperPicker } from '../HousekeeperPicker';
import { buttonClass, Drawer, ErrorNote, Field, inputClass, Loading } from '../ui';

interface RoomActionDrawerProps {
  roomId: string;
  onClose: () => void;
  onOpenFolio: (bookingId: string) => void;
}

const HOUSEKEEPING: Array<{ value: HousekeepingStatus; label: string; dot: string }> = [
  { value: 'CLEAN', label: 'Clean & ready', dot: 'bg-emerald-500' },
  { value: 'CLEANING', label: 'Cleaning', dot: 'bg-[#8d4b00]' },
  { value: 'DIRTY', label: 'Dirty', dot: 'bg-amber-500' },
];

export const RoomActionDrawer: React.FC<RoomActionDrawerProps> = ({ roomId, onClose, onOpenFolio }) => {
  const { hasPermission, property } = useHotel();
  const canEdit = hasPermission('canFrontDesk');
  const rooms = useApi(() => api.rooms());
  const room = rooms.data?.find((item) => item.id === roomId);
  const update = useMutation(api.updateRoom);
  const [housekeeper, setHousekeeper] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const canManageRooms = hasPermission('canManageRooms');
  const saveDetails = useMutation(api.updateRoomDetails);
  const [details, setDetails] = useState<{ name: string; code: string; floor: string } | null>(null);

  if (!room) {
    return (
      <Drawer title="Room" onClose={onClose}>
        {rooms.error ? <ErrorNote message={rooms.error} /> : <Loading />}
      </Drawer>
    );
  }

  const housekeeperValue = housekeeper ?? room.housekeeper ?? '';
  const detailValues = details ?? { name: room.name, code: room.code ?? '', floor: room.floor ?? '' };
  const detailsChanged =
    detailValues.name !== room.name || detailValues.code !== (room.code ?? '') || detailValues.floor !== (room.floor ?? '');

  const retire = async () => {
    const ok = window.confirm(
      `Retire ${room.name}? It stops being sold and disappears from the room rack. Past bookings keep their history.`,
    );
    if (ok && (await saveDetails.run(room.id, { isActive: false }))) onClose();
  };
  const noteValue = note ?? room.maintenanceNote ?? '';

  return (
    <Drawer
      title={
        <span className="flex items-center gap-2">
          {room.name}
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROOM_STATUS_BADGE[room.status]}`}>
            {ROOM_STATUS_LABELS[room.status]}
          </span>
        </span>
      }
      subtitle={`${room.roomTypeName}${room.floor ? ` · ${room.floor}` : ''} · ${formatMoney(room.basePrice, room.currency)} / night`}
      onClose={onClose}
    >
      <ErrorNote message={update.error || saveDetails.error} />

      <div className="p-3.5 rounded-xl bg-[#e7ddd0] grid grid-cols-2 gap-3">
        <div>
          <span className="text-[#786f62]">Housekeeping</span>
          <div className="font-semibold">{room.housekeeping.toLowerCase()}</div>
        </div>
        <div>
          <span className="text-[#786f62]">Last cleaned</span>
          <div className="font-semibold">{room.lastCleanedAt ? formatDateTime(room.lastCleanedAt, property?.timezone) : '—'}</div>
        </div>
        <div>
          <span className="text-[#786f62]">Housekeeper</span>
          <div className="font-semibold">{room.housekeeper ?? '—'}</div>
        </div>
        <div>
          <span className="text-[#786f62]">Guest</span>
          <div className="font-semibold">{room.currentStay?.guestName ?? 'Vacant'}</div>
        </div>
      </div>

      {room.currentStay ? (
        <div className="p-4 rounded-xl border border-[#d99d26]/30 bg-[#e7ddd0]/20 flex items-center justify-between">
          <div>
            <div className="font-bold text-[#d99d26]">{room.currentStay.reference}</div>
            <div className="text-[#786f62]">Checks out {formatDay(room.currentStay.checkOut)}</div>
          </div>
          <button onClick={() => onOpenFolio(room.currentStay!.bookingId)} className={buttonClass.small}>
            Open folio
          </button>
        </div>
      ) : null}

      {canEdit ? (
        <>
          <div className="space-y-2">
            <div className="font-bold text-[#161410]">Housekeeping status</div>
            <div className="grid grid-cols-3 gap-2">
              {HOUSEKEEPING.map((option) => (
                <button
                  key={option.value}
                  disabled={update.pending}
                  onClick={() => void update.run(room.id, { housekeeping: option.value })}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 ${
                    room.housekeeping === option.value
                      ? 'border-[#d99d26] bg-[#e7ddd0]/30 font-semibold ring-1 ring-[#d99d26]'
                      : 'border-[#cfc4b4]/40 hover:bg-[#e7ddd0]'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${option.dot}`} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Housekeeper">
            <div className="flex gap-2">
              <div className="flex-1">
                <HousekeeperPicker value={housekeeperValue} onChange={setHousekeeper} />
              </div>
              <button
                disabled={update.pending || housekeeperValue === (room.housekeeper ?? '')}
                onClick={() => void update.run(room.id, { housekeeper: housekeeperValue.trim() || null })}
                className={buttonClass.secondary}
              >
                Save
              </button>
            </div>
          </Field>

          <div className="space-y-2 p-4 rounded-xl border border-[#ba1a1a]/30 bg-[#ffdad6]/20">
            <div className="font-bold text-[#ba1a1a]">Maintenance</div>
            <textarea
              value={noteValue}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              placeholder="Describe the fault (AC, plumbing, electrical…)"
              className="w-full h-20 p-2.5 rounded-lg bg-white border border-[#ba1a1a]/40 text-xs focus:outline-none resize-none"
            />
            {room.maintenance ? (
              <div className="flex gap-2">
                <button
                  disabled={update.pending || noteValue === (room.maintenanceNote ?? '')}
                  onClick={() => void update.run(room.id, { maintenanceNote: noteValue })}
                  className={buttonClass.secondary}
                >
                  Update note
                </button>
                <button
                  disabled={update.pending}
                  onClick={() => void update.run(room.id, { maintenance: false }).then(() => setNote(null))}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-50"
                >
                  Resolve & return to sale
                </button>
              </div>
            ) : (
              <button
                disabled={update.pending || !noteValue.trim()}
                onClick={() => void update.run(room.id, { maintenance: true, maintenanceNote: noteValue })}
                className={buttonClass.danger}
              >
                Take out of service
              </button>
            )}
            <p className="text-[11px] text-[#786f62]">Out-of-service rooms stop being sold on the website until resolved.</p>
          </div>
        </>
      ) : null}

      {canManageRooms ? (
        <div className="space-y-3 p-4 rounded-xl border border-[#cfc4b4]/40">
          <div className="font-bold text-[#161410]">Room details</div>
          <Field label="Name">
            <input
              maxLength={60}
              className={inputClass}
              value={detailValues.name}
              onChange={(event) => setDetails({ ...detailValues, name: event.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Code / number">
              <input maxLength={20} className={inputClass} value={detailValues.code} onChange={(event) => setDetails({ ...detailValues, code: event.target.value })} />
            </Field>
            <Field label="Floor / wing">
              <input maxLength={40} className={inputClass} value={detailValues.floor} onChange={(event) => setDetails({ ...detailValues, floor: event.target.value })} />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              disabled={!detailsChanged || !detailValues.name.trim() || saveDetails.pending}
              onClick={() =>
                void saveDetails
                  .run(room.id, {
                    name: detailValues.name.trim(),
                    code: detailValues.code.trim() || null,
                    floor: detailValues.floor.trim() || null,
                  })
                  .then((result) => result && setDetails(null))
              }
              className={buttonClass.secondary}
            >
              Save details
            </button>
            <button disabled={saveDetails.pending || Boolean(room.currentStay)} onClick={() => void retire()} className="text-[#ba1a1a] font-semibold hover:underline disabled:opacity-40 disabled:no-underline">
              Retire room
            </button>
          </div>
          {room.currentStay ? <p className="text-[11px] text-[#786f62]">Check the guest out before retiring this room.</p> : null}
        </div>
      ) : null}
    </Drawer>
  );
};

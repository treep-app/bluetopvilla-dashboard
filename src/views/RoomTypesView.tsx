import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import type { RoomTypeDetail } from '../types/hotel';
import { amenitySymbol, formatMoney, mediaSrc } from '../lib/format';
import { RoomTypeEditor } from '../components/modals/RoomTypeEditor';
import { buttonClass, Card, Empty, ErrorNote, Icon, inputClass, Loading, PageHeader } from '../components/ui';

const RateEditor: React.FC<{ type: RoomTypeDetail }> = ({ type }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(type.basePrice);
  const save = useMutation(api.updateRate);

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className={buttonClass.small}>
        Change rate
      </button>
    );
  }
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (await save.run(type.id, Number(value))) setEditing(false);
      }}
      className="flex items-center gap-1.5"
    >
      <input type="number" min="1" step="0.01" required autoFocus value={value} onChange={(e) => setValue(e.target.value)} className={`${inputClass} w-28 h-8`} />
      <button type="submit" disabled={save.pending} className={buttonClass.small}>
        Save
      </button>
      <button type="button" onClick={() => setEditing(false)} className="text-[#786f62] text-[11px]">
        Cancel
      </button>
      {save.error ? <span className="text-[11px] text-[#ba1a1a]">{save.error}</span> : null}
    </form>
  );
};

export const RoomTypesView: React.FC = () => {
  const { hasPermission } = useHotel();
  const canManageRooms = hasPermission('canManageRooms');
  const canManageRates = hasPermission('canManageRates');
  const types = useApi(() => api.roomTypes());
  const [editing, setEditing] = useState<RoomTypeDetail | null | undefined>(undefined);

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader
        title="Room types & rates"
        subtitle="What guests can book on the website, and the rooms behind each type"
        actions={
          canManageRooms ? (
            <button onClick={() => setEditing(null)} className={buttonClass.primary}>
              <Icon name="add" />
              New room type
            </button>
          ) : null
        }
      />

      <div className="p-3.5 rounded-xl bg-[#e7ddd0]/30 border border-[#d99d26]/20 text-xs text-[#3c3832] flex gap-2">
        <Icon name="info" className="text-[18px] text-[#d99d26]" />
        <span>
          A room type is what guests book (e.g. "Deluxe Room"); its rooms are the physical units the front desk assigns.
          Each room adds one room to sell per night. Rate changes apply to new bookings only.
        </span>
      </div>

      <ErrorNote message={types.error} onRetry={types.reload} />

      {types.loading && !types.data ? (
        <Loading />
      ) : !types.data?.length ? (
        <Card>
          <Empty icon="king_bed" title="No room types yet" detail={canManageRooms ? 'Create your first room type to start taking bookings.' : undefined} />
        </Card>
      ) : (
        <div className="space-y-4">
          {types.data.map((type) => {
            const cover = type.images[0];
            return (
              <Card key={type.id} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-[14rem_1fr]">
                  <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[11rem] bg-[#e7ddd0]">
                    {cover ? (
                      <img src={mediaSrc(cover.url)} alt={cover.alt ?? type.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-[#786f62] gap-1">
                        <Icon name="image" className="text-3xl" />
                        <span className="text-[11px]">No photo</span>
                      </div>
                    )}
                    {type.images.length > 1 ? (
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                        {type.images.length} photos
                      </span>
                    ) : null}
                  </div>
                  <div className="p-5 space-y-3 text-xs">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-[#161410]">{type.name}</h2>
                          {type.isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">On website</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-[#e7ddd0] text-[#786f62] text-[10px] font-bold">Hidden</span>
                          )}
                        </div>
                        <div className="text-[#786f62] mt-0.5">
                          /rooms/{type.slug} · sleeps {type.occupancy}
                          {type.bedConfig ? ` · ${type.bedConfig}` : ''}
                          {type.sizeSqm ? ` · ${type.sizeSqm} m²` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#161410] tabular-nums">{formatMoney(type.basePrice, type.currency)}</div>
                        <div className="text-[11px] text-[#786f62] mb-1">per night</div>
                        {canManageRates && !canManageRooms ? <RateEditor key={type.basePrice} type={type} /> : null}
                      </div>
                    </div>

                    {type.description ? <p className="text-[#3c3832] line-clamp-2">{type.description}</p> : null}

                    <div className="flex flex-wrap gap-1.5">
                      {type.amenities.map((amenity) => (
                        <span key={amenity.id} className="px-2 py-0.5 rounded bg-[#e7ddd0] text-[#3c3832] flex items-center gap-1">
                          <Icon name={amenitySymbol(amenity.icon)} className="text-[13px] text-[#d99d26]" />
                          {amenity.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e7ddd0]">
                      <div className="text-[#3c3832]">
                        <strong>{type.sellableUnits}</strong> of {type.units} room(s) sellable
                        {type.units ? `: ${type.rooms.filter((room) => room.isActive).map((room) => room.name).join(', ')}` : ''}
                        {type.upcomingBookings ? <span className="text-[#786f62]"> · {type.upcomingBookings} upcoming booking(s)</span> : null}
                        {type.isActive && type.units === 0 ? (
                          <span className="block text-amber-800">Shown on the website but has no rooms — guests can't book it yet.</span>
                        ) : null}
                        {type.isActive && type.images.length === 0 ? (
                          <span className="block text-amber-800">Add a photo — the website shows an empty frame without one.</span>
                        ) : null}
                      </div>
                      {canManageRooms ? (
                        <button onClick={() => setEditing(type)} className={buttonClass.secondary}>
                          <Icon name="edit" className="text-[16px]" />
                          Edit
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!canManageRooms && !canManageRates ? (
        <p className="text-[11px] text-[#786f62]">Administrators manage room types; managers can change rates.</p>
      ) : null}
      {editing !== undefined ? <RoomTypeEditor key={editing?.id ?? 'new'} roomType={editing} onClose={() => setEditing(undefined)} /> : null}
    </div>
  );
};

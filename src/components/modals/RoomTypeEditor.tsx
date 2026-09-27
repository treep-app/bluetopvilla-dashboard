import React, { useRef, useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { useApi, useMutation } from '../../hooks/useApi';
import { api, NewRoom } from '../../services/api';
import type { RoomTypeDetail } from '../../types/hotel';
import { AMENITY_ICONS, amenitySymbol, formatMoney, mediaSrc } from '../../lib/format';
import { buttonClass, ErrorNote, Field, Icon, inputClass, Modal } from '../ui';

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

type Photo = { url: string; alt: string };

interface RoomTypeEditorProps {
  /** Existing room type to edit, or null to create a new one. */
  roomType: RoomTypeDetail | null;
  onClose: () => void;
}

export const RoomTypeEditor: React.FC<RoomTypeEditorProps> = ({ roomType, onClose }) => {
  const { property } = useHotel();
  const creating = !roomType;
  const currency = roomType?.currency ?? property?.currency ?? 'GHS';

  const [form, setForm] = useState({
    name: roomType?.name ?? '',
    slug: '',
    description: roomType?.description ?? '',
    bedConfig: roomType?.bedConfig ?? '',
    sizeSqm: roomType?.sizeSqm ? String(roomType.sizeSqm) : '',
    occupancy: String(roomType?.occupancy ?? 2),
    basePrice: roomType?.basePrice ?? '',
    sortOrder: roomType ? String(roomType.sortOrder) : '',
    isActive: roomType?.isActive ?? true,
  });
  const [amenityIds, setAmenityIds] = useState<string[]>(roomType?.amenities.map((amenity) => amenity.id) ?? []);
  const [photos, setPhotos] = useState<Photo[]>(roomType?.images.map((image) => ({ url: image.url, alt: image.alt ?? '' })) ?? []);
  const [rooms, setRooms] = useState<NewRoom[]>([]);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newAmenity, setNewAmenity] = useState({ name: '', icon: 'wifi' });
  const fileInput = useRef<HTMLInputElement>(null);

  const amenities = useApi(() => api.amenities());
  const addAmenity = useMutation(api.createAmenity);
  const save = useMutation(async () => {
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      bedConfig: form.bedConfig.trim(),
      sizeSqm: form.sizeSqm ? Number(form.sizeSqm) : null,
      occupancy: Number(form.occupancy),
      basePrice: Number(form.basePrice),
      amenityIds,
      images: photos.map((photo) => ({ url: photo.url, alt: photo.alt.trim() || undefined })),
      isActive: form.isActive,
      ...(form.sortOrder ? { sortOrder: Number(form.sortOrder) } : {}),
    };
    return creating
      ? api.createRoomType({
          ...body,
          slug: form.slug.trim() || undefined,
          rooms: rooms.filter((room) => room.name.trim()).map((room) => ({
            name: room.name.trim(),
            code: room.code?.trim() || undefined,
            floor: room.floor?.trim() || undefined,
          })),
        })
      : api.updateRoomTypeDetails(roomType.id, body);
  });

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: event.target.value });

  const slug = form.slug || slugify(form.name);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(null);
    for (const file of Array.from(files)) {
      setUploading((count) => count + 1);
      try {
        const result = await api.uploadImage(file);
        setPhotos((current) => [...current, { url: result.url, alt: '' }]);
      } catch (error) {
        setUploadError(`${file.name}: ${error instanceof Error ? error.message : 'upload failed'}`);
      } finally {
        setUploading((count) => count - 1);
      }
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const movePhoto = (index: number, to: number) =>
    setPhotos((current) => {
      const next = [...current];
      const [photo] = next.splice(index, 1);
      next.splice(to, 0, photo);
      return next;
    });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (roomType && !form.isActive && roomType.isActive && roomType.upcomingBookings > 0) {
      const ok = window.confirm(
        `${roomType.upcomingBookings} upcoming booking(s) use this room type. Hiding it stops new bookings but keeps those. Continue?`,
      );
      if (!ok) return;
    }
    if (await save.run()) onClose();
  };

  const createAmenity = async () => {
    const created = await addAmenity.run(newAmenity.name.trim(), newAmenity.icon);
    if (created) {
      setAmenityIds((ids) => [...ids, created.id]);
      setNewAmenity({ name: '', icon: newAmenity.icon });
      void amenities.reload();
    }
  };

  const suggestRooms = () => {
    const base = form.name.trim() || 'Room';
    setRooms((current) => [...current, { name: `${base} ${current.length + 1}` }]);
  };

  return (
    <Modal
      title={creating ? 'New room type' : `Edit ${roomType.name}`}
      subtitle={creating ? 'Add a new kind of room to sell on the website' : `Web address: /rooms/${roomType.slug}`}
      icon="king_bed"
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button type="submit" form="room-type-form" disabled={save.pending || uploading > 0} className={buttonClass.primary}>
            {save.pending ? 'Saving…' : uploading > 0 ? 'Uploading photos…' : creating ? 'Create room type' : 'Save changes'}
          </button>
        </>
      }
    >
      <form id="room-type-form" onSubmit={submit} className="space-y-6">
        <ErrorNote message={save.error} />

        {/* Basics */}
        <section className="space-y-3">
          <div className="text-[11px] font-bold text-[#707881] uppercase tracking-wider">Details guests see</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name *">
              <input required minLength={2} maxLength={80} className={inputClass} value={form.name} onChange={set('name')} placeholder="e.g. Garden Suite" />
            </Field>
            {creating ? (
              <Field label="Web address">
                <div className="flex items-center gap-1">
                  <span className="text-[#707881] shrink-0">/rooms/</span>
                  <input
                    className={inputClass}
                    value={form.slug}
                    placeholder={slugify(form.name) || 'garden-suite'}
                    onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })}
                  />
                </div>
                <span className="text-[10px] text-[#707881] font-normal">Fixed once created so shared links keep working.</span>
              </Field>
            ) : (
              <Field label="Web address">
                <div className={`${inputClass} flex items-center bg-[#f2f3ff] text-[#707881]`}>/rooms/{roomType.slug}</div>
              </Field>
            )}
          </div>
          <Field label="Description">
            <textarea
              rows={4}
              maxLength={4000}
              className="w-full p-2.5 rounded-lg border border-[#bfc7d2]/60 text-xs focus:border-[#006194] focus:outline-none"
              value={form.description}
              onChange={set('description')}
              placeholder="What makes this room special — space, light, view, what's included."
            />
          </Field>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Beds">
              <input maxLength={120} className={inputClass} value={form.bedConfig} onChange={set('bedConfig')} placeholder="1 King bed" />
            </Field>
            <Field label="Size (m²)">
              <input type="number" min={5} max={1000} className={inputClass} value={form.sizeSqm} onChange={set('sizeSqm')} />
            </Field>
            <Field label="Sleeps up to *">
              <input type="number" required min={1} max={20} className={inputClass} value={form.occupancy} onChange={set('occupancy')} />
            </Field>
            <Field label={`Nightly rate (${currency}) *`}>
              <input type="number" required min={1} step="0.01" className={inputClass} value={form.basePrice} onChange={set('basePrice')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <Field label="Position in listings">
              <input type="number" min={0} max={1000} className={inputClass} value={form.sortOrder} onChange={set('sortOrder')} placeholder="Last" />
            </Field>
            <label className="flex items-center gap-2 h-9 font-semibold text-[#111a36] cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
              Show on website and accept bookings
            </label>
          </div>
        </section>

        {/* Photos */}
        <section className="space-y-3 pt-4 border-t border-[#ebedff]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-[#707881] uppercase tracking-wider">Photos</div>
              <p className="text-[11px] text-[#707881]">The first photo is the cover on the website. JPEG, PNG or WebP.</p>
            </div>
            <button type="button" onClick={() => fileInput.current?.click()} className={buttonClass.secondary} disabled={uploading > 0}>
              <Icon name="add_photo_alternate" className="text-[16px]" />
              {uploading > 0 ? `Uploading ${uploading}…` : 'Add photos'}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(event) => void upload(event.target.files)}
            />
          </div>
          <ErrorNote message={uploadError} />
          {photos.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-[#bfc7d2] text-center text-[#707881]">
              No photos yet — rooms with photos get far more bookings.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div key={photo.url} className="rounded-xl border border-[#bfc7d2]/40 overflow-hidden bg-white">
                  <div className="relative aspect-[4/3] bg-[#f2f3ff]">
                    <img src={mediaSrc(photo.url)} alt={photo.alt} className="absolute inset-0 w-full h-full object-cover" />
                    {index === 0 ? (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#006194] text-white text-[10px] font-bold">Cover</span>
                    ) : null}
                  </div>
                  <div className="p-2 space-y-1.5">
                    <input
                      className={`${inputClass} h-7`}
                      placeholder="Describe the photo"
                      maxLength={160}
                      value={photo.alt}
                      onChange={(event) =>
                        setPhotos((current) => current.map((item, i) => (i === index ? { ...item, alt: event.target.value } : item)))
                      }
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <button type="button" title="Move left" disabled={index === 0} onClick={() => movePhoto(index, index - 1)} className={buttonClass.small}>
                          <Icon name="chevron_left" className="text-[14px]" />
                        </button>
                        <button type="button" title="Move right" disabled={index === photos.length - 1} onClick={() => movePhoto(index, index + 1)} className={buttonClass.small}>
                          <Icon name="chevron_right" className="text-[14px]" />
                        </button>
                        {index !== 0 ? (
                          <button type="button" onClick={() => movePhoto(index, 0)} className={buttonClass.small}>
                            Make cover
                          </button>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                        className="text-[#ba1a1a] hover:bg-[#ffdad6] rounded p-0.5"
                      >
                        <Icon name="delete" className="text-[16px]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Amenities */}
        <section className="space-y-3 pt-4 border-t border-[#ebedff]">
          <div className="text-[11px] font-bold text-[#707881] uppercase tracking-wider">Amenities</div>
          <ErrorNote message={amenities.error || addAmenity.error} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(amenities.data ?? []).map((amenity) => {
              const checked = amenityIds.includes(amenity.id);
              return (
                <label
                  key={amenity.id}
                  className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                    checked ? 'border-[#006194] bg-[#cce5ff]/30' : 'border-[#bfc7d2]/40 hover:bg-[#f2f3ff]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setAmenityIds((ids) => (checked ? ids.filter((id) => id !== amenity.id) : [...ids, amenity.id]))
                    }
                  />
                  <Icon name={amenitySymbol(amenity.icon)} className="text-[16px] text-[#006194]" />
                  {amenity.name}
                </label>
              );
            })}
          </div>
          <div className="flex items-end gap-2">
            <Field label="Add a new amenity">
              <input
                className={inputClass}
                maxLength={60}
                placeholder="e.g. Private balcony"
                value={newAmenity.name}
                onChange={(event) => setNewAmenity({ ...newAmenity, name: event.target.value })}
              />
            </Field>
            <select className={`${inputClass} w-44`} value={newAmenity.icon} onChange={(event) => setNewAmenity({ ...newAmenity, icon: event.target.value })}>
              {AMENITY_ICONS.map((icon) => (
                <option key={icon.key} value={icon.key}>
                  {icon.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void createAmenity()}
              disabled={newAmenity.name.trim().length < 2 || addAmenity.pending}
              className={buttonClass.secondary}
            >
              Add
            </button>
          </div>
        </section>

        {/* Rooms */}
        <section className="space-y-3 pt-4 border-t border-[#ebedff]">
          <div className="text-[11px] font-bold text-[#707881] uppercase tracking-wider">Rooms of this type</div>
          {creating ? (
            <>
              <p className="text-[11px] text-[#707881]">
                Each physical room adds one room to sell per night. You can also add rooms later from the room matrix.
              </p>
              {rooms.map((room, index) => (
                <div key={index} className="grid grid-cols-[1fr_7rem_9rem_auto] gap-2 items-center">
                  <input
                    required
                    maxLength={60}
                    className={inputClass}
                    placeholder="Room name, e.g. Garden Suite 1"
                    value={room.name}
                    onChange={(event) => setRooms((current) => current.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))}
                  />
                  <input
                    maxLength={20}
                    className={inputClass}
                    placeholder="Code / no."
                    value={room.code ?? ''}
                    onChange={(event) => setRooms((current) => current.map((item, i) => (i === index ? { ...item, code: event.target.value } : item)))}
                  />
                  <input
                    maxLength={40}
                    className={inputClass}
                    placeholder="Floor / wing"
                    value={room.floor ?? ''}
                    onChange={(event) => setRooms((current) => current.map((item, i) => (i === index ? { ...item, floor: event.target.value } : item)))}
                  />
                  <button type="button" onClick={() => setRooms((current) => current.filter((_, i) => i !== index))} className="text-[#ba1a1a] p-1">
                    <Icon name="close" className="text-[18px]" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={suggestRooms} className={buttonClass.secondary}>
                <Icon name="add" className="text-[16px]" />
                Add a room
              </button>
              {rooms.length === 0 ? (
                <p className="text-amber-800">Without at least one room this type can be shown but not booked.</p>
              ) : null}
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              {roomType.rooms.filter((room) => room.isActive).map((room) => (
                <span key={room.id} className="px-2 py-1 rounded bg-[#f2f3ff] text-[#3f4850] font-semibold">
                  {room.name}
                  {room.floor ? <span className="font-normal text-[#707881]"> · {room.floor}</span> : null}
                  {room.maintenance ? <span className="text-[#ba1a1a]"> · out of service</span> : null}
                </span>
              ))}
              {!roomType.units ? <span className="text-amber-800">No rooms yet — add one from the room matrix.</span> : null}
            </div>
          )}
        </section>

        {creating && form.name ? (
          <p className="text-[11px] text-[#707881]">
            Will appear at <strong>/rooms/{slug}</strong>
            {form.basePrice ? ` from ${formatMoney(form.basePrice, currency)} per night` : ''}
            {form.isActive ? '' : ' once you make it visible'}.
          </p>
        ) : null}
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { useApi, useMutation } from '../../hooks/useApi';
import { api } from '../../services/api';
import { buttonClass, ErrorNote, Field, inputClass, Loading, Modal } from '../ui';

/** Adds a physical room to an existing room type — one more room to sell each night. */
export const AddRoomModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const types = useApi(() => api.roomTypes());
  const [form, setForm] = useState({ roomTypeId: '', name: '', code: '', floor: '' });
  const create = useMutation(api.createRoom);
  const roomTypeId = form.roomTypeId || types.data?.[0]?.id || '';
  const type = types.data?.find((item) => item.id === roomTypeId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const created = await create.run({
      roomTypeId,
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      floor: form.floor.trim() || undefined,
    });
    if (created) onClose();
  };

  return (
    <Modal title="Add a room" subtitle="A new physical room the front desk can assign" icon="add_home" onClose={onClose} width="max-w-md">
      <ErrorNote message={create.error || types.error} />
      {!types.data ? (
        <Loading />
      ) : !types.data.length ? (
        <p className="text-[#786f62]">Create a room type first under Room types &amp; rates.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Field label="Room type">
            <select className={inputClass} value={roomTypeId} onChange={(event) => setForm({ ...form, roomTypeId: event.target.value })}>
              {types.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.units} room(s){item.isActive ? '' : ' (hidden)'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Room name *">
            <input
              required
              maxLength={60}
              className={inputClass}
              placeholder={type ? `${type.name} ${type.units + 1}` : 'e.g. Deluxe Room 2'}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code / number">
              <input maxLength={20} className={inputClass} placeholder="e.g. 204" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
            </Field>
            <Field label="Floor / wing">
              <input maxLength={40} className={inputClass} placeholder="e.g. First floor" value={form.floor} onChange={(event) => setForm({ ...form, floor: event.target.value })} />
            </Field>
          </div>
          {type ? (
            <p className="text-[11px] text-[#786f62]">
              {type.name} will have {type.units + 1} room(s) to sell per night
              {type.isActive ? ' on the website' : ' once the room type is shown on the website'}.
            </p>
          ) : null}
          <div className="pt-2 flex justify-between">
            <button type="button" onClick={onClose} className={buttonClass.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={create.pending} className={buttonClass.primary}>
              {create.pending ? 'Adding…' : 'Add room'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

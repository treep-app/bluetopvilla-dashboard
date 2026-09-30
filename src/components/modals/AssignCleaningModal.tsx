import React, { useState } from 'react';
import { useApi, useMutation } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ROOM_STATUS_LABELS } from '../../lib/format';
import { HousekeeperPicker } from '../HousekeeperPicker';
import { buttonClass, Empty, ErrorNote, Field, inputClass, Loading, Modal } from '../ui';

export const AssignCleaningModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const rooms = useApi(() => api.rooms());
  const queue = (rooms.data ?? []).filter((room) => room.status === 'dirty' || room.status === 'cleaning');
  const [roomId, setRoomId] = useState('');
  const [housekeeper, setHousekeeper] = useState('');
  const assign = useMutation(api.updateRoom);
  const selected = roomId || queue[0]?.id || '';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (await assign.run(selected, { housekeeping: 'CLEANING', housekeeper: housekeeper.trim() })) onClose();
  };

  return (
    <Modal title="Assign cleaning" subtitle="Rooms waiting to be turned over" icon="cleaning_services" onClose={onClose} width="max-w-md">
      <ErrorNote message={assign.error || rooms.error} />
      {rooms.loading && !rooms.data ? (
        <Loading />
      ) : !queue.length ? (
        <Empty icon="task_alt" title="Every vacant room is clean" />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label={`Room (${queue.length} waiting)`}>
            <select required className={inputClass} value={selected} onChange={(event) => setRoomId(event.target.value)}>
              {queue.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} — {ROOM_STATUS_LABELS[room.status]}
                  {room.housekeeper ? ` (${room.housekeeper})` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Housekeeper">
            <HousekeeperPicker value={housekeeper} onChange={setHousekeeper} />
          </Field>
          <div className="pt-2 flex justify-between">
            <button type="button" onClick={onClose} className={buttonClass.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={assign.pending} className={buttonClass.primary}>
              {assign.pending ? 'Saving…' : 'Mark as cleaning'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

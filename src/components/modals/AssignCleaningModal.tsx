import React, { useState } from 'react';
import { useApi, useMutation } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ROOM_STATUS_LABELS } from '../../lib/format';
import { HousekeeperPicker } from '../HousekeeperPicker';
import { buttonClass, Empty, ErrorNote, Field, Icon, inputClass, Loading, Modal } from '../ui';

type Step = 'form' | 'confirm' | 'done';

export const AssignCleaningModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const rooms = useApi(() => api.rooms());
  const employees = useApi(() => api.employees());
  const queue = (rooms.data ?? []).filter((room) => room.status === 'dirty' || room.status === 'cleaning');
  const [step, setStep] = useState<Step>('form');
  const [roomId, setRoomId] = useState('');
  const [housekeeper, setHousekeeper] = useState('');
  const assign = useMutation(api.updateRoom);
  const selected = roomId || queue[0]?.id || '';
  const room = (rooms.data ?? []).find((item) => item.id === selected);

  // Match the chosen name to the employee record to show their phone on the confirmation.
  const employee = (employees.data ?? []).find((item) => {
    const name = [item.firstName, item.lastName].filter(Boolean).join(' ').trim();
    return item.active && item.department.toLowerCase() === 'housekeeping' && name === housekeeper.trim();
  });
  const phone = employee?.phone ?? null;
  const firstName = (employee?.firstName || housekeeper.trim().split(' ')[0] || 'there').trim();
  const smsPreview = `Hi ${firstName}, you have been assigned Room ${room?.name ?? ''} for cleaning. Thank you! - BlueTopVilla`;

  const submit = async () => {
    if (!selected) return;
    const result = await assign.run(selected, { housekeeping: 'CLEANING', housekeeper: housekeeper.trim() });
    if (result) setStep('done');
  };

  const reset = () => {
    setRoomId('');
    setHousekeeper('');
    setStep('form');
  };

  const housekeepers = (employees.data ?? []).filter(
    (item) => item.active && item.department.toLowerCase() === 'housekeeping',
  );

  return (
    <Modal
      title={step === 'done' ? 'Room assigned' : 'Assign cleaning'}
      subtitle={
        step === 'confirm'
          ? 'Review before the SMS goes out'
          : step === 'done'
            ? 'The cleaner has been notified'
            : 'Rooms waiting to be turned over'
      }
      icon="cleaning_services"
      onClose={onClose}
      width="max-w-md"
    >
      <ErrorNote message={assign.error || rooms.error || employees.error} />

      {rooms.loading && !rooms.data ? (
        <Loading />
      ) : step === 'done' ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#d9f2e5]">
            <Icon name="check_circle" className="text-[32px] text-[#0b6b3a]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#161410]">
              Room {room?.name} assigned to {housekeeper}
            </p>
            <p className="mt-1 text-xs text-[#786f62]">
              {phone
                ? `An SMS was sent to ${phone}.`
                : 'No phone number on file for this housekeeper, so no SMS was sent — add one under Employees.'}
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-1">
            <button type="button" onClick={reset} className={buttonClass.secondary}>
              Assign another room
            </button>
            <button type="button" onClick={onClose} className={buttonClass.primary}>
              Done
            </button>
          </div>
        </div>
      ) : step === 'confirm' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#e7ddd0] bg-[#f4efe6]/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#786f62]">Room</p>
                <p className="mt-0.5 text-sm font-bold text-[#161410]">{room?.name}</p>
                <p className="text-[11px] text-[#786f62]">{room?.roomTypeName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#786f62]">Status</p>
                <p className="mt-0.5 inline-block rounded-full bg-[#fff3cd] px-2 py-0.5 text-[11px] font-bold text-[#7a5b00]">
                  {room ? ROOM_STATUS_LABELS[room.status] : ''} → Cleaning
                </p>
              </div>
            </div>
            <div className="mt-3 border-t border-[#e7ddd0] pt-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#786f62]">Housekeeper</p>
              <p className="mt-0.5 text-sm font-bold text-[#161410]">
                {housekeeper}
                {employee ? <span className="ml-1.5 text-[11px] font-semibold text-[#786f62]">({employee.employeeCode})</span> : null}
              </p>
              <p className="mt-0.5 text-[11px]">
                {phone ? (
                  <span className="text-[#0b6b3a] font-semibold">📱 SMS will be sent to {phone}</span>
                ) : (
                  <span className="text-[#7a5b00] font-semibold">No phone on file — the assignment saves, but no SMS can be sent</span>
                )}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#786f62]">SMS the cleaner will receive</p>
            <div className="rounded-2xl border border-[#1b2c38]/15 bg-[#1b2c38] p-4 text-[11px] leading-relaxed text-[#f4efe6]">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-[#d99d26]">BlueTopVilla · SMS</p>
              <p className="whitespace-pre-wrap">{smsPreview}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#e7ddd0] bg-[#f4efe6]/40 px-3 py-2.5 text-[11px] text-[#2f1500]">
            <span className="font-bold">After you confirm:</span> the room moves to Cleaning and the SMS goes out immediately. Delivery
            appears under SMS Deliveries.
          </div>

          <div className="pt-1 flex justify-between">
            <button type="button" onClick={() => setStep('form')} disabled={assign.pending} className={buttonClass.secondary}>
              Back
            </button>
            <button type="button" onClick={() => void submit()} disabled={assign.pending} className={buttonClass.primary}>
              {assign.pending ? (
                <>
                  <Icon name="progress_activity" className="animate-spin text-[16px]" />
                  Assigning…
                </>
              ) : (
                <>
                  <Icon name="sms" className="text-[16px]" />
                  Confirm &amp; send SMS
                </>
              )}
            </button>
          </div>
        </div>
      ) : !queue.length ? (
        <Empty icon="task_alt" title="Every vacant room is clean" />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setStep('confirm');
          }}
          className="space-y-4"
        >
          <Field label={`Room (${queue.length} waiting)`}>
            <select required className={inputClass} value={selected} onChange={(event) => setRoomId(event.target.value)}>
              {queue.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {ROOM_STATUS_LABELS[item.status]}
                  {item.housekeeper ? ` (${item.housekeeper})` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Housekeeper">
            <HousekeeperPicker value={housekeeper} onChange={setHousekeeper} />
          </Field>
          {housekeeper && !phone && housekeepers.length ? (
            <p className="rounded-lg bg-[#fff8f0] border border-[#ffdcc3] px-3 py-2 text-[11px] text-[#7a5b00]">
              This housekeeper has no phone number on file — add one under Employees so they receive assignment SMS.
            </p>
          ) : null}
          <div className="pt-2 flex justify-between">
            <button type="button" onClick={onClose} className={buttonClass.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={!housekeeper.trim()} className={buttonClass.primary}>
              Review assignment
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

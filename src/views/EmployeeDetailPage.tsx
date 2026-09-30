import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import { avatarColorFor, ROLE_TITLES } from '../services/mapAuthUser';
import type { EmployeeDetail } from '../types/hotel';
import { buttonClass, Card, Empty, ErrorNote, Field, Icon, inputClass, Loading, Modal, PageHeader } from '../components/ui';
import { EmployeesView } from './EmployeesView';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-[#e3e7ff] text-[#3f4850]',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800',
  PAYMENT_PROCESSING: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-[#f2f3ff] text-[#707881]',
  NO_SHOW: 'bg-red-100 text-red-700',
};

/** Human phrasing for audit actions like "employee.create", "booking.check_in". */
const actionLabel = (action: string) =>
  action
    .replace(/^employee\./, '')
    .replace(/[._]/g, ' ')
    .replace(/^create$/, 'created')
    .replace(/^update$/, 'updated')
    .replace(/^deactivate$/, 'deactivated')
    .trim();

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const fmtMoney = (value: number, currency: string) =>
  `${currency}${value.toLocaleString('en-GH', { maximumFractionDigits: 0 })}`;

const KIND_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-800',
  LATE: 'bg-amber-100 text-amber-800',
  ABSENT: 'bg-red-100 text-red-700',
  LEAVE: 'bg-[#e3e7ff] text-[#006194]',
  HOLIDAY: 'bg-[#f2f3ff] text-[#707881]',
};

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

const RequestLeaveModal: React.FC<{
  employeeId: string;
  onClose: () => void;
}> = ({ employeeId, onClose }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('annual');
  const [reason, setReason] = useState('');
  const request = useMutation(() =>
    api.requestLeave(employeeId, {
      startDate,
      ...(endDate ? { endDate } : {}),
      leaveType,
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    }),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await request.run()) onClose();
  };

  return (
    <Modal title="Request leave" icon="event_busy" onClose={onClose} width="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote message={request.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <input required type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="To (optional — single day if empty)">
            <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Leave type">
          <select className={inputClass} value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
            {['annual', 'sick', 'maternity', 'paternity', 'compassionate', 'unpaid'].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field label="Reason (optional)">
          <textarea className={inputClass} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="pt-1 flex justify-between">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>Cancel</button>
          <button type="submit" disabled={request.pending} className={buttonClass.primary}>
            {request.pending ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const AttendanceTab: React.FC<{ employeeId: string; canManage: boolean }> = ({ employeeId, canManage }) => {
  const attendance = useApi(() => api.attendance(employeeId));
  const [marking, setMarking] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const checkIn = useMutation(() => api.attendanceCheckIn(employeeId));
  const checkOut = useMutation(() => api.attendanceCheckOut(employeeId));

  const today = new Date().toISOString().slice(0, 10);
  const todayRow = (attendance.data ?? []).find((row) => row.date === today);

  return (
    <div className="space-y-4">
      {canManage && (
        <Card className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] text-xs text-[#707881]">
            Today: <strong className="text-[#111a36]">
              {todayRow ? todayRow.kind : 'not marked'}
            </strong>
            {todayRow?.checkIn && <span> · in {fmtTime(todayRow.checkIn)}</span>}
            {todayRow?.checkOut && <span> · out {fmtTime(todayRow.checkOut)}</span>}
          </div>
          <button
            onClick={() => checkIn.run()}
            disabled={checkIn.pending || Boolean(todayRow?.checkIn && !todayRow?.checkOut)}
            className={buttonClass.secondary}
          >
            <Icon name="login" /> Check in
          </button>
          <button
            onClick={() => checkOut.run()}
            disabled={checkOut.pending || !todayRow?.checkIn || Boolean(todayRow?.checkOut)}
            className={buttonClass.secondary}
          >
            <Icon name="logout" /> Check out
          </button>
          <button onClick={() => setLeaveOpen(true)} className={buttonClass.secondary}>
            <Icon name="event_busy" /> Request leave
          </button>
          <button onClick={() => setMarking(true)} className={buttonClass.secondary}>
            <Icon name="edit_calendar" /> Mark a day
          </button>
        </Card>
      )}
      <ErrorNote message={checkIn.error || checkOut.error} />

      <Card className="overflow-hidden">
        {!attendance.data?.length ? (
          <Empty icon="calendar_month" title="No attendance records this month" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f2f3ff] text-[#707881] uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">In</th>
                  <th className="p-3">Out</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebedff]">
                {attendance.data.map((row) => (
                  <tr key={row.id}>
                    <td className="p-3 font-semibold text-[#111a36]">
                      {new Date(row.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${KIND_COLORS[row.kind] ?? 'bg-[#f2f3ff] text-[#707881]'}`}>
                        {row.kind}
                      </span>
                      {row.kind === 'LEAVE' && row.leaveStatus && (
                        <span className="ml-1.5 text-[10px] font-bold text-[#707881]">{row.leaveStatus.toLowerCase()}</span>
                      )}
                    </td>
                    <td className="p-3 text-[#3f4850]">{fmtTime(row.checkIn)}</td>
                    <td className="p-3 text-[#3f4850]">{fmtTime(row.checkOut)}</td>
                    <td className="p-3 text-[#707881]">
                      {row.leaveType ? `${row.leaveType} leave` : ''}
                      {row.endDate && ` → ${new Date(row.endDate).toLocaleDateString('en-GB')}`}
                      {row.reason ? ` — ${row.reason}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {marking && (
        <MarkDayModal
          employeeId={employeeId}
          onClose={() => {
            setMarking(false);
            attendance.reload();
          }}
        />
      )}
      {leaveOpen && (
        <RequestLeaveModal
          employeeId={employeeId}
          onClose={() => {
            setLeaveOpen(false);
            attendance.reload();
          }}
        />
      )}
    </div>
  );
};

const MarkDayModal: React.FC<{ employeeId: string; onClose: () => void }> = ({ employeeId, onClose }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState<'PRESENT' | 'LATE' | 'ABSENT' | 'HOLIDAY'>('PRESENT');
  const [reason, setReason] = useState('');
  const mark = useMutation(() => api.attendanceMark(employeeId, { date, kind, ...(reason.trim() ? { reason: reason.trim() } : {}) }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await mark.run()) onClose();
  };

  return (
    <Modal title="Mark attendance" icon="edit_calendar" onClose={onClose} width="max-w-sm">
      <form onSubmit={submit} className="space-y-3">
        <ErrorNote message={mark.error} />
        <Field label="Date">
          <input required type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Status">
          <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            {['PRESENT', 'LATE', 'ABSENT', 'HOLIDAY'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Reason (optional)">
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="pt-1 flex justify-between">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>Cancel</button>
          <button type="submit" disabled={mark.pending} className={buttonClass.primary}>{mark.pending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
};

type Tab = 'audit' | 'bookings' | 'attendance';

const Detail: React.FC<{
  employeeId: string;
  currency: string;
  canManage: boolean;
  onBack: () => void;
}> = ({ employeeId, currency, canManage, onBack }) => {
  const detail = useApi(() => api.employee(employeeId));
  const [tab, setTab] = useState<Tab>('audit');

  const data = detail.data;

  if (detail.loading && !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Loading />
      </div>
    );
  }
  if (detail.error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <button onClick={onBack} className={buttonClass.secondary}>
          <Icon name="arrow_back" /> Back to employees
        </button>
        <ErrorNote message={detail.error} onRetry={detail.reload} />
      </div>
    );
  }

  const name = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email;
  const tenureMonths = Math.max(
    0,
    Math.round((Date.now() - new Date(data.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto pb-16">
      <button onClick={onBack} className="text-xs font-semibold text-[#006194] flex items-center gap-1 hover:underline">
        <Icon name="arrow_back" className="text-[16px]" />
        All employees
      </button>

      <PageHeader
        title={name}
        subtitle={`${data.employeeCode} · ${data.position} · ${data.department}`}
        actions={
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${data.active ? 'bg-emerald-100 text-emerald-800' : 'bg-[#e3e7ff] text-[#707881]'}`}>
            {data.active ? 'Active' : 'Inactive'}
          </span>
        }
      />

      {/* Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full ${avatarColorFor(data.userId)} text-white font-bold flex items-center justify-center text-lg`}>
              {name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-[#111a36]">{name}</div>
              <div className="text-xs text-[#707881] truncate">{data.email}</div>
              {data.phone && <div className="text-xs text-[#707881]">{data.phone}</div>}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              { label: 'Role', value: data.roles.map((role) => ROLE_TITLES[role]).join(', ') },
              { label: 'Hire date', value: new Date(data.hireDate).toLocaleDateString('en-GB') },
              { label: 'Tenure', value: tenureMonths >= 12 ? `${Math.floor(tenureMonths / 12)}y ${tenureMonths % 12}m` : `${tenureMonths}m` },
              { label: 'Monthly salary', value: data.salary === null ? '—' : fmtMoney(data.salary, currency) },
            ].map((item) => (
              <div key={item.label} className="p-2.5 rounded-lg bg-[#f2f3ff]">
                <div className="text-[10px] uppercase tracking-wide text-[#707881] font-bold">{item.label}</div>
                <div className="font-semibold text-[#111a36] mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>
          {data.notes && (
            <div className="text-xs text-[#3f4850] p-3 rounded-lg border border-[#ebedff] bg-white">
              <span className="font-bold text-[#707881]">Notes: </span>
              {data.notes}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-wide text-[#707881] font-bold">
            Annual leave {data.leaveBalance.year}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#111a36]">{data.leaveBalance.remaining}</span>
            <span className="text-xs text-[#707881]">of {data.leaveBalance.entitlement} days left</span>
          </div>
          <div className="h-2 rounded-full bg-[#e3e7ff] overflow-hidden">
            <div
              className={`h-full rounded-full ${data.leaveBalance.remaining <= 3 ? 'bg-amber-500' : 'bg-[#006194]'}`}
              style={{ width: `${Math.min(100, (data.leaveBalance.used / Math.max(1, data.leaveBalance.entitlement)) * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-[#707881] flex justify-between">
            <span>{data.leaveBalance.used} used</span>
            {data.leaveBalance.pending > 0 && <span className="text-amber-700 font-semibold">{data.leaveBalance.pending} pending</span>}
          </div>
          <div className="pt-2 border-t border-[#ebedff] flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#111a36]">{data.stats.bookingsCreated}</span>
            <span className="text-xs text-[#707881]">desk bookings created</span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(
          [
            ['audit', `Audit trail (${data.audit.length})`],
            ['bookings', `Bookings (${data.bookings.length})`],
            ['attendance', 'Attendance'],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              tab === key ? 'bg-[#006194] text-white' : 'bg-white border border-[#bfc7d2]/50 text-[#3f4850] hover:border-[#006194]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'audit' ? (
        <Card className="overflow-hidden">
          {!data.audit.length ? (
            <Empty icon="history" title="No audit entries yet" />
          ) : (
            <ul className="divide-y divide-[#ebedff]">
              {data.audit.map((entry) => (
                <li key={entry.id} className="p-4 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${entry.by === 'self' ? 'bg-[#e3e7ff] text-[#006194]' : 'bg-[#f2f3ff] text-[#707881]'}`}>
                    <Icon name={entry.by === 'self' ? 'person' : 'admin_panel_settings'} className="text-[16px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-[#111a36]">
                      <span className="font-bold">{entry.actor}</span>{' '}
                      {entry.by === 'self' ? (
                        <span>acted as {entry.actor === 'Self' ? 'themselves' : 'self'} — {actionLabel(entry.action)} {entry.entity.toLowerCase()}</span>
                      ) : (
                        <span>{actionLabel(entry.action)} {entry.entity.toLowerCase()}</span>
                      )}
                    </div>
                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                      <div className="text-[11px] text-[#707881] mt-0.5 truncate">
                        {Object.entries(entry.metadata)
                          .filter(([, value]) => value !== null && value !== undefined && value !== '')
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .slice(0, 4)
                          .join(' · ')}
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-[#707881] whitespace-nowrap">{fmtDate(entry.createdAt)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : tab === 'attendance' ? (
        <AttendanceTab employeeId={data.id} canManage={canManage} />
      ) : (
        <Card className="overflow-hidden">
          {!data.bookings.length ? (
            <Empty icon="book_online" title="No bookings created by this employee yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f2f3ff] text-[#707881] uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Guest</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebedff]">
                  {data.bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="p-3 font-mono font-semibold text-[#006194]">{booking.reference}</td>
                      <td className="p-3 text-[#111a36]">{booking.guestName ?? '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[booking.status] ?? 'bg-[#f2f3ff] text-[#707881]'}`}>
                          {booking.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-[#111a36]">{fmtMoney(booking.totalAmount, currency)}</td>
                      <td className="p-3 text-[#707881]">{fmtDate(booking.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

/** Wrapper: shows the register list, or the detail page when an employee is selected. */
export const EmployeesSection: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { hasPermission } = useHotel();
  const canManage = hasPermission('canManageStaff');

  if (selectedId) {
    return <Detail employeeId={selectedId} currency="₵" canManage={canManage} onBack={() => setSelectedId(null)} />;
  }
  return <EmployeesView onOpen={(id) => setSelectedId(id)} />;
};

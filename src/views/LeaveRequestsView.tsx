import React, { useMemo, useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import type { LeaveRequestRow, LeaveStatus, LeaveCalendarEntry } from '../types/hotel';
import { buttonClass, Card, Empty, ErrorNote, Icon, inputClass, Loading, PageHeader } from '../components/ui';

// ---------------------------------------------------------------- team calendar

const DAY_MS = 86_400_000;

const iso = (date: Date) => date.toISOString().slice(0, 10);

const mondayOf = (date: Date) => {
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
};

const LEAVE_COLORS: Record<string, string> = {
  annual: 'bg-[#006194] text-white',
  sick: 'bg-red-500 text-white',
  maternity: 'bg-purple-500 text-white',
  paternity: 'bg-purple-400 text-white',
  compassionate: 'bg-[#262f4c] text-white',
  unpaid: 'bg-[#707881] text-white',
};

const LeaveCalendarCard: React.FC = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const monday = mondayOf(new Date());
    monday.setUTCDate(monday.getUTCDate() + weekOffset * 7);
    return monday;
  }, [weekOffset]);
  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 6 * DAY_MS), [weekStart]);

  const calendar = useApi(() => api.leaveCalendar(iso(weekStart), iso(weekEnd)));
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * DAY_MS)), [weekStart]);

  const onLeaveOn = (entries: LeaveCalendarEntry[], day: Date) =>
    entries.filter((entry) => entry.startDate <= iso(day) && entry.endDate >= iso(day));

  const isThisWeek = weekOffset === 0;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-bold text-[#111a36] mr-auto">Who is off</h2>
        <button onClick={() => setWeekOffset(weekOffset - 1)} className={buttonClass.secondary} title="Previous week">
          <Icon name="chevron_left" />
        </button>
        <span className="text-xs font-bold text-[#111a36] min-w-[190px] text-center">
          {new Date(weekStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {new Date(weekEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          {isThisWeek && <span className="ml-1.5 text-[#006194]">(this week)</span>}
        </span>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          disabled={weekOffset >= 12}
          className={buttonClass.secondary}
          title="Next week"
        >
          <Icon name="chevron_right" />
        </button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} className="text-[11px] font-bold text-[#006194] hover:underline">
            Today
          </button>
        )}
      </div>

      {calendar.error && <ErrorNote message={calendar.error} onRetry={calendar.reload} />}

      {calendar.loading && !calendar.data ? (
        <Loading />
      ) : (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-1.5 min-w-[700px]">
            {days.map((day) => {
              const isToday = iso(day) === iso(new Date());
              const onLeave = calendar.data ? onLeaveOn(calendar.data.entries, day) : [];
              return (
                <div key={iso(day)} className={`rounded-lg border p-2 min-h-[140px] ${isToday ? 'border-[#006194] bg-[#006194]/5' : 'border-[#ebedff] bg-white'}`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${isToday ? 'text-[#006194]' : 'text-[#707881]'}`}>
                    {day.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit' })}
                  </div>
                  {!onLeave.length ? (
                    <div className="text-[10px] text-[#bfc7d2]">—</div>
                  ) : (
                    <div className="space-y-1">
                      {onLeave.map((entry) => (
                        <div
                          key={`${entry.id}-${iso(day)}`}
                          title={`${entry.name} — ${entry.leaveType} leave${entry.reason ? `: ${entry.reason}` : ''}`}
                          className={`px-1.5 py-1 rounded text-[9px] font-bold leading-tight ${LEAVE_COLORS[entry.leaveType] ?? 'bg-[#007bb9] text-white'}`}
                        >
                          {entry.name.split(' ')[0]}
                          <div className="font-normal opacity-80">{entry.leaveType}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {calendar.data && !calendar.data.entries.length && (
        <p className="text-[11px] text-[#707881] text-center">Nobody on approved leave this week.</p>
      )}
    </Card>
  );
};

const STATUS_STYLES: Record<LeaveStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-700',
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Working days between two dates inclusive (rough — ignores holidays). */
const dayCount = (start: string, end: string | null) => {
  const from = new Date(`${start}T00:00:00.000Z`).getTime();
  const to = new Date(`${(end ?? start)}T00:00:00.000Z`).getTime();
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1);
};

export const LeaveRequestsView: React.FC = () => {
  const { hasPermission } = useHotel();
  const canDecide = hasPermission('canManageStaff');
  const requests = useApi(() => api.leaveRequests());
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'all'>('PENDING');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const decide = useMutation(({ id, approve }: { id: string; approve: boolean }) => api.decideLeave(id, approve));

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (requests.data ?? []).filter((row) => {
      if (statusFilter !== 'all' && (row.leaveStatus ?? 'PENDING') !== statusFilter) return false;
      if (!needle) return true;
      return [row.employee.name, row.employee.employeeCode, row.leaveType, row.reason]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [requests.data, statusFilter, search]);

  const counts = useMemo(() => {
    const list = requests.data ?? [];
    return {
      pending: list.filter((row) => row.leaveStatus === 'PENDING').length,
      approved: list.filter((row) => row.leaveStatus === 'APPROVED').length,
      rejected: list.filter((row) => row.leaveStatus === 'REJECTED').length,
    };
  }, [requests.data]);

  const decideLeave = async (row: LeaveRequestRow, approve: boolean) => {
    setBusyId(row.id);
    const result = await decide.run({ id: row.id, approve });
    setBusyId(null);
    if (result) requests.reload();
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Leave requests"
        subtitle="Approve or reject time off across all employees"
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: counts.pending, color: 'text-amber-800' },
          { label: 'Approved', value: counts.approved, color: 'text-emerald-800' },
          { label: 'Rejected', value: counts.rejected, color: 'text-red-700' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] text-[#707881] mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>

      <ErrorNote message={requests.error} onRetry={requests.reload} />
      <ErrorNote message={decide.error} />

      <LeaveCalendarCard />

      {/* Filters */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707881] text-[18px]" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search employee, type, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={`${inputClass} max-w-[200px]`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeaveStatus | 'all')}
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="all">All statuses</option>
        </select>
      </Card>

      {requests.loading && !requests.data ? (
        <Loading />
      ) : !filtered.length ? (
        <Card>
          <Empty
            icon="event_busy"
            title={
              statusFilter === 'PENDING' && !search
                ? 'No pending leave requests — all caught up'
                : 'No leave requests match'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const pending = row.leaveStatus === 'PENDING';
            return (
              <Card key={row.id} className="p-4 flex flex-wrap items-center gap-4">
                <div className="min-w-[180px] flex-1">
                  <div className="font-bold text-sm text-[#111a36]">{row.employee.name}</div>
                  <div className="text-[11px] text-[#707881] font-mono">{row.employee.employeeCode}</div>
                </div>

                <div className="min-w-[160px]">
                  <div className="text-xs font-semibold text-[#111a36] capitalize">{row.leaveType} leave</div>
                  <div className="text-[11px] text-[#707881]">
                    {fmt(row.date)}{row.endDate ? ` → ${fmt(row.endDate)}` : ''} · {dayCount(row.date, row.endDate)} day{dayCount(row.date, row.endDate) === 1 ? '' : 's'}
                  </div>
                </div>

                {row.reason && (
                  <div className="min-w-[180px] flex-1 text-[11px] text-[#3f4850] truncate" title={row.reason}>
                    “{row.reason}”
                  </div>
                )}

                {row.leaveType === 'annual' && row.leaveBalance && (
                  <div className={`min-w-[150px] text-[11px] font-semibold ${row.leaveBalance.remaining < dayCount(row.date, row.endDate) ? 'text-red-600' : 'text-[#3f4850]'}`}>
                    Balance: {row.leaveBalance.remaining}/{row.leaveBalance.entitlement} d
                    {row.leaveBalance.remaining < dayCount(row.date, row.endDate) && (
                      <div className="text-[10px] font-bold">⚠ exceeds remaining</div>
                    )}
                  </div>
                )}

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_STYLES[row.leaveStatus ?? 'PENDING']}`}>
                  {(row.leaveStatus ?? 'PENDING').toLowerCase()}
                </span>

                {canDecide && pending && (
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => decideLeave(row, true)}
                      disabled={busyId === row.id}
                      className={`${buttonClass.primary} px-3 py-1.5 text-[11px]`}
                    >
                      <Icon name="check" className="text-[14px]" />
                      Approve
                    </button>
                    <button
                      onClick={() => decideLeave(row, false)}
                      disabled={busyId === row.id}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 flex items-center gap-1"
                    >
                      <Icon name="close" className="text-[14px]" />
                      Reject
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

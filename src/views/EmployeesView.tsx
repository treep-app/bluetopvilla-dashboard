import React, { useMemo, useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import { assignableRoles, avatarColorFor, ROLE_TITLES } from '../services/mapAuthUser';
import type { BackendRole, CreateEmployeeInput, Employee, UpdateEmployeeInput } from '../types/hotel';
import {
  buttonClass,
  Card,
  Empty,
  ErrorNote,
  Field,
  Icon,
  inputClass,
  Loading,
  Modal,
  PageHeader,
} from '../components/ui';

const DEPARTMENTS = [
  'Front Office',
  'Housekeeping',
  'Kitchen',
  'Restaurant',
  'Maintenance',
  'Events',
  'Management',
  'Security',
  'Other',
];

const ROLES: BackendRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'CONTENT_EDITOR', 'REPORTS_VIEWER'];

const money = (value: number | null, currency: string) =>
  value === null ? '—' : `${currency}${value.toLocaleString('en-GH', { maximumFractionDigits: 0 })}`;

// ---------------------------------------------------------------- forms

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: BackendRole;
  password: string;
  position: string;
  department: string;
  hireDate: string;
  salary: string;
  notes: string;
};

const emptyForm = (role: BackendRole): FormState => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role,
  password: '',
  position: '',
  department: DEPARTMENTS[0],
  hireDate: new Date().toISOString().slice(0, 10),
  salary: '',
  notes: '',
});

const OnboardEmployeeModal: React.FC<{
  onClose: () => void;
  roles: BackendRole[];
  currency: string;
}> = ({ onClose, roles, currency }) => {
  const [form, setForm] = useState<FormState>(() => emptyForm(roles.includes('STAFF') ? 'STAFF' : (roles[0] ?? 'STAFF')));
  const create = useMutation(api.createEmployee);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload: CreateEmployeeInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      password: form.password,
      position: form.position.trim(),
      department: form.department,
      hireDate: form.hireDate,
      ...(form.salary ? { salary: Number(form.salary) } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    };
    if (await create.run(payload)) onClose();
  };

  return (
    <Modal title="Onboard employee" subtitle="Creates their login and employment record" icon="person_add" onClose={onClose} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote message={create.error} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input required className={inputClass} value={form.firstName} onChange={set('firstName')} />
          </Field>
          <Field label="Last name">
            <input required className={inputClass} value={form.lastName} onChange={set('lastName')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Email (login)">
            <input required type="email" className={inputClass} value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Phone">
            <input required className={inputClass} value={form.phone} onChange={set('phone')} placeholder="024 000 0000" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <select className={inputClass} value={form.role} onChange={set('role')}>
              {roles.map((role) => (
                <option key={role} value={role}>{ROLE_TITLES[role]}</option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <select className={inputClass} value={form.department} onChange={set('department')}>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Position">
            <input required className={inputClass} value={form.position} onChange={set('position')} placeholder="Front Desk Supervisor" />
          </Field>
          <Field label="Hire date">
            <input required type="date" className={inputClass} value={form.hireDate} onChange={set('hireDate')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Monthly salary (${currency}, optional)`}>
            <input type="number" min={0} className={inputClass} value={form.salary} onChange={set('salary')} placeholder="2500" />
          </Field>
          <Field label="Temporary password (10+ chars, letter + number)">
            <input
              required
              minLength={10}
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={form.password}
              onChange={set('password')}
            />
          </Field>
        </div>

        <Field label="Notes (optional)">
          <textarea className={inputClass} rows={2} value={form.notes} onChange={set('notes')} placeholder="Referral, contract type…" />
        </Field>

        <p className="text-[11px] text-[#707881]">
          An employee code (EMP-0001, EMP-0002…) is assigned automatically. Share the password privately — no email is sent.
        </p>

        <div className="pt-1 flex justify-between">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>Cancel</button>
          <button type="submit" disabled={create.pending} className={buttonClass.primary}>
            {create.pending ? 'Creating…' : 'Onboard employee'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const EditEmployeeModal: React.FC<{
  employee: Employee;
  onClose: () => void;
  roles: BackendRole[];
  currency: string;
}> = ({ employee, onClose, roles, currency }) => {
  const [position, setPosition] = useState(employee.position);
  const [department, setDepartment] = useState(employee.department);
  const [role, setRole] = useState<BackendRole>(employee.roles[0] ?? 'STAFF');
  const [phone, setPhone] = useState(employee.phone ?? '');
  const [hireDate, setHireDate] = useState(employee.hireDate);
  const [salary, setSalary] = useState(employee.salary === null ? '' : String(employee.salary));
  const [annualLeaveDays, setAnnualLeaveDays] = useState(String(employee.annualLeaveDays ?? 15));
  const [notes, setNotes] = useState(employee.notes ?? '');
  const [active, setActive] = useState(employee.active);
  const update = useMutation((input: UpdateEmployeeInput) => api.updateEmployee(employee.id, input));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload: UpdateEmployeeInput = {
      position: position.trim(),
      department,
      role,
      phone: phone.trim(),
      hireDate,
      salary: salary === '' ? null : Number(salary),
      annualLeaveDays: Number(annualLeaveDays) || 15,
      notes: notes.trim(),
      active,
    };
    if (await update.run(payload)) onClose();
  };

  return (
    <Modal title={`Edit ${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || 'Edit employee'} subtitle={employee.employeeCode} icon="edit" onClose={onClose} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote message={update.error} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Position">
            <input required className={inputClass} value={position} onChange={(e) => setPosition(e.target.value)} />
          </Field>
          <Field label="Department">
            <select className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)}>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
              {!DEPARTMENTS.includes(department) && <option value={department}>{department}</option>}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as BackendRole)}>
              {roles.map((r) => (
                <option key={r} value={r}>{ROLE_TITLES[r]}</option>
              ))}
              {!roles.includes(role) && <option value={role}>{ROLE_TITLES[role]}</option>}
            </select>
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Hire date">
            <input required type="date" className={inputClass} value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
          </Field>
          <Field label={`Monthly salary (${currency}, empty = not set)`}>
            <input type="number" min={0} className={inputClass} value={salary} onChange={(e) => setSalary(e.target.value)} />
          </Field>
        </div>

        <Field label="Annual leave entitlement (working days)">
          <input
            type="number"
            min={0}
            max={365}
            className={inputClass}
            value={annualLeaveDays}
            onChange={(e) => setAnnualLeaveDays(e.target.value)}
          />
        </Field>

        <Field label="Notes">
          <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <label className="flex items-center gap-2 text-xs font-semibold text-[#111a36]">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Currently employed
        </label>

        <div className="pt-1 flex justify-between">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>Cancel</button>
          <button type="submit" disabled={update.pending} className={buttonClass.primary}>
            {update.pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const DeactivateModal: React.FC<{ employee: Employee; onClose: () => void }> = ({ employee, onClose }) => {
  const name = [employee.firstName, employee.lastName].filter(Boolean).join(' ') || employee.email;
  const deactivate = useMutation((id: string) => api.deactivateEmployee(id));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await deactivate.run(employee.id)) onClose();
  };

  return (
    <Modal title="Deactivate employee" icon="person_off" onClose={onClose} width="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote message={deactivate.error} />
        <p className="text-xs text-[#3f4850]">
          Deactivate <strong>{name}</strong> ({employee.employeeCode})? Their dashboard login stops being listed as
          active staff. The account is kept for booking history and audit — nothing is deleted.
        </p>
        <div className="pt-1 flex justify-between">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>Cancel</button>
          <button type="submit" disabled={deactivate.pending} className={buttonClass.danger ?? buttonClass.primary}>
            {deactivate.pending ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------- view

export const EmployeesView: React.FC<{ onOpen?: (id: string) => void }> = ({ onOpen }) => {
  const { currentUser, hasPermission, property } = useHotel();
  const canManage = hasPermission('canManageStaff');
  const roles = assignableRoles(currentUser?.roles ?? []);
  const currency = property?.currency ?? '₵';

  const employees = useApi(() => api.employees());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deactivating, setDeactivating] = useState<Employee | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const filtered = useMemo(() => {
    const list = employees.data ?? [];
    const needle = search.trim().toLowerCase();
    return list.filter((employee) => {
      if (deptFilter !== 'all' && employee.department !== deptFilter) return false;
      if (!needle) return true;
      const haystack = [employee.employeeCode, employee.email, employee.firstName, employee.lastName, employee.position]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [employees.data, search, deptFilter]);

  const active = (employees.data ?? []).filter((employee) => employee.active);
  const departments = useMemo(
    () => [...new Set((employees.data ?? []).map((employee) => employee.department))].sort(),
    [employees.data],
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Employees"
        subtitle="Employment register — positions, departments and onboarding"
        actions={
          canManage ? (
            <button onClick={() => setAdding(true)} className={buttonClass.primary}>
              <Icon name="person_add" />
              Onboard employee
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-[#707881] text-xs font-medium flex items-center gap-1">
              <Icon name="lock" className="text-[16px]" />
              Administrators manage employees
            </span>
          )
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active employees', value: active.length, icon: 'group' },
          { label: 'Departments', value: departments.length, icon: 'apartment' },
          {
            label: 'Onboarded this month',
            value: (employees.data ?? []).filter((employee) => employee.hireDate.startsWith(new Date().toISOString().slice(0, 7))).length,
            icon: 'person_add',
          },
          {
            label: 'Monthly payroll (listed)',
            value: money(active.reduce((sum, employee) => sum + (employee.salary ?? 0), 0), currency),
            icon: 'payments',
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#e3e7ff] text-[#006194] flex items-center justify-center">
                <Icon name={stat.icon} />
              </div>
              <div>
                <div className="text-lg font-bold text-[#111a36] leading-none">{stat.value}</div>
                <div className="text-[11px] text-[#707881] mt-1">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ErrorNote message={employees.error} onRetry={employees.reload} />

      {/* Filters */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707881] text-[18px]" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search name, code, email, position…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={`${inputClass} max-w-[220px]`} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="all">All departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </Card>

      {employees.loading && !employees.data ? (
        <Loading />
      ) : !filtered.length ? (
        <Card>
          <Empty icon="badge" title={search || deptFilter !== 'all' ? 'No employees match' : 'No employees yet — onboard your first one'} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f2f3ff] text-[#707881] uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Hired</th>
                  <th className="p-3 text-right">Salary</th>
                  <th className="p-3">Status</th>
                  {(canManage || onOpen) && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebedff]">
                {filtered.map((employee) => {
                  const name = [employee.firstName, employee.lastName].filter(Boolean).join(' ') || employee.email;
                  return (
                    <tr key={employee.id} className={employee.active ? '' : 'opacity-55'}>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full ${avatarColorFor(employee.userId)} text-white font-bold flex items-center justify-center text-[11px]`}>
                            {name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            {onOpen ? (
                              <button
                                onClick={() => onOpen(employee.id)}
                                className="font-bold text-[#111a36] hover:text-[#006194] hover:underline text-left"
                                title="Open employee profile"
                              >
                                {name}
                              </button>
                            ) : (
                              <div className="font-bold text-[#111a36]">{name}</div>
                            )}
                            <div className="text-[11px] text-[#707881] truncate">{employee.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[#006194] font-semibold">{employee.employeeCode}</td>
                      <td className="p-3 text-[#111a36]">{employee.position}</td>
                      <td className="p-3 text-[#3f4850]">{employee.department}</td>
                      <td className="p-3 text-[#3f4850]">{employee.roles.map((role) => ROLE_TITLES[role]).join(', ')}</td>
                      <td className="p-3 text-[#3f4850]">{new Date(employee.hireDate).toLocaleDateString('en-GB')}</td>
                      <td className="p-3 text-right text-[#111a36] font-semibold">{money(employee.salary, currency)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${employee.active ? 'bg-emerald-100 text-emerald-800' : 'bg-[#e3e7ff] text-[#707881]'}`}>
                          {employee.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="p-3 text-right whitespace-nowrap">
                          <button onClick={() => setEditing(employee)} className="p-1.5 rounded-lg hover:bg-[#f2f3ff] text-[#006194]" title="Edit">
                            <Icon name="edit" className="text-[16px]" />
                          </button>
                          {employee.active && (
                            <button onClick={() => setDeactivating(employee)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Deactivate">
                              <Icon name="person_off" className="text-[16px]" />
                            </button>
                          )}
                        </td>
                      )}
                      {!canManage && onOpen && (
                        <td className="p-3 text-right">
                          <button onClick={() => onOpen(employee.id)} className="text-[#006194] font-bold text-[11px] hover:underline">
                            View
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {adding && <OnboardEmployeeModal onClose={() => setAdding(false)} roles={roles} currency={currency} />}
      {editing && <EditEmployeeModal employee={editing} onClose={() => setEditing(null)} roles={roles} currency={currency} />}
      {deactivating && <DeactivateModal employee={deactivating} onClose={() => setDeactivating(null)} />}
    </div>
  );
};

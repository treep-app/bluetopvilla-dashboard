import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi, useMutation } from '../hooks/useApi';
import { api } from '../services/api';
import { assignableRoles, avatarColorFor, permissionsFor, ROLE_TITLES } from '../services/mapAuthUser';
import type { BackendRole, StaffUser } from '../types/hotel';
import { buttonClass, Card, Empty, ErrorNote, Field, Icon, inputClass, Loading, Modal, PageHeader } from '../components/ui';

const ROLES: BackendRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'CONTENT_EDITOR', 'REPORTS_VIEWER'];

const CAPABILITIES: Array<[keyof StaffUser['permissions'], string]> = [
  ['canViewOperations', 'View bookings, rooms, rates and revenue'],
  ['canFrontDesk', 'Create bookings, check in/out, take payments, housekeeping'],
  ['canCancelBookings', 'Cancel bookings'],
  ['canManageRates', 'Change room rates'],
  ['canManageRooms', 'Add and edit room types, photos and rooms'],
  ['canHandleEnquiries', 'Handle enquiries and messages'],
  ['canManageContent', 'Edit events, event types and venue spaces'],
  ['canManagePromotions', 'Issue Golden Tickets by email and SMS'],
  ['canViewStaff', 'View staff list'],
  ['canManageStaff', 'Create staff accounts'],
];

const AddStaffModal: React.FC<{ onClose: () => void; roles: BackendRole[] }> = ({ onClose, roles }) => {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: (roles.includes('STAFF') ? 'STAFF' : roles[0]) as BackendRole, password: '' });
  const create = useMutation(api.createStaff);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await create.run(form)) onClose();
  };

  return (
    <Modal title="Add staff member" subtitle="Creates a dashboard login" icon="person_add" onClose={onClose} width="max-w-md">
      <form onSubmit={submit} className="space-y-3">
        <ErrorNote message={create.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input required className={inputClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Last name">
            <input required className={inputClass} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
        </div>
        <Field label="Email">
          <input required type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Role">
          <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as BackendRole })}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {ROLE_TITLES[role]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Temporary password (10+ characters, with a letter and a number)">
          <input
            required
            minLength={10}
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <p className="text-[11px] text-[#786f62]">
          Share it with them privately — no email is sent. They should change it from their account menu after signing in.
        </p>
        <div className="pt-2 flex justify-between">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button type="submit" disabled={create.pending} className={buttonClass.primary}>
            {create.pending ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const StaffView: React.FC = () => {
  const { currentUser, hasPermission } = useHotel();
  const canManage = hasPermission('canManageStaff');
  const staff = useApi(() => api.staff());
  const [adding, setAdding] = useState(false);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Staff & access"
        subtitle="Dashboard accounts and what each role can do"
        actions={
          canManage ? (
            <button onClick={() => setAdding(true)} className={buttonClass.primary}>
              <Icon name="person_add" />
              Add staff member
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-[#e7ddd0] text-[#786f62] text-xs font-medium flex items-center gap-1">
              <Icon name="lock" className="text-[16px]" />
              Administrators manage accounts
            </span>
          )
        }
      />

      <ErrorNote message={staff.error} onRetry={staff.reload} />

      {staff.loading && !staff.data ? (
        <Loading />
      ) : !staff.data?.length ? (
        <Card>
          <Empty icon="group" title="No staff accounts" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {staff.data.map((member) => {
            const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email;
            const isYou = member.id === currentUser?.id;
            return (
              <Card key={member.id} className={`p-5 space-y-3 ${isYou ? 'ring-2 ring-[#d99d26]/30 border-[#d99d26]' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-full ${avatarColorFor(member.id)} text-white font-bold flex items-center justify-center text-sm`}>
                    {name.substring(0, 2).toUpperCase()}
                  </div>
                  {isYou ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">You</span>
                  ) : null}
                </div>
                <div>
                  <div className="font-bold text-sm text-[#161410]">{name}</div>
                  <div className="text-xs text-[#d99d26] font-semibold">{member.roles.map((role) => ROLE_TITLES[role]).join(', ')}</div>
                  <div className="text-[11px] text-[#786f62] mt-0.5 truncate">{member.email}</div>
                </div>
                <div className="text-[11px] text-[#786f62] pt-2 border-t border-[#e7ddd0]">
                  Added {new Date(member.createdAt).toLocaleDateString('en-GB')}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-[#e7ddd0]">
          <h2 className="text-base font-bold text-[#161410]">Role permissions</h2>
          <p className="text-xs text-[#786f62]">Enforced by the API on every request</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#e7ddd0] text-[#786f62] uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Capability</th>
                {ROLES.map((role) => (
                  <th key={role} className="p-3 text-center">
                    {ROLE_TITLES[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7ddd0]">
              {CAPABILITIES.map(([key, label]) => (
                <tr key={key}>
                  <td className="p-3 font-semibold text-[#161410]">{label}</td>
                  {ROLES.map((role) => (
                    <td key={role} className="p-3 text-center">
                      {permissionsFor([role])[key] ? (
                        <span className="text-emerald-700 font-bold">✓</span>
                      ) : (
                        <span className="text-[#cfc4b4]">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {adding && (
        <AddStaffModal onClose={() => setAdding(false)} roles={assignableRoles(currentUser?.roles ?? [])} />
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { inputClass } from './ui';

/**
 * Select a housekeeper from active employees in the Housekeeping department.
 * Falls back to a free-text input when no housekeeping employees are onboarded yet,
 * so the desk is never blocked — names typed this way are stored as before.
 */
export const HousekeeperPicker: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const employees = useApi(() => api.employees());

  const housekeepers = useMemo(
    () =>
      (employees.data ?? [])
        .filter((employee) => employee.active && employee.department.toLowerCase() === 'housekeeping')
        .map((employee) => ({
          ...employee,
          name: [employee.firstName, employee.lastName].filter(Boolean).join(' ') || employee.email,
        })),
    [employees.data],
  );

  if (employees.loading && !employees.data) {
    return <input className={inputClass} placeholder="Loading housekeepers…" disabled value="" />;
  }

  // No housekeeping employees onboarded — free-text fallback so work is never blocked.
  if (!housekeepers.length) {
    return (
      <div className="space-y-1.5">
        <input
          maxLength={80}
          className={inputClass}
          placeholder="Name of the person cleaning"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <p className="text-[10px] text-[#707881]">
          No housekeeping employees registered yet — onboard them under Employees to pick from a list.
        </p>
      </div>
    );
  }

  return (
    <select
      required
      className={inputClass}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="" disabled>
        Pick a housekeeper…
      </option>
      {housekeepers.map((employee) => (
        <option key={employee.id} value={employee.name}>
          {employee.name} ({employee.employeeCode})
        </option>
      ))}
      {/* Keep a current value that no longer matches the list visible */}
      {value && !housekeepers.some((employee) => employee.name === value) && (
        <option value={value}>{value} (previous)</option>
      )}
    </select>
  );
};

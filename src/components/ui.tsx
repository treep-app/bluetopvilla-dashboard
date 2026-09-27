import React from 'react';

export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = 'text-[18px]' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({
  title,
  subtitle,
  actions,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#bfc7d2]/30 shadow-xs">
    <div>
      <h1 className="text-xl font-bold text-[#111a36]">{title}</h1>
      {subtitle ? <p className="text-xs text-[#707881]">{subtitle}</p> : null}
    </div>
    {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
  </div>
);

export const ErrorNote: React.FC<{ message: string | null; onRetry?: () => void }> = ({ message, onRetry }) =>
  message ? (
    <div className="p-3 rounded-lg bg-[#ffdad6]/60 text-[#93000a] border border-[#ba1a1a]/30 text-xs font-semibold flex items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        <Icon name="error" />
        {message}
      </span>
      {onRetry ? (
        <button onClick={onRetry} className="underline">
          Retry
        </button>
      ) : null}
    </div>
  ) : null;

export const Loading: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="p-10 flex items-center justify-center gap-2 text-xs font-semibold text-[#707881]">
    <Icon name="progress_activity" className="text-[20px] animate-spin text-[#006194]" />
    {label}
  </div>
);

export const Empty: React.FC<{ icon?: string; title: string; detail?: string }> = ({ icon = 'inbox', title, detail }) => (
  <div className="p-10 text-center text-[#707881]">
    <Icon name={icon} className="text-4xl mb-2 text-[#bfc7d2]" />
    <div className="font-semibold text-sm text-[#111a36]">{title}</div>
    {detail ? <p className="text-xs mt-1">{detail}</p> : null}
  </div>
);

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`bg-white rounded-xl border border-[#bfc7d2]/30 shadow-xs ${className}`}>{children}</div>
);

export const StatCard: React.FC<{
  label: string;
  icon: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  onClick?: () => void;
}> = ({ label, icon, value, detail, onClick }) => (
  <div
    onClick={onClick}
    className={`p-3.5 rounded-xl bg-white shadow-xs border border-[#bfc7d2]/30 flex flex-col justify-between gap-1.5 ${
      onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
    }`}
  >
    <div className="flex items-center justify-between text-[#707881]">
      <span className="text-[11px] uppercase tracking-wider font-bold">{label}</span>
      <Icon name={icon} className="text-[18px] text-[#006194]" />
    </div>
    <div className="text-2xl font-bold text-[#111a36] tracking-tight tabular-nums truncate">{value}</div>
    {detail ? <div className="text-[11px] text-[#707881] truncate">{detail}</div> : null}
  </div>
);

export const Modal: React.FC<{
  title: string;
  subtitle?: string;
  icon: string;
  onClose: () => void;
  width?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, subtitle, icon, onClose, width = 'max-w-xl', children, footer }) => (
  <div className="fixed inset-0 z-50 bg-[#262f4c]/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
    <div
      className={`bg-white rounded-2xl ${width} w-full shadow-2xl border border-[#bfc7d2]/40 overflow-hidden flex flex-col max-h-[90vh]`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="px-6 py-4 bg-[#faf8ff] border-b border-[#ebedff] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#006194] text-white flex items-center justify-center">
            <Icon name={icon} className="text-[20px]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#111a36]">{title}</h2>
            {subtitle ? <p className="text-xs text-[#707881]">{subtitle}</p> : null}
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[#ebedff] text-[#707881]" aria-label="Close">
          <Icon name="close" className="text-[20px]" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto space-y-4 text-xs">{children}</div>
      {footer ? (
        <div className="px-6 py-4 bg-[#faf8ff] border-t border-[#ebedff] flex items-center justify-between gap-3">{footer}</div>
      ) : null}
    </div>
  </div>
);

export const Drawer: React.FC<{ title: React.ReactNode; subtitle?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }> = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
}) => (
  <div className="fixed inset-0 z-50 bg-[#262f4c]/50 backdrop-blur-xs flex justify-end" onClick={onClose}>
    <div
      className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#bfc7d2]/40"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="p-6 border-b border-[#ebedff] flex items-start justify-between bg-[#faf8ff]">
        <div>
          <div className="text-xl font-bold text-[#111a36]">{title}</div>
          {subtitle ? <p className="text-xs text-[#707881] mt-1">{subtitle}</p> : null}
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#ebedff] text-[#707881]" aria-label="Close">
          <Icon name="close" className="text-[22px]" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">{children}</div>
      {footer ? <div className="p-6 border-t border-[#ebedff] bg-[#faf8ff] flex items-center gap-3">{footer}</div> : null}
    </div>
  </div>
);

export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="font-semibold text-[#111a36] block mb-1">{label}</span>
    {children}
  </label>
);

export const inputClass =
  'w-full h-9 px-3 rounded-lg border border-[#bfc7d2]/60 bg-white text-xs text-[#111a36] focus:border-[#006194] focus:outline-none';

export const buttonClass = {
  primary:
    'px-4 py-2 rounded-lg bg-[#006194] hover:bg-[#007bb9] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'px-4 py-2 rounded-lg bg-[#ebedff] hover:bg-[#dbe1ff] text-[#3f4850] text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50',
  danger:
    'px-4 py-2 rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50',
  small:
    'px-2.5 py-1 rounded bg-[#ebedff] hover:bg-[#dbe1ff] text-[#006194] font-semibold text-[11px] transition-colors disabled:opacity-50',
};

export const Tabs = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) => (
  <div className="flex items-center bg-[#ebedff] rounded-lg p-0.5 text-xs">
    {options.map((option) => (
      <button
        key={option.value}
        onClick={() => onChange(option.value)}
        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
          value === option.value ? 'bg-white text-[#006194] shadow-xs' : 'text-[#707881] hover:text-[#111a36]'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

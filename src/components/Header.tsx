import React, { useEffect, useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { ChangePasswordModal } from './modals/ChangePasswordModal';
import { Icon } from './ui';

interface HeaderProps {
  onOpenNewReservation: () => void;
  onOpenCheckIn: () => void;
  onOpenAssignCleaning: () => void;
  onOpenActivity: () => void;
  onOpenSearch: () => void;
}

function clockLabel(timeZone: string) {
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone });
  const zone =
    new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'short' })
      .formatToParts(now)
      .find((part) => part.type === 'timeZoneName')?.value ?? timeZone;
  return `${time} · ${zone}`;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewReservation,
  onOpenCheckIn,
  onOpenAssignCleaning,
  onOpenActivity,
  onOpenSearch,
}) => {
  const { currentUser, property, logout, hasPermission } = useHotel();
  const [clock, setClock] = useState('');
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const canFrontDesk = hasPermission('canFrontDesk');
  const canSearch = hasPermission('canViewOperations');

  useEffect(() => {
    if (!property) return;
    const update = () => setClock(clockLabel(property.timezone));
    update();
    const timer = window.setInterval(update, 10_000);
    return () => window.clearInterval(timer);
  }, [property]);

  useEffect(() => {
    if (!canSearch) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch, canSearch]);

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-[#f4efe6]/95 backdrop-blur-md z-40 flex items-center justify-between px-6 border-b border-[#cfc4b4]/30">
      <div className="flex-1 max-w-md">
        {canSearch ? (
          <button
            onClick={onOpenSearch}
            className="w-full h-9 pl-3 pr-2.5 rounded-lg bg-white border border-[#cfc4b4]/60 hover:border-[#d99d26] text-xs text-[#786f62] flex items-center justify-between shadow-xs transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon name="search" />
              Search bookings by guest, reference, phone…
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-[#3c3832] bg-[#cfc4b4] rounded border border-[#cfc4b4]/40">
              ⌘K
            </kbd>
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        {clock ? (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#e7ddd0] text-[#3c3832] text-xs font-medium border border-[#cfc4b4]/20">
            <Icon name="schedule" className="text-[16px] text-[#d99d26]" />
            <span>{clock}</span>
          </div>
        ) : null}

        {canFrontDesk ? (
          <div className="relative">
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d99d26] hover:bg-[#e8b03a] text-white text-xs font-semibold shadow-sm"
            >
              <Icon name="add_circle" />
              <span>Quick action</span>
              <Icon name="expand_more" className="text-[16px]" />
            </button>
            {showQuickMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#cfc4b4]/40 py-1.5 z-50">
                {[
                  { label: 'New reservation', icon: 'add_task', action: onOpenNewReservation },
                  { label: 'Check in a guest', icon: 'how_to_reg', action: onOpenCheckIn },
                  { label: 'Assign cleaning', icon: 'cleaning_services', action: onOpenAssignCleaning },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setShowQuickMenu(false);
                      item.action();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-[#161410] hover:bg-[#e7ddd0] flex items-center gap-2"
                  >
                    <Icon name={item.icon} className="text-[18px] text-[#d99d26]" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <button
          onClick={onOpenActivity}
          className="p-2 rounded-lg hover:bg-[#e7ddd0] text-[#3c3832] hover:text-[#161410] transition-colors"
          title="Recent activity"
        >
          <Icon name="notifications" className="text-[21px]" />
        </button>

        <div className="h-6 w-px bg-[#cfc4b4]/40" />

        <div className="relative">
          <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 pl-1 text-left">
            <div
              className={`w-8 h-8 rounded-full ${currentUser?.avatarColor} text-white flex items-center justify-center font-bold text-xs`}
            >
              {currentUser?.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <div className="text-xs text-[#161410] leading-tight font-semibold">{currentUser?.name}</div>
              <div className="text-[11px] text-[#786f62] leading-none mt-0.5">{currentUser?.roleTitle}</div>
            </div>
            <Icon name="expand_more" className="text-[#786f62] text-[18px]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-[#cfc4b4]/40 py-2 z-50">
              <div className="px-4 py-2 border-b border-[#e7ddd0]">
                <div className="text-xs font-bold text-[#161410]">{currentUser?.name}</div>
                <div className="text-[11px] text-[#786f62]">{currentUser?.email}</div>
                <div className="text-[11px] text-[#d99d26] font-semibold mt-0.5">{currentUser?.roleTitle}</div>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  setChangingPassword(true);
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-[#161410] hover:bg-[#e7ddd0] flex items-center gap-2"
              >
                <Icon name="password" className="text-[16px]" />
                Change password
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  void logout();
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 flex items-center gap-2"
              >
                <Icon name="logout" className="text-[16px]" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </header>
  );
};

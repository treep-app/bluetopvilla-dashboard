import React from 'react';
import { useHotel } from '../context/HotelContext';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { StaffUser } from '../types/hotel';
import { Icon } from './ui';

export type NavScreen =
  | 'dashboard'
  | 'reservations'
  | 'arrivals'
  | 'tape-chart'
  | 'rooms'
  | 'housekeeping'
  | 'maintenance'
  | 'rates'
  | 'employees'
  | 'leave'
  | 'enquiries'
  | 'events-content'
  | 'staff';

type NavItem = {
  screen: NavScreen;
  label: string;
  icon: string;
  permission: keyof StaffUser['permissions'];
  badge?: (counts: Counts) => number;
  badgeClass?: string;
};

type Counts = { arrivalsPending: number; housekeeping: number; outOfService: number; enquiries: number };

const SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Overview',
    items: [
      { screen: 'dashboard', label: 'Dashboard', icon: 'dashboard', permission: 'canViewOperations' },
      { screen: 'employees', label: 'Employees', icon: 'badge', permission: 'canViewStaff' },
      { screen: 'leave', label: 'Leave requests', icon: 'event_busy', permission: 'canViewStaff' },
    ],
  },
  {
    title: 'Reservations',
    items: [
      { screen: 'reservations', label: 'All reservations', icon: 'book_online', permission: 'canViewOperations' },
      {
        screen: 'arrivals',
        label: 'Arrivals & departures',
        icon: 'flight_land',
        permission: 'canViewOperations',
        badge: (counts) => counts.arrivalsPending,
      },
      { screen: 'tape-chart', label: 'Tape chart', icon: 'calendar_view_week', permission: 'canViewOperations' },
    ],
  },
  {
    title: 'Rooms',
    items: [
      { screen: 'rooms', label: 'Room matrix', icon: 'meeting_room', permission: 'canViewOperations' },
      {
        screen: 'housekeeping',
        label: 'Housekeeping',
        icon: 'cleaning_services',
        permission: 'canViewOperations',
        badge: (counts) => counts.housekeeping,
        badgeClass: 'bg-[#b15f00]',
      },
      {
        screen: 'maintenance',
        label: 'Out of service',
        icon: 'build',
        permission: 'canViewOperations',
        badge: (counts) => counts.outOfService,
        badgeClass: 'bg-[#ba1a1a]',
      },
      { screen: 'rates', label: 'Room types & rates', icon: 'price_change', permission: 'canViewOperations' },
    ],
  },
  {
    title: 'Guests',
    items: [
      {
        screen: 'enquiries',
        label: 'Enquiries & messages',
        icon: 'mail',
        permission: 'canHandleEnquiries',
        badge: (counts) => counts.enquiries,
      },
    ],
  },
  {
    title: 'Website',
    items: [{ screen: 'events-content', label: 'Events page', icon: 'celebration', permission: 'canManageContent' }],
  },
  {
    title: 'System',
    items: [{ screen: 'staff', label: 'Staff & access', icon: 'manage_accounts', permission: 'canViewStaff' }],
  },
];

interface SidebarProps {
  currentScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  onOpenNewReservation: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate, onOpenNewReservation }) => {
  const { currentUser, property, hasPermission } = useHotel();
  const canViewOperations = hasPermission('canViewOperations');
  const overview = useApi(() => api.overview(), [], canViewOperations);

  const counts: Counts = {
    arrivalsPending: overview.data ? overview.data.arrivals.total - overview.data.arrivals.checkedIn : 0,
    housekeeping: overview.data ? overview.data.rooms.dirty + overview.data.rooms.cleaning : 0,
    outOfService: overview.data?.rooms.outOfService ?? 0,
    enquiries: overview.data?.enquiries.total ?? 0,
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#262f4c] z-50 flex flex-col select-none">
      <div className="h-16 px-4 flex items-center gap-2.5 border-b border-[#707881]/20">
        <img
          src="/logo.png"
          alt="Blue Top Villa"
          className="h-8 w-auto rounded-md bg-white/95 px-1.5 py-1 shadow-xs"
        />
        <div className="min-w-0">
          <div className="font-bold text-sm text-[#eff0ff] leading-tight truncate">{property?.name ?? 'Dashboard'}</div>
          <div className="text-[11px] text-[#bfc7d2] leading-none truncate">{property?.address ?? 'Hotel operations'}</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4 no-scrollbar">
        {SECTIONS.map((section) => {
          const items = section.items.filter((item) => hasPermission(item.permission));
          if (!items.length) return null;
          return (
            <div key={section.title} className="space-y-1">
              <div className="px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#bfc7d2]/70 font-bold">
                {section.title}
              </div>
              {items.map((item) => {
                const active = currentScreen === item.screen;
                const badge = item.badge?.(counts) ?? 0;
                return (
                  <button
                    key={item.screen}
                    onClick={() => onNavigate(item.screen)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      active ? 'bg-[#006194] text-white font-semibold shadow-xs' : 'text-[#eff0ff]/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon name={item.icon} />
                      {item.label}
                    </span>
                    {badge > 0 ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold ${item.badgeClass ?? 'bg-[#007bb9]'}`}>
                        {badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {section.title === 'Reservations' && hasPermission('canFrontDesk') ? (
                <button
                  onClick={onOpenNewReservation}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#eff0ff]/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Icon name="add_circle" />
                  New reservation
                </button>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#707881]/20">
        <div className="p-2.5 rounded-lg bg-white/5 text-[#eff0ff] border border-white/5">
          <div className="text-xs font-semibold truncate">{currentUser?.name}</div>
          <div className="text-[11px] text-[#bfc7d2] truncate">{currentUser?.roleTitle}</div>
        </div>
      </div>
    </aside>
  );
};

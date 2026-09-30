import React from 'react';
import { useHotel } from '../../context/HotelContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import type { ActivityItem } from '../../types/hotel';
import { formatDateTime } from '../../lib/format';
import { Drawer, Empty, ErrorNote, Icon, Loading } from '../ui';

const KIND_ICON: Record<ActivityItem['kind'], string> = {
  booking: 'book_online',
  payment: 'payments',
  enquiry: 'celebration',
  message: 'mail',
  staff: 'badge',
};

export const ActivityDrawer: React.FC<{ onClose: () => void; onOpenBooking: (bookingId: string) => void }> = ({
  onClose,
  onOpenBooking,
}) => {
  const { property } = useHotel();
  const activity = useApi(() => api.activity());

  return (
    <Drawer title="Recent activity" subtitle="New bookings, payments, enquiries and staff actions" onClose={onClose}>
      <ErrorNote message={activity.error} onRetry={activity.reload} />
      {activity.loading && !activity.data ? (
        <Loading />
      ) : !activity.data?.length ? (
        <Empty icon="notifications_off" title="No activity yet" />
      ) : (
        <div className="space-y-2">
          {activity.data.map((item) => {
            const clickable = Boolean(item.bookingId);
            return (
              <button
                key={item.id}
                disabled={!clickable}
                onClick={() => item.bookingId && onOpenBooking(item.bookingId)}
                className={`w-full text-left p-3 rounded-xl border border-[#cfc4b4]/30 bg-[#f4efe6] flex gap-3 ${
                  clickable ? 'hover:bg-[#e7ddd0]' : 'cursor-default'
                }`}
              >
                <Icon name={KIND_ICON[item.kind]} className="text-[18px] text-[#d99d26] mt-0.5" />
                <span className="min-w-0">
                  <span className="block font-bold text-[#161410] first-letter:uppercase">{item.title}</span>
                  {item.detail ? <span className="block text-[11px] text-[#3c3832] truncate">{item.detail}</span> : null}
                  <span className="block text-[10px] text-[#786f62] mt-0.5">{formatDateTime(item.at, property?.timezone)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Drawer>
  );
};

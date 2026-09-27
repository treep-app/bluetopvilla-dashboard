import type { BookingStage, RoomStatus } from '../types/hotel';

export function formatMoney(amount: string | number, currency: string) {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
}

/** "Sun 27 Sep" from a YYYY-MM-DD key (timezone-neutral). */
export function formatDay(key: string) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function formatDateTime(iso: string, timeZone?: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

export function addDays(key: string, days: number) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const STAGE_LABELS: Record<BookingStage, string> = {
  pending_payment: 'Awaiting payment',
  upcoming: 'Upcoming',
  arriving: 'Arriving',
  in_house: 'In house',
  departed: 'Departed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  no_show: 'No show',
};

export const STAGE_BADGE: Record<BookingStage, string> = {
  pending_payment: 'bg-amber-100 text-amber-900',
  upcoming: 'bg-[#f2f3ff] text-[#006194]',
  arriving: 'bg-[#cce5ff] text-[#001d31]',
  in_house: 'bg-emerald-100 text-emerald-800',
  departed: 'bg-[#ebedff] text-[#707881]',
  cancelled: 'bg-[#ffdad6] text-[#93000a]',
  expired: 'bg-[#ebedff] text-[#707881]',
  no_show: 'bg-[#ffdad6] text-[#93000a]',
};

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  occupied: 'Occupied',
  clean: 'Clean & ready',
  cleaning: 'Cleaning',
  dirty: 'Dirty',
  oos: 'Out of service',
};

export const ROOM_STATUS_BADGE: Record<RoomStatus, string> = {
  occupied: 'bg-[#cce5ff] text-[#001d31]',
  clean: 'bg-emerald-100 text-emerald-800',
  cleaning: 'bg-[#ffdcc3] text-[#2f1500]',
  dirty: 'bg-amber-100 text-amber-900',
  oos: 'bg-[#ffdad6] text-[#93000a]',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile money',
  card: 'Card terminal',
  bank_transfer: 'Bank transfer',
};

export const SOURCE_LABELS: Record<string, string> = {
  web: 'Website',
  desk: 'Walk-in',
  phone: 'Phone',
};

/** Amenity icon keys (backend AMENITY_ICONS) → Material Symbols names for the dashboard. */
export const AMENITY_ICONS: Array<{ key: string; label: string; symbol: string }> = [
  { key: 'wifi', label: 'Wi-Fi', symbol: 'wifi' },
  { key: 'wind', label: 'Air conditioning', symbol: 'air' },
  { key: 'snowflake', label: 'Cooling', symbol: 'ac_unit' },
  { key: 'tv', label: 'TV', symbol: 'tv' },
  { key: 'bath', label: 'Bathtub', symbol: 'bathtub' },
  { key: 'shower', label: 'Shower', symbol: 'shower' },
  { key: 'coffee', label: 'Coffee / tea', symbol: 'coffee' },
  { key: 'bed', label: 'Bed', symbol: 'bed' },
  { key: 'parking', label: 'Parking', symbol: 'local_parking' },
  { key: 'pool', label: 'Pool', symbol: 'pool' },
  { key: 'safe', label: 'Safe', symbol: 'lock' },
  { key: 'fridge', label: 'Fridge', symbol: 'kitchen' },
  { key: 'desk', label: 'Work desk', symbol: 'desk' },
  { key: 'view', label: 'View / balcony', symbol: 'landscape' },
  { key: 'breakfast', label: 'Breakfast', symbol: 'restaurant' },
];

export const amenitySymbol = (icon: string | null) =>
  AMENITY_ICONS.find((item) => item.key === icon)?.symbol ?? 'check_circle';

/** Photos bundled with the website (/images/...) are served by the site, not the dashboard. */
export function mediaSrc(url: string) {
  if (!url.startsWith('/')) return url;
  const site = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${site}${url}`;
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Every Fri & Sat · 21:00" for weekly events, "Sat 24 Dec · 19:00" for one-offs. */
export function eventSchedule(event: { startsAt: string | null; recurrenceDays: number[]; recurrenceTime: string | null }) {
  if (event.recurrenceDays.length) {
    const days = event.recurrenceDays.map((day) => WEEKDAYS[day]);
    const list = days.length > 1 ? `${days.slice(0, -1).join(', ')} & ${days[days.length - 1]}` : days[0];
    return `Every ${list}${event.recurrenceTime ? ` · ${event.recurrenceTime}` : ''}`;
  }
  if (!event.startsAt) return 'No date set';
  const [date, time] = event.startsAt.split('T');
  return `${formatDay(date)} ${date.slice(0, 4)} · ${time}`;
}

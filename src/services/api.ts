import type {
  ActivityItem,
  Booking,
  BookingDetail,
  BackendRole,
  DeskPaymentMethod,
  Enquiries,
  EnquiryStatus,
  HousekeepingStatus,
  Overview,
  Property,
  RevenuePoint,
  Room,
  Amenity,
  CalendarEvent,
  EventSpace,
  EventType,
  RoomTypeDetail,
  StaffMember,
  Employee,
  EmployeeDetail,
  AttendanceRow,
  LeaveRequestRow,
  LeaveCalendar,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from '../types/hotel';
import { request } from './authService';

const post = (body?: unknown): RequestInit => ({ method: 'POST', body: body ? JSON.stringify(body) : undefined });
const patch = (body: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(body) });
const del: RequestInit = { method: 'DELETE' };

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export type BookingQuery = {
  view?: 'all' | 'arrivals' | 'departures' | 'in_house';
  date?: string;
  from?: string;
  to?: string;
  status?: string;
  q?: string;
};

export type NewDeskBooking = {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  specialRequests?: string;
  source: 'desk' | 'phone';
};

export type AvailabilityResult = {
  nights: number;
  currency: string;
  results: Array<{ id: string; name: string; occupancy: number; nightly: string; total: string; availableUnits: number }>;
};

export type NewRoom = { name: string; code?: string; floor?: string };

export type RoomTypeInput = {
  name: string;
  description?: string;
  bedConfig?: string;
  sizeSqm?: number | null;
  occupancy: number;
  basePrice: number;
  amenityIds: string[];
  images: Array<{ url: string; alt?: string }>;
  isActive: boolean;
  sortOrder?: number;
};

export type EventInput = {
  title: string;
  description: string;
  eventType: string;
  startsAt: string | null;
  recurrenceDays: number[];
  recurrenceTime: string | null;
  location: string;
  imageUrl: string | null;
  isPublic: boolean;
};

export type EventTypeInput = {
  title: string;
  tagline: string;
  description: string;
  highlights: string[];
  icon: string;
  imageUrl: string | null;
  sortOrder?: number;
  isPublished: boolean;
};

export type EventSpaceInput = {
  title: string;
  detail: string;
  tag: string;
  imageUrl: string | null;
  href: string | null;
  sortOrder?: number;
  isPublished: boolean;
};

export const api = {
  property: () => request<Property>('/property'),
  /** Same availability + pricing engine the public website uses. */
  availability: (body: { checkIn: string; checkOut: string; adults: number; children: number; rooms: number }) =>
    request<AvailabilityResult>('/availability/search', post(body)),
  overview: () => request<Overview>('/admin/overview'),
  revenue: (days: number) => request<RevenuePoint[]>(`/admin/revenue${query({ days })}`),
  activity: () => request<ActivityItem[]>('/admin/activity'),

  rooms: () => request<Room[]>('/admin/rooms'),
  updateRoom: (
    id: string,
    body: { housekeeping?: HousekeepingStatus; housekeeper?: string | null; maintenance?: boolean; maintenanceNote?: string | null },
  ) => request<Room>(`/admin/rooms/${id}`, patch(body)),

  bookings: (params: BookingQuery = {}) => request<Booking[]>(`/admin/bookings${query(params)}`),
  booking: (id: string) => request<BookingDetail>(`/admin/bookings/${id}`),
  createBooking: (body: NewDeskBooking) => request<BookingDetail>('/admin/bookings', post(body)),
  checkIn: (id: string, roomIds: string[]) => request<BookingDetail>(`/admin/bookings/${id}/check-in`, post({ roomIds })),
  checkOut: (id: string) => request<BookingDetail>(`/admin/bookings/${id}/check-out`, post()),
  cancelBooking: (id: string) => request<BookingDetail>(`/admin/bookings/${id}/cancel`, post()),
  recordPayment: (id: string, amount: number, method: DeskPaymentMethod) =>
    request<BookingDetail>(`/admin/bookings/${id}/payments`, post({ amount, method })),

  roomTypes: () => request<RoomTypeDetail[]>('/admin/room-types'),
  updateRate: (id: string, basePrice: number) => request<RoomTypeDetail>(`/admin/room-types/${id}`, patch({ basePrice })),
  createRoomType: (body: RoomTypeInput & { slug?: string; rooms?: NewRoom[] }) =>
    request<RoomTypeDetail>('/admin/room-types', post(body)),
  updateRoomTypeDetails: (id: string, body: Partial<RoomTypeInput>) =>
    request<RoomTypeDetail>(`/admin/room-types/${id}/details`, patch(body)),
  createRoom: (body: NewRoom & { roomTypeId: string }) => request<{ id: string }>('/admin/rooms', post(body)),
  updateRoomDetails: (id: string, body: { name?: string; code?: string | null; floor?: string | null; isActive?: boolean }) =>
    request<{ id: string }>(`/admin/rooms/${id}/details`, patch(body)),
  amenities: () => request<Amenity[]>('/admin/amenities'),
  createAmenity: (name: string, icon: string) => request<Amenity>('/admin/amenities', post({ name, icon })),
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ path: string; url: string }>('/admin/uploads', { method: 'POST', body: form }, 60_000);
  },

  events: () => request<CalendarEvent[]>('/admin/events'),
  createEvent: (body: EventInput & { title: string }) => request<CalendarEvent>('/admin/events', post(body)),
  updateEvent: (id: string, body: Partial<EventInput>) => request<CalendarEvent>(`/admin/events/${id}`, patch(body)),
  deleteEvent: (id: string) => request(`/admin/events/${id}`, del),

  eventTypes: () => request<EventType[]>('/admin/event-types'),
  createEventType: (body: EventTypeInput) => request<EventType>('/admin/event-types', post(body)),
  updateEventType: (id: string, body: Partial<EventTypeInput>) => request<EventType>(`/admin/event-types/${id}`, patch(body)),
  deleteEventType: (id: string) => request(`/admin/event-types/${id}`, del),

  eventSpaces: () => request<EventSpace[]>('/admin/event-spaces'),
  createEventSpace: (body: EventSpaceInput) => request<EventSpace>('/admin/event-spaces', post(body)),
  updateEventSpace: (id: string, body: Partial<EventSpaceInput>) =>
    request<EventSpace>(`/admin/event-spaces/${id}`, patch(body)),
  deleteEventSpace: (id: string) => request(`/admin/event-spaces/${id}`, del),

  staff: () => request<StaffMember[]>('/admin/staff'),
  createStaff: (body: { email: string; firstName: string; lastName: string; role: BackendRole; password: string }) =>
    request<StaffMember>('/admin/staff', post(body)),
  employees: () => request<Employee[]>('/admin/employees'),
  employee: (id: string) => request<EmployeeDetail>(`/admin/employees/${id}`),
  attendance: (id: string, from?: string, to?: string) =>
    request<AttendanceRow[]>(`/admin/employees/${id}/attendance${query({ from, to })}`),
  attendanceCheckIn: (id: string) => request<AttendanceRow>(`/admin/employees/${id}/attendance/check-in`, post({})),
  attendanceCheckOut: (id: string) => request<AttendanceRow>(`/admin/employees/${id}/attendance/check-out`, post({})),
  attendanceMark: (id: string, body: { date: string; kind: 'PRESENT' | 'LATE' | 'ABSENT' | 'HOLIDAY'; reason?: string }) =>
    request<AttendanceRow>(`/admin/employees/${id}/attendance/mark`, post(body)),
  leaveRequests: () => request<LeaveRequestRow[]>('/admin/leave-requests'),
  leaveCalendar: (from?: string, to?: string) =>
    request<LeaveCalendar>(`/admin/leave-calendar${query({ from, to })}`),
  requestLeave: (id: string, body: { startDate: string; endDate?: string; leaveType: string; reason?: string }) =>
    request<AttendanceRow>(`/admin/employees/${id}/leave`, post(body)),
  decideLeave: (entryId: string, approve: boolean) =>
    request<AttendanceRow>(`/admin/leave-requests/${entryId}`, patch({ approve })),
  createEmployee: (body: CreateEmployeeInput) => request<Employee>('/admin/employees', post(body)),
  updateEmployee: (id: string, body: UpdateEmployeeInput) =>
    request<Employee>(`/admin/employees/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deactivateEmployee: (id: string) => request<Employee>(`/admin/employees/${id}`, { method: 'DELETE' }),

  enquiries: () => request<Enquiries>('/admin/enquiries'),
  updateVenueEnquiry: (id: string, status: EnquiryStatus) => request(`/admin/enquiries/venue/${id}`, patch({ status })),
  updateEventReservation: (id: string, status: EnquiryStatus) =>
    request(`/admin/enquiries/events/${id}`, patch({ status })),
  markMessageRead: (id: string) => request(`/admin/enquiries/contact/${id}/read`, post()),
};

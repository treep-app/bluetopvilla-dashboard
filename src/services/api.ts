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
  GoldenTicket,
  GoldenTicketCampaign,
  GoldenTicketRecipient,
  IssueGoldenTicketInput,
  MarketingContact,
  NewsletterSubscriber,
  SmsTemplate,
  SmsCampaign,
  SmsCampaignDetail,
  SmsHubDelivery,
  SmsHubDeliveryOutcome,
  SmsHubStatus,
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
  priceFrom: number | null;
  priceNote: string | null;
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

  goldenTicketCampaigns: () => request<GoldenTicketCampaign[]>('/admin/golden-tickets/campaigns'),
  goldenTicketRecipients: (q?: string) =>
    request<GoldenTicketRecipient[]>(`/admin/golden-tickets/recipients${query({ q })}`),
  goldenTickets: (params: { status?: string; q?: string; campaignId?: string; limit?: number; offset?: number } = {}) =>
    request<{ items: GoldenTicket[]; total: number; limit: number; offset: number }>(
      `/admin/golden-tickets${query(params)}`,
    ),
  goldenTicket: (id: string) => request<GoldenTicket>(`/admin/golden-tickets/${id}`),
  issueGoldenTicket: (body: IssueGoldenTicketInput) =>
    request<{
      created: boolean;
      alreadyExists: boolean;
      emailed: boolean;
      emailSkipped?: boolean;
      smsSent: boolean;
      smsSkipped?: boolean;
      smsFailed?: boolean;
      smsError?: string | null;
      tip?: string;
      smsPreview?: string;
      ticket: GoldenTicket;
    }>('/admin/golden-tickets/issue', post(body)),
  cancelGoldenTicket: (id: string) =>
    request<{ alreadyCancelled: boolean; ticket: GoldenTicket }>(`/admin/golden-tickets/${id}/cancel`, post()),

  // Marketing — contacts, templates, SMS campaigns
  marketingContacts: (params: { q?: string; limit?: number; offset?: number } = {}) =>
    request<{ items: MarketingContact[]; total: number }>(`/admin/marketing/contacts${query(params)}`),
  createMarketingContact: (body: { phone: string; name?: string; email?: string; tags?: string[]; notes?: string }) =>
    request<MarketingContact>('/admin/marketing/contacts', post(body)),
  updateMarketingContact: (
    id: string,
    body: { phone?: string; name?: string | null; email?: string | null; tags?: string[]; notes?: string | null },
  ) => request<MarketingContact>(`/admin/marketing/contacts/${id}`, patch(body)),
  deleteMarketingContact: (id: string) => request<{ deleted: boolean }>(`/admin/marketing/contacts/${id}`, del),
  newsletterSubscribers: (params: { q?: string; limit?: number; offset?: number } = {}) =>
    request<{ items: NewsletterSubscriber[]; total: number }>(
      `/admin/marketing/newsletter-subscribers${query(params)}`,
    ),
  deleteNewsletterSubscriber: (id: string) =>
    request<{ deleted: boolean }>(`/admin/marketing/newsletter-subscribers/${id}`, del),
  importMarketingContactsFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{
      created: number;
      updated: number;
      skipped: number;
      total: number;
      errors: Array<{ row: number; phone?: string; error: string }>;
    }>('/admin/marketing/contacts/import-file', { method: 'POST', body: form }, 60_000);
  },

  smsTemplates: () => request<SmsTemplate[]>('/admin/marketing/sms-templates'),
  createSmsTemplate: (body: { name: string; body: string; description?: string; isDefault?: boolean }) =>
    request<SmsTemplate>('/admin/marketing/sms-templates', post(body)),
  updateSmsTemplate: (
    id: string,
    body: { name?: string; body?: string; description?: string | null; isDefault?: boolean },
  ) => request<SmsTemplate>(`/admin/marketing/sms-templates/${id}`, patch(body)),
  deleteSmsTemplate: (id: string) => request<{ deleted: boolean }>(`/admin/marketing/sms-templates/${id}`, del),

  createCouponCampaign: (body: {
    name: string;
    offerTitle: string;
    offerSubtitle?: string;
    offerTerms?: string;
    description?: string;
    expiryDays?: number;
    discountPercent?: number;
    isDefault?: boolean;
  }) => request<GoldenTicketCampaign>('/admin/marketing/coupon-campaigns', post(body)),

  smsCampaigns: () => request<SmsCampaign[]>('/admin/marketing/sms-campaigns'),
  smsCampaign: (id: string) => request<SmsCampaignDetail>(`/admin/marketing/sms-campaigns/${id}`),
  createSmsCampaign: (body: {
    name: string;
    description?: string;
    templateId?: string;
    body?: string;
    goldenTicketCampaignId?: string;
    contactIds?: string[];
  }) => request<SmsCampaign>('/admin/marketing/sms-campaigns', post(body)),
  sendSmsCampaign: (id: string) =>
    request<SmsCampaign & { sent: number; failed: number; skipped: number }>(
      `/admin/marketing/sms-campaigns/${id}/send`,
      post(),
    ),
  cancelSmsCampaign: (id: string) => request(`/admin/marketing/sms-campaigns/${id}/cancel`, post()),

  // Hubtel SMS delivery log (Redis)
  smsStatus: () => request<SmsHubStatus>('/admin/sms/status'),
  smsDeliveries: (params: { outcome?: SmsHubDeliveryOutcome; phone?: string; limit?: number; offset?: number } = {}) =>
    request<{ items: SmsHubDelivery[]; total: number }>(`/admin/sms/deliveries${query(params)}`),
  smsDelivery: (id: string) => request<SmsHubDelivery | null>(`/admin/sms/deliveries/${id}`),
};

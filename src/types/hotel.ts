/** Shapes returned by the backend admin API (`/api/admin/*`) and public `/api/property`. */

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_PROCESSING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type BookingStage =
  | 'pending_payment'
  | 'upcoming'
  | 'arriving'
  | 'in_house'
  | 'departed'
  | 'cancelled'
  | 'expired'
  | 'no_show';

export type RoomStatus = 'occupied' | 'clean' | 'cleaning' | 'dirty' | 'oos';
export type HousekeepingStatus = 'CLEAN' | 'DIRTY' | 'CLEANING';
export type PaymentProvider = 'STRIPE' | 'HUBTEL' | 'MANUAL';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type DeskPaymentMethod = 'cash' | 'mobile_money' | 'card' | 'bank_transfer';
export type EnquiryStatus = 'PENDING' | 'CONTACTED' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED';
export type BackendRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'CONTENT_EDITOR' | 'REPORTS_VIEWER';

export interface Property {
  name: string;
  timezone: string;
  currency: string;
  checkInTime: string;
  checkOutTime: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface Overview {
  today: string;
  currency: string;
  rooms: { total: number; occupied: number; clean: number; dirty: number; cleaning: number; outOfService: number };
  arrivals: { total: number; checkedIn: number };
  departures: { total: number; checkedOut: number };
  inHouse: number;
  revenueToday: string;
  outstanding: { count: number; amount: string };
  pendingPayment: number;
  enquiries: { venue: number; events: number; contact: number; total: number };
  roomTypes: Array<{ id: string; name: string; units: number; occupied: number }>;
}

export interface RevenuePoint {
  date: string;
  online: number;
  mobileMoney: number;
  desk: number;
  total: number;
}

export interface Room {
  id: string;
  name: string;
  code: string | null;
  floor: string | null;
  roomTypeId: string;
  roomTypeName: string;
  basePrice: string;
  currency: string;
  status: RoomStatus;
  housekeeping: HousekeepingStatus;
  housekeeper: string | null;
  lastCleanedAt: string | null;
  maintenance: boolean;
  maintenanceNote: string | null;
  currentStay: { bookingId: string; reference: string; guestName: string; checkOut: string } | null;
}

export interface Booking {
  id: string;
  reference: string;
  status: BookingStatus;
  stage: BookingStage;
  source: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  guest: {
    firstName: string;
    lastName: string;
    name: string;
    email: string | null;
    phone: string;
    country: string | null;
  };
  rooms: Array<{ roomTypeId: string; roomTypeName: string; roomId: string | null; roomName: string | null }>;
  currency: string;
  total: string;
  paid: string;
  balance: string;
  specialRequests: string | null;
  holdExpiresAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface BookingDetail extends Booking {
  subtotal: string;
  taxes: string;
  fees: string;
  discount: string;
  lines: Array<{ id: string; roomTypeName: string; roomName: string | null; nightly: string; nights: number; lineTotal: string }>;
  payments: Array<{
    id: string;
    provider: PaymentProvider;
    method: string | null;
    status: PaymentStatus;
    amount: string;
    refunded: string;
    paidAt: string | null;
    createdAt: string;
  }>;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string | null;
}

/** A sellable room type as shown on the website, with the physical rooms behind it. */
export interface RoomTypeDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bedConfig: string | null;
  sizeSqm: number | null;
  occupancy: number;
  basePrice: string;
  currency: string;
  /** Shown and bookable on the website. */
  isActive: boolean;
  sortOrder: number;
  units: number;
  sellableUnits: number;
  /** Open bookings for this type checking out today or later. */
  upcomingBookings: number;
  images: Array<{ id: string; url: string; alt: string | null }>;
  amenities: Amenity[];
  rooms: Array<{ id: string; name: string; code: string | null; floor: string | null; isActive: boolean; maintenance: boolean }>;
}

export interface StaffMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  roles: BackendRole[];
  createdAt: string;
}

export interface Employee {
  id: string;
  userId: string;
  employeeCode: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  roles: BackendRole[];
  position: string;
  department: string;
  hireDate: string;
  salary: number | null;
  active: boolean;
  annualLeaveDays: number;
  notes: string | null;
  createdAt: string;
}

export interface LeaveBalance {
  entitlement: number;
  used: number;
  pending: number;
  remaining: number;
  year: number;
}

export interface CreateEmployeeInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: BackendRole;
  password: string;
  position: string;
  department: string;
  hireDate: string;
  salary?: number;
  notes?: string;
}

export interface EmployeeAuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: string;
  by: 'self' | 'other';
}

export interface EmployeeBookingSummary {
  id: string;
  reference: string;
  status: BookingStatus;
  guestName: string | null;
  totalAmount: number;
  createdAt: string;
}

export type AttendanceKind = 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'HOLIDAY';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceRow {
  id: string;
  employeeId: string;
  kind: AttendanceKind;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  leaveStatus: LeaveStatus | null;
  leaveType: string | null;
  endDate: string | null;
  reason: string | null;
  createdAt: string;
}

export interface LeaveRequestRow extends AttendanceRow {
  employee: { id: string; employeeCode: string; name: string };
  leaveBalance: LeaveBalance | null;
}

export interface LeaveCalendarEntry {
  id: string;
  employeeId: string;
  employeeCode: string;
  name: string;
  position: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

export interface LeaveCalendar {
  from: string;
  to: string;
  entries: LeaveCalendarEntry[];
}

export interface EmployeeDetail extends Employee {
  leaveBalance: LeaveBalance;
  stats: { bookingsCreated: number };
  audit: EmployeeAuditEntry[];
  bookings: EmployeeBookingSummary[];
}

export interface UpdateEmployeeInput {
  position?: string;
  department?: string;
  hireDate?: string;
  salary?: number | null;
  notes?: string;
  active?: boolean;
  annualLeaveDays?: number;
  role?: BackendRole;
  phone?: string;
}

export interface VenueEnquiry {
  id: string;
  reference: string;
  status: EnquiryStatus;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  eventType: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  guestCount: number;
  preferredVenue: string | null;
  decoration: boolean;
  catering: boolean;
  soundSystem: boolean;
  photography: boolean;
  budgetRange: string | null;
  notes: string | null;
  createdAt: string;
}

export interface EventReservation {
  id: string;
  reference: string;
  status: EnquiryStatus;
  eventTitle: string | null;
  attendeeName: string;
  attendeeEmail: string | null;
  attendeePhone: string;
  partySize: number;
  visitDate: string | null;
  arrivalTime: string | null;
  vipTable: boolean;
  bottleReservation: boolean;
  celebrationType: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Enquiries {
  venue: VenueEnquiry[];
  events: EventReservation[];
  contact: ContactMessage[];
}

export interface ActivityItem {
  id: string;
  kind: 'booking' | 'payment' | 'enquiry' | 'message' | 'staff';
  at: string;
  title: string;
  detail: string;
  bookingId: string | null;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  roles: BackendRole[];
  roleTitle: string;
  avatarColor: string;
  permissions: {
    /** Read bookings, rooms, rates, revenue. */
    canViewOperations: boolean;
    /** Create bookings, check in/out, take payments, update housekeeping. */
    canFrontDesk: boolean;
    canCancelBookings: boolean;
    canManageRates: boolean;
    /** Create and edit room types, photos, amenities and physical rooms. */
    canManageRooms: boolean;
    canViewStaff: boolean;
    canManageStaff: boolean;
    canHandleEnquiries: boolean;
    /** Edit website content: events, event types and venue spaces. */
    canManageContent: boolean;
  };
}

/** A listing on the website's public events calendar. */
export interface CalendarEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  eventType: string;
  eventAt: string | null;
  /** Local start at the villa, "YYYY-MM-DDTHH:mm" (one-off events). */
  startsAt: string | null;
  /** 0 = Sunday … 6 = Saturday (weekly events). */
  recurrenceDays: number[];
  recurrenceTime: string | null;
  location: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  reservations?: number;
  isPast?: boolean;
}

/** Weddings, parties, corporate… shown on /events, the home page and the venue form. */
export interface EventType {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  highlights: string[];
  icon: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
}

export interface EventSpace {
  id: string;
  title: string;
  detail: string | null;
  tag: string | null;
  imageUrl: string | null;
  href: string | null;
  sortOrder: number;
  isPublished: boolean;
}

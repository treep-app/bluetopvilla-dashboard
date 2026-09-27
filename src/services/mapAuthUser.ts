import type { BackendRole, StaffUser } from "../types/hotel";
import type { AuthUser } from "./authService";

const AVATAR_COLORS = ["bg-[#006194]", "bg-[#8d4b00]", "bg-[#565d79]", "bg-emerald-600", "bg-indigo-600"];

export const ROLE_TITLES: Record<BackendRole, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  MANAGER: "Duty Manager",
  STAFF: "Front Desk Staff",
  CONTENT_EDITOR: "Content Editor",
  REPORTS_VIEWER: "Reports Viewer",
};

const ROLE_ORDER: BackendRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "CONTENT_EDITOR", "REPORTS_VIEWER"];

export function primaryRole(roles: BackendRole[]): BackendRole {
  return ROLE_ORDER.find((role) => roles.includes(role)) ?? "STAFF";
}

/** Mirrors the backend `@Roles(...)` gates in admin.controller.ts. */
export function permissionsFor(roles: BackendRole[]): StaffUser["permissions"] {
  const has = (...allowed: BackendRole[]) => allowed.some((role) => roles.includes(role));
  return {
    canViewOperations: has("SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "REPORTS_VIEWER"),
    canFrontDesk: has("SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"),
    canCancelBookings: has("SUPER_ADMIN", "ADMIN", "MANAGER"),
    canManageRates: has("SUPER_ADMIN", "ADMIN", "MANAGER"),
    canManageRooms: has("SUPER_ADMIN", "ADMIN"),
    canViewStaff: has("SUPER_ADMIN", "ADMIN", "MANAGER"),
    canManageStaff: has("SUPER_ADMIN", "ADMIN"),
    canHandleEnquiries: has("SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "CONTENT_EDITOR"),
    canManageContent: has("SUPER_ADMIN", "ADMIN", "MANAGER", "CONTENT_EDITOR"),
  };
}

export function avatarColorFor(id: string) {
  const sum = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function mapAuthUserToStaffUser(user: AuthUser): StaffUser {
  const nameFromParts = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return {
    id: user.id,
    name: nameFromParts || user.email.split("@")[0] || "Staff",
    email: user.email,
    roles: user.roles,
    roleTitle: ROLE_TITLES[primaryRole(user.roles)],
    avatarColor: avatarColorFor(user.id),
    permissions: permissionsFor(user.roles),
  };
}

/** Mirrors backend `assignableRoles` (auth.rules.ts): who may create which accounts. */
export function assignableRoles(roles: BackendRole[]): BackendRole[] {
  if (roles.includes("SUPER_ADMIN")) return ROLE_ORDER;
  if (roles.includes("ADMIN")) return ["MANAGER", "STAFF", "CONTENT_EDITOR", "REPORTS_VIEWER"];
  return [];
}

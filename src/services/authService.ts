/**
 * API client — JWT bearer tokens for the hotel management dashboard.
 * `request` is shared by every dashboard API call (see ./api.ts).
 */

const TOKEN_KEY = "btv_access_token";
const USER_KEY = "btv_user";

export type BackendRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "STAFF"
  | "CONTENT_EDITOR"
  | "REPORTS_VIEWER";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: BackendRole[];
};

export type LoginResult = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: AuthUser;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: { code: string; message: string } };

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

function apiBaseUrl(): string {
  const base = import.meta.env.VITE_API_URL as string | undefined;
  return (base ?? "http://localhost:4000/api").replace(/\/$/, "");
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function parseResponse<T>(response: Response): Promise<T> {
  let body: ApiSuccess<T> | ApiFailure | null = null;
  try {
    body = (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body && !body.success
        ? body.error.message
        : response.status >= 500
          ? "Something went wrong. Please try again."
          : "Request failed.";

    if (response.status === 401 || response.status === 403) {
      throw new AuthApiError(
        message === "Unauthorized" || message === "Invalid credentials"
          ? "Invalid email or password."
          : message || "Invalid email or password.",
        response.status,
        body && !body.success ? body.error.code : undefined,
      );
    }

    throw new AuthApiError(message, response.status, body && !body.success ? body.error.code : undefined);
  }

  if (body && typeof body === "object" && "success" in body && body.success) {
    return body.data;
  }

  return body as unknown as T;
}

export async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 12_000): Promise<T> {
  const headers = new Headers(init.headers);
  // FormData (file uploads) must let the browser set its own multipart boundary.
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } catch {
    throw new AuthApiError("Unable to connect to the server. Please try again.", 0, "NETWORK_ERROR");
  } finally {
    window.clearTimeout(timer);
  }

  return parseResponse<T>(response);
}

export const authService = {
  login(email: string, password: string) {
    return request<LoginResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
  },

  me() {
    return request<AuthUser>("/auth/me");
  },

  /** Whether the first administrator still has to be created. */
  setupStatus() {
    return request<{ required: boolean }>("/auth/setup");
  },

  /** First-run only: creates the initial super administrator and signs them in. */
  setup(body: { email: string; firstName: string; lastName: string; password: string }) {
    return request<LoginResult>("/auth/setup", {
      method: "POST",
      body: JSON.stringify({ ...body, email: body.email.trim().toLowerCase() }),
    });
  },

  changePassword(currentPassword: string, newPassword: string) {
    return request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async logout() {
    try {
      if (getAccessToken()) {
        await request<{ message: string }>("/auth/logout", { method: "POST" });
      }
    } catch {
      // Always clear local session even if the API call fails.
    } finally {
      clearAuthStorage();
    }
  },
};

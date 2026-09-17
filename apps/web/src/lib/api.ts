export const API_URL =
  process.env.NEXT_PUBLIC_API_URL !== undefined && process.env.NEXT_PUBLIC_API_URL !== ""
    ? process.env.NEXT_PUBLIC_API_URL
    : typeof window !== "undefined"
      ? window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://46.202.163.202:4000"
        : window.location.port === "3000"
          ? `${window.location.protocol}//${window.location.hostname}:4000`
          : ""
      : "http://46.202.163.202:4000";

export type Session = {
  accessToken: string;
  accountId: string;
  personId: string;
  institutionId: string;
  roles: string[];
  givenName: string;
  familyName: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const KEY = "mh.session";
const ROLE_COOKIE = "mh_roles";

/** Align role-cookie lifetime with JWT access token (30d). */
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function writeRoleCookie(roles: string[]) {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(roles));
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ROLE_COOKIE}=${value}; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SEC}${secure}`;
}

function tokenExpired(accessToken: string): boolean {
  try {
    const part = accessToken.split(".")[1];
    if (!part) return true;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((part.length * 3) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

function clearRoleCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${ROLE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function saveSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
  writeRoleCookie(session.roles ?? []);
}

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    if (!session.accessToken || tokenExpired(session.accessToken)) {
      clearSession();
      return null;
    }
    writeRoleCookie(session.roles ?? []);
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
  clearRoleCookie();
}

export async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  const base = API_URL.replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, { ...init, headers });
  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string }; message?: string };
      message = body.error?.message ?? body.message ?? message;
      code = body.error?.code;
    } catch {
      try {
        message = await res.text();
      } catch {
        /* ignore */
      }
    }
    if (res.status === 401) {
      clearSession();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`/login?next=${next}`);
      }
    }
    throw new ApiError(message || `Request failed (${res.status})`, res.status, code);
  }
  return res.json() as Promise<T>;
}

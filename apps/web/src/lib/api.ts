export const API_URL =
  process.env.NEXT_PUBLIC_API_URL !== undefined && process.env.NEXT_PUBLIC_API_URL !== ""
    ? process.env.NEXT_PUBLIC_API_URL
    : typeof window !== "undefined"
      ? "/__api"
      : "http://127.0.0.1:4000";

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
const KEY_SESSION = "mh.session.ephemeral";
const ROLE_COOKIE = "mh_roles";

/** Align role-cookie lifetime with JWT access token (30d default). */
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;
const SESSION_SHORT_AGE_SEC = 60 * 60 * 12;

function writeRoleCookie(roles: string[], maxAgeSec = SESSION_MAX_AGE_SEC) {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(roles));
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ROLE_COOKIE}=${value}; Path=/; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
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

export function saveSession(session: Session, remember = true) {
  const raw = JSON.stringify(session);
  if (typeof window === "undefined") return;
  if (remember) {
    sessionStorage.removeItem(KEY_SESSION);
    localStorage.setItem(KEY, raw);
    writeRoleCookie(session.roles ?? [], SESSION_MAX_AGE_SEC);
  } else {
    localStorage.removeItem(KEY);
    sessionStorage.setItem(KEY_SESSION, raw);
    writeRoleCookie(session.roles ?? [], SESSION_SHORT_AGE_SEC);
  }
}

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY_SESSION);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    if (!session.accessToken || tokenExpired(session.accessToken)) {
      clearSession();
      return null;
    }
    const remember = Boolean(localStorage.getItem(KEY));
    writeRoleCookie(session.roles ?? [], remember ? SESSION_MAX_AGE_SEC : SESSION_SHORT_AGE_SEC);
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY_SESSION);
  clearRoleCookie();
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
  opts?: { skipAuthRedirect?: boolean },
): Promise<T> {
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
    if (res.status === 401 && !opts?.skipAuthRedirect) {
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

export async function fetchAuthenticatedBlob(path: string, token: string): Promise<{ blob: Blob; filename: string | null }> {
  const headers = new Headers();
  headers.set("authorization", `Bearer ${token}`);
  const base = API_URL.replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, { headers });
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
  const cd = res.headers.get("content-disposition");
  const filename = cd?.match(/filename\*?=(?:UTF-8''|")?([^\";]+)"?/i)?.[1] ?? null;
  return { blob: await res.blob(), filename: filename ? decodeURIComponent(filename) : null };
}

function triggerBlobDownload(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noreferrer";
  a.click();
}

export async function openAuthenticatedPdf(path: string, token: string, fallbackName: string, existingPreview?: Window | null) {
  if (path.startsWith("https://")) {
    existingPreview?.close();
    window.open(path, "_blank", "noopener,noreferrer");
    return;
  }
  const preview = existingPreview && !existingPreview.closed ? existingPreview : window.open("about:blank", "_blank");
  try {
    const { blob, filename } = await fetchAuthenticatedBlob(path, token);
    const url = URL.createObjectURL(blob);
    const name = filename || fallbackName;
    let opened = false;
    if (preview && !preview.closed) {
      try {
        preview.document.open();
        preview.document.write(
          `<!doctype html><html><head><title>${name.replace(/[<>&"]/g, "")}</title><style>html,body{margin:0;height:100%;background:#525659}</style></head><body><embed src="${url}" type="application/pdf" style="width:100%;height:100%;border:0" /></body></html>`,
        );
        preview.document.close();
        opened = true;
      } catch {
        try {
          preview.location.href = url;
          opened = true;
        } catch {
          preview.close();
        }
      }
    }
    if (!opened) triggerBlobDownload(url, name);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    preview?.close();
    throw err;
  }
}

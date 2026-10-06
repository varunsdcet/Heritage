import { isJitsiMeetUrl } from "./jitsiMeet.js";

/** In-app launcher; the web route resolves it to a BigBlueButton (or Jitsi fallback) join URL per user. */
export function liveClassUrl(sectionId: string) {
  return `/live/${sectionId}`;
}

export function isLiveClassUrl(url: string | null | undefined) {
  return Boolean(url && /^\/live\/[0-9a-zA-Z-]+$/.test(url.trim()));
}

/** Teacher-supplied external meeting link (Zoom, Teams, …), or null for platform rooms. */
export function externalJoinUrl(url: string | null | undefined) {
  const raw = url?.trim();
  if (!raw || !raw.startsWith("https://") || isJitsiMeetUrl(raw)) return null;
  return raw;
}

/** What clients should open for a section's online class. Legacy Jitsi links now route through the launcher. */
export function classJoinUrl(sectionId: string, stored?: string | null) {
  return externalJoinUrl(stored) || liveClassUrl(sectionId);
}

/** Same as `classJoinUrl`, but keeps sessions without any join link (in-person) link-free. */
export function sessionJoinUrl(sectionId: string, stored: string | null | undefined) {
  return stored?.trim() ? classJoinUrl(sectionId, stored) : null;
}

export function webPublicUrl(path = "") {
  const base = (process.env.WEB_PUBLIC_URL || "http://46.202.163.202:3000").replace(/\/+$/, "");
  return `${base}${path}`;
}

/** Absolute link for notification text, where relative in-app paths are not clickable. */
export function notificationJoinUrl(url: string | null | undefined) {
  if (!url) return null;
  return isLiveClassUrl(url) ? webPublicUrl(url) : url;
}

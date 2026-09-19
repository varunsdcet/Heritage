/** Shared Jitsi Meet room URLs — same room for instructor + enrolled students. */

export function jitsiMeetRoomSlug(courseCode: string, sectionCode: string) {
  const raw = `heritage-${courseCode}-${sectionCode}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return raw || "heritage-class";
}

export function jitsiMeetUrl(courseCode: string, sectionCode: string) {
  return `https://meet.jit.si/${jitsiMeetRoomSlug(courseCode, sectionCode)}`;
}

export function isJitsiMeetUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "meet.jit.si" || host.endsWith(".jit.si");
  } catch {
    return false;
  }
}

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

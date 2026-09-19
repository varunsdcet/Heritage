const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function formatClock(value: Date) {
  let hours = value.getHours();
  const minutes = value.getMinutes();
  const suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, "0")}${suffix}`;
}

export function instructorDisplayName(person: { givenName: string; familyName: string } | null | undefined) {
  if (!person) return null;
  const family = person.familyName?.trim();
  const given = person.givenName?.trim();
  if (family && given) return `${family}, ${given}`;
  return family || given || null;
}

export function roomFromSessions(sessions: Array<{ location: string | null }>) {
  const room = sessions.map((s) => s.location?.trim()).find((v) => v);
  return room || null;
}

export function deliveryFromSessions(sessions: Array<{ deliveryMode: string }>) {
  const mode = sessions[0]?.deliveryMode;
  if (!mode) return null;
  if (mode === "in_person") return "In person";
  if (mode === "online" || mode === "remote") return "Online";
  if (mode === "hybrid") return "Hybrid";
  return mode.replace(/_/g, " ");
}

export function scheduleTextFromSessions(
  sessions: Array<{ startsAt: Date; endsAt: Date | null }>,
): string | null {
  if (sessions.length === 0) return null;
  const byDay = new Map<number, string>();
  for (const session of sessions) {
    const day = session.startsAt.getDay();
    if (byDay.has(day)) continue;
    const start = formatClock(session.startsAt);
    const end = session.endsAt ? formatClock(session.endsAt) : null;
    byDay.set(day, end ? `${WEEKDAYS[day]}: ${start} - ${end}` : `${WEEKDAYS[day]}: ${start}`);
  }
  const lines = WEEKDAY_ORDER.map((d) => byDay.get(d)).filter(Boolean) as string[];
  return lines.length > 0 ? lines.join("\n") : null;
}

export function dateBoundsFromSessions(sessions: Array<{ startsAt: Date; endsAt: Date | null }>) {
  if (sessions.length === 0) return { startsOn: null as string | null, endsOn: null as string | null };
  const starts = sessions.map((s) => s.startsAt.getTime());
  const ends = sessions.map((s) => (s.endsAt ?? s.startsAt).getTime());
  const start = new Date(Math.min(...starts));
  const end = new Date(Math.max(...ends));
  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
  return { startsOn: toIsoDate(start), endsOn: toIsoDate(end) };
}

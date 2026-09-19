const MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."] as const;
const WEEKDAYS_SHORT = ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."] as const;

function parseDate(value: string) {
  const raw = value.includes("T") ? value : `${value}T12:00:00`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** HCC-style: "Aug. 4, 2026 (Tue.)" */
export function formatHccDate(value: string | null | undefined) {
  if (!value) return null;
  const d = parseDate(value);
  if (!d) return value;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} (${WEEKDAYS_SHORT[d.getDay()]})`;
}

/** HCC-style range without weekday: "Sep. 2, 2026 - Sep. 15, 2026" */
export function formatHccDateRange(startsOn: string | null | undefined, endsOn: string | null | undefined) {
  const start = startsOn ? parseDate(startsOn) : null;
  const end = endsOn ? parseDate(endsOn) : null;
  if (!start && !end) return null;
  const fmt = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  if (start && end) return `${fmt(start)} - ${fmt(end)}`;
  if (start) return fmt(start);
  return end ? fmt(end) : null;
}

export function statusLabel(enrolmentStatus: string) {
  if (enrolmentStatus === "enrolled") return "In Progress";
  if (enrolmentStatus === "completed") return "Completed";
  if (enrolmentStatus === "withdrawn") return "Withdrawn";
  return enrolmentStatus;
}

export function statusTone(enrolmentStatus: string) {
  if (enrolmentStatus === "enrolled") return "progress";
  if (enrolmentStatus === "completed") return "done";
  if (enrolmentStatus === "withdrawn") return "muted";
  return "muted";
}

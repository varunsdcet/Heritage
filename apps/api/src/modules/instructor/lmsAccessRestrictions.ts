export const LMS_ACCESS_RESTRICTIONS_KEY = "Access restrictions";

export type LmsAccessRule =
  | { type: "date"; operator: "from" | "until"; value: string }
  | { type: "student"; studentIds: string[] }
  | { type: "group"; groupIds: string[] };

export type LmsAccessRestrictions = {
  match: "all" | "any";
  rules: LmsAccessRule[];
};

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400, code: "VALIDATION_ERROR" });
}

function ids(value: unknown, label: string) {
  if (!Array.isArray(value)) throw badRequest(`${label} must be a list`);
  const out = [...new Set(value.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean))];
  if (!out.length) throw badRequest(`Select at least one ${label.toLowerCase()}`);
  if (out.length > 500 || out.some((id) => id.length > 120)) throw badRequest(`${label} selection is invalid`);
  return out;
}

/** Parses and canonicalizes rules received from the LMS editor. Empty input means unrestricted. */
export function parseLmsAccessRestrictions(value: unknown): LmsAccessRestrictions | null {
  const raw = typeof value === "string" ? value.trim() : value;
  if (!raw) return null;
  let input: unknown = raw;
  if (typeof raw === "string") {
    try {
      input = JSON.parse(raw);
    } catch {
      throw badRequest("Access restrictions are invalid. Remove and add the rules again.");
    }
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) throw badRequest("Access restrictions are invalid");
  const obj = input as { match?: unknown; rules?: unknown };
  if (!Array.isArray(obj.rules)) throw badRequest("Access restrictions are invalid");
  if (obj.rules.length === 0) return null;
  if (obj.rules.length > 25) throw badRequest("A maximum of 25 access restrictions is allowed");
  const rules: LmsAccessRule[] = obj.rules.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw badRequest(`Access restriction ${index + 1} is invalid`);
    const rule = row as Record<string, unknown>;
    if (rule.type === "date") {
      if (rule.operator !== "from" && rule.operator !== "until") throw badRequest(`Choose before or after for date restriction ${index + 1}`);
      const date = new Date(typeof rule.value === "string" ? rule.value : "");
      if (Number.isNaN(date.getTime())) throw badRequest(`Choose a valid date for restriction ${index + 1}`);
      return { type: "date", operator: rule.operator, value: date.toISOString() };
    }
    if (rule.type === "student") return { type: "student", studentIds: ids(rule.studentIds, "Students") };
    if (rule.type === "group") return { type: "group", groupIds: ids(rule.groupIds, "Groups") };
    throw badRequest(`Access restriction ${index + 1} has an unsupported type`);
  });
  return { match: obj.match === "any" ? "any" : "all", rules };
}

export function serializeLmsAccessRestrictions(value: unknown) {
  const parsed = parseLmsAccessRestrictions(value);
  return parsed ? JSON.stringify(parsed) : "";
}

/** Malformed stored rules fail closed so corrupt data can never expose restricted content. */
export function studentCanAccessLms(
  value: unknown,
  input: { studentId: string; groupIds?: Iterable<string>; now?: Date },
) {
  if (typeof value === "string" && !value.trim()) return true;
  if (value == null) return true;
  let restrictions: LmsAccessRestrictions | null;
  try {
    restrictions = parseLmsAccessRestrictions(value);
  } catch {
    return false;
  }
  if (!restrictions) return true;
  const now = (input.now ?? new Date()).getTime();
  const groupIds = new Set(input.groupIds ?? []);
  const results = restrictions.rules.map((rule) => {
    if (rule.type === "student") return rule.studentIds.includes(input.studentId);
    if (rule.type === "group") return rule.groupIds.some((id) => groupIds.has(id));
    const boundary = new Date(rule.value).getTime();
    return rule.operator === "from" ? now >= boundary : now < boundary;
  });
  return restrictions.match === "any" ? results.some(Boolean) : results.every(Boolean);
}

/** Applies both the containing topic rule and the activity rule for a linked workspace assignment. */
export function studentCanAccessLinkedAssignment(
  overlay: Record<string, unknown> | null | undefined,
  assignmentId: string,
  studentId: string,
  now?: Date,
) {
  if (!overlay) return true;
  const topicActivities = (overlay.topicActivities as Record<string, Array<Record<string, unknown>>> | undefined) || {};
  let topicId = "";
  let activity: Record<string, unknown> | undefined;
  for (const [candidateTopicId, rows] of Object.entries(topicActivities)) {
    const found = (rows || []).find((row) => row.assignmentId === assignmentId);
    if (found) {
      topicId = candidateTopicId;
      activity = found;
      break;
    }
  }
  if (!activity) return true;
  const edit = ((overlay.activityEdits as Record<string, Record<string, unknown>> | undefined) || {})[String(activity.id || "")];
  const merged = { ...activity, ...(edit || {}) };
  const groupMembers = (overlay.groupMembers as Record<string, Array<{ id?: string }>> | undefined) || {};
  const groupIds = Object.entries(groupMembers)
    .filter(([, members]) => (members || []).some((member) => member.id === studentId))
    .map(([groupId]) => groupId);
  const context = { studentId, groupIds, now };
  const topicRestrictions = ((overlay.topicRestrictions as Record<string, string> | undefined) || {})[topicId];
  if (!studentCanAccessLms(topicRestrictions, context)) return false;
  const settings = merged.settings && typeof merged.settings === "object" ? (merged.settings as Record<string, unknown>) : {};
  return studentCanAccessLms(settings[LMS_ACCESS_RESTRICTIONS_KEY], context);
}

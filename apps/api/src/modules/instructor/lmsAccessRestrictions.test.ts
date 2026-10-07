import { describe, expect, it } from "vitest";
import {
  LMS_ACCESS_RESTRICTIONS_KEY,
  parseLmsAccessRestrictions,
  serializeLmsAccessRestrictions,
  studentCanAccessLinkedAssignment,
  studentCanAccessLms,
} from "./lmsAccessRestrictions.js";

const studentA = "90000000-0000-4000-8000-000000000001";
const studentB = "90000000-0000-4000-8000-000000000002";

describe("LMS access restrictions", () => {
  it("canonicalizes valid date and student rules", () => {
    const value = serializeLmsAccessRestrictions({
      match: "all",
      rules: [
        { type: "date", operator: "from", value: "2026-10-07T10:00:00+05:30" },
        { type: "student", studentIds: [studentA, studentA] },
      ],
    });
    expect(parseLmsAccessRestrictions(value)).toEqual({
      match: "all",
      rules: [
        { type: "date", operator: "from", value: "2026-10-07T04:30:00.000Z" },
        { type: "student", studentIds: [studentA] },
      ],
    });
  });

  it("enforces all/any, date, student and group rules", () => {
    const all = JSON.stringify({
      match: "all",
      rules: [
        { type: "date", operator: "from", value: "2026-10-01T00:00:00.000Z" },
        { type: "student", studentIds: [studentA] },
        { type: "group", groupIds: ["group-a"] },
      ],
    });
    expect(studentCanAccessLms(all, { studentId: studentA, groupIds: ["group-a"], now: new Date("2026-10-07T00:00:00Z") })).toBe(true);
    expect(studentCanAccessLms(all, { studentId: studentB, groupIds: ["group-a"], now: new Date("2026-10-07T00:00:00Z") })).toBe(false);

    const any = JSON.stringify({ match: "any", rules: [{ type: "student", studentIds: [studentA] }, { type: "group", groupIds: ["group-b"] }] });
    expect(studentCanAccessLms(any, { studentId: studentB, groupIds: ["group-b"] })).toBe(true);
  });

  it("fails closed for malformed stored rules", () => {
    expect(studentCanAccessLms("not-json", { studentId: studentA })).toBe(false);
    expect(() => parseLmsAccessRestrictions(JSON.stringify({ match: "all", rules: [{ type: "student", studentIds: [] }] }))).toThrow(/Select at least one/);
  });

  it("enforces topic and activity rules for linked assignments", () => {
    const allowA = JSON.stringify({ match: "all", rules: [{ type: "student", studentIds: [studentA] }] });
    const overlay = {
      topicRestrictions: { "topic-1": allowA },
      topicActivities: {
        "topic-1": [
          { id: "act-1", assignmentId: "assignment-1", settings: { [LMS_ACCESS_RESTRICTIONS_KEY]: allowA } },
        ],
      },
    };
    expect(studentCanAccessLinkedAssignment(overlay, "assignment-1", studentA)).toBe(true);
    expect(studentCanAccessLinkedAssignment(overlay, "assignment-1", studentB)).toBe(false);
    expect(studentCanAccessLinkedAssignment(overlay, "unlinked", studentB)).toBe(true);
  });
});

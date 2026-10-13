import { describe, expect, it, vi } from "vitest";

vi.mock("@myheritage/db", () => ({ prisma: {} }));

import { meetingsFromWeekly } from "./programs.sections.js";
import { ENTITIES } from "./programs.spec.js";
import { defaultRateCategory } from "./students.js";

describe("program session timetable", () => {
  it("turns the master-schedule weekly grid into section meetings, skipping days without both times", () => {
    expect(meetingsFromWeekly({ Wednesday: { start: "13:00", end: "15:00" }, Monday: { start: "09:00", end: "12:00" }, Friday: { start: "09:00", end: "" } })).toEqual([
      { day: "Monday", start: "09:00", end: "12:00" },
      { day: "Wednesday", start: "13:00", end: "15:00" },
    ]);
    expect(meetingsFromWeekly(null)).toEqual([]);
  });

  it("offers independent morning, afternoon and evening batch periods", () => {
    const field = ENTITIES.sessions.fields.find((item) => item.key === "classPeriod");
    expect(field?.options).toEqual(["Morning", "Afternoon", "Evening", "Flexible"]);
  });

  it("offers multi-faculty assignment while creating or editing a program", () => {
    const field = ENTITIES.programs.fields.find((item) => item.key === "instructors");
    expect(field).toMatchObject({ label: "Faculty Members (Multiple Select)", kind: "people", dflt: [], section: "Program Chair & Lead Accesses" });
  });
});

describe("rate category default", () => {
  it("defaults Rate Category / Fee Status from residency", () => {
    expect(defaultRateCategory({ residency: "international" })).toBe("International");
    expect(defaultRateCategory({ residency: "Domestic" })).toBe("Domestic");
    expect(defaultRateCategory({})).toBe("");
  });
});

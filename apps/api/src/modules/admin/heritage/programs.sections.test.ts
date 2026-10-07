import { describe, expect, it, vi } from "vitest";

vi.mock("@myheritage/db", () => ({ prisma: {} }));

import { meetingsFromWeekly } from "./programs.sections.js";
import { defaultRateCategory } from "./students.js";

describe("program session timetable", () => {
  it("turns the master-schedule weekly grid into section meetings, skipping days without both times", () => {
    expect(meetingsFromWeekly({ Wednesday: { start: "13:00", end: "15:00" }, Monday: { start: "09:00", end: "12:00" }, Friday: { start: "09:00", end: "" } })).toEqual([
      { day: "Monday", start: "09:00", end: "12:00" },
      { day: "Wednesday", start: "13:00", end: "15:00" },
    ]);
    expect(meetingsFromWeekly(null)).toEqual([]);
  });
});

describe("rate category default", () => {
  it("defaults Rate Category / Fee Status from residency", () => {
    expect(defaultRateCategory({ residency: "international" })).toBe("International");
    expect(defaultRateCategory({ residency: "Domestic" })).toBe("Domestic");
    expect(defaultRateCategory({})).toBe("");
  });
});

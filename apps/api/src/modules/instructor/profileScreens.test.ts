import { describe, expect, it, vi } from "vitest";

vi.mock("@myheritage/db", () => ({ prisma: {} }));

import { availabilityDefaultDates, buildAddAvailabilityForm, validateAvailabilityWindow } from "./profileScreens.js";

describe("Add Availability defaults", () => {
  it("starts from today and a week later instead of fixed past dates", () => {
    const now = new Date(2026, 9, 7, 9, 30);
    expect(availabilityDefaultDates(now)).toEqual({ date: "2026-10-07", endDate: "2026-10-14" });
    const fields = buildAddAvailabilityForm("", now).groups[0]!.fields;
    expect(fields.find((f) => f.label === "Date")?.value).toBe("2026-10-07");
    expect(fields.find((f) => f.label === "End Date")?.value).toBe("2026-10-14");
  });

  it("rolls over month ends", () => {
    expect(availabilityDefaultDates(new Date(2026, 11, 28, 12))).toEqual({ date: "2026-12-28", endDate: "2027-01-04" });
  });
});

describe("validateAvailabilityWindow", () => {
  const ok = { start: "09:00", end: "10:00", date: "2026-10-07", endDate: "2026-10-14" };

  it("accepts a valid slot", () => {
    expect(() => validateAvailabilityWindow(ok)).not.toThrow();
    expect(() => validateAvailabilityWindow({ ...ok, endDate: "" })).not.toThrow();
  });

  it("rejects bad dates, inverted times and a recurrence ending before it starts", () => {
    for (const input of [
      { ...ok, date: "" },
      { ...ok, date: "07/10/2026" },
      { ...ok, end: "09:00" },
      { ...ok, start: "25:00" },
      { ...ok, endDate: "2026-10-01" },
    ]) {
      expect(() => validateAvailabilityWindow(input)).toThrow(expect.objectContaining({ status: 400, code: "VALIDATION_ERROR" }));
    }
  });
});

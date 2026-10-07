import { describe, expect, it, vi } from "vitest";

vi.mock("@myheritage/db", () => ({ prisma: {} }));

import type { Offering } from "../courses/sectionOffering.js";
import { sectionRunFacts } from "./myCoursesFacts.js";

const tz = "America/Vancouver";
const term = { startsOn: "2026-09-01", endsOn: "2026-12-20" };

function offering(patch: Partial<Offering>): Offering {
  return {
    startsOn: null,
    endsOn: null,
    continuous: false,
    meetings: [],
    scheduleText: null,
    campus: null,
    room: null,
    location: null,
    deliveryMethod: null,
    deliveryMode: "in_person",
    ...patch,
  };
}

const sessions = [
  { startsAt: new Date("2026-09-09T16:00:00Z"), endsAt: new Date("2026-09-09T17:30:00Z"), deliveryMode: "in_person" },
  { startsAt: new Date("2026-09-16T16:00:00Z"), endsAt: new Date("2026-09-16T17:30:00Z"), deliveryMode: "in_person" },
];

describe("sectionRunFacts", () => {
  it("uses the offering's start/end dates and delivery over class sessions", () => {
    const facts = sectionRunFacts(
      { term, academicBlock: null, classSessions: sessions },
      offering({ startsOn: "2026-09-08", endsOn: "2026-12-15", deliveryMethod: "Online", deliveryMode: "online" }),
      tz,
      "2026-10-07",
    );
    expect(facts).toEqual({ startsOn: "2026-09-08", endsOn: "2026-12-15", delivery: "Online", timing: "current" });
  });

  it("falls back to the first and last class session dates", () => {
    const facts = sectionRunFacts({ term: null, academicBlock: null, classSessions: sessions }, undefined, tz, "2026-10-07");
    expect(facts).toMatchObject({ startsOn: "2026-09-09", endsOn: "2026-09-16", delivery: "In person", timing: "ended" });
  });

  it("is upcoming before the section starts, even inside the latest term", () => {
    const facts = sectionRunFacts(
      { term, academicBlock: null, classSessions: [] },
      offering({ startsOn: "2027-01-11", endsOn: "2027-04-20" }),
      tz,
      "2026-10-07",
    );
    expect(facts.timing).toBe("upcoming");
  });

  it("keeps a continuous offering open-ended", () => {
    const facts = sectionRunFacts(
      { term, academicBlock: null, classSessions: [] },
      offering({ startsOn: "2026-09-08", continuous: true }),
      tz,
      "2027-02-01",
    );
    expect(facts).toMatchObject({ startsOn: "2026-09-08", endsOn: null, timing: "current" });
  });

  it("has no timing when nothing dates the section", () => {
    expect(sectionRunFacts({ term: null, academicBlock: null, classSessions: [] }, undefined, tz, "2026-10-07").timing).toBeNull();
  });
});

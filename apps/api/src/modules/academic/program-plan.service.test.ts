import { describe, expect, it, vi } from "vitest";

vi.mock("@myheritage/db", () => ({ prisma: {} }));

import { creditWeighted, hasFinalMark, summarizeCourses, weightedPercent } from "./program-plan.service.js";

const row = (over: Partial<Parameters<typeof summarizeCourses>[0][number]>) => ({
  status: "enrolled",
  final: true,
  credits: 3,
  letter: "B",
  averagePercent: 75,
  gradePoints: 3,
  countsTowardCgpa: true,
  ...over,
});

describe("course percent", () => {
  it("weights published marks by assessment weight, like the instructor gradebook", () => {
    expect(weightedPercent([{ score: 88, maxScore: 100, weightPercent: 30 }, { score: 50, maxScore: 100, weightPercent: 70 }])).toBe(61.4);
    expect(weightedPercent([{ score: 8, maxScore: 10, weightPercent: 0 }, { score: 6, maxScore: 10, weightPercent: 0 }])).toBe(70);
    expect(weightedPercent([{ score: null, maxScore: 100, weightPercent: 40 }])).toBeNull();
  });

  it("credit-weights course values", () => {
    expect(creditWeighted([{ credits: 3, value: 4 }, { credits: 1, value: 2 }])).toBe(3.5);
    expect(creditWeighted([])).toBeNull();
  });
});

describe("final marks", () => {
  it("treats an enrolled course as final only after it has ended with published marks", () => {
    expect(hasFinalMark({ status: "enrolled", endsOn: "2026-09-30", averagePercent: 80 }, "2026-10-07")).toBe(true);
    expect(hasFinalMark({ status: "enrolled", endsOn: "2026-12-18", averagePercent: 80 }, "2026-10-07")).toBe(false);
    expect(hasFinalMark({ status: "enrolled", endsOn: "2026-09-30", averagePercent: null }, "2026-10-07")).toBe(false);
    expect(hasFinalMark({ status: "completed", endsOn: null, averagePercent: null }, "2026-10-07")).toBe(true);
  });

  it("keeps in-progress, withdrawn and failed courses out of earned credits and CGPA", () => {
    const totals = summarizeCourses([
      row({ credits: 3, gradePoints: 4, averagePercent: 90, letter: "A" }),
      row({ credits: 1, gradePoints: 2, averagePercent: 65, letter: "C" }),
      row({ credits: 3, gradePoints: 0, averagePercent: 40, letter: "F" }),
      row({ status: "enrolled", final: false, credits: 3, letter: "IP", gradePoints: null, averagePercent: 82 }),
      row({ status: "withdrawn", final: false, credits: 3, letter: "W", gradePoints: null, averagePercent: null }),
    ]);
    expect(totals.earnedCredits).toBe(4);
    expect(totals.attemptedCredits).toBe(10);
    expect(totals.cgpa).toBe(Number(((3 * 4 + 1 * 2 + 0) / 7).toFixed(2)));
    expect(totals.averagePercent).toBe(Number(((3 * 90 + 65 + 3 * 40) / 7).toFixed(2)));
    expect(totals.currentAverage).toBe(82);
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("@myheritage/db", () => ({ prisma: {} }));

import { courseStanding } from "./degree-progress.service.js";

const row = (over: Partial<Parameters<typeof courseStanding>[0][number]>) => ({
  courseCode: "HCA101",
  credits: 3,
  status: "enrolled",
  final: false,
  letter: "IP",
  gradePoints: null as number | null,
  countsTowardCgpa: true,
  ...over,
});

describe("courseStanding", () => {
  it("satisfies a course only with a final, passing mark", () => {
    const standing = courseStanding([
      row({ courseCode: "HCA101", final: true, letter: "A", gradePoints: 4 }),
      row({ courseCode: "HCA102", credits: 4 }),
      row({ courseCode: "HCA103", final: true, letter: "F", gradePoints: 0 }),
      row({ courseCode: "HCA104", status: "withdrawn", letter: "W" }),
    ]);
    expect(standing.get("HCA101")).toEqual({ credits: 3, status: "satisfied" });
    expect(standing.get("HCA102")).toEqual({ credits: 4, status: "in_progress" });
    expect(standing.has("HCA103")).toBe(false);
    expect(standing.has("HCA104")).toBe(false);
  });

  it("keeps an earlier pass satisfied while a retake is in progress, and honours what-if drops", () => {
    const rows = [row({ final: true, letter: "B", gradePoints: 3 }), row({ letter: "IP" })];
    expect(courseStanding(rows).get("HCA101")?.status).toBe("satisfied");
    expect(courseStanding(rows, new Set(["HCA101"])).has("HCA101")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { citeOrRefuse, groundedCoachAnswer } from "./index.js";

describe("ai gateway", () => {
  it("refuses without sources", () => {
    expect(() => citeOrRefuse({ text: "hello", sources: [] })).toThrow(/citations/);
  });

  it("returns cited answer", () => {
    const ans = citeOrRefuse({
      text: "Your midterm was 88/100.",
      sources: [{ id: "g1", title: "GradeItem Midterm" }],
    });
    expect(ans.sources).toHaveLength(1);
  });

  it("answers a deadline question only from supplied facts", () => {
    const result = groundedCoachAnswer({
      role: "student",
      question: "What should I focus on today?",
      facts: [
        {
          id: "assignment:a1",
          title: "CS301 - Project 1",
          uri: "/student/assignments/a1",
          text: "Project 1 is due September 20.",
          kind: "assignment",
        },
        {
          id: "grade:g1",
          title: "Published grade",
          uri: "/student/grades",
          text: "Midterm is 88/100.",
          kind: "grade",
        },
      ],
    });
    expect(result.text).toContain("Project 1");
    expect(result.text).not.toContain("Midterm");
    expect(result.sources).toEqual([
      expect.objectContaining({ id: "assignment:a1" }),
    ]);
  });
});

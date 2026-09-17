import { describe, expect, it } from "vitest";
import {
  citeOrRefuse,
  groundedCoachAnswer,
  isAdvisorQuestion,
  extractDropCourseCode,
  advisorAnswerFromProgress,
} from "./index.js";

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
    expect(result.sources).toEqual([expect.objectContaining({ id: "assignment:a1" })]);
  });

  it("detects advisor intents and drop codes", () => {
    expect(isAdvisorQuestion("Can I graduate next summer?")).toBe(true);
    expect(isAdvisorQuestion("What happens if I drop MATH210?")).toBe(true);
    expect(isAdvisorQuestion("What should I focus on today?")).toBe(false);
    expect(extractDropCourseCode("What happens if I drop MATH 210?")).toBe("MATH210");
  });

  it("builds a cited advisor answer from progress evidence", () => {
    const result = advisorAnswerFromProgress({
      question: "Can I graduate next summer?",
      progress: {
        programName: "Computer Science",
        programVersionLabel: "2024.1",
        remainingCredits: 21,
        completedCredits: 6,
        requiredCredits: 27,
        projectedCompletionTerm: "Summer 2027",
        remainingRequirements: [
          {
            code: "MATH210",
            title: "Discrete Math",
            credits: 3,
            status: "missing",
            blockedByCourseCodes: [],
          },
        ],
        prerequisiteConflicts: [],
        prerequisiteGraph: [],
        warnings: [],
        suggestedOptions: ["Take MATH210 next term."],
        evidence: [{ id: "programVersion:1", title: "CS 2024.1", uri: "/student/degree" }],
        claims: [{ kind: "fact", text: "21 credits remain.", evidenceIds: ["programVersion:1"] }],
      },
    });
    expect(result.text).toContain("21");
    expect(result.sources[0]?.id).toBe("programVersion:1");
  });
});

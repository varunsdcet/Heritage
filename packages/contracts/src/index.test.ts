import { describe, expect, it } from "vitest";
import {
  ErrorEnvelope,
  GradeItem,
  LoginRequest,
  MAX_STUDENT_FILE_BYTES,
  RequestStudentProfileChange,
  StudentCalendarEvent,
  StudentModuleId,
  UploadStudentSubmissionFileRequest,
  AskCoachRequest,
  CoachAnswer,
} from "./index.js";

describe("contracts", () => {
  it("parses login request", () => {
    const parsed = LoginRequest.parse({
      email: "marcus.vance@heritage.edu",
      password: "Heritage!2026",
      deviceFingerprint: "device-fingerprint-1",
    });
    expect(parsed.email).toContain("marcus");
  });

  it("rejects draft exposure shape without status", () => {
    expect(() =>
      GradeItem.parse({
        id: "00000000-0000-4000-8000-000000000001",
        institutionId: "00000000-0000-4000-8000-000000000002",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        rowVersion: 1,
        assignmentId: "00000000-0000-4000-8000-000000000003",
        studentId: "00000000-0000-4000-8000-000000000004",
        enrolmentId: "00000000-0000-4000-8000-000000000005",
        score: 90,
        maxScore: 100,
        letter: "A",
        status: "published",
        publishedAt: "2026-01-02T00:00:00.000Z",
      }),
    ).not.toThrow();
  });

  it("validates error envelope", () => {
    const err = ErrorEnvelope.parse({
      error: { code: "UNAUTHORIZED", message: "No session", correlationId: "c1" },
    });
    expect(err.error.code).toBe("UNAUTHORIZED");
  });

  it("registers every student module", () => {
    expect(StudentModuleId.options).toHaveLength(22);
    expect(StudentModuleId.parse("ST-22")).toBe("ST-22");
  });

  it("rejects oversized student submission files", () => {
    expect(() =>
      UploadStudentSubmissionFileRequest.parse({
        filename: "project.pdf",
        mimeType: "application/pdf",
        sizeBytes: MAX_STUDENT_FILE_BYTES + 1,
        contentBase64: "JVBERi0xLjQ=",
      }),
    ).toThrow();
  });

  it("requires an official field in a profile change request", () => {
    expect(() =>
      RequestStudentProfileChange.parse({
        reason: "Please change the details on my student record.",
      }),
    ).toThrow();
  });

  it("allows only HTTPS student join links", () => {
    expect(() =>
      StudentCalendarEvent.parse({
        id: "class-1",
        kind: "class",
        sectionId: "00000000-0000-4000-8000-000000000001",
        title: "Clinical Practice",
        startsAt: "2026-01-01T17:00:00.000Z",
        endsAt: "2026-01-01T18:00:00.000Z",
        location: "Online",
        joinUrl: "http://unsafe.example.test/class",
      }),
    ).toThrow();
  });

  it("validates a cited read-only Coach answer", () => {
    const request = AskCoachRequest.parse({
      question: "What should I focus on today?",
      contextPath: "/student",
      capability: "campus_coach",
    });
    expect(request.question).toContain("today");
    expect(() =>
      CoachAnswer.parse({
        interactionId: "00000000-0000-4000-8000-000000000010",
        role: "student",
        tier: "read_only",
        capability: "campus_coach",
        answer: "Project 1 is your next assignment.",
        sources: [
          {
            id: "assignment:00000000-0000-4000-8000-000000000011",
            title: "CS301 - Project 1",
            uri: "/student/assignments/00000000-0000-4000-8000-000000000011",
          },
        ],
        suggestedActions: [{ label: "Open assignments", href: "/student/assignments" }],
        claims: [],
        createdAt: "2026-09-15T20:00:00.000Z",
      }),
    ).not.toThrow();
  });

  it("parses degree plan analysis shape", async () => {
    const { DegreePlanAnalysis, AiCapabilityId } = await import("./index.js");
    expect(AiCapabilityId.parse("student_advisor")).toBe("student_advisor");
    expect(() =>
      DegreePlanAnalysis.parse({
        studentId: "00000000-0000-4000-8000-000000000001",
        programCode: "CS-DIP",
        programName: "Computer Science",
        programVersionLabel: "2024.1",
        remainingCredits: 21,
        completedCredits: 6,
        requiredCredits: 27,
        remainingRequirements: [],
        satisfiedRequirements: [],
        prerequisiteConflicts: [],
        prerequisiteGraph: [],
        projectedCompletionTerm: "Summer 2027",
        warnings: [],
        suggestedOptions: [],
        evidence: [{ id: "programVersion:1", title: "CS", uri: "/student/degree" }],
        claims: [],
      }),
    ).not.toThrow();
  });
});

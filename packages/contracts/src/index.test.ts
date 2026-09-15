import { describe, expect, it } from "vitest";
import { LoginRequest, GradeItem, ErrorEnvelope } from "./index.js";

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
});

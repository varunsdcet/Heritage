import { describe, expect, it } from "vitest";
import { REGISTERED_ROUTES } from "./openapi.js";

describe("api openapi", () => {
  it("registers proof-slice routes", () => {
    expect(REGISTERED_ROUTES).toContain("/grades/me");
    expect(REGISTERED_ROUTES).toContain("/approvals");
    expect(REGISTERED_ROUTES).toContain("/student/assignments/{assignmentId}/files");
    expect(REGISTERED_ROUTES).toContain("/notifications/me/{notificationId}/read");
  });
});

import { REGISTERED_ROUTES, openApiDocument } from "./openapi.js";

const runtimeRoutes = [
  "/auth/login",
  "/me/home",
  "/me/profile",
  "/me/preferences",
  "/me/profile-change-requests",
  "/courses/me",
  "/notifications/me",
  "/notifications/me/{notificationId}/read",
  "/calendar/me",
  "/grades/me",
  "/gradebooks/{sectionId}",
  "/grade-items/{id}",
  "/gradebooks/{sectionId}/publish",
  "/approvals",
  "/approvals/{id}/decide",
  "/approvals/{id}/apply",
  "/messages/ask-grade",
  "/student/assignments",
  "/student/assignments/{assignmentId}",
  "/student/assignments/{assignmentId}/files",
  "/student/submission-files/{fileId}",
  "/student/assignments/{assignmentId}/submit",
  "/student/degree-progress",
  "/student/degree-scenarios",
  "/search",
  "/ai/ask",
  "/ai/history",
  "/auth/forgot-password",
  "/auth/reset-password",
];

const missing = runtimeRoutes.filter((r) => !REGISTERED_ROUTES.includes(r));
if (missing.length) {
  console.error("OpenAPI missing routes:", missing);
  process.exit(1);
}
console.log("OpenAPI check OK:", Object.keys(openApiDocument.paths).length, "paths");

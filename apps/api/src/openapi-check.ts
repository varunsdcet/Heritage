import { REGISTERED_ROUTES, openApiDocument } from "./openapi.js";

const runtimeRoutes = [
  "/auth/login",
  "/me/home",
  "/courses/me",
  "/notifications/me",
  "/calendar/me",
  "/grades/me",
  "/gradebooks/{sectionId}",
  "/grade-items/{id}",
  "/gradebooks/{sectionId}/publish",
  "/approvals",
  "/approvals/{id}/decide",
  "/approvals/{id}/apply",
  "/messages/ask-grade",
  "/search",
];

const missing = runtimeRoutes.filter((r) => !REGISTERED_ROUTES.includes(r));
if (missing.length) {
  console.error("OpenAPI missing routes:", missing);
  process.exit(1);
}
console.log("OpenAPI check OK:", Object.keys(openApiDocument.paths).length, "paths");

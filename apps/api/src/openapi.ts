export const openApiDocument = {
  openapi: "3.0.3",
  info: { title: "MyHeritage API", version: "0.1.0" },
  paths: {
    "/auth/login": { post: { summary: "Password login", security: [], "x-idempotent": false } },
    "/me/home": { get: { summary: "Role-aware home feed", security: [{ bearer: [] }] } },
    "/courses/me": { get: { summary: "Courses for current user", security: [{ bearer: [] }] } },
    "/notifications/me": { get: { summary: "Notifications inbox", security: [{ bearer: [] }] } },
    "/calendar/me": { get: { summary: "Calendar events", security: [{ bearer: [] }] } },
    "/grades/me": { get: { summary: "Student published grades", security: [{ bearer: [] }] } },
    "/gradebooks/{sectionId}": { get: { summary: "Instructor gradebook", security: [{ bearer: [] }] } },
    "/grade-items/{id}": { patch: { summary: "Upsert draft grade", security: [{ bearer: [] }], "x-concurrency": "row_version" } },
    "/gradebooks/{sectionId}/publish": {
      post: { summary: "Request grade publish via approval", security: [{ bearer: [] }], "x-idempotent": true },
    },
    "/approvals": { get: { summary: "Approval inbox", security: [{ bearer: [] }] } },
    "/approvals/{id}/decide": { post: { summary: "Decide approval", security: [{ bearer: [] }] } },
    "/approvals/{id}/apply": { post: { summary: "Apply approved publish", security: [{ bearer: [] }] } },
    "/messages/ask-grade": { post: { summary: "Ask about a grade", security: [{ bearer: [] }] } },
    "/search": { get: { summary: "Command-K search", security: [{ bearer: [] }] } },
  },
  components: {
    securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
  },
};

export const REGISTERED_ROUTES = Object.keys(openApiDocument.paths);

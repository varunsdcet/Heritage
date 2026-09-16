export const openApiDocument = {
  openapi: "3.0.3",
  info: { title: "MyHeritage API", version: "0.1.0" },
  paths: {
    "/auth/login": { post: { summary: "Password login", security: [], "x-idempotent": false } },
    "/auth/forgot-password": { post: { summary: "Request password reset email", security: [], "x-idempotent": false } },
    "/auth/reset-password": { post: { summary: "Reset password with token", security: [], "x-idempotent": false } },
    "/me/home": { get: { summary: "Role-aware home feed", security: [{ bearer: [] }] } },
    "/me/profile": { get: { summary: "Student profile", security: [{ bearer: [] }] } },
    "/me/preferences": { patch: { summary: "Update student preferences", security: [{ bearer: [] }] } },
    "/me/profile-change-requests": {
      post: { summary: "Request an official profile change", security: [{ bearer: [] }] },
    },
    "/courses/me": { get: { summary: "Courses for current user", security: [{ bearer: [] }] } },
    "/notifications/me": { get: { summary: "Notifications inbox", security: [{ bearer: [] }] } },
    "/notifications/me/{notificationId}/read": {
      patch: { summary: "Mark own notification read", security: [{ bearer: [] }], "x-idempotent": true },
    },
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
    "/student/assignments": {
      get: { summary: "Student assignment list", security: [{ bearer: [] }] },
    },
    "/student/assignments/{assignmentId}": {
      get: { summary: "Student assignment detail", security: [{ bearer: [] }] },
    },
    "/student/assignments/{assignmentId}/files": {
      post: { summary: "Upload a student submission file", security: [{ bearer: [] }] },
    },
    "/student/submission-files/{fileId}": {
      delete: { summary: "Archive a student submission file", security: [{ bearer: [] }] },
    },
    "/student/assignments/{assignmentId}/submit": {
      post: { summary: "Submit a student assignment", security: [{ bearer: [] }], "x-idempotent": true },
    },
    "/search": { get: { summary: "Command-K search", security: [{ bearer: [] }] } },
    "/ai/ask": {
      post: { summary: "Ask the grounded role-aware Campus Coach", security: [{ bearer: [] }], "x-idempotent": true },
    },
    "/ai/history": {
      get: { summary: "Current account Coach history", security: [{ bearer: [] }] },
    },
  },
  components: {
    securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
  },
};

export const REGISTERED_ROUTES = Object.keys(openApiDocument.paths);

import express, { type Express } from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { authRouter } from "./modules/auth/auth.router.js";
import { gradesRouter } from "./modules/grades/grades.router.js";
import { approvalsRouter } from "./modules/approvals/approvals.router.js";
import { messagesRouter } from "./modules/messages/messages.router.js";
import { searchRouter } from "./modules/search/search.router.js";
import { meRouter } from "./modules/me/me.router.js";
import { coursesRouter } from "./modules/courses/courses.router.js";
import { notificationsRouter } from "./modules/notifications/notifications.router.js";
import { calendarRouter } from "./modules/calendar/calendar.router.js";
import { openApiDocument } from "./openapi.js";
import { catalogRouter } from "./modules/catalog/catalog.router.js";
import { portalRouter } from "./modules/portal/portal.router.js";
import { adminRouter } from "./modules/admin/admin.router.js";
import { instructorRouter } from "./modules/instructor/instructor.router.js";
import { errorHandler } from "./middleware/error-handler.js";

const app: Express = express();
const allowedOrigins = (process.env.WEB_ORIGIN ??
  "http://localhost:3000,http://46.202.163.202:3000,http://46.202.163.202,http://46.202.163.202:80")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin tools / server-to-server (no Origin) and listed browser origins
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        cb(null, true);
        return;
      }
      // Reflect any heritage host during launch
      if (origin.includes("46.202.163.202") || origin.includes("localhost")) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use((req, _res, next) => {
  (req as express.Request & { correlationId: string }).correlationId =
    (req.header("x-correlation-id") as string) || randomUUID();
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "myheritage-api" }));
app.get("/api/openapi.json", (_req, res) => res.json(openApiDocument));
app.get("/api/docs", (_req, res) => {
  res.type("html").send(`<!doctype html><html><body style="font-family:sans-serif;padding:2rem">
  <h1>MyHeritage API</h1>
  <p>OpenAPI JSON: <a href="/api/openapi.json">/api/openapi.json</a></p>
  <ul>
    <li>POST /auth/login</li>
    <li>GET /me/home</li>
    <li>GET /courses/me</li>
    <li>GET /notifications/me</li>
    <li>GET /calendar/me</li>
    <li>GET /grades/me</li>
    <li>GET /gradebooks/:sectionId</li>
    <li>PATCH /grade-items/:id</li>
    <li>POST /gradebooks/:sectionId/publish</li>
    <li>GET /approvals</li>
    <li>POST /approvals/:id/decide</li>
    <li>POST /approvals/:id/apply</li>
    <li>POST /messages/ask-grade</li>
    <li>GET /search</li>
    <li>GET /portal/view?path=</li>
    <li>GET /portal/bootstrap</li>
    <li>GET /admin/users</li>
    <li>POST /admin/users</li>
    <li>GET /admin/sections</li>
    <li>POST /admin/sections</li>
    <li>POST /admin/enrolments</li>
    <li>POST /admin/assignments</li>
    <li>GET /admin/sis/screen?path=</li>
    <li>POST /admin/sis/action</li>
    <li>POST /admin/sis/seed</li>
    <li>GET /instructor/sis/bootstrap</li>
    <li>GET /instructor/sis/screen?path=</li>
    <li>POST /instructor/sis/action</li>
    <li>GET /public/verify</li>
  </ul></body></html>`);
});

app.use("/auth", authRouter);
app.use("/me", meRouter);
app.use("/instructor", instructorRouter);
app.use("/courses", coursesRouter);
app.use("/notifications", notificationsRouter);
app.use("/calendar", calendarRouter);
app.use("/grades", gradesRouter);
app.use("/gradebooks", gradesRouter);
app.use("/grade-items", gradesRouter);
app.use("/approvals", approvalsRouter);
app.use("/messages", messagesRouter);
app.use("/search", searchRouter);
app.use("/catalog", catalogRouter);
app.use("/portal", portalRouter);
app.use("/admin", adminRouter);

app.get("/public/verify", async (req, res, next) => {
  try {
    const q = String(req.query.studentNumber ?? req.query.q ?? "")
      .trim()
      .toUpperCase();
    if (!q) {
      res.status(400).json({ match: false, error: { message: "studentNumber required" } });
      return;
    }
    const { prisma } = await import("@myheritage/db");
    const hit = await prisma.student.findFirst({
      where: {
        OR: [
          { studentNumber: { equals: q, mode: "insensitive" } },
          { person: { email: { contains: q.toLowerCase(), mode: "insensitive" } } },
        ],
      },
      select: { id: true },
    });
    res.json({ match: Boolean(hit) });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

const port = Number(process.env.API_PORT ?? 4000);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`MyHeritage API listening on http://localhost:${port}`);
  });
}

export { app };

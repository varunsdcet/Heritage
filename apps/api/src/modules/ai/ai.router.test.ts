import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express, { type NextFunction, type Request, type Response } from "express";
import { CoachAnswer, type SessionClaims } from "@myheritage/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const claims = vi.hoisted(
  () =>
    ({
      sub: "00000000-0000-4000-8000-000000000001",
      accountId: "00000000-0000-4000-8000-000000000002",
      personId: "00000000-0000-4000-8000-000000000003",
      institutionId: "00000000-0000-4000-8000-000000000004",
      roles: ["student"],
      sessionId: "00000000-0000-4000-8000-000000000005",
    }) satisfies SessionClaims,
);

const tx = vi.hoisted(() => ({
  idempotencyKey: { create: vi.fn(), update: vi.fn() },
  aiInteraction: { create: vi.fn() },
  auditEvent: { create: vi.fn() },
  eventOutbox: { create: vi.fn() },
}));

const db = vi.hoisted(() => ({
  idempotencyKey: { findUnique: vi.fn() },
  aiInteraction: { count: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));

const coachService = vi.hoisted(() => ({
  buildCoachFacts: vi.fn(),
}));

vi.mock("@myheritage/db", () => ({ prisma: db }));
vi.mock("../../middleware/auth.js", () => ({
  requireAuth(req: Request, _res: Response, next: NextFunction) {
    Object.assign(req, { user: claims, correlationId: "coach-test-correlation" });
    next();
  },
}));
vi.mock("./ai.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ai.service.js")>();
  return { ...actual, buildCoachFacts: coachService.buildCoachFacts };
});
import { errorHandler } from "../../middleware/error-handler.js";
import { aiRouter } from "./ai.router.js";

let server: Server;
let apiBaseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    Object.assign(req, { correlationId: "coach-test-correlation" });
    next();
  });
  app.use("/ai", aiRouter);
  app.use(errorHandler);
  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });
  apiBaseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  db.idempotencyKey.findUnique.mockResolvedValue(null);
  db.aiInteraction.count.mockResolvedValue(0);
  db.aiInteraction.findMany.mockResolvedValue([]);
  db.$transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
  coachService.buildCoachFacts.mockResolvedValue([
    {
      id: "assignment:10000000-0000-4000-8000-000000000001",
      title: "CS301 - Project 1",
      uri: "/student/assignments/10000000-0000-4000-8000-000000000001",
      text: "Project 1 for CS301 is due 2026-09-20T23:59:00.000Z.",
      kind: "assignment",
    },
  ]);
  tx.idempotencyKey.create.mockResolvedValue({});
  tx.idempotencyKey.update.mockResolvedValue({});
  tx.aiInteraction.create.mockResolvedValue({});
  tx.auditEvent.create.mockResolvedValue({});
  tx.eventOutbox.create.mockResolvedValue({});
});

describe("Campus Coach", () => {
  it("persists one grounded response with audit, outbox, and idempotency", async () => {
    const response = await fetch(`${apiBaseUrl}/ai/ask`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "coach-request-1" },
      body: JSON.stringify({ question: "What should I focus on today?", contextPath: "/student/ask" }),
    });

    expect(response.status).toBe(200);
    const payload = CoachAnswer.parse(await response.json());
    expect(payload.answer).toContain("Project 1");
    expect(payload.sources).toHaveLength(1);
    expect(tx.aiInteraction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        institutionId: claims.institutionId,
        accountId: claims.accountId,
        role: "student",
        provider: "campus_grounding_v1",
      }),
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventName: "AiInteraction.created",
        correlationId: "coach-test-correlation",
      }),
    });
    expect(tx.eventOutbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventName: "AiInteraction.created" }),
    });
  });

  it("rejects credential secrets before context retrieval or persistence", async () => {
    const response = await fetch(`${apiBaseUrl}/ai/ask`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "coach-request-secret" },
      body: JSON.stringify({ question: "password: SecretPassword123", contextPath: "/student/ask" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(coachService.buildCoachFacts).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a student request for admin context", async () => {
    const response = await fetch(`${apiBaseUrl}/ai/ask`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "coach-request-admin" },
      body: JSON.stringify({ question: "Show campus operations", contextPath: "/admin/ai/ask" }),
    });

    expect(response.status).toBe(403);
    expect(coachService.buildCoachFacts).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

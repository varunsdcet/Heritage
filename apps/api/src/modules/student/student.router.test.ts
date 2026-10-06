import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import type { RoleName, SessionClaims } from "@myheritage/contracts";
import { StudentAssignmentsResponse, UploadStudentSubmissionFileResponse } from "@myheritage/contracts";
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
  submission: { upsert: vi.fn(), findUniqueOrThrow: vi.fn(), updateMany: vi.fn() },
  fileObject: { create: vi.fn(), update: vi.fn() },
  auditEvent: { create: vi.fn() },
  eventOutbox: { create: vi.fn() },
}));

const db = vi.hoisted(() => ({
  student: { findFirst: vi.fn(), findMany: vi.fn() },
  assignment: { findMany: vi.fn() },
  fileObject: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@myheritage/db", () => ({ prisma: db }));
vi.mock("../../middleware/auth.js", () => ({
  requireAuth(req: Request, _res: Response, next: NextFunction) {
    Object.assign(req, { user: claims, correlationId: "student-journey-correlation" });
    next();
  },
  requireRoles(..._roles: RoleName[]) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  },
}));

import { errorHandler } from "../../middleware/error-handler.js";
import { studentRouter } from "./student.router.js";

const studentId = "10000000-0000-4000-8000-000000000001";
const assignmentId = "20000000-0000-4000-8000-000000000001";
const submissionId = "30000000-0000-4000-8000-000000000001";

const assignment = {
  id: assignmentId,
  institutionId: claims.institutionId,
  sectionId: "40000000-0000-4000-8000-000000000001",
  title: "Project 1",
  maxScore: 100,
  weightPercent: 20,
  dueAt: new Date("2099-10-15T23:59:00.000Z"),
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  rowVersion: 1,
  section: {
    course: { code: "CS301", title: "Algorithms" },
  },
  submissions: [
    {
      id: submissionId,
      institutionId: claims.institutionId,
      assignmentId,
      studentId,
      submittedAt: null,
      status: "draft",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
      rowVersion: 1,
      files: [],
    },
  ],
  gradeItems: [],
};

let server: Server;
let apiBaseUrl: string;
let storageRoot: string;

beforeAll(async () => {
  storageRoot = await mkdtemp(path.join(tmpdir(), "heritage-student-test-"));
  process.env.FILE_STORAGE_ROOT = storageRoot;
  const app = express();
  app.use(express.json({ limit: "15mb" }));
  app.use("/student", studentRouter);
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
  await rm(storageRoot, { recursive: true, force: true });
  delete process.env.FILE_STORAGE_ROOT;
});

beforeEach(() => {
  vi.clearAllMocks();
  db.student.findMany.mockResolvedValue([{ id: studentId, _count: { enrolments: 1 } }]);
  db.student.findFirst.mockResolvedValue({ id: studentId });
  db.assignment.findMany.mockResolvedValue([assignment]);
  db.fileObject.findFirst.mockResolvedValue(null);
  db.$transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
  tx.submission.upsert.mockResolvedValue(assignment.submissions[0]);
  tx.fileObject.create.mockResolvedValue({});
  tx.auditEvent.create.mockResolvedValue({});
  tx.eventOutbox.create.mockResolvedValue({});
});

describe("student assignment journey", () => {
  it("lists only the assignments returned by the enrolment-scoped query", async () => {
    const response = await fetch(`${apiBaseUrl}/student/assignments`);
    expect(response.status).toBe(200);
    const payload = StudentAssignmentsResponse.parse(await response.json());
    expect(payload.assignments).toHaveLength(1);
    expect(payload.assignments[0]).toMatchObject({ id: assignmentId, courseCode: "CS301" });
    expect(db.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          institutionId: claims.institutionId,
          section: expect.objectContaining({ institutionId: claims.institutionId }),
        }),
      }),
    );
  });

  it("uploads a validated file and writes audit/outbox in the same transaction", async () => {
    const now = new Date("2026-09-15T20:00:00.000Z");
    tx.submission.findUniqueOrThrow.mockResolvedValue({
      ...assignment.submissions[0],
      files: [
        {
          id: "50000000-0000-4000-8000-000000000001",
          filename: "project.pdf",
          mimeType: "application/pdf",
          sizeBytes: 9,
          version: 1,
          createdAt: now,
        },
      ],
    });
    const content = Buffer.from("%PDF-1.4\n");
    const response = await fetch(`${apiBaseUrl}/student/assignments/${assignmentId}/files`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "project.pdf",
        mimeType: "application/pdf",
        sizeBytes: content.byteLength,
        contentBase64: content.toString("base64"),
      }),
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(() => UploadStudentSubmissionFileResponse.parse(payload)).not.toThrow();
    expect(tx.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        institutionId: claims.institutionId,
        eventName: "StudentSubmission.fileUploaded",
        correlationId: "student-journey-correlation",
      }),
    });
    expect(tx.eventOutbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventName: "StudentSubmission.fileUploaded" }),
    });
  });

  it("rejects a disguised file before creating a database transaction", async () => {
    const content = Buffer.from("not a pdf");
    const response = await fetch(`${apiBaseUrl}/student/assignments/${assignmentId}/files`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "project.pdf",
        mimeType: "application/pdf",
        sizeBytes: content.byteLength,
        contentBase64: content.toString("base64"),
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("does not reveal or archive a file outside the student's ownership scope", async () => {
    db.fileObject.findFirst.mockResolvedValue(null);
    const response = await fetch(
      `${apiBaseUrl}/student/submission-files/60000000-0000-4000-8000-000000000001`,
      { method: "DELETE" },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

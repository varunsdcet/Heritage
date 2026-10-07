import type { SessionClaims } from "@myheritage/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  admissionsApplication: { findFirst: vi.fn() },
}));

vi.mock("@myheritage/db", () => ({ prisma: db }));
vi.mock("@myheritage/events", () => ({ writeAuditAndOutbox: vi.fn() }));

import { runApplicantAction } from "./applicant.service.js";

const user: SessionClaims = {
  sub: "00000000-0000-4000-8000-000000000001",
  accountId: "00000000-0000-4000-8000-000000000002",
  personId: "00000000-0000-4000-8000-000000000003",
  institutionId: "00000000-0000-4000-8000-000000000004",
  roles: ["applicant"],
  sessionId: "00000000-0000-4000-8000-000000000005",
};

const documentId = "00000000-0000-4000-8000-000000000010";

beforeEach(() => {
  vi.clearAllMocks();
  db.admissionsApplication.findFirst.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000020",
    status: "draft",
    documents: [{ id: documentId, label: "Transcript", status: "missing", fileName: null }],
    offers: [],
    timeline: [],
  });
});

describe("applicant upload_document validation", () => {
  it("rejects an empty file with a clear message", async () => {
    await expect(
      runApplicantAction(user, "upload_document", {
        documentId,
        filename: "transcript.pdf",
        mimeType: "application/pdf",
        sizeBytes: 0,
        contentBase64: "",
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "The selected file is empty (0 bytes). Choose a file that has content.",
    });
  });

  it("lists the allowed file types when the type is not allowed", async () => {
    await expect(
      runApplicantAction(user, "upload_document", {
        documentId,
        filename: "notes.txt",
        mimeType: "text/plain",
        sizeBytes: 4,
        contentBase64: Buffer.from("test").toString("base64"),
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "File type not allowed. Allowed file types: .pdf, .doc, .docx, .png, .jpg, .jpeg",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  admissionsApplication: { findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  applicationTimelineEvent: { create: vi.fn() },
  notification: { create: vi.fn() },
}));

vi.mock("@myheritage/db", () => ({ prisma: db }));
vi.mock("@myheritage/events", () => ({ writeAuditAndOutbox: vi.fn() }));

import type { SessionClaims } from "@myheritage/contracts";
import { applicationCompleteness, cleanApplicationForm } from "./applicationForm.js";
import { runApplicantAction } from "./applicant.service.js";

const now = new Date("2026-10-07T12:00:00Z");
const opts = { programs: ["Practical Nursing"], intakes: ["Winter 2027"] };

const complete = {
  givenName: "Ada",
  familyName: "Lovelace",
  dateOfBirth: "2000-05-01",
  phone: "+1 604 555 0101",
  addressLine1: "1 Main St",
  city: "Vancouver",
  country: "Canada",
  residency: "Permanent resident",
  highestEducation: "Secondary school",
  institutionName: "Heritage Secondary",
  graduationYear: "2018",
  programName: "Practical Nursing",
  intakeTerm: "Winter 2027",
  studyMode: "Full-time",
};
const uploaded = [
  { label: "Official transcript", status: "uploaded" },
  { label: "Government ID", status: "accepted" },
];

describe("cleanApplicationForm", () => {
  it("accepts a partial save with blanks", () => {
    const out = cleanApplicationForm({ givenName: " Ada ", familyName: "" }, opts, {}, now);
    expect(out.errors).toEqual({});
    expect(out.values).toEqual({ givenName: "Ada", familyName: "" });
  });

  it("rejects malformed dates, years, phones and options not offered", () => {
    const out = cleanApplicationForm(
      { dateOfBirth: "2020-01-01", graduationYear: "3020", phone: "call me", programName: "Astronaut", studyMode: "Weekends" },
      opts,
      {},
      now,
    );
    expect(Object.keys(out.errors).sort()).toEqual(["dateOfBirth", "graduationYear", "phone", "programName", "studyMode"]);
  });

  it("keeps a previously saved option that is no longer offered", () => {
    const out = cleanApplicationForm({ programName: "Retired Program" }, opts, { programName: "Retired Program" }, now);
    expect(out.errors).toEqual({});
  });
});

describe("applicationCompleteness", () => {
  it("is 100% only with every required field and document", () => {
    expect(applicationCompleteness(complete, uploaded)).toMatchObject({ pct: 100, missing: [] });
  });

  it("lists missing fields by section and missing or rejected documents", () => {
    const { givenName: _g, graduationYear: _y, ...partial } = complete;
    const out = applicationCompleteness(partial, [uploaded[0]!, { label: "Government ID", status: "rejected" }]);
    expect(out.missing).toEqual(["Personal details: First name", "Academic history: Year completed", "Document: Government ID"]);
    expect(out.sections.program.done).toBe(true);
    expect(out.pct).toBeLessThan(100);
  });

  it("treats an application with no document checklist as missing the required documents", () => {
    expect(applicationCompleteness(complete, []).documentsMissing).toEqual(["Official transcript", "Government ID"]);
  });
});

describe("submit_application", () => {
  const user = { accountId: "acc-1", institutionId: "inst-1", personId: "p-1", roles: ["applicant"] } as unknown as SessionClaims;
  const app = (overrides: Record<string, unknown> = {}) => ({
    id: "app-1",
    status: "draft",
    rowVersion: 2,
    progressPct: 40,
    programName: "Practical Nursing",
    intakeTerm: "Winter 2027",
    formJson: JSON.stringify(complete),
    documents: uploaded.map((d, i) => ({ id: `d-${i}`, fileName: null, ...d })),
    offers: [],
    timeline: [],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    db.admissionsApplication.updateMany.mockResolvedValue({ count: 1 });
  });

  it("returns 400 APPLICATION_INCOMPLETE listing what is missing", async () => {
    db.admissionsApplication.findFirst.mockResolvedValue(
      app({ formJson: JSON.stringify({ givenName: "Ada" }), documents: [{ id: "d-0", label: "Government ID", status: "missing", fileName: null }] }),
    );
    const err = await runApplicantAction(user, "submit_application").catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 400, code: "APPLICATION_INCOMPLETE" });
    expect((err as { missing: string[] }).missing).toContain("Document: Government ID");
    expect((err as Error).message).toMatch(/^Complete these before submitting: Personal details: Last name/);
    expect(db.admissionsApplication.updateMany).not.toHaveBeenCalled();
  });

  it("submits a complete draft with a row-version guard", async () => {
    db.admissionsApplication.findFirst.mockResolvedValue(app());
    await expect(runApplicantAction(user, "submit_application")).resolves.toEqual({ ok: true, status: "submitted" });
    expect(db.admissionsApplication.updateMany.mock.calls[0]?.[0]?.where).toEqual({ id: "app-1", status: "draft", rowVersion: 2 });
  });

  it("refuses to submit twice", async () => {
    db.admissionsApplication.findFirst.mockResolvedValue(app({ status: "submitted" }));
    await expect(runApplicantAction(user, "submit_application")).rejects.toMatchObject({ status: 409 });
  });
});

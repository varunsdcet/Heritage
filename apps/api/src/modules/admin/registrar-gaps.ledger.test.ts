import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  financeLedgerEntry: { findFirst: vi.fn(), updateMany: vi.fn(), findFirstOrThrow: vi.fn(), create: vi.fn() },
  heritageRecord: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
const createAdjustment = vi.hoisted(() => vi.fn());

vi.mock("@myheritage/db", () => ({ prisma: db }));
vi.mock("@myheritage/events", () => ({ writeAuditAndOutbox: vi.fn() }));
vi.mock("./heritage/enrolment.js", () => ({ assertSeat: vi.fn() }));
vi.mock("./heritage/finance.core.js", () => ({ S: { ADJUSTMENT: "FIN:ADJUSTMENT" } }));
vi.mock("./heritage/finance.records.js", () => ({ createAdjustment }));

import type { SessionClaims } from "@myheritage/contracts";
import { adjustLedgerEntry } from "./registrar-gaps.service.js";

const user = { accountId: "acc-1", institutionId: "inst-1", roles: ["admin"] } as unknown as SessionClaims;
const entryId = "11111111-1111-4111-8111-111111111111";
const charge = { id: entryId, institutionId: "inst-1", studentId: "stu-1", label: "Legacy charge", amountCad: 1234.56, kind: "charge", status: "open", source: "manual_post", reversedFromId: null, note: null, financialTermId: null };

beforeEach(() => {
  vi.clearAllMocks();
  db.heritageRecord.findMany.mockResolvedValue([]);
  createAdjustment.mockResolvedValue({ id: "adj-1", number: 1004, message: "Financial adjustment submitted for approval" });
});

describe("adjustLedgerEntry write-offs", () => {
  it("turns a waive into a pending Financial Adjustment and leaves the charge open", async () => {
    db.financeLedgerEntry.findFirst.mockResolvedValue(charge);
    const res = await adjustLedgerEntry(user, { entryId, action: "waive" });
    expect(res).toMatchObject({ pendingApproval: true, adjustmentId: "adj-1" });
    expect(createAdjustment).toHaveBeenCalledWith(user, expect.objectContaining({ studentId: "stu-1", direction: "Decrease balance (credit)", amount: 1234.56, ledgerEntryId: entryId }));
    expect(db.financeLedgerEntry.updateMany).not.toHaveBeenCalled();
  });

  it("routes reversing a charge through the same approval", async () => {
    db.financeLedgerEntry.findFirst.mockResolvedValue({ ...charge, status: "paid" });
    await expect(adjustLedgerEntry(user, { entryId, action: "reverse" })).resolves.toMatchObject({ pendingApproval: true });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("refuses to mark a charge paid without a payment", async () => {
    db.financeLedgerEntry.findFirst.mockResolvedValue(charge);
    await expect(adjustLedgerEntry(user, { entryId, action: "mark_paid" })).rejects.toMatchObject({ status: 409 });
    expect(db.financeLedgerEntry.updateMany).not.toHaveBeenCalled();
    expect(createAdjustment).not.toHaveBeenCalled();
  });

  it("does not open a second request while one is pending", async () => {
    db.financeLedgerEntry.findFirst.mockResolvedValue(charge);
    db.heritageRecord.findMany.mockResolvedValue([{ dataJson: JSON.stringify({ status: "Pending", number: 1003, ledgerEntryId: entryId }) }]);
    await expect(adjustLedgerEntry(user, { entryId, action: "waive" })).rejects.toMatchObject({ status: 409, message: expect.stringContaining("#1003") });
    expect(createAdjustment).not.toHaveBeenCalled();
  });
});

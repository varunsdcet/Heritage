import { randomUUID } from "node:crypto";
import type { RoleName } from "@myheritage/contracts";
import { prisma, type Prisma } from "@myheritage/db";
import { writeAuditAndOutbox } from "@myheritage/events";

export async function requireApproval(input: {
  institutionId: string;
  type: string;
  subjectRef: string;
  proposedDiff: unknown;
  requestedBy: string;
  requiredApproverRoles: RoleName[];
  requiredCount?: number;
  correlationId?: string;
  eventName?: string;
  purpose?: string;
  source?: string;
  tx?: Prisma.TransactionClient;
}) {
  const correlationId = input.correlationId ?? randomUUID();
  const createRequest = async (tx: Prisma.TransactionClient) => {
    const row = await tx.approvalRequest.create({
      data: {
        institutionId: input.institutionId,
        type: input.type,
        subjectRef: input.subjectRef,
        proposedDiffJson: JSON.stringify(input.proposedDiff),
        requestedBy: input.requestedBy,
        requiredApproverRolesJson: JSON.stringify(input.requiredApproverRoles),
        requiredCount: input.requiredCount ?? 1,
        status: "pending",
        decisionsJson: "[]",
      },
    });
    await writeAuditAndOutbox(tx, {
      institutionId: input.institutionId,
      actorId: input.requestedBy,
      eventName: input.eventName ?? "GradeItem.publishRequested",
      purpose: input.purpose ?? "consequential_write",
      before: null,
      after: { approvalRequestId: row.id, type: input.type },
      source: input.source ?? "approvals.require",
      correlationId,
      outboxPayload: { approvalRequestId: row.id },
    });
    return row;
  };
  return input.tx ? createRequest(input.tx) : prisma.$transaction(createRequest);
}

export async function decideApproval(input: {
  approvalId: string;
  institutionId: string;
  actorId: string;
  actorRoles: RoleName[];
  decision: "approve" | "reject";
  comment?: string;
}) {
  const correlationId = randomUUID();
  return prisma.$transaction(async (tx) => {
    const row = await tx.approvalRequest.findFirst({
      where: { id: input.approvalId, institutionId: input.institutionId },
    });
    if (!row) throw Object.assign(new Error("Approval not found"), { code: "NOT_FOUND", status: 404 });
    if (row.status !== "pending") {
      throw Object.assign(new Error("Approval is not pending"), { code: "CONFLICT", status: 409 });
    }
    const requiredRoles = JSON.parse(row.requiredApproverRolesJson) as RoleName[];
    if (!requiredRoles.some((r) => input.actorRoles.includes(r))) {
      throw Object.assign(new Error("Insufficient role to decide"), { code: "FORBIDDEN", status: 403 });
    }
    const decisions = JSON.parse(row.decisionsJson) as Array<{
      actorId: string;
      decision: string;
      comment?: string;
      decidedAt: string;
    }>;
    decisions.push({
      actorId: input.actorId,
      decision: input.decision,
      comment: input.comment,
      decidedAt: new Date().toISOString(),
    });

    let status = row.status;
    if (input.decision === "reject") status = "rejected";
    else if (decisions.filter((d) => d.decision === "approve").length >= row.requiredCount) {
      status = "approved";
    }

    const updated = await tx.approvalRequest.update({
      where: { id: row.id },
      data: { decisionsJson: JSON.stringify(decisions), status, rowVersion: { increment: 1 } },
    });

    await writeAuditAndOutbox(tx, {
      institutionId: input.institutionId,
      actorId: input.actorId,
      eventName: "ApprovalRequest.decided",
      purpose: "approval",
      before: { status: row.status },
      after: { status, decisions },
      source: "approvals.decide",
      correlationId,
    });

    return updated;
  });
}

export async function applyApproval(input: {
  approvalId: string;
  institutionId: string;
  applyFn: (proposedDiff: unknown, tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<void>;
}) {
  const correlationId = randomUUID();
  return prisma.$transaction(async (tx) => {
    const row = await tx.approvalRequest.findFirst({
      where: { id: input.approvalId, institutionId: input.institutionId },
    });
    if (!row) throw Object.assign(new Error("Approval not found"), { code: "NOT_FOUND", status: 404 });
    if (row.status !== "approved") {
      throw Object.assign(new Error("Approval not approved"), { code: "CONFLICT", status: 409 });
    }
    const diff = JSON.parse(row.proposedDiffJson);
    await input.applyFn(diff, tx);
    const updated = await tx.approvalRequest.update({
      where: { id: row.id },
      data: { status: "applied", rowVersion: { increment: 1 } },
    });
    await writeAuditAndOutbox(tx, {
      institutionId: input.institutionId,
      actorId: row.requestedBy,
      eventName: "GradeItem.published",
      purpose: "apply_approval",
      before: null,
      after: diff,
      source: "approvals.apply",
      correlationId,
      outboxPayload: {
        type: row.type,
        ...diff,
        notifyStudentIds: (diff as { studentIds?: string[] }).studentIds ?? [],
      },
    });
    return updated;
  });
}

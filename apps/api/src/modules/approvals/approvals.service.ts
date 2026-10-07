import { applyApproval } from "@myheritage/auth";
import { prisma } from "@myheritage/db";
import { applyStudentProfileChange } from "../admin/registrar-gaps.service.js";

export const OPEN_SERVICE_REQUEST_STATUSES = ["open", "pending", "pending_approval", "submitted", "in_review"];

async function studentAccounts(institutionId: string, studentIds: string[]) {
  if (!studentIds.length) return new Map<string, string>();
  const students = await prisma.student.findMany({ where: { institutionId, id: { in: studentIds } }, select: { id: true, personId: true } });
  const accounts = await prisma.account.findMany({
    where: { institutionId, personId: { in: students.map((s) => s.personId) } },
    select: { id: true, personId: true },
    orderBy: { createdAt: "asc" },
  });
  const byPerson = new Map<string, string>();
  for (const a of accounts) if (a.personId && !byPerson.has(a.personId)) byPerson.set(a.personId, a.id);
  return new Map(students.flatMap((s) => (byPerson.has(s.personId) ? [[s.id, byPerson.get(s.personId)!] as const] : [])));
}

async function gradeItemIdsOf(institutionId: string, approvalId: string) {
  const row = await prisma.approvalRequest.findFirst({ where: { id: approvalId, institutionId }, select: { proposedDiffJson: true } });
  if (!row) return [];
  try {
    const ids = (JSON.parse(row.proposedDiffJson) as { gradeItemIds?: unknown }).gradeItemIds;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Closes the linked leave and service requests once an approval is rejected, returns its grades to draft, and tells the student. */
export async function settleRejectedApproval(institutionId: string, approvalId: string, comment?: string) {
  const gradeItemIds = await gradeItemIdsOf(institutionId, approvalId);
  if (gradeItemIds.length) {
    await prisma.gradeItem.updateMany({
      where: { id: { in: gradeItemIds }, institutionId, status: "pending_publish" },
      data: { status: "draft" },
    });
  }
  const [leaves, services] = await Promise.all([
    prisma.leaveOfAbsenceRequest.findMany({ where: { institutionId, approvalRequestId: approvalId, status: "pending" }, select: { studentId: true } }),
    prisma.serviceRequest.findMany({
      where: { institutionId, approvalRequestId: approvalId, status: { in: OPEN_SERVICE_REQUEST_STATUSES } },
      select: { studentId: true, type: true, subject: true },
    }),
  ]);
  await prisma.$transaction([
    prisma.leaveOfAbsenceRequest.updateMany({
      where: { institutionId, approvalRequestId: approvalId, status: "pending" },
      data: { status: "rejected", decidedAt: new Date(), decisionNote: comment || "Declined from approvals inbox" },
    }),
    prisma.serviceRequest.updateMany({
      where: { institutionId, approvalRequestId: approvalId, status: { in: OPEN_SERVICE_REQUEST_STATUSES } },
      data: { status: "rejected" },
    }),
  ]);
  const note = comment ? ` Note: ${comment}` : "";
  const notices = [
    ...leaves.map((l) => ({ studentId: l.studentId, body: `Your leave of absence request was declined.${note}` })),
    ...services.map((r) => ({ studentId: r.studentId, body: `Your ${r.type.replace(/_/g, " ")} request “${r.subject}” was declined.${note}` })),
  ];
  const accounts = await studentAccounts(institutionId, [...new Set(notices.map((n) => n.studentId))]);
  const data = notices.flatMap((n) => {
    const recipientAccountId = accounts.get(n.studentId);
    return recipientAccountId ? [{ institutionId, recipientAccountId, channel: "in_app", title: "Request declined", body: n.body.slice(0, 4000) }] : [];
  });
  if (data.length) await prisma.notification.createMany({ data });
}

/** Applies an approved request's proposed change (grades, profile changes, leave, service requests). */
export async function applyApprovedRequest(institutionId: string, approvalId: string, actorId?: string) {
  const approvalRow = await prisma.approvalRequest.findFirst({ where: { id: approvalId, institutionId } });
  return applyApproval({
    approvalId,
    institutionId,
    actorId,
    applyFn: async (diff, tx) => {
      const payload = diff as { gradeItemIds?: string[]; type?: string };
      if (Array.isArray(payload.gradeItemIds) && payload.gradeItemIds.length) {
        await tx.gradeItem.updateMany({
          where: { id: { in: payload.gradeItemIds }, institutionId },
          data: { status: "published", publishedAt: new Date() },
        });
      }
      if (approvalRow?.type === "student_profile_change" && approvalRow.subjectRef) {
        await applyStudentProfileChange(institutionId, approvalRow.subjectRef, payload as Record<string, unknown>, tx);
      }
      await tx.serviceRequest.updateMany({
        where: { institutionId, approvalRequestId: approvalId },
        data: { status: "resolved" },
      });
      if (approvalRow?.type === "leave_of_absence") {
        await tx.leaveOfAbsenceRequest.updateMany({
          where: { approvalRequestId: approvalId, institutionId },
          data: { status: "approved", decidedAt: new Date(), decisionNote: "Applied from approvals inbox" },
        });
      }
    },
  });
}

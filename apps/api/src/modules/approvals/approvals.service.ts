import { applyApproval } from "@myheritage/auth";
import { prisma } from "@myheritage/db";
import { applyStudentProfileChange } from "../admin/registrar-gaps.service.js";

/** Closes the linked leave and service requests once an approval is rejected. */
export async function settleRejectedApproval(institutionId: string, approvalId: string, comment?: string) {
  await prisma.$transaction([
    prisma.leaveOfAbsenceRequest.updateMany({
      where: { institutionId, approvalRequestId: approvalId, status: "pending" },
      data: { status: "rejected", decidedAt: new Date(), decisionNote: comment || "Declined from approvals inbox" },
    }),
    prisma.serviceRequest.updateMany({
      where: { institutionId, approvalRequestId: approvalId, status: { in: ["open", "pending", "submitted", "in_review"] } },
      data: { status: "rejected" },
    }),
  ]);
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

import { Router } from "express";
import { z } from "zod";
import { ApprovalInboxResponse, DecideApprovalRequest } from "@myheritage/contracts";
import { applyApproval, decideApproval } from "@myheritage/auth";
import { prisma } from "@myheritage/db";
import { requireAuth, requireRoles, type AuthedRequest } from "../../middleware/auth.js";
import { applyStudentProfileChange } from "../admin/registrar-gaps.service.js";

export const approvalsRouter: Router = Router();

approvalsRouter.get("/", requireAuth, requireRoles("admin", "registrar"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const rows = await prisma.approvalRequest.findMany({
      where: { institutionId: user.institutionId, status: { in: ["pending", "approved"] } },
      orderBy: { createdAt: "desc" },
    });

    const profileIds = rows
      .filter((r) => r.type === "student_profile_change")
      .map((r) => r.subjectRef);
    const students = profileIds.length
      ? await prisma.student.findMany({
          where: { institutionId: user.institutionId, id: { in: profileIds } },
          include: { person: true },
        })
      : [];
    const byId = new Map(students.map((s) => [s.id, s]));

    res.json(
      ApprovalInboxResponse.parse({
        items: rows.map((r) => {
          const proposedDiff = JSON.parse(r.proposedDiffJson) as Record<string, unknown>;
          const student = byId.get(r.subjectRef);
          const currentValues = student
            ? {
                givenName: student.person.givenName,
                familyName: student.person.familyName,
                middleName: student.person.middleName,
                preferredName: student.person.preferredName,
                primaryEmail: student.person.email,
                personalEmail: student.person.personalEmail,
                phone: student.person.phone,
                dateOfBirth: student.person.dateOfBirth,
                emergencyContactName: student.person.emergencyContactName,
                emergencyContactPhone: student.person.emergencyContactPhone,
                sinMasked: student.person.sinMasked,
              }
            : null;
          return {
            id: r.id,
            institutionId: r.institutionId,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            rowVersion: r.rowVersion,
            type: r.type,
            subjectRef: r.subjectRef,
            proposedDiff: {
              ...proposedDiff,
              ...(student
                ? {
                    _meta: {
                      studentNumber: student.studentNumber,
                      studentName: `${student.person.givenName} ${student.person.familyName}`,
                      currentValues,
                    },
                  }
                : {}),
            },
            requestedBy: r.requestedBy,
            requiredApproverRoles: JSON.parse(r.requiredApproverRolesJson),
            requiredCount: r.requiredCount,
            status: r.status,
            decisions: JSON.parse(r.decisionsJson),
          };
        }),
      }),
    );
  } catch (err) {
    next(err);
  }
});

approvalsRouter.post(
  "/:id/decide",
  requireAuth,
  requireRoles("admin", "registrar"),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const id = z.string().uuid().parse(req.params.id);
      const body = DecideApprovalRequest.parse(req.body);
      const updated = await decideApproval({
        approvalId: id,
        institutionId: user.institutionId,
        actorId: user.accountId,
        actorRoles: user.roles,
        decision: body.decision,
        comment: body.comment,
      });
      if (updated.status === "rejected") {
        await prisma.$transaction([
          prisma.leaveOfAbsenceRequest.updateMany({
            where: { institutionId: user.institutionId, approvalRequestId: id, status: "pending" },
            data: { status: "rejected", decidedAt: new Date(), decisionNote: body.comment || "Declined from approvals inbox" },
          }),
          prisma.serviceRequest.updateMany({
            where: { institutionId: user.institutionId, approvalRequestId: id, status: { in: ["open", "pending", "submitted", "in_review"] } },
            data: { status: "rejected" },
          }),
        ]);
      }
      res.json({ id: updated.id, status: updated.status });
    } catch (err) {
      next(err);
    }
  },
);

approvalsRouter.post(
  "/:id/apply",
  requireAuth,
  requireRoles("admin", "registrar"),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const id = z.string().uuid().parse(req.params.id);
      const approvalRow = await prisma.approvalRequest.findFirst({
        where: { id, institutionId: user.institutionId },
      });
      const updated = await applyApproval({
        approvalId: id,
        institutionId: user.institutionId,
        applyFn: async (diff, tx) => {
          const payload = diff as {
            gradeItemIds?: string[];
            type?: string;
          };
          if (Array.isArray(payload.gradeItemIds) && payload.gradeItemIds.length) {
            await tx.gradeItem.updateMany({
              where: { id: { in: payload.gradeItemIds }, institutionId: user.institutionId },
              data: { status: "published", publishedAt: new Date() },
            });
          }
          if (approvalRow?.type === "student_profile_change" && approvalRow.subjectRef) {
            await applyStudentProfileChange(
              user.institutionId,
              approvalRow.subjectRef,
              payload as Record<string, unknown>,
              tx,
            );
          }
          await tx.serviceRequest.updateMany({
            where: { institutionId: user.institutionId, approvalRequestId: id },
            data: { status: "resolved" },
          });
          if (approvalRow?.type === "leave_of_absence") {
            await tx.leaveOfAbsenceRequest.updateMany({
              where: { approvalRequestId: id, institutionId: user.institutionId },
              data: { status: "approved", decidedAt: new Date(), decisionNote: "Applied from approvals inbox" },
            });
          }
        },
      });
      res.json({ id: updated.id, status: updated.status });
    } catch (err) {
      next(err);
    }
  },
);

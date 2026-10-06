import { Router } from "express";
import { z } from "zod";
import { ApprovalInboxResponse, DecideApprovalRequest, type RoleName } from "@myheritage/contracts";
import { decideApproval } from "@myheritage/auth";
import { prisma } from "@myheritage/db";
import { requireAuth, requireRoles, type AuthedRequest } from "../../middleware/auth.js";
import { applyApprovedRequest, settleRejectedApproval } from "./approvals.service.js";

export const approvalsRouter: Router = Router();

approvalsRouter.get("/", requireAuth, requireRoles("admin", "registrar"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const rows = (
      await prisma.approvalRequest.findMany({
        where: { institutionId: user.institutionId, status: { in: ["pending", "approved"] } },
        orderBy: { createdAt: "desc" },
      })
    ).filter((r) => (JSON.parse(r.requiredApproverRolesJson) as RoleName[]).some((role) => user.roles.includes(role)));

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

    const otherIds = [...new Set(rows.filter((r) => r.type !== "student_profile_change").map((r) => r.subjectRef))];
    const requesterIds = [...new Set(rows.map((r) => r.requestedBy))];
    const [sections, requesters] = await Promise.all([
      otherIds.length
        ? prisma.section.findMany({
            where: { institutionId: user.institutionId, id: { in: otherIds } },
            select: { id: true, code: true, course: { select: { code: true, title: true } } },
          })
        : [],
      requesterIds.length
        ? prisma.account.findMany({
            where: { institutionId: user.institutionId, id: { in: requesterIds } },
            select: { id: true, email: true, person: { select: { givenName: true, familyName: true } } },
          })
        : [],
    ]);
    const sectionById = new Map(
      sections.map((s) => [s.id, `${s.code.includes(s.course.code) ? s.code : `${s.course.code} ${s.code}`} — ${s.course.title}`]),
    );
    const requesterById = new Map(
      requesters.map((a) => [a.id, `${a.person.givenName} ${a.person.familyName}`.trim() || a.email]),
    );

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
              _meta: {
                ...(student
                  ? {
                      studentNumber: student.studentNumber,
                      studentName: `${student.person.givenName} ${student.person.familyName}`,
                      currentValues,
                    }
                  : {}),
                subjectLabel: sectionById.get(r.subjectRef) ?? null,
                requestedByName: requesterById.get(r.requestedBy) ?? null,
              },
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
      if (updated.status === "rejected") await settleRejectedApproval(user.institutionId, id, body.comment);
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
      const updated = await applyApprovedRequest(user.institutionId, id, user.accountId);
      res.json({ id: updated.id, status: updated.status });
    } catch (err) {
      next(err);
    }
  },
);

import { Router } from "express";
import { z } from "zod";
import { ApprovalInboxResponse, DecideApprovalRequest } from "@myheritage/contracts";
import { applyApproval, decideApproval } from "@myheritage/auth";
import { prisma } from "@myheritage/db";
import { requireAuth, requireRoles, type AuthedRequest } from "../../middleware/auth.js";

export const approvalsRouter: Router = Router();

approvalsRouter.get("/", requireAuth, requireRoles("admin", "registrar"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const rows = await prisma.approvalRequest.findMany({
      where: { institutionId: user.institutionId, status: { in: ["pending", "approved"] } },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      ApprovalInboxResponse.parse({
        items: rows.map((r) => ({
          id: r.id,
          institutionId: r.institutionId,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          rowVersion: r.rowVersion,
          type: r.type,
          subjectRef: r.subjectRef,
          proposedDiff: JSON.parse(r.proposedDiffJson),
          requestedBy: r.requestedBy,
          requiredApproverRoles: JSON.parse(r.requiredApproverRolesJson),
          requiredCount: r.requiredCount,
          status: r.status,
          decisions: JSON.parse(r.decisionsJson),
        })),
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
      const updated = await applyApproval({
        approvalId: id,
        institutionId: user.institutionId,
        applyFn: async (diff, tx) => {
          const { gradeItemIds } = diff as { gradeItemIds: string[] };
          await tx.gradeItem.updateMany({
            where: { id: { in: gradeItemIds }, institutionId: user.institutionId },
            data: { status: "published", publishedAt: new Date() },
          });
        },
      });
      res.json({ id: updated.id, status: updated.status });
    } catch (err) {
      next(err);
    }
  },
);

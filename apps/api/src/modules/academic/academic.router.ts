import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  DegreeProgressResponse,
  WhatIfScenarioRequest,
  WhatIfScenarioResponse,
} from "@myheritage/contracts";
import { prisma } from "@myheritage/db";
import { writeAuditAndOutbox } from "@myheritage/events";
import { requireAuth, requireRoles, type AuthedRequest } from "../../middleware/auth.js";
import { computeDegreeProgress, impactIfDropCourse } from "../academic/degree-progress.service.js";

export const academicRouter: Router = Router();

academicRouter.use(requireAuth, requireRoles("student"));

async function ownStudent(user: AuthedRequest["user"]) {
  const student = await prisma.student.findFirst({
    where: { institutionId: user.institutionId, personId: user.personId },
  });
  if (!student) {
    throw Object.assign(new Error("Student record not found"), { code: "NOT_FOUND", status: 404 });
  }
  return student;
}

academicRouter.get("/degree-progress", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const student = await ownStudent(user);
    const progress = await computeDegreeProgress({
      institutionId: user.institutionId,
      studentId: student.id,
    });
    res.json(DegreeProgressResponse.parse(progress));
  } catch (error) {
    next(error);
  }
});

academicRouter.post("/degree-scenarios", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const parsed = WhatIfScenarioRequest.safeParse(req.body);
    if (!parsed.success) {
      throw Object.assign(new Error("Invalid what-if scenario"), {
        code: "VALIDATION_ERROR",
        status: 400,
        issues: parsed.error.issues,
      });
    }
    const student = await ownStudent(user);
    const baseline = await computeDegreeProgress({
      institutionId: user.institutionId,
      studentId: student.id,
    });
    const projected = await computeDegreeProgress({
      institutionId: user.institutionId,
      studentId: student.id,
      dropCourseCodes: parsed.data.dropCourseCodes,
      failCourseCodes: parsed.data.failCourseCodes,
      addCourseCodes: parsed.data.addCourseCodes,
    });

    const impactSummary: string[] = [];
    for (const code of parsed.data.dropCourseCodes) {
      const impact = await impactIfDropCourse({
        institutionId: user.institutionId,
        studentId: student.id,
        courseCode: code,
      });
      impactSummary.push(...impact.impactSummary);
    }
    if (!impactSummary.length) {
      impactSummary.push(
        `Projected completion ${baseline.projectedCompletionTerm ?? "unknown"} → ${projected.projectedCompletionTerm ?? "unknown"}.`,
        `Remaining credits ${baseline.remainingCredits} → ${projected.remainingCredits}.`,
      );
    }

    const label =
      parsed.data.label ||
      (parsed.data.dropCourseCodes[0]
        ? `Drop ${parsed.data.dropCourseCodes.join(", ")}`
        : "What-if academic plan");

    let scenarioId: string | null = null;
    if (parsed.data.save) {
      scenarioId = randomUUID();
      await prisma.$transaction(async (tx) => {
        await tx.degreePlanScenario.create({
          data: {
            id: scenarioId!,
            institutionId: user.institutionId,
            studentId: student.id,
            label,
            assumptionsJson: JSON.stringify(parsed.data),
            resultJson: JSON.stringify(projected),
            status: "draft",
          },
        });
        await writeAuditAndOutbox(tx, {
          institutionId: user.institutionId,
          actorId: user.accountId,
          eventName: "DegreePlanScenario.created",
          purpose: "what_if_plan_draft",
          before: null,
          after: { scenarioId, label },
          source: "academic.degree-scenarios",
          correlationId: (req as AuthedRequest).correlationId,
          outboxPayload: { scenarioId, studentId: student.id },
        });
      });
    }

    res.json(
      WhatIfScenarioResponse.parse({
        scenarioId,
        label,
        baseline,
        projected,
        impactSummary,
        claims: projected.claims,
      }),
    );
  } catch (error) {
    next(error);
  }
});

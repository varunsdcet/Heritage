import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  advisorAnswerFromProgress,
  extractDropCourseCode,
  groundedCoachAnswer,
  isAdvisorQuestion,
} from "@myheritage/ai";
import {
  AskCoachRequest,
  CoachAnswer,
  CoachHistoryResponse,
  type CoachSource,
  type CoachSuggestedAction,
  type DegreePlanAnalysis,
} from "@myheritage/contracts";
import { prisma } from "@myheritage/db";
import { writeAuditAndOutbox } from "@myheritage/events";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { buildCoachFacts, resolveCoachRole } from "./ai.service.js";
import { computeDegreeProgress, impactIfDropCourse } from "../academic/degree-progress.service.js";

export const aiRouter: Router = Router();

function validationError(message: string, issues?: unknown) {
  return Object.assign(new Error(message), { code: "VALIDATION_ERROR", status: 400, issues });
}

function containsRestrictedSecret(question: string) {
  return (
    /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/.test(question) ||
    /\b\d{3}[- ]?\d{3}[- ]?\d{3}\b/.test(question) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(question) ||
    /\b(?:passport(?: number)?|password|access[_ -]?token)\s*[:=]\s*\S{4,}/i.test(question) ||
    /\bbearer\s+[A-Za-z0-9._~-]{12,}/i.test(question)
  );
}

function parseStored<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

aiRouter.use(requireAuth);

aiRouter.get("/history", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const rows = await prisma.aiInteraction.findMany({
      where: { institutionId: user.institutionId, accountId: user.accountId, status: "completed" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(
      CoachHistoryResponse.parse({
        items: rows.map((row) => ({
          interactionId: row.id,
          question: row.question,
          role: row.role,
          tier: row.tier === "draft" ? "draft" : "read_only",
          capability: row.provider === "student_advisor_v1" ? "student_advisor" : "campus_coach",
          answer: row.answer,
          sources: parseStored<CoachSource[]>(row.sourcesJson, []),
          suggestedActions: parseStored<CoachSuggestedAction[]>(row.suggestedActionsJson, []),
          claims: [],
          createdAt: row.createdAt.toISOString(),
        })),
      }),
    );
  } catch (error) {
    next(error);
  }
});

aiRouter.post("/ask", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const parsed = AskCoachRequest.safeParse(req.body);
    if (!parsed.success) throw validationError("Invalid Coach question", parsed.error.issues);
    if (containsRestrictedSecret(parsed.data.question)) {
      throw validationError("Do not include government identifiers or credential secrets in Coach questions");
    }
    const idempotencyKey = req.header("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 200) {
      throw validationError("A valid Idempotency-Key header is required");
    }
    const idempotencyPath = `/ai/ask/${user.accountId}`;
    const existing = await prisma.idempotencyKey.findUnique({
      where: {
        institutionId_key_method_path: {
          institutionId: user.institutionId,
          key: idempotencyKey,
          method: "POST",
          path: idempotencyPath,
        },
      },
    });
    if (existing) {
      if (existing.statusCode === 0) {
        throw Object.assign(new Error("An identical Coach request is still processing"), {
          code: "CONFLICT",
          status: 409,
        });
      }
      res.status(existing.statusCode).json(JSON.parse(existing.responseJson));
      return;
    }

    const recentCount = await prisma.aiInteraction.count({
      where: {
        institutionId: user.institutionId,
        accountId: user.accountId,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recentCount >= 20) {
      throw Object.assign(new Error("Coach request limit reached; try again in a minute"), {
        code: "RATE_LIMITED",
        status: 429,
      });
    }

    const role = resolveCoachRole(user, parsed.data.contextPath);
    const wantsAdvisor =
      role === "student" &&
      (parsed.data.capability === "student_advisor" ||
        parsed.data.capability === "degree_progress" ||
        parsed.data.capability === "what_if_planner" ||
        isAdvisorQuestion(parsed.data.question));

    let grounded = groundedCoachAnswer({
      role,
      question: parsed.data.question,
      facts: await buildCoachFacts(user, role),
    });
    let capability: "campus_coach" | "student_advisor" = "campus_coach";
    let provider = "campus_grounding_v1";
    let analysis: DegreePlanAnalysis | undefined;

    if (wantsAdvisor) {
      const student = await prisma.student.findFirst({
        where: { institutionId: user.institutionId, personId: user.personId },
      });
      if (!student?.programVersionId) {
        grounded = {
          tier: "read_only",
          text: "I cannot answer degree-planning questions yet because no program version is assigned to your student record. Open Advising to request a program assignment.",
          sources: [
            {
              id: "portal:advising",
              title: "Advising",
              uri: "/student/advising",
            },
          ],
          suggestedActions: [{ label: "Open advising", href: "/student/advising" }],
          claims: [
            {
              kind: "uncertainty",
              text: "Program version is missing on the student record.",
              evidenceIds: [],
            },
          ],
        };
        capability = "student_advisor";
        provider = "student_advisor_v1";
      } else {
        const dropCode = extractDropCourseCode(parsed.data.question);
        if (dropCode) {
          const impact = await impactIfDropCourse({
            institutionId: user.institutionId,
            studentId: student.id,
            courseCode: dropCode,
          });
          analysis = impact.projected;
          grounded = advisorAnswerFromProgress({
            question: parsed.data.question,
            progress: impact.projected,
            impact: {
              courseCode: dropCode,
              impactSummary: impact.impactSummary,
              downstream: impact.downstream,
              projectedCompletionTerm: impact.projected.projectedCompletionTerm,
              baselineCompletionTerm: impact.baseline.projectedCompletionTerm,
            },
          });
        } else {
          analysis = await computeDegreeProgress({
            institutionId: user.institutionId,
            studentId: student.id,
          });
          grounded = advisorAnswerFromProgress({
            question: parsed.data.question,
            progress: analysis,
          });
        }
        capability = "student_advisor";
        provider = "student_advisor_v1";
      }
    }

    const interactionId = randomUUID();
    const createdAt = new Date();
    const response = CoachAnswer.parse({
      interactionId,
      role,
      tier: grounded.tier === "draft" ? "draft" : "read_only",
      capability,
      answer: grounded.text,
      sources: grounded.sources,
      suggestedActions: grounded.suggestedActions,
      claims: grounded.claims ?? [],
      analysis,
      createdAt: createdAt.toISOString(),
    });

    try {
      await prisma.$transaction(async (tx) => {
        await tx.idempotencyKey.create({
          data: {
            institutionId: user.institutionId,
            key: idempotencyKey,
            method: "POST",
            path: idempotencyPath,
            responseJson: "{}",
            statusCode: 0,
          },
        });
        await tx.aiInteraction.create({
          data: {
            id: interactionId,
            institutionId: user.institutionId,
            accountId: user.accountId,
            role,
            question: parsed.data.question,
            answer: response.answer,
            sourcesJson: JSON.stringify(response.sources),
            suggestedActionsJson: JSON.stringify(response.suggestedActions),
            tier: response.tier,
            provider,
            status: "completed",
            createdAt,
          },
        });
        await writeAuditAndOutbox(tx, {
          institutionId: user.institutionId,
          actorId: user.accountId,
          eventName: "AiInteraction.created",
          purpose: capability === "student_advisor" ? "grounded_degree_advice" : "grounded_campus_assistance",
          before: null,
          after: {
            interactionId,
            role,
            tier: response.tier,
            capability,
            sourceIds: response.sources.map((source) => source.id),
          },
          source: "ai.ask",
          correlationId: (req as AuthedRequest).correlationId,
          outboxPayload: { interactionId, role, tier: response.tier, capability },
        });
        await tx.idempotencyKey.update({
          where: {
            institutionId_key_method_path: {
              institutionId: user.institutionId,
              key: idempotencyKey,
              method: "POST",
              path: idempotencyPath,
            },
          },
          data: { responseJson: JSON.stringify(response), statusCode: 200 },
        });
      });
      res.json(response);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        const completed = await prisma.idempotencyKey.findUnique({
          where: {
            institutionId_key_method_path: {
              institutionId: user.institutionId,
              key: idempotencyKey,
              method: "POST",
              path: idempotencyPath,
            },
          },
        });
        if (completed && completed.statusCode > 0) {
          res.status(completed.statusCode).json(JSON.parse(completed.responseJson));
          return;
        }
        throw Object.assign(new Error("An identical Coach request is already processing"), {
          code: "CONFLICT",
          status: 409,
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

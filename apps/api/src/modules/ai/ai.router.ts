import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { askHeritageAi } from "../../lib/ask.js";
import { prisma } from "@myheritage/db";

export const aiRouter: Router = Router();

const AskBody = z.object({
  question: z.string().min(2).max(4000),
  contextPath: z.string().optional(),
});

aiRouter.post("/ask", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const body = AskBody.parse(req.body);
    const role = user.roles.includes("admin")
      ? "admin"
      : user.roles.includes("instructor")
        ? "instructor"
        : "student";

    const person = await prisma.person.findUnique({ where: { id: user.personId } });
    const result = await askHeritageAi({
      question: body.question,
      role,
      systemPrompt: `You are Ask Heritage for MyHeritage AI Campus OS.
User: ${person ? `${person.givenName} ${person.familyName}` : "campus user"} (${role}).
Screen context: ${body.contextPath || "general"}.
Help with courses, grades, attendance, fees, programs, scheduling, admissions, and campus navigation.
Be concise. If the question needs live private data (exact balances/grades), tell them which portal screen to open.`,
    });

    await prisma.auditEvent.create({
      data: {
        institutionId: user.institutionId,
        actorId: user.accountId,
        eventName: "ai.ask",
        purpose: "assistant",
        afterJson: JSON.stringify({
          question: body.question.slice(0, 500),
          source: result.source,
          model: result.model,
          contextPath: body.contextPath ?? null,
        }),
        source: "ai.ask",
        correlationId: randomUUID(),
      },
    });

    res.json({
      answer: result.answer,
      model: result.model,
      source: result.source,
    });
  } catch (err) {
    next(err);
  }
});

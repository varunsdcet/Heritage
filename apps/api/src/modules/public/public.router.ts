import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { prisma } from "@myheritage/db";
import { registerApplicant } from "./apply.js";

export const publicRouter: Router = Router();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 30;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(bucket: string, max = MAX_REQUESTS, message = "Too many verification attempts. Try again later.") {
  return (req: Request, res: Response, next: NextFunction) => {
    const client = req.header("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "unknown";
    const key = `${bucket}|${client}`;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (hits.size > 10_000) hits.clear();
      hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > max) {
      res.status(429).json({ error: { code: "RATE_LIMITED", message } });
      return;
    }
    next();
  };
}

publicRouter.post("/apply", rateLimit("apply", 5, "Too many sign-up attempts from this network. Try again later."), async (req, res, next) => {
  try {
    res.status(201).json(await registerApplicant(req.body));
  } catch (err) {
    next(err);
  }
});

/**
 * Identity match needs both the student number and the registered family name, so a
 * student number alone never reveals whether a record exists.
 */
publicRouter.get("/verify", rateLimit("verify"), async (req, res, next) => {
  try {
    const studentNumber = String(req.query.studentNumber ?? "").trim();
    const familyName = String(req.query.familyName ?? "").trim();
    if (!studentNumber || !familyName) {
      res.status(400).json({ match: false, error: { message: "studentNumber and familyName required" } });
      return;
    }
    const hit = await prisma.student.findFirst({
      where: {
        studentNumber: { equals: studentNumber, mode: "insensitive" },
        person: { familyName: { equals: familyName, mode: "insensitive" } },
      },
      select: { id: true },
    });
    res.json({ match: Boolean(hit) });
  } catch (err) {
    next(err);
  }
});

const CertificateId = z.string().uuid();

publicRouter.get("/certificates/:id", rateLimit("certificates"), async (req, res, next) => {
  try {
    const id = CertificateId.safeParse(req.params.id);
    const row = id.success
      ? await prisma.credentialRecord.findFirst({
          where: { id: id.data, status: { in: ["earned", "revoked"] } },
          select: {
            id: true,
            title: true,
            status: true,
            earnedAt: true,
            student: { select: { person: { select: { givenName: true, preferredName: true, familyName: true } } } },
          },
        })
      : null;
    if (!row) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "No certificate found" } });
      return;
    }
    const person = row.student.person;
    res.json({
      certificateId: row.id,
      holderName: `${person.preferredName || person.givenName} ${person.familyName}`.trim(),
      title: row.title,
      status: row.status,
      issuedAt: row.earnedAt?.toISOString() ?? null,
    });
  } catch (err) {
    next(err);
  }
});

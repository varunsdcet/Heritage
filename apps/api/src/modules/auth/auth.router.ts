import { Router } from "express";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@myheritage/db";
import { hashPassword, loginWithPassword, changePassword } from "@myheritage/auth";
import { LoginRequest, LoginResponse } from "@myheritage/contracts";
import { sendMailViaHumanitix, mailConfigured } from "../../lib/mailer.js";
import { forgetSessionRevocation, requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const authRouter: Router = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = LoginRequest.parse(req.body);
    const result = await loginWithPassword({
      ...body,
      ipAddress: req.ip ?? "127.0.0.1",
      userAgent: req.header("user-agent") ?? "unknown",
    });
    res.json(LoginResponse.parse(result));
  } catch (err) {
    next(err);
  }
});

const ForgotBody = z.object({
  email: z.string().email(),
  studentNumber: z.string().min(3).optional(),
});

const ResetBody = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const body = ForgotBody.parse(req.body);
    const email = body.email.trim().toLowerCase();
    const account = await prisma.account.findFirst({
      where: { email, status: "active" },
      include: { person: { include: { students: true } } },
    });

    // Always return ok to avoid account enumeration.
    if (!account) {
      res.json({ ok: true, mailed: false });
      return;
    }

    if (body.studentNumber) {
      const match = account.person.students.some(
        (s) => s.studentNumber.toLowerCase() === body.studentNumber!.trim().toLowerCase(),
      );
      if (!match) {
        res.json({ ok: true, mailed: false });
        return;
      }
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordResetToken.create({
      data: {
        accountId: account.id,
        tokenHash,
        expiresAt,
      },
    });

    const webOrigin = (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(",")[0]?.trim() || "http://localhost:3000";
    const resetUrl = `${webOrigin.replace(/\/$/, "")}/reset?token=${rawToken}`;
    const title = "Reset your MyHeritage password";
    const message = [
      `Hello ${account.person.givenName},`,
      "",
      "We received a request to reset your MyHeritage campus password.",
      "",
      `Reset link (valid 60 minutes):`,
      `  ${resetUrl}`,
      "",
      "If you did not request this, you can ignore this email.",
      "",
      "— MyHeritage AI Campus OS",
    ].join("\n");

    let mailed = false;
    if (mailConfigured()) {
      try {
        await sendMailViaHumanitix({ email: account.email, title, message });
        mailed = true;
      } catch (err) {
        console.error("forgot-password mail failed", err);
      }
    }

    res.json({
      ok: true,
      mailed,
      ...(process.env.NODE_ENV !== "production" || process.env.EXPOSE_RESET_TOKEN === "1"
        ? { resetToken: rawToken, resetUrl }
        : {}),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const body = ChangePasswordBody.parse(req.body);
    await changePassword({
      accountId: user.accountId,
      institutionId: user.institutionId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      keepSessionId: user.sessionId,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const body = ResetBody.parse(req.body);
    const tokenHash = hashToken(body.token);
    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      res.status(400).json({ error: { message: "Reset link is invalid or expired" } });
      return;
    }
    const passwordHash = await hashPassword(body.password);
    await prisma.$transaction([
      prisma.account.update({
        where: { id: row.accountId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.deleteMany({ where: { accountId: row.accountId } }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    await prisma.session.deleteMany({
      where: { id: user.sessionId, accountId: user.accountId, institutionId: user.institutionId },
    });
    forgetSessionRevocation(user.sessionId);
    await prisma.auditEvent.create({
      data: {
        institutionId: user.institutionId,
        actorId: user.accountId,
        eventName: "Account.logout",
        purpose: "authentication",
        beforeJson: JSON.stringify({ sessionId: user.sessionId }),
        afterJson: null,
        source: "auth.logout",
        correlationId: randomUUID(),
        version: 1,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

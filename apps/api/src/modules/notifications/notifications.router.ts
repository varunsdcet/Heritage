import { Router } from "express";
import { prisma } from "@myheritage/db";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const notificationsRouter: Router = Router();

notificationsRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const rows = await prisma.notification.findMany({
      where: { institutionId: user.institutionId, recipientAccountId: user.accountId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const items = rows.map((n) => ({
      id: n.id,
      channel: n.channel,
      title: n.title,
      body: n.body,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
      templateKey: n.templateKey,
    }));
    res.json({
      items,
      unreadCount: items.filter((i) => i.readAt == null).length,
    });
  } catch (err) {
    next(err);
  }
});

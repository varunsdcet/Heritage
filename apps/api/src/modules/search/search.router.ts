import { Router } from "express";
import { prisma } from "@myheritage/db";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const searchRouter: Router = Router();

searchRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const q = String(req.query.q ?? "").trim().toLowerCase();
    if (!q) {
      res.json({ groups: [] });
      return;
    }
    const people = await prisma.person.findMany({
      where: {
        institutionId: user.institutionId,
        OR: [
          { givenName: { contains: q } },
          { familyName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: 8,
    });
    const courses = await prisma.course.findMany({
      where: {
        institutionId: user.institutionId,
        OR: [{ code: { contains: q.toUpperCase() } }, { title: { contains: q } }],
      },
      take: 8,
    });
    res.json({
      groups: [
        {
          type: "people",
          items: people.map((p) => ({ id: p.id, label: `${p.givenName} ${p.familyName}`, sub: p.email })),
        },
        {
          type: "courses",
          items: courses.map((c) => ({ id: c.id, label: `${c.code} · ${c.title}`, sub: `${c.credits} credits` })),
        },
      ],
    });
  } catch (err) {
    next(err);
  }
});

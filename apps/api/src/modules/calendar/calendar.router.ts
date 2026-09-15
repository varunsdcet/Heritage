import { Router } from "express";
import { prisma } from "@myheritage/db";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const calendarRouter: Router = Router();

calendarRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const roles = user.roles;

    let sectionIds: string[] = [];

    if (roles.includes("instructor")) {
      const sections = await prisma.section.findMany({
        where: { institutionId: user.institutionId, instructorPersonId: user.personId },
        select: { id: true },
      });
      sectionIds = sections.map((s) => s.id);
    } else if (!roles.includes("admin") && !roles.includes("registrar")) {
      const student = await prisma.student.findFirst({
        where: { institutionId: user.institutionId, personId: user.personId },
      });
      if (student) {
        const enrolments = await prisma.enrolment.findMany({
          where: { studentId: student.id, status: "enrolled" },
          select: { sectionId: true },
        });
        sectionIds = enrolments.map((e) => e.sectionId);
      }
    } else {
      const sections = await prisma.section.findMany({
        where: { institutionId: user.institutionId },
        select: { id: true },
      });
      sectionIds = sections.map((s) => s.id);
    }

    const term = await prisma.term.findFirst({
      where: { institutionId: user.institutionId },
      orderBy: { code: "desc" },
    });

    const assignments =
      sectionIds.length > 0
        ? await prisma.assignment.findMany({
            where: { institutionId: user.institutionId, sectionId: { in: sectionIds }, dueAt: { not: null } },
            include: { section: { include: { course: true } } },
            orderBy: { dueAt: "asc" },
          })
        : [];

    const deadlineEvents = assignments.map((a) => ({
      id: `asg-${a.id}`,
      title: `${a.title} due`,
      startsAt: a.dueAt!.toISOString(),
      endsAt: a.dueAt!.toISOString(),
      location: "Online submission",
      courseCode: a.section.course.code,
      type: "deadline" as const,
    }));

    res.json({
      items: deadlineEvents,
      termCode: term?.code ?? "2026F",
    });
  } catch (err) {
    next(err);
  }
});

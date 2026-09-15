import { Router } from "express";
import { prisma } from "@myheritage/db";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const coursesRouter: Router = Router();

coursesRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const roles = user.roles;

    if (roles.includes("admin") || roles.includes("registrar")) {
      const sections = await prisma.section.findMany({
        where: { institutionId: user.institutionId },
        include: {
          course: true,
          term: true,
          _count: { select: { enrolments: true } },
        },
      });
      const instructors = await prisma.person.findMany({
        where: {
          id: { in: [...new Set(sections.map((s) => s.instructorPersonId))] },
          institutionId: user.institutionId,
        },
      });
      const nameById = new Map(instructors.map((p) => [p.id, `${p.givenName} ${p.familyName}`]));
      res.json({
        items: sections.map((s) => ({
          sectionId: s.id,
          code: s.course.code,
          title: s.course.title,
          credits: s.course.credits,
          termCode: s.term.code,
          instructorName: nameById.get(s.instructorPersonId) ?? "TBA",
          enrolmentCount: s._count.enrolments,
          status: "active",
        })),
      });
      return;
    }

    if (roles.includes("instructor")) {
      const sections = await prisma.section.findMany({
        where: { institutionId: user.institutionId, instructorPersonId: user.personId },
        include: {
          course: true,
          term: true,
          _count: { select: { enrolments: true } },
        },
      });
      res.json({
        items: sections.map((s) => ({
          sectionId: s.id,
          code: s.course.code,
          title: s.course.title,
          credits: s.course.credits,
          termCode: s.term.code,
          enrolmentCount: s._count.enrolments,
          status: "teaching",
        })),
      });
      return;
    }

    const student = await prisma.student.findFirst({
      where: { institutionId: user.institutionId, personId: user.personId },
    });
    if (!student) {
      res.json({ items: [] });
      return;
    }

    const enrolments = await prisma.enrolment.findMany({
      where: { institutionId: user.institutionId, studentId: student.id, status: "enrolled" },
      include: {
        section: { include: { course: true, term: true } },
        gradeItems: {
          where: { institutionId: user.institutionId, status: "published" },
          select: { score: true, maxScore: true },
        },
      },
    });

    const instructorIds = [...new Set(enrolments.map((e) => e.section.instructorPersonId))];
    const instructors = await prisma.person.findMany({
      where: { id: { in: instructorIds }, institutionId: user.institutionId },
    });
    const nameById = new Map(instructors.map((p) => [p.id, `${p.givenName} ${p.familyName}`]));

    const courses = enrolments.map((e) => {
      const scored = e.gradeItems.filter((grade) => grade.score != null && grade.maxScore > 0);
      const progressPercent =
        scored.length > 0
          ? Number(
              ((scored.reduce((sum, grade) => sum + (grade.score ?? 0) / grade.maxScore, 0) / scored.length) * 100).toFixed(1),
            )
          : null;
      return {
        sectionId: e.sectionId,
        courseCode: e.section.course.code,
        courseTitle: e.section.course.title,
        sectionCode: e.section.code,
        termName: e.section.term.name,
        credits: e.section.course.credits,
        instructorName: nameById.get(e.section.instructorPersonId) ?? "TBA",
        enrolmentStatus: e.status as "enrolled" | "completed",
        progressPercent,
      };
    });

    res.json({
      courses,
      items: courses.map((course) => ({
        sectionId: course.sectionId,
        code: course.courseCode,
        title: course.courseTitle,
        credits: course.credits,
        termCode: enrolments.find((entry) => entry.sectionId === course.sectionId)?.section.term.code,
        instructorName: course.instructorName,
        status: course.enrolmentStatus,
        progressPercent: course.progressPercent,
      })),
    });
  } catch (err) {
    next(err);
  }
});

import { Router } from "express";
import { prisma } from "@myheritage/db";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { sectionOfferings } from "./sectionOffering.js";
import {
  DEFAULT_TZ,
  dateBoundsFromSessions,
  deliveryFromSessions,
  instructorDisplayName,
  roomFromSessions,
  scheduleTextFromSessions,
} from "./sectionSchedule.js";
import { currentStudentId } from "../me/studentAlignment.js";

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
          _count: { select: { enrolments: { where: { status: "enrolled" } } } },
        },
      });
      // Only sections with enrolled students (hide empty shells).
      const withStudents = sections.filter((s) => s._count.enrolments > 0);
      res.json({
        items: withStudents.map((s) => ({
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
      where: { id: await currentStudentId(user.institutionId, user.personId), institutionId: user.institutionId },
    });
    if (!student) {
      res.json({ items: [] });
      return;
    }

    const enrolments = await prisma.enrolment.findMany({
      where: {
        institutionId: user.institutionId,
        studentId: student.id,
        status: { in: ["enrolled", "completed", "waitlisted"] },
      },
      include: {
        section: {
          include: {
            course: true,
            term: true,
            academicBlock: true,
            classSessions: { orderBy: { startsAt: "asc" } },
          },
        },
        gradeItems: {
          where: { institutionId: user.institutionId, status: "published" },
          select: { score: true, maxScore: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const instructorIds = [...new Set(enrolments.map((e) => e.section.instructorPersonId))];
    const instructors = await prisma.person.findMany({
      where: { id: { in: instructorIds }, institutionId: user.institutionId },
    });
    const personById = new Map(instructors.map((p) => [p.id, p]));

    const planItems = await prisma.programPlanItem.findMany({
      where: {
        institutionId: user.institutionId,
        plan: { studentId: student.id, institutionId: user.institutionId },
        OR: [
          { sectionId: { in: enrolments.map((e) => e.sectionId) } },
          { courseCode: { in: [...new Set(enrolments.map((e) => e.section.course.code))] } },
        ],
      },
    });
    const planBySection = new Map(planItems.filter((i) => i.sectionId).map((i) => [i.sectionId!, i]));
    const planByCode = new Map(planItems.map((i) => [i.courseCode, i]));
    const [offerings, institution] = await Promise.all([
      sectionOfferings(user.institutionId, enrolments.map((e) => e.sectionId)),
      prisma.institution.findFirst({ where: { id: user.institutionId }, select: { timezone: true } }),
    ]);
    const tz = institution?.timezone || DEFAULT_TZ;

    const courses = enrolments
      .map((e) => {
        const scored = e.gradeItems.filter((grade) => grade.score != null && grade.maxScore > 0);
        const progressPercent =
          scored.length > 0
            ? Number(
                (
                  (scored.reduce((sum, grade) => sum + (grade.score ?? 0) / grade.maxScore, 0) / scored.length) *
                  100
                ).toFixed(1),
              )
            : null;
        const sessions = e.section.classSessions;
        const fromSessions = dateBoundsFromSessions(sessions, tz);
        const plan = planBySection.get(e.sectionId) ?? planByCode.get(e.section.course.code);
        const offering = offerings.get(e.sectionId);
        const startsOn =
          offering?.startsOn || plan?.startsOn || e.section.academicBlock?.startsOn || fromSessions.startsOn || e.section.term.startsOn;
        const endsOn =
          offering?.endsOn || plan?.endsOn || e.section.academicBlock?.endsOn || fromSessions.endsOn || e.section.term.endsOn;
        return {
          sectionId: e.sectionId,
          courseCode: e.section.course.code,
          courseTitle: e.section.course.title,
          sectionCode: e.section.code,
          termName: e.section.term.name,
          credits: e.section.course.credits,
          instructorName: instructorDisplayName(personById.get(e.section.instructorPersonId)) ?? "TBA",
          enrolmentStatus: e.status as "enrolled" | "completed" | "waitlisted",
          progressPercent,
          deliveryMethod: offering?.deliveryMethod || deliveryFromSessions(sessions),
          location: offering?.location || roomFromSessions(sessions) || "TBD",
          scheduleText: offering?.scheduleText || scheduleTextFromSessions(sessions, tz) || plan?.scheduleText || null,
          startsOn,
          endsOn,
        };
      })
      .sort((a, b) => {
        const rank = (code: string) => (/^ACSW\s*500$/i.test(code) ? 0 : 1);
        const diff = rank(a.courseCode) - rank(b.courseCode);
        if (diff !== 0) return diff;
        return a.courseCode.localeCompare(b.courseCode);
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

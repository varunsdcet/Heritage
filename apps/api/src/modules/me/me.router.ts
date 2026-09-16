import { Router } from "express";
import { prisma } from "@myheritage/db";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import {
  RequestStudentProfileChange,
  StudentProfileResponse,
  UpdateStudentPreferencesRequest,
} from "@myheritage/contracts";
import { requireApproval } from "@myheritage/auth";
import { writeAuditAndOutbox } from "@myheritage/events";

export const meRouter: Router = Router();

function validationError(issues: unknown, message = "Invalid request") {
  return Object.assign(new Error(message), { code: "VALIDATION_ERROR", status: 400, issues });
}

meRouter.get("/home", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const roles = user.roles;

    if (roles.includes("admin") || roles.includes("registrar")) {
      const [pending, openAlerts, activeStudents, notifications] = await Promise.all([
        prisma.approvalRequest.count({
          where: { institutionId: user.institutionId, status: "pending" },
        }),
        prisma.auditEvent.count({
          where: { institutionId: user.institutionId },
        }),
        prisma.student.count({ where: { institutionId: user.institutionId } }),
        prisma.notification.findMany({
          where: { institutionId: user.institutionId, recipientAccountId: user.accountId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);
      res.json({
        role: "admin",
        headline: "Campus operations",
        stats: {
          pendingApprovals: pending,
          openAlerts,
          activeStudents,
        },
        shortcuts: [
          { label: "Approval inbox", href: "/admin/approvals" },
          { label: "Search people", href: "/admin/search" },
          { label: "All screens", href: "/admin/all" },
        ],
        announcements: notifications.map((n) => ({ id: n.id, title: n.title, body: n.body })),
        items: [
          ...notifications.map((n) => ({ label: n.title, sub: n.body })),
          { label: `${pending} approvals waiting`, sub: "Approvals" },
        ],
      });
      return;
    }

    if (roles.includes("instructor")) {
      const sections = await prisma.section.findMany({
        where: { institutionId: user.institutionId, instructorPersonId: user.personId },
        include: { course: true, _count: { select: { enrolments: true } }, assignments: true },
      });
      const draftGrades = await prisma.gradeItem.count({
        where: {
          institutionId: user.institutionId,
          status: "draft",
          assignment: { section: { instructorPersonId: user.personId } },
        },
      });
      const sectionItems = sections.map((s) => ({
        sectionId: s.id,
        code: s.code,
        title: s.course.title,
        enrolmentCount: s._count.enrolments,
      }));
      const tasks = [
        ...(draftGrades > 0
          ? [{ id: "task-drafts", label: `Enter or publish ${draftGrades} draft grade item(s)`, sectionCode: sectionItems[0]?.code ?? "—" }]
          : []),
        ...sections.flatMap((s) =>
          s.assignments
            .filter((a) => a.dueAt)
            .slice(0, 1)
            .map((a) => ({
              id: a.id,
              label: `${a.title} due ${a.dueAt ? new Date(a.dueAt).toLocaleDateString() : ""}`,
              sectionCode: s.code,
            })),
        ),
      ];
      res.json({
        role: "instructor",
        headline: "Teaching dashboard",
        sections: sectionItems,
        tasks,
        shortcuts: [
          { label: "Open gradebook", href: "/instructor/gradebook" },
          { label: "My courses", href: "/instructor/sections" },
          { label: "Attendance", href: "/instructor/attendance" },
          { label: "Messages", href: "/instructor/f/t16-teacher-messages-chat" },
        ],
        items: [
          ...sectionItems.map((s) => ({
            label: `${s.code} · ${s.title}`,
            sub: "Section",
          })),
          ...tasks.map((t) => ({ label: t.label, sub: t.sectionCode })),
        ],
      });
      return;
    }

    const student = await prisma.student.findFirst({
      where: { institutionId: user.institutionId, personId: user.personId },
    });
    const enrolmentCount = student
      ? await prisma.enrolment.count({
          where: { institutionId: user.institutionId, studentId: student.id, status: "enrolled" },
        })
      : 0;

    const grades = student
      ? await prisma.gradeItem.findMany({
          where: { institutionId: user.institutionId, studentId: student.id, status: "published" },
        })
      : [];
    const gpa =
      grades.length > 0
        ? Number(
            (
              grades.reduce((n, g) => n + ((g.score ?? 0) / g.maxScore) * 4, 0) / grades.length
            ).toFixed(2),
          )
        : null;

    const nextAssignment = student
      ? await prisma.assignment.findFirst({
          where: {
            institutionId: user.institutionId,
            dueAt: { not: null },
            section: {
              institutionId: user.institutionId,
              enrolments: {
                some: { institutionId: user.institutionId, studentId: student.id, status: "enrolled" },
              },
            },
          },
          include: { section: { include: { course: true } } },
          orderBy: { dueAt: "asc" },
        })
      : null;

    const notifications = await prisma.notification.findMany({
      where: { institutionId: user.institutionId, recipientAccountId: user.accountId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    res.json({
      role: "student",
      headline: "Your campus home",
      standing: student?.standing ?? "unknown",
      programName: student?.programName ?? "Undeclared",
      enrolledCourses: enrolmentCount,
      gpa,
      nextDeadline: nextAssignment
        ? {
            title: nextAssignment.title,
            dueAt: nextAssignment.dueAt!.toISOString(),
            courseCode: nextAssignment.section.course.code,
          }
        : null,
      shortcuts: [
        { label: "Grades", href: "/student/grades" },
        { label: "Calendar", href: "/student/calendar" },
        { label: "All screens", href: "/student/all" },
      ],
      announcements: notifications.map((n) => ({ id: n.id, title: n.title, body: n.body })),
      items: [
        ...notifications.map((n) => ({ label: n.title, sub: n.body })),
        ...(nextAssignment
          ? [
              {
                label: `Next: ${nextAssignment.title}`,
                sub: student?.programName ?? "Program",
              },
            ]
          : []),
      ],
    });
  } catch (err) {
    next(err);
  }
});

meRouter.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    if (!user.roles.includes("student")) {
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN", status: 403 });
    }
    const student = await prisma.student.findFirst({
      where: { institutionId: user.institutionId, personId: user.personId },
      include: { person: true },
    });
    const account = await prisma.account.findFirst({
      where: { id: user.accountId, institutionId: user.institutionId, personId: user.personId },
    });
    if (!student || !account) {
      throw Object.assign(new Error("Student profile not found"), { code: "NOT_FOUND", status: 404 });
    }
    res.json(
      StudentProfileResponse.parse({
        studentId: student.id,
        studentNumber: student.studentNumber,
        givenName: student.person.givenName,
        familyName: student.person.familyName,
        primaryEmail: student.person.email,
        dateOfBirth: student.person.dateOfBirth,
        programName: student.programName,
        standing: student.standing,
        timezone: account.timezone,
      }),
    );
  } catch (error) {
    next(error);
  }
});

meRouter.patch("/preferences", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    if (!user.roles.includes("student")) {
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN", status: 403 });
    }
    const parsed = UpdateStudentPreferencesRequest.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error.issues);
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: parsed.data.timezone }).format();
    } catch {
      throw validationError(
        [{ path: ["timezone"], message: "Timezone must be a valid IANA timezone" }],
        "Timezone must be a valid IANA timezone",
      );
    }
    const account = await prisma.account.findFirst({
      where: { id: user.accountId, institutionId: user.institutionId, personId: user.personId },
    });
    if (!account) throw Object.assign(new Error("Account not found"), { code: "NOT_FOUND", status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.account.update({
        where: { id: account.id },
        data: { timezone: parsed.data.timezone, rowVersion: { increment: 1 } },
      });
      await writeAuditAndOutbox(tx, {
        institutionId: user.institutionId,
        actorId: user.accountId,
        eventName: "Student.preferencesUpdated",
        purpose: "profile_preference",
        before: { timezone: account.timezone },
        after: { timezone: row.timezone },
        source: "me.preferences",
        correlationId: (req as AuthedRequest).correlationId,
      });
      return row;
    });
    res.json({ timezone: updated.timezone });
  } catch (error) {
    next(error);
  }
});

meRouter.post("/profile-change-requests", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    if (!user.roles.includes("student")) {
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN", status: 403 });
    }
    const parsed = RequestStudentProfileChange.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error.issues);
    const student = await prisma.student.findFirst({
      where: { institutionId: user.institutionId, personId: user.personId },
    });
    if (!student) throw Object.assign(new Error("Student not found"), { code: "NOT_FOUND", status: 404 });

    const approval = await requireApproval({
      institutionId: user.institutionId,
      type: "student_profile_change",
      subjectRef: student.id,
      proposedDiff: parsed.data,
      requestedBy: user.accountId,
      requiredApproverRoles: ["registrar"],
      correlationId: (req as AuthedRequest).correlationId,
      eventName: "Student.profileChangeRequested",
      purpose: "official_record_change",
      source: "me.profile",
    });
    res.status(202).json({ approvalRequestId: approval.id, status: "pending" });
  } catch (error) {
    next(error);
  }
});

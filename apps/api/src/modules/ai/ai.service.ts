import type { RoleName, SessionClaims } from "@myheritage/contracts";
import { prisma } from "@myheritage/db";
import type { GroundedCoachFact } from "@myheritage/ai";

const rolePrefixes: Array<{ prefix: string; role: RoleName }> = [
  { prefix: "/student", role: "student" },
  { prefix: "/instructor", role: "instructor" },
  { prefix: "/admin", role: "admin" },
  { prefix: "/applicant", role: "applicant" },
  { prefix: "/employer", role: "employer" },
];

function hasRole(user: SessionClaims, role: RoleName) {
  return role === "admin"
    ? user.roles.includes("admin") || user.roles.includes("registrar")
    : user.roles.includes(role);
}

export function resolveCoachRole(user: SessionClaims, contextPath?: string): RoleName {
  if (contextPath) {
    const requested = rolePrefixes.find(({ prefix }) => contextPath === prefix || contextPath.startsWith(`${prefix}/`));
    if (!requested || !hasRole(user, requested.role)) {
      throw Object.assign(new Error("Coach context is not available for this role"), {
        code: "FORBIDDEN",
        status: 403,
      });
    }
    if (requested.role === "admin" && !user.roles.includes("admin") && user.roles.includes("registrar")) {
      return "registrar";
    }
    return requested.role;
  }

  const role = (["student", "instructor", "admin", "registrar", "applicant", "employer"] as RoleName[]).find(
    (candidate) => user.roles.includes(candidate),
  );
  if (!role) {
    throw Object.assign(new Error("Coach is not available for this account"), {
      code: "FORBIDDEN",
      status: 403,
    });
  }
  return role;
}

function homeFor(role: RoleName) {
  return role === "registrar" ? "/admin" : `/${role}`;
}

function safePortalRecord(text: string) {
  return !/(?:passport|social security|\bssn\b|\bsin\b)/i.test(text);
}

function campusDate(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  })
    .format(value)
    .replace(/\.$/, "");
}

export async function buildCoachFacts(user: SessionClaims, role: RoleName): Promise<GroundedCoachFact[]> {
  const [person, institution] = await Promise.all([
    prisma.person.findFirst({
      where: { id: user.personId, institutionId: user.institutionId },
      select: { id: true, givenName: true, familyName: true },
    }),
    prisma.institution.findFirst({
      where: { institutionId: user.institutionId },
      select: { id: true, name: true, timezone: true },
    }),
  ]);
  if (!person) {
    throw Object.assign(new Error("Account profile not found"), { code: "NOT_FOUND", status: 404 });
  }

  const facts: GroundedCoachFact[] = [
    {
      id: `profile:${person.id}`,
      title: "Your campus profile",
      uri: homeFor(role),
      text: `${person.givenName} ${person.familyName} is signed in to the ${role} workspace.`,
      kind: "profile",
    },
  ];
  if (institution) {
    facts.push({
      id: `institution:${institution.id}`,
      title: institution.name,
      uri: homeFor(role),
      text: `${institution.name} uses ${institution.timezone} as its campus timezone.`,
      kind: "institution",
    });
  }

  if (role === "student") {
    const campusTimeZone = institution?.timezone ?? "UTC";
    const student = await prisma.student.findFirst({
      where: { institutionId: user.institutionId, personId: user.personId },
      select: { id: true, studentNumber: true, programName: true, standing: true },
    });
    if (!student) throw Object.assign(new Error("Student record not found"), { code: "NOT_FOUND", status: 404 });
    facts.push({
      id: `student:${student.id}`,
      title: "Your student record",
      uri: "/student/profile",
      text: `Program: ${student.programName}; academic standing: ${student.standing}.`,
      kind: "profile",
    });

    const [enrolments, assignments, sessions, grades] = await Promise.all([
      prisma.enrolment.findMany({
        where: {
          institutionId: user.institutionId,
          studentId: student.id,
          status: { in: ["enrolled", "completed"] },
        },
        include: { section: { include: { course: true } } },
        take: 8,
      }),
      prisma.assignment.findMany({
        where: {
          institutionId: user.institutionId,
          section: {
            institutionId: user.institutionId,
            enrolments: {
              some: {
                institutionId: user.institutionId,
                studentId: student.id,
                status: { in: ["enrolled", "completed"] },
              },
            },
          },
        },
        include: { section: { include: { course: true } } },
        orderBy: [{ dueAt: "asc" }, { title: "asc" }],
        take: 8,
      }),
      prisma.classSession.findMany({
        where: {
          institutionId: user.institutionId,
          section: {
            institutionId: user.institutionId,
            enrolments: {
              some: {
                institutionId: user.institutionId,
                studentId: student.id,
                status: { in: ["enrolled", "completed"] },
              },
            },
          },
        },
        include: { section: { include: { course: true } } },
        orderBy: { startsAt: "asc" },
        take: 5,
      }),
      prisma.gradeItem.findMany({
        where: { institutionId: user.institutionId, studentId: student.id, status: "published" },
        include: { assignment: { include: { section: { include: { course: true } } } } },
        orderBy: { publishedAt: "desc" },
        take: 5,
      }),
    ]);

    facts.push(
      ...enrolments.map((entry) => ({
        id: `course:${entry.sectionId}`,
        title: `${entry.section.course.code} - ${entry.section.course.title}`,
        uri: `/student/courses/${entry.sectionId}`,
        text: `${entry.section.course.code} (${entry.section.code}) is ${entry.status}.`,
        kind: "course" as const,
      })),
      ...assignments.map((assignment) => ({
        id: `assignment:${assignment.id}`,
        title: `${assignment.section.course.code} - ${assignment.title}`,
        uri: `/student/assignments/${assignment.id}`,
        text: `${assignment.title} for ${assignment.section.course.code}${assignment.dueAt ? ` is due ${campusDate(assignment.dueAt, campusTimeZone)}` : " has no published due date"}.`,
        kind: "assignment" as const,
      })),
      ...sessions.map((session) => ({
        id: `session:${session.id}`,
        title: `${session.section.course.code} - ${session.title}`,
        uri: "/student/calendar",
        text: `${session.title} for ${session.section.course.code} starts ${campusDate(session.startsAt, campusTimeZone)}${session.location ? ` at ${session.location}` : ""}.`,
        kind: "session" as const,
      })),
      ...grades.map((grade) => ({
        id: `grade:${grade.id}`,
        title: `${grade.assignment.section.course.code} - ${grade.assignment.title}`,
        uri: "/student/grades",
        text: `${grade.assignment.title} has a published score of ${grade.score ?? "not scored"}/${grade.maxScore}${grade.letter ? ` (${grade.letter})` : ""}.`,
        kind: "grade" as const,
      })),
    );
  } else if (role === "instructor") {
    const sections = await prisma.section.findMany({
      where: { institutionId: user.institutionId, instructorPersonId: user.personId },
      include: { course: true, assignments: true, _count: { select: { enrolments: true } } },
      take: 10,
    });
    facts.push(
      ...sections.map((section) => ({
        id: `section:${section.id}`,
        title: `${section.course.code} - ${section.code}`,
        uri: "/instructor/sections",
        text: `${section.course.code} ${section.code} has ${section._count.enrolments} enrolled records and ${section.assignments.length} assignments.`,
        kind: "course" as const,
      })),
    );
    const draftGrades = await prisma.gradeItem.count({
      where: {
        institutionId: user.institutionId,
        status: "draft",
        assignment: { section: { institutionId: user.institutionId, instructorPersonId: user.personId } },
      },
    });
    facts.push({
      id: `gradebook:${user.personId}`,
      title: "Your gradebook",
      uri: "/instructor/gradebook",
      text: `${draftGrades} grade items in your assigned sections remain in draft.`,
      kind: "grade",
    });
  } else if (role === "admin" || role === "registrar") {
    const [students, sections, pendingApprovals, auditEvents] = await Promise.all([
      prisma.student.count({ where: { institutionId: user.institutionId } }),
      prisma.section.count({ where: { institutionId: user.institutionId } }),
      prisma.approvalRequest.count({ where: { institutionId: user.institutionId, status: "pending" } }),
      prisma.auditEvent.count({ where: { institutionId: user.institutionId } }),
    ]);
    facts.push(
      {
        id: `operations:students:${user.institutionId}`,
        title: "Student operations",
        uri: "/admin/students",
        text: `${students} student records are currently held by the institution.`,
        kind: "institution",
      },
      {
        id: `operations:sections:${user.institutionId}`,
        title: "Academic operations",
        uri: "/admin/sections",
        text: `${sections} course sections are configured.`,
        kind: "course",
      },
      {
        id: `operations:approvals:${user.institutionId}`,
        title: "Approval inbox",
        uri: "/admin/approvals",
        text: `${pendingApprovals} approval requests are pending human review.`,
        kind: "approval",
      },
      {
        id: `operations:audit:${user.institutionId}`,
        title: "Audit activity",
        uri: "/admin/audit",
        text: `${auditEvents} audit events are available for governance review.`,
        kind: "institution",
      },
    );
  } else {
    const portalRole = role;
    const records = await prisma.portalRecord.findMany({
      where: {
        institutionId: user.institutionId,
        role: portalRole,
        OR: [{ audienceAccountId: null }, { audienceAccountId: user.accountId }],
      },
      orderBy: [{ screenPath: "asc" }, { sortOrder: "asc" }],
      take: 20,
    });
    facts.push(
      ...records
        .filter((record) => safePortalRecord(`${record.primaryText} ${record.secondaryText ?? ""}`))
        .map((record) => ({
          id: `portal:${record.id}`,
          title: record.primaryText,
          uri: record.href?.startsWith("/") ? record.href : homeFor(role),
          text: [record.primaryText, record.secondaryText, record.metaText].filter(Boolean).join(" - "),
          kind: "portal" as const,
        })),
    );
  }

  const unread = await prisma.notification.count({
    where: { institutionId: user.institutionId, recipientAccountId: user.accountId, readAt: null },
  });
  facts.push({
    id: `notifications:${user.accountId}`,
    title: "Your notifications",
    uri: `${homeFor(role)}/notifications`,
    text: `You have ${unread} unread notifications.`,
    kind: "notification",
  });

  return facts;
}

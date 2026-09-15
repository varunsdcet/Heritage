import { prisma } from "@myheritage/db";
import type { SessionClaims } from "@myheritage/contracts";

export type PortalRow = {
  primary: string;
  secondary?: string;
  meta?: string;
  href?: string;
};

export type PortalView = {
  path: string;
  title: string;
  subtitle: string;
  role: "student" | "instructor" | "admin" | "applicant" | "employer";
  active: string;
  breadcrumb: string[];
  metrics: Array<{ label: string; value: string; hint?: string }>;
  sections: Array<{ title: string; rows: PortalRow[] }>;
  actions: Array<{ label: string; href: string; variant?: "primary" | "secondary" | "ai" }>;
  live: true;
};

function roleFor(user: SessionClaims, path: string): PortalView["role"] {
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/instructor") || path.startsWith("/m/instructor")) return "instructor";
  if (path.startsWith("/applicant")) return "applicant";
  if (path.startsWith("/employer")) return "employer";
  if (user.roles.includes("instructor") && path.startsWith("/m/")) return "instructor";
  if (user.roles.includes("admin") || user.roles.includes("registrar")) {
    if (path.startsWith("/admin")) return "admin";
  }
  return "student";
}

function titleFromPath(path: string): string {
  const leaf = path.split("/").filter(Boolean).pop() ?? "Home";
  if (leaf === "student" || leaf === "instructor" || leaf === "admin" || leaf === "applicant" || leaf === "employer") {
    return "Home";
  }
  return leaf
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function institutionMeta(institutionId: string) {
  const [institution, term] = await Promise.all([
    prisma.institution.findFirst({ where: { institutionId } }),
    prisma.term.findFirst({ where: { institutionId }, orderBy: { code: "desc" } }),
  ]);
  return {
    institutionName: institution?.name ?? "Heritage College",
    campus: institution ? `${institution.city}, ${institution.region}` : "Surrey, BC",
    termName: term?.name ?? "Fall 2026",
    termCode: term?.code ?? "2026F",
  };
}

async function portalRows(institutionId: string, path: string, accountId?: string) {
  const rows = await prisma.portalRecord.findMany({
    where: {
      institutionId,
      screenPath: path,
      OR: [{ audienceAccountId: null }, ...(accountId ? [{ audienceAccountId: accountId }] : [])],
    },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((r) => ({
    primary: r.primaryText,
    secondary: r.secondaryText ?? undefined,
    meta: r.metaText ?? undefined,
    href: r.href ?? undefined,
  }));
}

async function coursesFor(user: SessionClaims): Promise<PortalRow[]> {
  if (user.roles.includes("admin") || user.roles.includes("registrar")) {
    const sections = await prisma.section.findMany({
      where: { institutionId: user.institutionId },
      include: { course: true, term: true, _count: { select: { enrolments: true } } },
    });
    return sections.map((s) => ({
      primary: `${s.course.code} · ${s.course.title}`,
      secondary: `${s.code} · ${s.term.code} · ${s._count.enrolments} enrolled`,
      meta: "Active",
      href: `/admin/sections`,
    }));
  }
  if (user.roles.includes("instructor")) {
    const sections = await prisma.section.findMany({
      where: { institutionId: user.institutionId, instructorPersonId: user.personId },
      include: { course: true, term: true, _count: { select: { enrolments: true } } },
    });
    return sections.map((s) => ({
      primary: `${s.course.code} · ${s.course.title}`,
      secondary: `${s.code} · ${s._count.enrolments} students`,
      meta: s.term.code,
      href: `/instructor/sections/${s.id}`,
    }));
  }
  const student = await prisma.student.findFirst({
    where: { institutionId: user.institutionId, personId: user.personId },
  });
  if (!student) return [];
  const enrolments = await prisma.enrolment.findMany({
    where: { institutionId: user.institutionId, studentId: student.id, status: "enrolled" },
    include: { section: { include: { course: true, term: true } } },
  });
  const instructorIds = [...new Set(enrolments.map((e) => e.section.instructorPersonId))];
  const instructors = await prisma.person.findMany({ where: { id: { in: instructorIds } } });
  const names = new Map(instructors.map((p) => [p.id, `${p.givenName} ${p.familyName}`]));
  return enrolments.map((e) => ({
    primary: `${e.section.course.code} · ${e.section.course.title}`,
    secondary: `${e.section.code} · ${names.get(e.section.instructorPersonId) ?? "TBA"} · ${e.section.course.credits} credits`,
    meta: e.status,
    href: `/student/courses/${e.sectionId}`,
  }));
}

async function gradesFor(user: SessionClaims): Promise<{ metrics: PortalView["metrics"]; rows: PortalRow[] }> {
  const student = await prisma.student.findFirst({
    where: { institutionId: user.institutionId, personId: user.personId },
  });
  if (!student) return { metrics: [], rows: [] };
  const grades = await prisma.gradeItem.findMany({
    where: { institutionId: user.institutionId, studentId: student.id, status: "published" },
    include: { assignment: { include: { section: { include: { course: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
  const published = grades.filter((g) => g.status === "published");
  const rows = published.map((g) => ({
    primary: `${g.assignment.section.course.code} · ${g.assignment.title}`,
    secondary: `Status: ${g.status}`,
    meta: g.score != null ? `${g.score}/${g.maxScore} ${g.letter ?? ""}`.trim() : "Pending",
    href: "/student/grades",
  }));
  const avg =
    published.length > 0
      ? (published.reduce((n, g) => n + ((g.score ?? 0) / g.maxScore) * 100, 0) / published.length).toFixed(1)
      : "—";
  return {
    metrics: [
      { label: "Items", value: String(published.length) },
      { label: "Published", value: String(published.length) },
      { label: "Avg %", value: String(avg) },
    ],
    rows,
  };
}

async function calendarFor(user: SessionClaims): Promise<PortalRow[]> {
  const assignments = await prisma.assignment.findMany({
    where: { institutionId: user.institutionId, dueAt: { not: null } },
    include: { section: { include: { course: true } } },
    orderBy: { dueAt: "asc" },
    take: 20,
  });
  const rows = assignments.map((a) => ({
    primary: `${a.section.course.code} · ${a.title}`,
    secondary: a.dueAt ? new Date(a.dueAt).toLocaleString() : "TBA",
    meta: "Deadline",
    href: user.roles.includes("instructor") ? "/instructor/assessments" : "/student/assessments",
  }));
  const extra = await portalRows(user.institutionId, "/calendar", user.accountId);
  return [...rows, ...extra];
}

async function notificationsFor(user: SessionClaims): Promise<PortalRow[]> {
  const items = await prisma.notification.findMany({
    where: { institutionId: user.institutionId, recipientAccountId: user.accountId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return items.map((n) => ({
    primary: n.title,
    secondary: n.body,
    meta: n.readAt ? "Read" : "Unread",
    href: user.roles.includes("instructor")
      ? "/instructor/notifications"
      : user.roles.includes("admin") || user.roles.includes("registrar")
        ? "/admin/notifications"
        : "/student/notifications",
  }));
}

async function messagesFor(user: SessionClaims): Promise<PortalRow[]> {
  const threads = await prisma.messageThread.findMany({
    where: {
      institutionId: user.institutionId,
      participantAccountIdsJson: { contains: user.accountId },
    },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  return threads.map((t) => ({
    primary: t.subject,
    secondary: t.messages[0]?.body ?? "No messages yet",
    meta: t.messages[0] ? new Date(t.messages[0].createdAt).toLocaleString() : "",
    href: user.roles.includes("instructor") ? "/instructor/messages" : "/student/messages",
  }));
}

async function approvalsFor(user: SessionClaims): Promise<PortalRow[]> {
  const items = await prisma.approvalRequest.findMany({
    where: { institutionId: user.institutionId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return items.map((a) => ({
    primary: `${a.type} · ${a.status}`,
    secondary: a.subjectRef,
    meta: new Date(a.createdAt).toLocaleString(),
    href: "/admin/approvals",
  }));
}

async function peopleFor(user: SessionClaims): Promise<PortalRow[]> {
  const people = await prisma.person.findMany({
    where: { institutionId: user.institutionId },
    include: { accounts: true, students: true },
    orderBy: { familyName: "asc" },
  });
  return people.map((p) => {
    const roles = p.accounts[0] ? JSON.parse(p.accounts[0].rolesJson) as string[] : [];
    return {
      primary: `${p.givenName} ${p.familyName}`,
      secondary: p.email,
      meta: roles.join(", ") || (p.students[0]?.studentNumber ?? "Person"),
      href: "/admin/users",
    };
  });
}

async function rosterFor(user: SessionClaims): Promise<PortalRow[]> {
  const sections = await prisma.section.findMany({
    where: user.roles.includes("instructor")
      ? { institutionId: user.institutionId, instructorPersonId: user.personId }
      : { institutionId: user.institutionId },
    include: {
      course: true,
      enrolments: { include: { student: { include: { person: true } } } },
    },
  });
  const rows: PortalRow[] = [];
  for (const s of sections) {
    for (const e of s.enrolments) {
      rows.push({
        primary: `${e.student.person.givenName} ${e.student.person.familyName}`,
        secondary: `${s.course.code} · ${e.student.studentNumber} · ${e.student.programName}`,
        meta: e.student.standing,
        href: "/instructor/roster",
      });
    }
  }
  return rows;
}

export async function buildPortalView(user: SessionClaims, path: string): Promise<PortalView> {
  const role = roleFor(user, path);
  const meta = await institutionMeta(user.institutionId);
  const title = titleFromPath(path);
  const active =
    path.includes("/approvals")
      ? "Approvals Inbox"
      : path.endsWith(`/${role}`) || path === `/${role}`
        ? role === "admin"
          ? "Overview"
          : "Home"
        : title;
  const breadcrumb = [role === "instructor" ? "Teacher" : role[0]!.toUpperCase() + role.slice(1), title];

  const base: PortalView = {
    path,
    title,
    subtitle: `${meta.termName} · ${meta.campus}`,
    role,
    active,
    breadcrumb,
    metrics: [
      { label: "Institution", value: meta.institutionName },
      { label: "Term", value: meta.termCode },
      { label: "Campus", value: meta.campus },
    ],
    sections: [],
    actions: [],
    live: true,
  };

  const normalized = path.replace(/\/demo$/, "").replace(/\/$/, "") || path;

  // Domain-backed screens
  if (
    normalized.endsWith("/courses") ||
    normalized.endsWith("/sections") ||
    normalized.includes("/courses/") ||
    normalized.includes("/sections/") ||
    normalized.endsWith("/continue") ||
    normalized.endsWith("/modules")
  ) {
    const rows = await coursesFor(user);
    base.metrics = [
      { label: "Sections", value: String(rows.length) },
      { label: "Term", value: meta.termCode },
      { label: "Campus", value: meta.campus },
    ];
    base.sections = [{ title: "Live catalogue", rows }];
    base.actions = [
      { label: "Open home", href: `/${role === "admin" ? "admin" : role === "instructor" ? "instructor" : "student"}` },
      ...(role === "student"
        ? [{ label: "View grades", href: "/student/grades", variant: "secondary" as const }]
        : role === "instructor"
          ? [{ label: "Open gradebook", href: "/instructor/gradebook", variant: "secondary" as const }]
          : [{ label: "Approvals", href: "/admin/approvals", variant: "secondary" as const }]),
    ];
    if (!rows.length) {
      const fallback = await portalRows(user.institutionId, normalized, user.accountId);
      base.sections = [{ title: "Catalogue", rows: fallback }];
    }
    return base;
  }

  if (normalized.endsWith("/grades") || normalized.endsWith("/assessments") || normalized.endsWith("/submissions")) {
    if (role === "student" || path.startsWith("/m/student")) {
      const g = await gradesFor(user);
      base.metrics = g.metrics.length ? g.metrics : base.metrics;
      base.sections = [{ title: "Grade items", rows: g.rows }];
      base.actions = [
        { label: "Ask about a grade", href: "/student/messages" },
        { label: "Courses", href: "/student/courses", variant: "secondary" },
      ];
      return base;
    }
    if (role === "instructor") {
      const sections = await coursesFor(user);
      base.sections = [{ title: "Sections ready for grading", rows: sections }];
      base.actions = [
        { label: "Open gradebook", href: "/instructor/gradebook" },
        { label: "Attendance", href: "/instructor/attendance", variant: "secondary" },
      ];
      return base;
    }
  }

  if (normalized.endsWith("/calendar") || normalized.endsWith("/schedule")) {
    const rows = await calendarFor(user);
    base.sections = [{ title: "Upcoming", rows }];
    base.actions = [{ label: "Assessments", href: role === "instructor" ? "/instructor/assessments" : "/student/assessments" }];
    return base;
  }

  if (normalized.endsWith("/notifications")) {
    const rows = await notificationsFor(user);
    base.metrics = [
      { label: "Unread", value: String(rows.filter((r) => r.meta === "Unread").length) },
      { label: "Total", value: String(rows.length) },
      { label: "Term", value: meta.termCode },
    ];
    base.sections = [{ title: "Inbox", rows }];
    base.actions = [{ label: "Messages", href: role === "instructor" ? "/instructor/messages" : "/student/messages", variant: "secondary" }];
    return base;
  }

  if (normalized.endsWith("/messages")) {
    const rows = await messagesFor(user);
    base.sections = [{ title: "Threads", rows }];
    base.actions = [
      { label: "Notifications", href: role === "instructor" ? "/instructor/notifications" : "/student/notifications", variant: "secondary" },
    ];
    return base;
  }

  if (normalized.endsWith("/approvals")) {
    const rows = await approvalsFor(user);
    base.metrics = [
      { label: "Pending", value: String(rows.filter((r) => r.primary.includes("pending")).length) },
      { label: "Total", value: String(rows.length) },
      { label: "Term", value: meta.termCode },
    ];
    base.sections = [{ title: "Approval queue", rows }];
    base.actions = [{ label: "Open inbox UI", href: "/admin/approvals" }];
    return base;
  }

  if (normalized.endsWith("/users") || normalized.endsWith("/students") || normalized.endsWith("/profile")) {
    if (role === "admin") {
      const rows = await peopleFor(user);
      base.metrics = [
        { label: "People", value: String(rows.length) },
        { label: "Institution", value: meta.institutionName },
        { label: "Term", value: meta.termCode },
      ];
      base.sections = [{ title: "Directory", rows }];
      base.actions = [{ label: "Search", href: "/admin/search", variant: "secondary" }];
      return base;
    }
    const person = await prisma.person.findUnique({ where: { id: user.personId } });
    const student = await prisma.student.findFirst({
      where: { institutionId: user.institutionId, personId: user.personId },
    });
    base.sections = [
      {
        title: "Profile",
        rows: [
          {
            primary: `${person?.givenName ?? ""} ${person?.familyName ?? ""}`.trim() || "Account",
            secondary: person?.email,
            meta: student?.studentNumber ?? user.roles.join(", "),
          },
          ...(student
            ? [
                {
                  primary: student.programName,
                  secondary: `Standing: ${student.standing}`,
                  meta: student.studentNumber,
                },
              ]
            : []),
        ],
      },
    ];
    base.actions = [{ label: "Security", href: role === "student" ? "/student/profile" : `/${role}/profile`, variant: "secondary" }];
    return base;
  }

  if (normalized.endsWith("/roster") || normalized.endsWith("/attendance")) {
    const rows = await rosterFor(user);
    base.metrics = [
      { label: "Roster size", value: String(rows.length) },
      { label: "Term", value: meta.termCode },
      { label: "Campus", value: meta.campus },
    ];
    base.sections = [{ title: "Students", rows }];
    base.actions = [
      { label: "Gradebook", href: "/instructor/gradebook" },
      { label: "Sections", href: "/instructor/sections", variant: "secondary" },
    ];
    return base;
  }

  // Generic: DB portal records for this path (+ role-wide fallback)
  let rows = await portalRows(user.institutionId, normalized, user.accountId);
  if (!rows.length) {
    // Strip /f/ slug folders to role wildcards
    const roleWild = `/${role}/*`;
    rows = await portalRows(user.institutionId, roleWild, user.accountId);
  }
  if (!rows.length && normalized.includes("/f/")) {
    rows = [
      {
        primary: title,
        secondary: `Live Figma screen ${normalized}`,
        meta: meta.termCode,
        href: role === "admin" ? "/admin" : `/${role}`,
      },
    ];
    // Still mark as API-composed from session/institution — not client fixtures.
  }
  base.sections = [{ title: `${title} records`, rows }];
  base.actions = [
    { label: "Home", href: role === "admin" ? "/admin" : `/${role}` },
    { label: "All screens", href: `/${role}/all`, variant: "secondary" },
  ];
  if (path.startsWith("/m/")) {
    base.actions = [
      { label: "Mobile home", href: role === "instructor" ? "/m/instructor/home" : "/m/student" },
      { label: "Desktop", href: role === "instructor" ? "/instructor" : "/student", variant: "secondary" },
    ];
  }
  return base;
}

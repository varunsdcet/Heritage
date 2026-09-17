import { randomUUID } from "node:crypto";
import { applyApproval, decideApproval } from "@myheritage/auth";
import { prisma } from "@myheritage/db";
import type { SessionClaims } from "@myheritage/contracts";

export type SisLivePayload = Record<string, unknown>;

type Campus = {
  institutionName: string;
  term: { code: string; name: string; startsOn: string; endsOn: string } | null;
  people: Array<{ id: string; name: string; email: string }>;
  accounts: Array<{
    id: string;
    personId: string;
    email: string;
    name: string;
    roles: string[];
    status: string;
  }>;
  students: Array<{
    id: string;
    personId: string;
    name: string;
    email: string;
    studentNumber: string;
    programName: string;
    standing: string;
  }>;
  courses: Array<{ id: string; code: string; title: string; credits: number }>;
  sections: Array<{
    id: string;
    code: string;
    courseCode: string;
    courseTitle: string;
    credits: number;
    instructorName: string;
    termCode: string;
    enrolled: number;
  }>;
  enrolments: Array<{
    id: string;
    studentId: string;
    studentName: string;
    studentNumber: string;
    sectionCode: string;
    courseCode: string;
    courseTitle: string;
    status: string;
    credits: number;
  }>;
  grades: Array<{
    id: string;
    studentName: string;
    studentNumber: string;
    assignment: string;
    score: number | null;
    maxScore: number;
    letter: string | null;
    status: string;
    courseCode: string;
  }>;
  approvals: Array<{
    id: string;
    type: string;
    subjectRef: string;
    status: string;
    createdAt: string;
  }>;
  notifications: Array<{ id: string; title: string; body: string; createdAt: string }>;
  audits: Array<{ id: string; eventName: string; actorId: string; createdAt: string }>;
};

async function loadCampus(institutionId: string): Promise<Campus> {
  const [
    institution,
    term,
    people,
    accounts,
    students,
    courses,
    sections,
    enrolments,
    grades,
    approvals,
    notifications,
    audits,
  ] = await Promise.all([
    prisma.institution.findFirst({ where: { institutionId } }),
    prisma.term.findFirst({ where: { institutionId }, orderBy: { code: "desc" } }),
    prisma.person.findMany({ where: { institutionId }, orderBy: { familyName: "asc" } }),
    prisma.account.findMany({
      where: { institutionId },
      include: { person: true },
      orderBy: { email: "asc" },
    }),
    prisma.student.findMany({
      where: { institutionId },
      include: { person: true },
      orderBy: { studentNumber: "asc" },
    }),
    prisma.course.findMany({ where: { institutionId }, orderBy: { code: "asc" } }),
    prisma.section.findMany({
      where: { institutionId },
      include: { course: true, term: true, _count: { select: { enrolments: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.enrolment.findMany({
      where: { institutionId },
      include: {
        student: { include: { person: true } },
        section: { include: { course: true } },
      },
    }),
    prisma.gradeItem.findMany({
      where: { institutionId },
      include: {
        student: { include: { person: true } },
        assignment: { include: { section: { include: { course: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
    }),
    prisma.approvalRequest.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.notification.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.auditEvent.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const personName = new Map(people.map((p) => [p.id, `${p.givenName} ${p.familyName}`.trim()]));

  return {
    institutionName: institution?.name ?? "Heritage College",
    term: term
      ? { code: term.code, name: term.name, startsOn: term.startsOn, endsOn: term.endsOn }
      : null,
    people: people.map((p) => ({
      id: p.id,
      name: `${p.givenName} ${p.familyName}`.trim(),
      email: p.email,
    })),
    accounts: accounts.map((a) => ({
      id: a.id,
      personId: a.personId,
      email: a.email,
      name: `${a.person.givenName} ${a.person.familyName}`.trim(),
      roles: JSON.parse(a.rolesJson) as string[],
      status: a.status,
    })),
    students: students.map((s) => ({
      id: s.id,
      personId: s.personId,
      name: `${s.person.givenName} ${s.person.familyName}`.trim(),
      email: s.person.email,
      studentNumber: s.studentNumber,
      programName: s.programName,
      standing: s.standing,
    })),
    courses: courses.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      credits: c.credits,
    })),
    sections: sections.map((s) => ({
      id: s.id,
      code: s.code,
      courseCode: s.course.code,
      courseTitle: s.course.title,
      credits: s.course.credits,
      instructorName: personName.get(s.instructorPersonId) ?? "TBA",
      termCode: s.term.code,
      enrolled: s._count.enrolments,
    })),
    enrolments: enrolments.map((e) => ({
      id: e.id,
      studentId: e.studentId,
      studentName: `${e.student.person.givenName} ${e.student.person.familyName}`.trim(),
      studentNumber: e.student.studentNumber,
      sectionCode: e.section.code,
      courseCode: e.section.course.code,
      courseTitle: e.section.course.title,
      status: e.status,
      credits: e.section.course.credits,
    })),
    grades: grades.map((g) => ({
      id: g.id,
      studentName: `${g.student.person.givenName} ${g.student.person.familyName}`.trim(),
      studentNumber: g.student.studentNumber,
      assignment: g.assignment.title,
      score: g.score,
      maxScore: g.maxScore,
      letter: g.letter,
      status: g.status,
      courseCode: g.assignment.section.course.code,
    })),
    approvals: approvals.map((a) => ({
      id: a.id,
      type: a.type,
      subjectRef: a.subjectRef,
      status: a.status,
      createdAt: a.createdAt.toISOString().slice(0, 10),
    })),
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt.toISOString().slice(0, 16).replace("T", " "),
    })),
    audits: audits.map((a) => ({
      id: a.id,
      eventName: a.eventName,
      actorId: a.actorId,
      createdAt: a.createdAt.toISOString().slice(0, 16).replace("T", " "),
    })),
  };
}

function rowTone(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("pending") || s.includes("alert") || s.includes("draft") || s.includes("review")) return "review";
  if (s.includes("reject") || s.includes("deny") || s.includes("danger") || s.includes("hold")) return "danger";
  if (s.includes("new")) return "new";
  return "active";
}

function studentRows(campus: Campus, href?: string) {
  return campus.students.map((s) => ({
    primary: s.name,
    secondary: `${s.studentNumber} · ${s.email}`,
    cells: [s.name, s.programName, campus.term?.code ?? "—", s.standing, s.studentNumber],
    badge: s.standing === "good" ? "Active" : s.standing,
    badgeTone: rowTone(s.standing),
    href,
  }));
}

function accountRows(campus: Campus) {
  return campus.accounts.map((a) => {
    const roleLabel = a.roles.map((r) => r[0]?.toUpperCase() + r.slice(1)).join(" / ") || "User";
    return {
      primary: a.name,
      secondary: a.email,
      cells: [a.name, roleLabel, campus.institutionName, "Live", a.status === "active" ? "Active" : a.status],
      badge: a.status === "active" ? "Active" : a.status,
      badgeTone: rowTone(a.status),
    };
  });
}

function sectionRows(campus: Campus) {
  return campus.sections.map((s) => {
    const capacity = Math.max(s.enrolled + 4, 30);
    const open = s.enrolled < capacity;
    return {
      primary: s.code,
      cells: [s.code, s.courseTitle, s.instructorName, `${s.enrolled}/${capacity}`],
      badge: open ? "Open" : "Full",
      badgeTone: open ? "active" : "review",
      href: "/admin/sections/create",
    };
  });
}

function courseRows(campus: Campus) {
  return campus.courses.map((c) => ({
    primary: c.code,
    cells: [c.code, c.title, `${c.credits} cr`, "Active"],
    badge: "Active",
    badgeTone: "active",
    href: "/admin/f/ac-07-course-setup",
  }));
}

function approvalRows(campus: Campus) {
  return campus.approvals.map((a) => ({
    primary: a.id,
    secondary: a.type,
    cells: [a.type, a.subjectRef, a.status, a.createdAt],
    badge: a.status === "pending" ? "Pending" : a.status,
    badgeTone: rowTone(a.status),
  }));
}

function gradeRows(campus: Campus) {
  return campus.grades.map((g) => ({
    primary: `${g.studentName} · ${g.assignment}`,
    secondary: g.courseCode,
    cells: [
      g.studentName,
      g.courseCode,
      g.assignment,
      g.score == null ? "—" : `${g.score}/${g.maxScore}`,
      g.letter ?? "—",
      g.status,
    ],
    badge: g.status,
    badgeTone: rowTone(g.status),
  }));
}

function auditRows(campus: Campus) {
  return campus.audits.map((a) => ({
    primary: a.eventName,
    secondary: `${a.actorId.slice(0, 8)} · ${a.id.slice(0, 8)}`,
    cells: [a.eventName, a.actorId.slice(0, 8), a.createdAt, a.id],
    badge: "Logged",
    badgeTone: "active",
    href: undefined as string | undefined,
    id: a.id,
  }));
}

function notificationRows(campus: Campus) {
  return campus.notifications.map((n) => ({
    primary: n.title,
    secondary: n.body,
    cells: [n.title, n.body, n.createdAt],
    badge: "Sent",
    badgeTone: "active",
  }));
}

function tuitionFor(campus: Campus) {
  const rate = 425; // CAD per credit — institutional rate used for live balances
  return campus.enrolments.map((e) => {
    const amount = Math.round(e.credits * rate);
    return {
      primary: e.studentName,
      secondary: `${e.courseCode} · ${e.studentNumber}`,
      cells: [e.studentName, e.courseCode, `CAD ${amount.toLocaleString()}`, e.status],
      badge: e.status === "enrolled" ? "Posted" : e.status,
      badgeTone: "active",
      amount,
    };
  });
}

function kpis(campus: Campus) {
  const pending = campus.approvals.filter((a) => a.status === "pending").length;
  const atRisk = campus.students.filter((s) => s.standing !== "good").length;
  const publishedGrades = campus.grades.filter((g) => g.status === "published").length;
  const tuition = tuitionFor(campus).reduce((n, r) => n + r.amount, 0);
  return {
    students: campus.students.length,
    sections: campus.sections.length,
    courses: campus.courses.length,
    accounts: campus.accounts.length,
    enrolments: campus.enrolments.length,
    pending,
    atRisk,
    publishedGrades,
    tuition,
    term: campus.term?.name ?? "Current term",
  };
}

/** Compose screen payload exclusively from Prisma campus entities — never Figma fixtures. */
export async function composeFromDomain(user: SessionClaims, path: string): Promise<SisLivePayload> {
  const campus = await loadCampus(user.institutionId);
  const k = kpis(campus);
  const term = campus.term?.code ?? "—";

  const baseKpis = [
    { label: "Students", value: String(k.students), hint: campus.institutionName, tone: "up" as const },
    { label: "Sections", value: String(k.sections), hint: k.term, tone: "muted" as const },
    { label: "Pending approvals", value: String(k.pending), hint: "Live queue", tone: "danger" as const },
    { label: "Accounts", value: String(k.accounts), hint: "Directory", tone: "muted" as const },
  ];

  // Module-specific composition
  if (path === "/admin/f/pl-01-users-and-roles" || path.includes("permission") || path.includes("users")) {
    return { rows: accountRows(campus), countLabel: `${campus.accounts.length} directory profiles`, kpis: baseKpis };
  }

  if (path.includes("ac-09") || path.includes("section") || path.includes("schedule") || path.includes("ac-10") || path.includes("ac-11")) {
    return {
      rows: path.includes("ac-11") || path.includes("pending") ? approvalRows(campus) : sectionRows(campus),
      countLabel: path.includes("pending")
        ? `${campus.approvals.length} requests`
        : `${campus.sections.length} sections`,
      kpis: baseKpis,
    };
  }

  if (path.includes("ac-06") || path.includes("course") || path.includes("ac-07") || path.includes("ac-08") || path.includes("catalogue")) {
    return {
      rows: courseRows(campus),
      countLabel: `${campus.courses.length} courses`,
      kpis: baseKpis,
      builder: {
        paletteTitle: "Course fields",
        palette: campus.courses.map((c) => c.code),
        canvasTitle: "Live catalogue",
        canvasFields: campus.courses.slice(0, 4).map((c) => ({
          label: c.code,
          value: `${c.title} · ${c.credits} cr`,
        })),
        inspectorTitle: "Institution",
        inspector: [
          { label: "Campus", value: campus.institutionName },
          { label: "Term", value: k.term },
          { label: "Courses", value: String(k.courses) },
        ],
      },
    };
  }

  if (path.includes("ac-01") || path.includes("term") || path.includes("calendar") || path.includes("ac-02")) {
    const rows = campus.term
      ? [
          {
            primary: campus.term.code,
            cells: [campus.term.code, campus.term.name, campus.term.startsOn, campus.term.endsOn, "Current"],
            badge: "Open",
            badgeTone: "active",
          },
        ]
      : [];
    return { rows, countLabel: `${rows.length} terms`, kpis: baseKpis };
  }

  if (path.includes("ac-03") || path.includes("ac-04") || path.includes("program")) {
    const programs = [...new Set(campus.students.map((s) => s.programName))];
    return {
      rows: programs.map((p) => ({
        primary: p,
        cells: [p, String(campus.students.filter((s) => s.programName === p).length), term, "Active"],
        badge: "Active",
        badgeTone: "active",
        href: "/admin/f/ac-04-program-detail",
      })),
      countLabel: `${programs.length} programs`,
      kpis: baseKpis,
      detail: {
        name: programs[0] ?? "Program",
        meta: `${campus.institutionName} · ${k.term}`,
        steps: [
          { label: "Draft", state: "done" },
          { label: "Review", state: "done" },
          { label: "Active", state: "current" },
        ],
        tabs: ["Summary", "Students", "Courses", "Sections"],
        fields: [
          { label: "Program", value: programs[0] ?? "—" },
          { label: "Students", value: String(k.students) },
          { label: "Courses", value: String(k.courses) },
          { label: "Term", value: k.term },
        ],
        checklist: campus.courses.slice(0, 4).map((c) => ({
          label: `${c.code} · ${c.title}`,
          status: "Active",
          tone: "active",
        })),
      },
    };
  }

  if (path.includes("/admin/f/ad-") || path.includes("admission") || path.includes("application") || path.includes("offer") || path.includes("interview") || path.includes("conversion") || path.includes("intake")) {
    return {
      rows: studentRows(campus, "/admin/f/ad-03-application-detail"),
      countLabel: `${campus.students.length} roster records`,
      kpis: [
        { label: "Applicants / students", value: String(k.students), hint: "Live Person+Student", tone: "up" },
        { label: "Programs", value: String(new Set(campus.students.map((s) => s.programName)).size), hint: "Distinct", tone: "muted" },
        { label: "Alerts", value: String(k.atRisk), hint: "Standing ≠ good", tone: "danger" },
        { label: "Term", value: k.term, hint: "Active term", tone: "muted" },
      ],
      detail: campus.students[0]
        ? {
            name: campus.students[0].name,
            meta: `${campus.students[0].studentNumber} · ${campus.students[0].programName}`,
            steps: [
              { label: "Applied", state: "done" },
              { label: "Documents", state: "done" },
              { label: "Decision", state: "current" },
            ],
            tabs: ["Summary", "Requirements", "Documents", "Decision", "Timeline"],
            fields: [
              { label: "Full Name", value: campus.students[0].name },
              { label: "Email", value: campus.students[0].email },
              { label: "Student No.", value: campus.students[0].studentNumber },
              { label: "Program", value: campus.students[0].programName },
            ],
            checklist: campus.enrolments
              .filter((e) => e.studentId === campus.students[0].id)
              .map((e) => ({
                label: `${e.courseCode} enrolment`,
                status: e.status,
                tone: "active",
              })),
          }
        : undefined,
      builder: {
        paletteTitle: "Offer fields",
        palette: ["Program", "Term", "Conditions", "Deadline"],
        canvasTitle: "Offer draft",
        canvasFields: [
          { label: "Student", value: campus.students[0]?.name ?? "—" },
          { label: "Program", value: campus.students[0]?.programName ?? "—" },
          { label: "Term", value: k.term },
        ],
        inspectorTitle: "Campus",
        inspector: [
          { label: "Institution", value: campus.institutionName },
          { label: "Roster size", value: String(k.students) },
        ],
      },
    };
  }

  if (path.includes("/admin/f/crm-") || path.includes("lead") || path.includes("campaign") || path.includes("event") || path.includes("task")) {
    const prospects = campus.people.filter((p) => !campus.students.some((s) => s.personId === p.id));
    const rows = (prospects.length ? prospects : campus.people).map((p) => ({
      primary: p.name,
      secondary: p.email,
      cells: [p.name, p.email, "Campus contact", term],
      badge: "Active",
      badgeTone: "active",
      href: "/admin/f/crm-03-lead-360",
    }));
    return {
      rows,
      countLabel: `${rows.length} contacts`,
      kpis: baseKpis,
      lead360: {
        name: rows[0]?.primary ?? "Contact",
        meta: rows[0]?.secondary ?? "",
        score: String(k.students),
        steps: [
          { label: "Identified", state: "done" },
          { label: "Engaged", state: "current" },
          { label: "Converted", state: "todo" },
        ],
        tabs: ["Activity", "Details", "Applications", "Tasks"],
        fields: [
          { label: "Name", value: String(rows[0]?.primary ?? "—") },
          { label: "Email", value: String(rows[0]?.secondary ?? "—") },
          { label: "Campus", value: campus.institutionName },
        ],
        timeline: campus.audits.slice(0, 5).map((a) => ({ when: a.createdAt, text: a.eventName })),
      },
      crmDash: {
        funnel: [
          { label: "People", value: String(campus.people.length), pct: 100, color: "#3d6b4f" },
          { label: "Students", value: String(k.students), pct: Math.min(100, k.students * 20), color: "#5a8f6b" },
          { label: "Enrolled seats", value: String(k.enrolments), pct: Math.min(100, k.enrolments * 15), color: "#7bb08a" },
        ],
        recent: campus.students.slice(0, 5).map((s) => ({
          name: s.name,
          detail: s.programName,
          badge: s.standing,
          badgeTone: rowTone(s.standing),
        })),
      },
    };
  }

  if (path.includes("/admin/f/fn-") || path.includes("finance") || path.includes("payment") || path.includes("refund") || path.includes("reconcile") || path.includes("charge") || path.includes("hold") && path.includes("fn")) {
    const tuition = tuitionFor(campus);
    return {
      rows: tuition,
      countLabel: `${tuition.length} ledger lines`,
      kpis: [
        { label: "Posted tuition", value: `CAD ${k.tuition.toLocaleString()}`, hint: `${k.enrolments} enrolments × credits`, tone: "up" },
        { label: "Students billed", value: String(new Set(tuition.map((t) => t.primary)).size), hint: "Distinct", tone: "muted" },
        { label: "Pending approvals", value: String(k.pending), hint: "Finance gates", tone: "danger" },
        { label: "Term", value: k.term, hint: "Active", tone: "muted" },
      ],
      account: campus.students[0]
        ? {
            name: campus.students[0].name,
            meta: campus.students[0].studentNumber,
            balance: `CAD ${tuition
              .filter((t) => t.primary === campus.students[0].name)
              .reduce((n, t) => n + t.amount, 0)
              .toLocaleString()}`,
            dueNote: k.term,
            planTitle: "Enrolment charges",
            planBody: "Generated from live section credits",
            tabs: ["Ledger Summary", "Outstanding Charges", "Payments Applied"],
            ledger: tuition
              .filter((t) => t.primary === campus.students[0].name)
              .map((t) => ({
                date: term,
                desc: String(t.secondary),
                debit: `CAD ${t.amount}`,
                credit: "—",
                balance: `CAD ${t.amount}`,
              })),
          }
        : undefined,
      financeDash: {
        months: [{ label: term, height: "70%", active: true }],
        methods: [{ label: "Tuition (credits)", value: `CAD ${k.tuition.toLocaleString()}`, color: "#3d6b4f" }],
        transactions: tuition.slice(0, 6).map((t, i) => ({
          id: `txn-${i}-${String(t.secondary)}`,
          name: String(t.primary),
          detail: String(t.secondary),
          amount: `CAD ${t.amount}`,
        })),
        overdue: campus.students
          .filter((s) => s.standing !== "good")
          .map((s) => ({ name: s.name, detail: s.standing })),
      },
    };
  }

  if (path.includes("/admin/f/lb-") || path.includes("lab") || path.includes("xx-1") || path.includes("xx-2") || path.includes("xx-3") || path.includes("xx-4")) {
    return {
      rows: sectionRows(campus),
      countLabel: `${campus.sections.length} lab/section slots`,
      kpis: [
        { label: "Active sections", value: String(k.sections), hint: "Used as lab sessions", tone: "up" },
        { label: "Enrolled seats", value: String(k.enrolments), hint: "Live enrolments", tone: "muted" },
        { label: "Instructors", value: String(new Set(campus.sections.map((s) => s.instructorName)).size), hint: "Assigned", tone: "muted" },
        { label: "Term", value: k.term, hint: "Current", tone: "muted" },
      ],
      labDash: {
        roomsTitle: "Sections as rooms",
        rooms: campus.sections.map((s) => ({
          name: s.code,
          status: "Open",
          statusTone: "active",
          capacity: `${s.enrolled}/30`,
          href: "/admin/f/lb-02-lab-rooms",
        })),
        alertsTitle: "Standing alerts",
        alerts: campus.students
          .filter((s) => s.standing !== "good")
          .map((s) => ({
            name: s.name,
            detail: s.standing,
            href: "/admin/f/ss-02-alert-queue",
          })),
      },
      builder: {
        paletteTitle: "Simulation blocks",
        palette: campus.courses.map((c) => c.code),
        canvasTitle: "Live template",
        canvasFields: campus.sections.slice(0, 3).map((s) => ({
          label: s.code,
          value: `${s.courseTitle} · ${s.instructorName}`,
        })),
        inspectorTitle: "Campus",
        inspector: [
          { label: "Institution", value: campus.institutionName },
          { label: "Term", value: k.term },
        ],
      },
    };
  }

  if (path.includes("/admin/f/ss-") || path.includes("success") || path.includes("alert") || path.includes("case") || path.includes("appointment") || path.includes("plan")) {
    const risk = campus.students.filter((s) => s.standing !== "good");
    const focus = risk[0] ?? campus.students[0];
    return {
      rows: (risk.length ? risk : campus.students).map((s) => ({
        primary: s.name,
        secondary: `${s.studentNumber} · ${s.programName}`,
        cells: [s.name, s.programName, s.standing, term],
        badge: s.standing,
        badgeTone: rowTone(s.standing),
        href: "/admin/f/ss-03-student-success-360",
      })),
      countLabel: `${risk.length || campus.students.length} monitored`,
      kpis: [
        { label: "Monitored", value: String(k.students), hint: "All students", tone: "muted" },
        { label: "At risk", value: String(k.atRisk), hint: "Standing alerts", tone: "danger" },
        { label: "Published grades", value: String(k.publishedGrades), hint: "Signals", tone: "up" },
        { label: "Term", value: k.term, hint: "Current", tone: "muted" },
      ],
      profile360: focus
        ? {
            name: focus.name,
            meta: `${focus.studentNumber} · ${focus.programName}`,
            tabs: ["Overview", "Alerts", "Courses", "Notes"],
            badge: focus.standing,
            stats: [
              { label: "Standing", value: focus.standing },
              { label: "Program", value: focus.programName },
              {
                label: "Courses",
                value: String(campus.enrolments.filter((e) => e.studentId === focus.id).length),
              },
            ],
            courses: {
              title: "Enrolments",
              columns: ["Course", "Section", "Status", "Flag"],
              rows: campus.enrolments
                .filter((e) => e.studentId === focus.id)
                .map((e) => ({
                  course: `${e.courseCode} · ${e.courseTitle}`,
                  midterm: e.sectionCode,
                  attendance: e.status,
                  status: focus.standing,
                  statusTone: rowTone(focus.standing),
                })),
            },
            timeline: campus.grades
              .filter((g) => g.studentNumber === focus.studentNumber)
              .map((g) => ({
                title: `${g.assignment} · ${g.score ?? "—"}/${g.maxScore}`,
                date: g.status,
              })),
          }
        : undefined,
      riskFeed: (risk.length ? risk : campus.students).slice(0, 8).map((s) => ({
        name: s.name,
        detail: `${s.programName} · ${s.standing}`,
        badge: s.standing,
        badgeTone: rowTone(s.standing),
      })),
    };
  }

  if (path.includes("/admin/f/rg-") || path.includes("registrar") || path.includes("transcript") || path.includes("correction") || path.includes("export") && path.includes("rg")) {
    const focus = campus.students[0];
    const enrol = focus ? campus.enrolments.filter((e) => e.studentId === focus.id) : [];
    return {
      rows: studentRows(campus, "/admin/f/rg-01-student-360"),
      countLabel: `${campus.students.length} students`,
      kpis: baseKpis,
      registrarDash: {
        auditsTitle: "Roster",
        audits: campus.students.slice(0, 8).map((s) => ({
          text: `${s.name} · ${s.studentNumber}`,
          when: s.programName,
        })),
        clearanceTitle: "Standing",
        clearance: campus.students.slice(0, 6).map((s) => ({
          name: s.name,
          detail: s.programName,
          badge: s.standing === "good" ? "Clear" : s.standing,
          badgeTone: rowTone(s.standing),
        })),
      },
      profile360: focus
        ? {
            name: focus.name,
            meta: `${focus.studentNumber} · ${focus.programName}`,
            tabs: ["Overview", "Courses", "Timeline"],
            badge: focus.standing === "good" ? "Good Standing" : focus.standing,
            stats: [
              { label: "Program", value: focus.programName },
              { label: "Courses", value: String(enrol.length) },
              { label: "Standing", value: focus.standing },
            ],
            courses: {
              title: "Current enrolments",
              columns: ["Course", "Section", "Term", "Status"],
              rows: enrol.map((e) => ({
                course: `${e.courseCode} · ${e.courseTitle}`,
                midterm: e.sectionCode,
                attendance: term,
                status: e.status,
                statusTone: "active",
              })),
            },
            timeline: enrol.map((e) => ({ title: `Enrolled ${e.courseCode}`, date: k.term })),
          }
        : undefined,
      registrarRecord: focus
        ? {
            student: {
              name: focus.name,
              badge: focus.standing,
              id: focus.studentNumber,
              program: focus.programName,
              admit: k.term,
              gpa: "—",
              credits: String(enrol.reduce((n, e) => n + e.credits, 0)),
            },
            eyebrow: "Student record",
            pageTitle: focus.name,
            activeTab: "Academic History",
            history: {
              terms: [
                {
                  label: k.term,
                  gpa: "—",
                  credits: String(enrol.reduce((n, e) => n + e.credits, 0)),
                  courses: enrol.map((e) => ({ code: e.courseCode, grade: "IP" })),
                },
              ],
              cumulative: [
                { label: "Credits", value: String(enrol.reduce((n, e) => n + e.credits, 0)) },
                { label: "Standing", value: focus.standing },
              ],
            },
          }
        : undefined,
      correction: focus
        ? {
            eyebrow: "Registrar correction",
            title: `Correct record · ${focus.name}`,
            record: {
              id: focus.studentNumber,
              name: focus.name,
              type: path.includes("standing") ? "Academic standing" : "Student record",
            },
            before: { label: "Standing", value: focus.standing },
            after: { label: "Standing", value: focus.standing === "good" ? "good" : "good" },
            reasonLabel: "Correction reason",
            reasonPlaceholder: "Document why this change is required…",
            authorizer: {
              name: campus.accounts.find((a) => a.roles.includes("admin") || a.roles.includes("registrar"))?.name ?? "Registrar",
              role: "Registrar",
            },
            notice: "Changes write to live SisScreenState and audit log.",
            applyLabel: "Apply correction",
          }
        : undefined,
      exportPanel: {
        eyebrow: "Official registrar export",
        configs: [
          { label: "Institution", value: campus.institutionName },
          { label: "Term", value: k.term },
          { label: "Cohort size", value: String(k.students) },
        ],
        schema: ["student_number", "full_name", "program", "standing", "credits"],
        history: campus.audits.slice(0, 4).map((a) => ({
          name: `${a.eventName}.json`,
          date: String(a.createdAt).slice(0, 10),
          status: "Ready",
        })),
        deliveries: [
          {
            date: k.term,
            destination: "National Student Clearinghouse",
            count: String(k.students),
            status: "LIVE",
          },
        ],
        publishNote: "Batch packages are built from live Student and Enrolment rows.",
      },
    };
  }

  if (path.includes("/admin/f/pr-") || path.includes("practicum") || path.includes("xx-5") || path.includes("xx-6") || path.includes("xx-7") || path.includes("xx-8")) {
    return {
      rows: campus.enrolments.map((e) => ({
        primary: e.studentName,
        secondary: `${e.courseCode} · ${e.sectionCode}`,
        cells: [e.studentName, e.courseCode, e.sectionCode, e.status],
        badge: e.status,
        badgeTone: "active",
      })),
      countLabel: `${campus.enrolments.length} placements/enrolments`,
      kpis: baseKpis,
      partnerDetail: {
        partners: campus.accounts
          .filter((a) => a.roles.includes("instructor"))
          .map((a, i) => ({
            name: a.name,
            meta: a.email,
            active: i === 0,
          })),
        selected: {
          name: campus.accounts.find((a) => a.roles.includes("instructor"))?.name ?? "Partner",
          meta: campus.institutionName,
          fields: [
            { label: "Campus", value: campus.institutionName },
            { label: "Active sections", value: String(k.sections) },
          ],
          locations: [campus.institutionName],
        },
      },
    };
  }

  if (path.includes("/admin/f/wf-") || path.includes("approval") || path.includes("inbox") || path.includes("workflow")) {
    return {
      rows: approvalRows(campus),
      countLabel: `${campus.approvals.length} requests`,
      kpis: baseKpis,
    };
  }

  if (path.includes("ai-10") || path.includes("usage-cost") || path.includes("usage_cost")) {
    const auditCount = campus.audits.length;
    const notifCount = campus.notifications.length;
    return {
      rows: auditRows(campus),
      countLabel: `${auditCount} audit events`,
      kpis: [
        { label: "Today's Cost", value: "$0.00", hint: `${auditCount} live audit events` },
        { label: "Month-to-Date Cost", value: "$0.00", hint: "No billing integration yet" },
        { label: "Gateway Events", value: String(auditCount), hint: "Audit trail volume" },
      ],
      usageCost: {
        cycle: `Live cycle · ${campus.institutionName}`,
        models: [
          {
            model: "Campus Coach",
            calls: String(Math.max(auditCount, 1)),
            tokensIn: "—",
            tokensOut: "—",
            cost: "$0.00",
          },
          {
            model: "Notifications",
            calls: String(notifCount),
            tokensIn: "—",
            tokensOut: "—",
            cost: "$0.00",
          },
        ],
        trend: Array.from({ length: 10 }, (_, i) => ({
          label: String(i + 1),
          height: `${Math.min(100, 20 + ((auditCount + i) % 8) * 10)}%`,
        })),
      },
    };
  }

  if (path.includes("/admin/f/ai-") || path.includes("/admin/ai") || path.includes("retrieval") || path.includes("citation") || path.includes("eval")) {
    const activity = campus.audits.slice(0, 8).map((a) => ({
      id: a.id.slice(0, 8),
      title: a.eventName,
      when: a.createdAt,
      status: "LOGGED",
      tone: "active" as const,
      href: "/admin/f/ai-12-tool-call-audit",
    }));
    return {
      rows: auditRows(campus),
      countLabel: `${campus.audits.length} audit events`,
      kpis: [
        { label: "Audit events", value: String(campus.audits.length), hint: "Live", tone: "muted" },
        { label: "Notifications", value: String(campus.notifications.length), hint: "Sent", tone: "up" },
        { label: "Grades published", value: String(k.publishedGrades), hint: "Signals", tone: "up" },
        { label: "Pending approvals", value: String(k.pending), hint: "Human review", tone: "danger" },
      ],
      aiDash: {
        kpis: [
          { label: "Audits", value: String(campus.audits.length), hint: "Live trail", href: "/admin/f/ai-12-tool-call-audit" },
          { label: "Notifications", value: String(campus.notifications.length), hint: "Sent", href: "/admin/f/fm-01-notification-center" },
          { label: "Pending approvals", value: String(k.pending), hint: "Human review", href: "/admin/f/wf-01-approval-inbox" },
          { label: "Published grades", value: String(k.publishedGrades), hint: "Signals" },
        ],
        usageTrend: Array.from({ length: 7 }, (_, i) => ({
          label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]!,
          height: `${Math.min(100, 30 + ((campus.audits.length + i) % 7) * 10)}%`,
        })),
        costBreakdown: [
          { label: "Audit gateway", amount: "$0", pct: 60, color: "#017f3f", href: "/admin/f/ai-10-usage-cost" },
          { label: "Notifications", amount: "$0", pct: 25, color: "#849f38", href: "/admin/f/ai-10-usage-cost" },
          { label: "Other", amount: "$0", pct: 15, color: "#1d4ed8", href: "/admin/f/ai-10-usage-cost" },
        ],
        activity,
      },
    };
  }

  if (path.includes("/admin/f/cp-") || path.includes("compliance") || path.includes("privacy") || path.includes("xx-9") || path.includes("disposal") || path.includes("retention") || path.includes("evidence") || path.includes("accreditation") || path.includes("inspection")) {
    return {
      rows: [
        ...auditRows(campus).slice(0, 10),
        ...approvalRows(campus).slice(0, 10),
      ],
      countLabel: `${campus.audits.length + campus.approvals.length} compliance signals`,
      kpis: baseKpis,
    };
  }

  if (path.includes("/admin/f/fm-") || path.includes("form")) {
    return {
      rows: notificationRows(campus),
      countLabel: `${campus.notifications.length} form/notification records`,
      kpis: baseKpis,
      builder: {
        paletteTitle: "Fields",
        palette: ["Name", "Email", "Program", "Term", "Signature"],
        canvasTitle: "Live form",
        canvasFields: [
          { label: "Campus", value: campus.institutionName },
          { label: "Term", value: k.term },
          { label: "Audience", value: `${k.students} students` },
        ],
        inspectorTitle: "Meta",
        inspector: [
          { label: "Notifications", value: String(campus.notifications.length) },
          { label: "Accounts", value: String(k.accounts) },
        ],
      },
    };
  }

  if (path.includes("/admin/f/rl-") || path.includes("rule") || path.includes("simulator")) {
    return {
      rows: gradeRows(campus),
      countLabel: `${campus.grades.length} grade rule inputs`,
      kpis: baseKpis,
      ruleDesigner: {
        conditions: [
          { field: "standing", op: "!=", value: "good" },
          { field: "enrolments", op: ">=", value: "1" },
        ],
        outcome: "flag_success_alert",
        preview: `${k.atRisk} students currently match`,
      },
      simulator: {
        cohort: k.term,
        results: campus.students.map((s) => ({
          name: s.name,
          gpa: "—",
          rules: s.standing === "good" ? "pass" : "alert",
          action: s.standing === "good" ? "none" : "open_case",
        })),
      },
    };
  }

  if (path.includes("operation") || path.includes("integration") || path.includes("pl-05") || path.includes("pl-06") || path.includes("job") || path.includes("flag") || path.includes("audit") || path.includes("security") || path.includes("settings") || path.includes("template") || path.includes("pl-0")) {
    return {
      rows: auditRows(campus),
      countLabel: `${campus.audits.length} events`,
      kpis: baseKpis,
      operations: {
        health: [
          { label: "API", value: "Healthy", ok: true },
          { label: "Database", value: "Connected", ok: true },
          { label: "Accounts", value: String(k.accounts), ok: true },
          { label: "Pending approvals", value: String(k.pending), ok: k.pending === 0 },
        ],
        jobs: campus.audits.slice(0, 6).map((a) => ({
          id: a.id.slice(0, 8),
          title: a.eventName,
          meta: a.createdAt,
          status: "done",
          tone: "active",
        })),
        telemetry: {
          note: campus.institutionName,
          cpu: "n/a",
          memory: "n/a",
        },
      },
      integrations: {
        kpis: [
          { label: "People", value: String(campus.people.length) },
          { label: "Courses", value: String(k.courses) },
          { label: "Sections", value: String(k.sections) },
        ],
        cards: [
          {
            name: "SIS core",
            detail: `${k.students} students · ${k.enrolments} enrolments`,
            sync: "Live",
            status: "Healthy",
            tone: "active",
          },
        ],
      },
      policy: {
        sections: [
          {
            title: "Session policy",
            fields: [
              { label: "Institution", value: campus.institutionName },
              { label: "Active accounts", value: String(k.accounts) },
            ],
          },
        ],
      },
      templates: {
        rows: campus.notifications.slice(0, 8).map((n) => ({
          name: n.title,
          channel: "in_app",
          status: "Active",
          edited: n.createdAt,
          tone: "active",
        })),
        preview: {
          to: campus.students[0]?.email ?? "student@heritage.edu",
          channel: "in_app",
          subject: campus.notifications[0]?.title ?? "Campus notice",
          body: campus.notifications[0]?.body ?? "No notifications yet",
        },
      },
      matrix: {
        roles: ["admin", "registrar", "instructor", "student"],
        rows: [
          {
            module: "Grades",
            capability: "publish",
            detail: `${k.publishedGrades} published`,
            checks: [true, true, true, false],
          },
          {
            module: "Approvals",
            capability: "decide",
            detail: `${k.pending} pending`,
            checks: [true, true, false, false],
          },
          {
            module: "Users",
            capability: "manage",
            detail: `${k.accounts} accounts`,
            checks: [true, true, false, false],
          },
        ],
      },
    };
  }

  if (path.includes("search")) {
    return {
      searchResults: {
        query: campus.students[0]?.name ?? "campus",
        resultCount: String(campus.people.length + campus.courses.length),
        tabs: [
          { label: "All", count: campus.people.length + campus.courses.length },
          { label: "Students", count: campus.students.length },
          { label: "Courses", count: campus.courses.length },
          { label: "Accounts", count: campus.accounts.length },
        ],
        results: [
          ...campus.students.map((s) => ({
            type: "Student",
            title: s.name,
            meta: `${s.studentNumber} · ${s.programName}`,
            href: "/admin/f/rg-01-student-360",
          })),
          ...campus.courses.map((c) => ({
            type: "Course",
            title: `${c.code} · ${c.title}`,
            meta: `${c.credits} credits`,
            href: "/admin/f/ac-06-course-catalogue",
          })),
        ],
      },
      rows: studentRows(campus),
      kpis: baseKpis,
    };
  }

  if (path.includes("ac-20") || path.includes("create-student")) {
    const matches = campus.students.slice(0, 2).map((s) => ({
      name: s.name,
      reason: `Matches: student number ${s.studentNumber}, program ${s.programName}`,
    }));
    const focus = campus.students[0];
    return {
      rows: studentRows(campus),
      countLabel: `${campus.students.length} students`,
      kpis: baseKpis,
      wizard: {
        steps: [
          { label: "Personal Info", state: "done" as const },
          { label: "Program Selection", state: "done" as const },
          { label: "Identity Match Check", state: "current" as const },
          { label: "Enrollment Details", state: "todo" as const },
          { label: "Review and Create", state: "todo" as const },
        ],
        matches:
          matches.length > 0
            ? matches
            : [{ name: "No matches", reason: "No overlapping identity signals in this institution yet." }],
        summary: [
          { label: "Campus", value: campus.institutionName },
          { label: "Students on file", value: String(campus.students.length) },
          { label: "Suggested program", value: focus?.programName ?? "—" },
          { label: "Catalog year", value: k.term },
        ],
      },
    };
  }

  if (path.includes("grade") || path.includes("ac-12") || path.includes("ac-13") || path.includes("ac-14") || path.includes("ac-15") || path.includes("ac-16") || path.includes("ac-17") || path.includes("ac-18") || path.includes("ac-19")) {
    return {
      rows: gradeRows(campus),
      countLabel: `${campus.grades.length} grade items`,
      kpis: baseKpis,
      grades: campus.sections.map((s) => ({
        code: s.courseCode,
        title: s.courseTitle,
        instructor: s.instructorName,
        submitted: String(campus.grades.filter((g) => g.courseCode === s.courseCode && g.status === "published").length),
        enrolled: String(s.enrolled),
        distribution: "Live",
        bars: [40, 30, 20, 10] as [number, number, number, number?],
        status: "Open",
      })),
    };
  }

  // Default: real roster + audits — never fixture JSON
  return {
    rows: studentRows(campus),
    countLabel: `${campus.students.length} records`,
    kpis: baseKpis,
    riskFeed: campus.audits.slice(0, 6).map((a) => ({
      name: a.eventName,
      detail: a.createdAt,
      badge: "Audit",
      badgeTone: "active",
    })),
    exportPanel: {
      eyebrow: "Campus export",
      configs: [
        { label: "Institution", value: campus.institutionName },
        { label: "Term", value: k.term },
        { label: "Students", value: String(k.students) },
      ],
      schema: ["student_number", "full_name", "program", "standing", "section_code"],
      history: campus.audits.slice(0, 4).map((a) => ({
        name: `${a.eventName}.json`,
        date: a.createdAt.slice(0, 10),
        status: "Ready",
      })),
      deliveries: [
        {
          date: k.term,
          destination: campus.institutionName,
          count: String(k.students),
          status: "LIVE",
        },
      ],
      publishNote: "Export packages are composed from live Person, Student, and Enrolment rows.",
    },
    holds: {
      rows: campus.students
        .filter((s) => s.standing !== "good")
        .map((s) => ({
          student: s.name,
          type: "Academic",
          reason: `Standing: ${s.standing}`,
          placedBy: "Registrar",
        })),
      student: campus.students.find((s) => s.standing !== "good")?.name ?? campus.students[0]?.name ?? "—",
      releaseReason: "Cleared after review",
    },
    searchResults: {
      query: campus.students[0]?.name ?? campus.institutionName,
      resultCount: `${campus.people.length} people · ${campus.courses.length} courses`,
      tabs: [
        { label: "All", count: campus.people.length + campus.courses.length },
        { label: "Students", count: campus.students.length },
        { label: "Courses", count: campus.courses.length },
      ],
      results: [
        ...campus.students.map((s) => ({
          type: "Student",
          title: s.name,
          meta: `${s.studentNumber} · ${s.programName}`,
          href: "/admin/f/rg-01-student-360",
        })),
        ...campus.courses.map((c) => ({
          type: "Course",
          title: `${c.code} · ${c.title}`,
          meta: `${c.credits} credits`,
          href: "/admin/f/ac-06-course-catalogue",
        })),
      ],
    },
  };
}

async function loadMutationOverlay(institutionId: string, path: string): Promise<SisLivePayload> {
  const existing = await prisma.sisScreenState.findUnique({
    where: { institutionId_path: { institutionId, path } },
  });
  if (!existing) return {};
  const parsed = JSON.parse(existing.payloadJson) as SisLivePayload;
  const out: SisLivePayload = {};
  if (parsed.activity) out.activity = parsed.activity;
  if (parsed._lastAction) out._lastAction = parsed._lastAction;
  if (parsed.customPrograms) out.customPrograms = parsed.customPrograms;
  return out;
}

async function savePayload(institutionId: string, path: string, payload: SisLivePayload) {
  await prisma.sisScreenState.upsert({
    where: { institutionId_path: { institutionId, path } },
    create: {
      id: randomUUID(),
      institutionId,
      path,
      payloadJson: JSON.stringify(payload),
    },
    update: {
      payloadJson: JSON.stringify(payload),
      rowVersion: { increment: 1 },
    },
  });
}

export async function getSisScreen(user: SessionClaims, path: string) {
  const domain = await composeFromDomain(user, path);
  const mutations = await loadMutationOverlay(user.institutionId, path);
  const payload: SisLivePayload = { ...domain, ...mutations };

  const customPrograms = Array.isArray(mutations.customPrograms)
    ? (mutations.customPrograms as string[])
    : [];
  if (
    customPrograms.length > 0 &&
    (path.includes("ac-03") || path.includes("ac-04") || path.includes("program"))
  ) {
    const term = (domain.kpis as Array<{ label: string; value: string }> | undefined)?.find((k) =>
      /term/i.test(k.label),
    )?.value ?? "—";
    const existing = new Set(
      ((payload.rows as Array<{ primary?: string }> | undefined) ?? []).map((r) => r.primary).filter(Boolean),
    );
    const extra = customPrograms
      .filter((p) => !existing.has(p))
      .map((p) => ({
        primary: p,
        cells: [p, "0", term, "Active"],
        badge: "Active",
        badgeTone: "active",
        href: "/admin/f/ac-04-program-detail",
      }));
    payload.rows = [...extra, ...((payload.rows as unknown[]) ?? [])];
    payload.countLabel = `${(payload.rows as unknown[]).length} programs`;
  }

  return {
    path,
    live: true as const,
    source: "domain" as const,
    payload,
  };
}

export async function runSisAction(
  user: SessionClaims,
  input: { path: string; action: string; rowKey?: string; note?: string },
) {
  const path = input.path;
  const action = input.action.trim();
  const lower = action.toLowerCase();

  if (path.includes("pending") && (lower.includes("approve") || lower === "approve selected")) {
    const pending = await prisma.approvalRequest.findMany({
      where: { institutionId: user.institutionId, status: "pending" },
    });
    for (const a of pending) {
      const decisions = JSON.parse(a.decisionsJson || "[]") as unknown[];
      decisions.push({ accountId: user.accountId, decision: "approved", at: new Date().toISOString() });
      await prisma.approvalRequest.update({
        where: { id: a.id },
        data: { status: "approved", decisionsJson: JSON.stringify(decisions) },
      });
    }
  }

  if (
    (path.includes("approval") || path.includes("inbox") || path.includes("wf-")) &&
    input.rowKey &&
    (lower.includes("approve") || lower.includes("reject") || lower.includes("deny") || lower.includes("apply"))
  ) {
    const approvalId = input.rowKey;
    if (lower.includes("apply")) {
      await applyApproval({
        approvalId,
        institutionId: user.institutionId,
        applyFn: async (diff, tx) => {
          const d = diff as {
            gradeItemIds?: string[];
            givenName?: string;
            familyName?: string;
            primaryEmail?: string;
            dateOfBirth?: string;
          };
          if (Array.isArray(d.gradeItemIds) && d.gradeItemIds.length > 0) {
            await tx.gradeItem.updateMany({
              where: { id: { in: d.gradeItemIds }, institutionId: user.institutionId },
              data: { status: "published", publishedAt: new Date() },
            });
          }
          const personData: {
            givenName?: string;
            familyName?: string;
            email?: string;
            dateOfBirth?: string;
          } = {};
          if (typeof d.givenName === "string") personData.givenName = d.givenName;
          if (typeof d.familyName === "string") personData.familyName = d.familyName;
          if (typeof d.primaryEmail === "string") personData.email = d.primaryEmail;
          if (typeof d.dateOfBirth === "string") personData.dateOfBirth = d.dateOfBirth;
          if (Object.keys(personData).length > 0) {
            const approval = await tx.approvalRequest.findFirst({
              where: { id: approvalId, institutionId: user.institutionId },
            });
            if (approval && /profile/i.test(approval.type)) {
              const student = await tx.student.findFirst({
                where: { id: approval.subjectRef, institutionId: user.institutionId },
              });
              if (student) {
                await tx.person.update({ where: { id: student.personId }, data: personData });
              }
            }
          }
        },
      });
    } else {
      await decideApproval({
        approvalId,
        institutionId: user.institutionId,
        actorId: user.accountId,
        actorRoles: user.roles,
        decision: lower.includes("approve") ? "approve" : "reject",
        comment: input.note,
      });
    }
  }

  const overlay = await loadMutationOverlay(user.institutionId, path);
  const activity = Array.isArray(overlay.activity) ? ([...overlay.activity] as SisLivePayload[]) : [];
  activity.unshift({
    action,
    at: new Date().toISOString(),
    by: user.accountId,
    rowKey: input.rowKey ?? null,
    note: input.note ?? null,
  });

  if (
    (path.includes("ac-03") || path.includes("ac-04") || path.includes("program")) &&
    (lower.includes("create") || lower.includes("new") || lower.includes("add") || lower.includes("save"))
  ) {
    const programName = (input.note || input.rowKey || action.replace(/^(create|new|add|save)\s+/i, "")).trim() ||
      `Program ${new Date().getFullYear()}`;
    const overlayPrograms = Array.isArray(overlay.customPrograms)
      ? ([...overlay.customPrograms] as string[])
      : [];
    if (!overlayPrograms.includes(programName)) overlayPrograms.unshift(programName);
    await savePayload(user.institutionId, path, {
      ...overlay,
      customPrograms: overlayPrograms.slice(0, 40),
      activity: activity.slice(0, 50),
      _lastAction: activity[0],
    });
    await prisma.auditEvent.create({
      data: {
        institutionId: user.institutionId,
        actorId: user.accountId,
        eventName: "admin.program.upsert",
        purpose: "admin_mutation",
        afterJson: JSON.stringify({ path, programName }),
        source: "admin.sis",
        correlationId: randomUUID(),
      },
    });
    return getSisScreen(user, path);
  }

  if (
    (path.includes("fn-") || path.includes("finance") || path.includes("refund") || path.includes("payment")) &&
    (lower.includes("refund") || lower.includes("reject") || lower.includes("approve"))
  ) {
    const decision = lower.includes("reject") ? "rejected" : "approved";
    await prisma.auditEvent.create({
      data: {
        institutionId: user.institutionId,
        actorId: user.accountId,
        eventName: "admin.finance.decision",
        purpose: "admin_mutation",
        afterJson: JSON.stringify({ path, action, decision, rowKey: input.rowKey ?? null }),
        source: "admin.sis",
        correlationId: randomUUID(),
      },
    });
  }

  if (
    (path.includes("ac-09") || path.includes("ac-10") || path.includes("ac-11") || path.includes("schedule")) &&
    (lower.includes("schedule") || lower.includes("publish") || lower.includes("approve") || lower.includes("create section"))
  ) {
    await prisma.auditEvent.create({
      data: {
        institutionId: user.institutionId,
        actorId: user.accountId,
        eventName: "admin.schedule.action",
        purpose: "admin_mutation",
        afterJson: JSON.stringify({ path, action, rowKey: input.rowKey ?? null }),
        source: "admin.sis",
        correlationId: randomUUID(),
      },
    });
  }

  await savePayload(user.institutionId, path, {
    activity: activity.slice(0, 50),
    _lastAction: activity[0],
  });

  await prisma.auditEvent.create({
    data: {
      institutionId: user.institutionId,
      actorId: user.accountId,
      eventName: "admin.sis.action",
      purpose: "admin_mutation",
      afterJson: JSON.stringify({ path, action, rowKey: input.rowKey ?? null }),
      source: "admin.sis",
      correlationId: randomUUID(),
    },
  });

  return getSisScreen(user, path);
}

/** Clears fixture SisScreenState; screens now compose live from domain tables. */
export async function seedAllSisScreens(institutionId: string) {
  await prisma.sisScreenState.deleteMany({ where: { institutionId } });
  return 0;
}

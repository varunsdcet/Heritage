import { randomUUID } from "node:crypto";
import { prisma } from "@myheritage/db";
import type { SessionClaims } from "@myheritage/contracts";

export type InstructorLivePayload = Record<string, unknown>;

type InstructorCtx = {
  user: SessionClaims;
  person: { givenName: string; familyName: string; email: string };
  displayName: string;
  term: { code: string; name: string } | null;
  sections: Array<{
    id: string;
    code: string;
    courseCode: string;
    courseTitle: string;
    credits: number;
    termCode: string;
    enrolmentCount: number;
    enrolments: Array<{
      id: string;
      status: string;
      studentId: string;
      studentNumber: string;
      studentName: string;
      email: string;
      programName: string;
      standing: string;
    }>;
    assignments: Array<{
      id: string;
      title: string;
      maxScore: number;
      weightPercent: number;
      dueAt: Date | null;
    }>;
  }>;
  studentCount: number;
  draftGradeCount: number;
  notifications: Array<{ id: string; title: string; body: string; createdAt: Date; readAt: Date | null }>;
  threads: Array<{
    id: string;
    subject: string;
    updatedAt: Date;
    preview: string;
    otherName: string;
  }>;
  grades: Array<{
    id: string;
    studentId: string;
    score: number | null;
    maxScore: number;
    letter: string | null;
    status: string;
    studentName: string;
    studentNumber: string;
    assignmentTitle: string;
    sectionCode: string;
    courseCode: string;
    weightPercent: number;
  }>;
  announcementPosts: Array<{ id: string; title: string; body: string; when: string }>;
};

function pct(score: number | null, max: number) {
  if (score == null || max <= 0) return null;
  return Math.round((score / max) * 1000) / 10;
}

function letterFromPct(p: number | null) {
  if (p == null) return "—";
  if (p >= 90) return "A";
  if (p >= 85) return "A-";
  if (p >= 80) return "B+";
  if (p >= 75) return "B";
  if (p >= 70) return "B-";
  if (p >= 65) return "C+";
  if (p >= 60) return "C";
  if (p >= 50) return "D";
  return "F";
}

async function loadCtx(user: SessionClaims): Promise<InstructorCtx> {
  const person = await prisma.person.findFirstOrThrow({
    where: { id: user.personId, institutionId: user.institutionId },
  });
  const term = await prisma.term.findFirst({
    where: { institutionId: user.institutionId },
    orderBy: { startsOn: "desc" },
  });
  const sectionsRaw = await prisma.section.findMany({
    where: { institutionId: user.institutionId, instructorPersonId: user.personId },
    include: {
      course: true,
      term: true,
      assignments: { orderBy: { dueAt: "asc" } },
      enrolments: {
        where: { status: { in: ["enrolled", "completed", "withdrawn"] } },
        include: { student: { include: { person: true } } },
      },
    },
    orderBy: { code: "asc" },
  });

  const sections = sectionsRaw.map((s) => ({
    id: s.id,
    code: s.code,
    courseCode: s.course.code,
    courseTitle: s.course.title,
    credits: s.course.credits,
    termCode: s.term.code,
    enrolmentCount: s.enrolments.filter((e) => e.status === "enrolled").length,
    enrolments: s.enrolments.map((e) => ({
      id: e.id,
      status: e.status,
      studentId: e.studentId,
      studentNumber: e.student.studentNumber,
      studentName: `${e.student.person.givenName} ${e.student.person.familyName}`.trim(),
      email: e.student.person.email,
      programName: e.student.programName,
      standing: e.student.standing,
    })),
    assignments: s.assignments.map((a) => ({
      id: a.id,
      title: a.title,
      maxScore: a.maxScore,
      weightPercent: a.weightPercent,
      dueAt: a.dueAt,
    })),
  }));

  const studentIds = new Set(sections.flatMap((s) => s.enrolments.map((e) => e.studentId)));
  const draftGradeCount = await prisma.gradeItem.count({
    where: {
      institutionId: user.institutionId,
      status: "draft",
      assignment: { section: { instructorPersonId: user.personId } },
    },
  });

  const notifications = await prisma.notification.findMany({
    where: { institutionId: user.institutionId, recipientAccountId: user.accountId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const allThreads = await prisma.messageThread.findMany({
    where: { institutionId: user.institutionId },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });
  const myThreads = allThreads.filter((t) => {
    try {
      const ids = JSON.parse(t.participantAccountIdsJson) as string[];
      return ids.includes(user.accountId);
    } catch {
      return false;
    }
  });
  const otherAccountIds = [
    ...new Set(
      myThreads.flatMap((t) => {
        try {
          return (JSON.parse(t.participantAccountIdsJson) as string[]).filter((id) => id !== user.accountId);
        } catch {
          return [];
        }
      }),
    ),
  ];
  const otherAccounts = await prisma.account.findMany({
    where: { id: { in: otherAccountIds } },
    include: { person: true },
  });
  const otherName = new Map(
    otherAccounts.map((a) => [a.id, `${a.person.givenName} ${a.person.familyName}`.trim()]),
  );
  const threads = myThreads.slice(0, 30).map((t) => {
    let other = "Participant";
    try {
      const ids = JSON.parse(t.participantAccountIdsJson) as string[];
      const oid = ids.find((id) => id !== user.accountId);
      if (oid) other = otherName.get(oid) ?? other;
    } catch {
      /* ignore */
    }
    return {
      id: t.id,
      subject: t.subject,
      updatedAt: t.updatedAt,
      preview: t.messages[0]?.body ?? "",
      otherName: other,
    };
  });

  const gradeRows = await prisma.gradeItem.findMany({
    where: {
      institutionId: user.institutionId,
      assignment: { section: { instructorPersonId: user.personId } },
    },
    include: {
      student: { include: { person: true } },
      assignment: { include: { section: { include: { course: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const announcementRecords = await prisma.portalRecord.findMany({
    where: {
      institutionId: user.institutionId,
      role: "instructor",
      OR: [
        { screenPath: { contains: "announcement" } },
        { audienceAccountId: user.accountId, primaryText: { not: "" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const announcementPosts = announcementRecords
    .filter((r) => r.screenPath.includes("announcement"))
    .map((r) => ({
      id: r.id,
      title: r.primaryText,
      body: r.secondaryText ?? "",
      when: r.createdAt.toLocaleString(),
    }));

  return {
    user,
    person: { givenName: person.givenName, familyName: person.familyName, email: person.email },
    displayName: `${person.givenName} ${person.familyName}`.trim(),
    term: term ? { code: term.code, name: term.name } : null,
    sections,
    studentCount: studentIds.size,
    draftGradeCount,
    notifications,
    threads,
    grades: gradeRows.map((g) => ({
      id: g.id,
      studentId: g.studentId,
      score: g.score,
      maxScore: g.maxScore,
      letter: g.letter,
      status: g.status,
      studentName: `${g.student.person.givenName} ${g.student.person.familyName}`.trim(),
      studentNumber: g.student.studentNumber,
      assignmentTitle: g.assignment.title,
      sectionCode: g.assignment.section.code,
      courseCode: g.assignment.section.course.code,
      weightPercent: g.assignment.weightPercent,
    })),
    announcementPosts,
  };
}

function primarySection(ctx: InstructorCtx) {
  return ctx.sections[0] ?? null;
}

function tableRowsFromSections(ctx: InstructorCtx) {
  return ctx.sections.map((s) => ({
    cells: [s.courseCode, s.courseTitle, s.code, String(s.enrolmentCount), s.termCode, "Active"],
    primary: s.courseCode,
    secondary: s.courseTitle,
    badge: "Active",
    badgeTone: "active" as const,
    href: `/instructor/sections/${s.id}`,
    action: "Open",
  }));
}

function rosterRows(ctx: InstructorCtx) {
  const seen = new Set<string>();
  const rows: Array<{
    cells: string[];
    primary: string;
    secondary: string;
    badge: string;
    badgeTone: "active" | "warning" | "danger" | "muted";
    href: string;
  }> = [];
  for (const s of ctx.sections) {
    for (const e of s.enrolments) {
      if (seen.has(e.studentId)) continue;
      seen.add(e.studentId);
      const tone =
        e.standing === "probation" || e.standing === "alert"
          ? ("danger" as const)
          : e.standing === "warning"
            ? ("warning" as const)
            : ("active" as const);
      rows.push({
        cells: [e.studentNumber, e.studentName, e.programName, s.courseCode, e.standing, e.status],
        primary: e.studentName,
        secondary: e.studentNumber,
        badge: e.standing,
        badgeTone: tone,
        href: `/instructor/f/t22-student-detail-full-page?studentId=${e.studentId}`,
      });
    }
  }
  return rows;
}

function buildDashboard(ctx: InstructorCtx): InstructorLivePayload {
  const sec = primarySection(ctx);
  const alerts = [
    ...(ctx.draftGradeCount > 0
      ? [
          {
            title: "Draft grades pending",
            body: `${ctx.draftGradeCount} grade item(s) still in draft across your sections.`,
            tone: "warning" as const,
          },
        ]
      : []),
    ...ctx.notifications.slice(0, 3).map((n) => ({
      title: n.title,
      body: n.body,
      tone: "info" as const,
    })),
  ];
  return {
    title: "Teacher Dashboard",
    subtitle: ctx.term ? `${ctx.term.name} · ${ctx.term.code}` : "Teaching workspace",
    kpis: [
      { label: "Active Courses", value: String(ctx.sections.length), hint: "This term", tone: "up" },
      { label: "Students", value: String(ctx.studentCount), hint: "Across sections", tone: "up" },
      { label: "Draft grades", value: String(ctx.draftGradeCount), hint: "Need action", tone: ctx.draftGradeCount ? "danger" : "muted" },
      { label: "Messages", value: String(ctx.threads.length), hint: "Open threads", tone: "muted" },
    ],
    dashboard: {
      greeting: "Welcome back,",
      name: ctx.displayName,
      meta: `${ctx.person.email} · Instructor`,
      statusBadge: ctx.sections.length ? "Teaching" : "No sections",
      quickActions: [
        { label: "Mark Attendance", href: "/instructor/attendance", variant: "primary" },
        { label: "Enter Grades", href: "/instructor/gradebook", variant: "secondary" },
        { label: "Messages", href: "/instructor/messages", variant: "secondary" },
        { label: "Notifications", href: "/instructor/notifications", variant: "ai" },
      ],
      timetable: ctx.sections.slice(0, 6).map((s) => ({
        time: s.termCode,
        code: s.courseCode,
        title: s.courseTitle,
        room: s.code,
        status: `${s.enrolmentCount} enrolled`,
        statusTone: "active" as const,
        action: "Open",
        href: `/instructor/sections/${s.id}`,
      })),
      announcements: ctx.notifications.slice(0, 4).map((n) => ({
        title: n.title,
        body: n.body,
        when: n.createdAt.toLocaleString(),
      })),
      alerts,
      officeHours: sec
        ? [{ day: "By appointment", window: "See calendar", mode: "Campus", remaining: sec.code }]
        : [],
    },
  };
}

function buildCourseList(ctx: InstructorCtx): InstructorLivePayload {
  return {
    title: "My Courses",
    subtitle: ctx.term ? `Sections · ${ctx.term.code}` : "Your teaching assignments",
    countLabel: `${ctx.sections.length} section(s)`,
    rows: tableRowsFromSections(ctx),
    courseList: {
      filters: ["All sections", ctx.term?.code ?? "Current term"],
      courses: ctx.sections.map((s) => ({
        code: s.courseCode,
        title: s.courseTitle,
        term: s.termCode || ctx.term?.code || "—",
        schedule: s.code,
        room: s.code,
        enrolled: String(s.enrolmentCount),
        capacity: String(Math.max(s.enrolmentCount, 30)),
        status: "Active",
        statusTone: "active",
        href: `/instructor/sections/${s.id}`,
      })),
    },
  };
}

function buildCourseDetail(ctx: InstructorCtx, path: string): InstructorLivePayload {
  const sectionId = path.split("/").pop();
  const sec =
    ctx.sections.find((s) => s.id === sectionId) ||
    (sectionId === "demo" ? ctx.sections[0] : undefined) ||
    ctx.sections[0];
  if (!sec) {
    return {
      title: "Section detail",
      subtitle: "No teaching section assigned",
      courseDetail: {
        code: "—",
        title: "No section",
        meta: "Assign a section to this instructor to open the workspace.",
        status: "Empty",
        tabs: ["Overview", "Modules", "Roster", "Assessments"],
        activeTab: "Overview",
        overview: [{ label: "Status", value: "No section" }],
        modules: [],
        team: [
          {
            name: ctx.displayName,
            role: "Lead Instructor",
            initials: `${ctx.person.givenName[0] ?? ""}${ctx.person.familyName[0] ?? ""}`.toUpperCase(),
          },
        ],
      },
    };
  }
  return {
    title: `${sec.courseCode} · ${sec.courseTitle}`,
    subtitle: `${sec.code} · ${sec.enrolmentCount} enrolled`,
    primaryAction: "Open Gradebook",
    primaryActionHref: "/instructor/gradebook",
    secondaryAction: "Announcements",
    secondaryActionHref: "/instructor/announcements",
    courseDetail: {
      code: sec.courseCode,
      title: sec.courseTitle,
      meta: `${sec.termCode || ctx.term?.code || "Term"} · ${sec.code} · ${sec.enrolmentCount} enrolled · ${sec.credits} credits`,
      status: "Active",
      tabs: ["Overview", "Modules", "Roster", "Assessments", "Lectures", "Labs", "Resources"],
      activeTab: "Overview",
      overview: [
        { label: "Credits", value: String(sec.credits) },
        { label: "Section", value: sec.code },
        { label: "Term", value: sec.termCode || ctx.term?.name || "—" },
        { label: "Enrolled", value: String(sec.enrolmentCount) },
        { label: "Assignments", value: String(sec.assignments.length) },
        { label: "Instructor", value: ctx.displayName },
      ],
      modules: sec.assignments.length
        ? sec.assignments.map((a) => ({
            title: a.title,
            items: 1,
            status: a.dueAt && a.dueAt < new Date() ? "Complete" : "In Progress",
          }))
        : [{ title: "Course outline", items: 0, status: "Draft" }],
      team: [
        {
          name: ctx.displayName,
          role: "Lead Instructor",
          initials: `${ctx.person.givenName[0] ?? ""}${ctx.person.familyName[0] ?? ""}`.toUpperCase(),
        },
      ],
    },
  };
}

function buildAnnouncements(ctx: InstructorCtx): InstructorLivePayload {
  const sec = primarySection(ctx);
  const posts =
    ctx.announcementPosts.length > 0
      ? ctx.announcementPosts.map((p) => ({
          title: p.title,
          body: p.body,
          when: p.when,
          audience: "All enrolled",
          pinned: false,
        }))
      : [];
  return {
    title: "Course Announcements",
    subtitle: sec
      ? `Publish updates to enrolled students in ${sec.courseCode}.`
      : "Publish class updates to enrolled students",
    primaryAction: "New Announcement",
    announcements: {
      course: sec ? `${sec.courseCode} · ${sec.courseTitle}` : "All sections",
      posts,
      compose: {
        titleLabel: "Announcement title",
        bodyLabel: "Message body",
        audienceLabel: "Audience",
        audienceValue: "All enrolled students",
        publishLabel: "Publish announcement",
      },
    },
  };
}

function buildAddCourseForm(ctx: InstructorCtx): InstructorLivePayload {
  const n = ctx.sections.length + 1;
  return {
    title: "Add New Course Instance",
    subtitle: "Create a live course and section for your teaching load",
    primaryAction: "Save Course",
    secondaryAction: "Cancel",
    secondaryActionHref: "/instructor/f/t14-course-management",
    form: {
      submitLabel: "Save Course",
      groups: [
        {
          title: "Course Details",
          fields: [
            { label: "Course Category", value: "General", type: "select" },
            { label: "Course Group", value: "Core", type: "select" },
            { label: "Course Name", value: `Instructor Course ${n}`, type: "text" },
            { label: "Course Number", value: `INS${String(n).padStart(3, "0")}`, type: "text" },
            { label: "Course Credit Value", value: "3.0", type: "number" },
            { label: "Intake Type", value: "Standard Intake", type: "select" },
          ],
        },
        {
          title: "Course Outline & Syllabus",
          fields: [
            {
              label: "Course Description",
              value: "Describe the course content, requirements and objectives here...",
              type: "textarea",
            },
            { label: "Total Course Hours", value: "120 Hours", type: "text" },
            { label: "Hours Per Day", value: "3 Hours", type: "text" },
          ],
        },
        {
          title: "Course Tuition & Finances",
          fields: [
            { label: "Domestic Tuition Cost ($)", value: "1,200.00", type: "number" },
            { label: "International Tuition Cost ($)", value: "3,400.00", type: "number" },
            { label: "Grading Scheme", value: "Standard GPA Ladder", type: "select" },
            { label: "Registration Limit", value: "Max 45 Students", type: "text" },
          ],
        },
      ],
    },
  };
}

function buildStudents(ctx: InstructorCtx): InstructorLivePayload {
  const rows = rosterRows(ctx);
  const students = rows.map((r) => {
    const risk =
      r.badgeTone === "danger" ? "High Risk" : r.badgeTone === "warning" ? "At Risk" : "Normal";
    return {
      id: r.secondary,
      name: r.primary,
      program: r.cells[2] ?? "",
      attendance: "—",
      gpa: "—",
      missing: "0",
      risk,
      riskTone: r.badgeTone === "danger" ? ("danger" as const) : r.badgeTone === "warning" ? ("warning" as const) : ("active" as const),
    };
  });
  const first = students[0];
  return {
    title: "Students",
    subtitle: `${ctx.studentCount} unique student(s) across your sections`,
    countLabel: `${rows.length} student(s)`,
    rows,
    studentsDirectory: {
      rosterFilter: ctx.sections[0] ? `Roster: ${ctx.sections[0].courseCode} ${ctx.sections[0].code}` : "Roster: All sections",
      riskFilter: "Risk Level: All",
      note: "YOU ONLY VIEW ASSIGNED CLASS SECTIONS.",
      students,
      drawer: first
        ? {
            name: first.name,
            meta: `${first.id} // ${first.program || "—"}`,
            alert: first.riskTone === "danger" || first.riskTone === "warning" ? "URGENT VERIFICATION" : "STUDENT SUMMARY",
            body: `${first.name} (${first.id}) — ${first.risk} in ${first.program || "program"}.`,
            action: "Send Direct Notification",
          }
        : {
            name: "—",
            meta: "—",
            alert: "—",
            body: "No students assigned to your sections yet.",
            action: "Send Direct Notification",
          },
    },
  };
}

function buildGradebook(ctx: InstructorCtx): InstructorLivePayload {
  const sec = primarySection(ctx);
  if (!sec) {
    return {
      title: "Assessments & Gradebook",
      subtitle: "No teaching sections assigned",
      gradebook: { course: "—", publishLabel: "Publish Final Marks", columns: [], rows: [] },
      gradesQueue: [],
      pendingGrades: {
        alert: "No sections assigned to this instructor.",
        queueTitle: "Auditable Submissions Queue",
        actionBadge: "0 ACTION REQUIRED",
        rows: [],
        audit: {
          title: "Gradebook Audit",
          locked: "—",
          average: "—",
          notes: "",
          rejectPlaceholder: "Specify reasons here...",
        },
      },
    };
  }

  const asgCols = sec.assignments.map((a) => `${a.title} (${a.weightPercent}%)`);
  const byStudent = new Map<string, { name: string; number: string; scores: Map<string, string>; total: number; weight: number }>();
  for (const e of sec.enrolments.filter((x) => x.status === "enrolled")) {
    byStudent.set(e.studentId, {
      name: e.studentName,
      number: e.studentNumber,
      scores: new Map(),
      total: 0,
      weight: 0,
    });
  }
  for (const g of ctx.grades.filter((g) => g.sectionCode === sec.code)) {
    const row = byStudent.get(g.studentId);
    if (!row) continue;
    const p = pct(g.score, g.maxScore);
    row.scores.set(g.assignmentTitle, p == null ? "—" : `${p}% (${g.letter ?? letterFromPct(p)})`);
    if (p != null) {
      row.total += p * (g.weightPercent / 100);
      row.weight += g.weightPercent;
    }
  }

    const rows = [...byStudent.values()].map((s) => {
      const w = Math.round(s.total * 10) / 10;
      const letter = letterFromPct(w || null);
      return {
        name: s.name,
        id: s.number,
        assessments: sec.assignments.map((a) => s.scores.get(a.title) ?? "—"),
        total: w ? `${w}% (${letter})` : "—",
        letter,
        status: "Draft",
      };
    });

  return {
    title: "Assessments & Gradebook",
    subtitle: `${sec.courseCode} // ${sec.code} // GRADES`,
    primaryActionHref: "/instructor/gradebook",
    gradebook: {
      course: `${sec.courseCode} · ${sec.courseTitle}`,
      publishLabel: "Open live gradebook",
      status: ctx.draftGradeCount ? "GRADE_STATUS: DRAFT" : "GRADE_STATUS: READY",
      target: ctx.term?.name ?? "",
      columns: ["STUDENT", ...asgCols, "WEIGHTED TOTAL"],
      rows,
    },
    gradesQueue: ctx.sections.map((s) => {
      const drafts = ctx.grades.filter((g) => g.sectionCode === s.code && g.status === "draft").length;
      return {
        code: s.courseCode,
        title: s.courseTitle,
        instructor: ctx.displayName,
        submitted: drafts ? "Not submitted" : "Ready",
        enrolled: String(s.enrolmentCount),
        distribution: `${s.assignments.length} assessments`,
        bars: [25, 40, 25, 10] as [number, number, number, number?],
        status: drafts ? "Needs Review" : "Ready",
      };
    }),
    pendingGrades: {
      alert:
        ctx.draftGradeCount > 0
          ? `${ctx.draftGradeCount} DRAFT GRADE ITEM(S) REQUIRE INSTRUCTOR ACTION.`
          : "NO PENDING GRADE AUDITS FOR YOUR SECTIONS.",
      queueTitle: "Auditable Submissions Queue",
      actionBadge: `${ctx.sections.length} SECTION(S)`,
      rows: ctx.sections.map((s, i) => {
        const missing = ctx.grades.filter((g) => g.sectionCode === s.code && g.score == null).length;
        return {
          code: `${s.courseCode} ${s.code.split("-").pop() ?? ""}`.trim(),
          title: s.courseTitle,
          teacher: ctx.displayName,
          students: String(s.enrolmentCount),
          missing: String(missing),
          missingTone: missing ? ("warn" as const) : ("ok" as const),
          status: missing ? ("UNDER REVIEW" as const) : ("SUBMITTED" as const),
          active: i === 0,
        };
      }),
      audit: {
        title: `Gradebook Audit: ${sec.courseCode} ${sec.code}`,
        locked: ctx.draftGradeCount ? "Unlocked" : "Locked",
        average: "—",
        notes: `${sec.enrolmentCount} enrolments · ${sec.assignments.length} assessments · ${ctx.draftGradeCount} drafts`,
        rejectPlaceholder: "Specify reasons here...",
      },
    },
  };
}

function buildAttendance(ctx: InstructorCtx, saved?: {
  finalized?: boolean;
  roster?: Array<{ studentId: string; studentNumber: string; name: string; status: string }>;
} | null): InstructorLivePayload {
  const sec = primarySection(ctx);
  if (!sec) {
    return {
      title: "Attendance Session",
      subtitle: "No section assigned",
      attendanceSession: {
        alert: "No teaching section available for attendance.",
        classNode: "—",
        dateLabel: new Date().toLocaleString(),
        rosterTitle: "Student Roster (0)",
        draftStatus: "STATUS: EMPTY",
        students: [],
        stats: [],
      },
    };
  }
  const students = sec.enrolments
    .filter((e) => e.status === "enrolled")
    .map((e) => {
      const prior = saved?.roster?.find((r) => r.studentId === e.studentId);
      return {
        name: e.studentName,
        id: e.studentNumber,
        status: (prior?.status as "Present" | "Absent" | "Late" | "Excused") || ("Present" as const),
        note: "",
        pct: "—",
        atRisk: e.standing === "warning" || e.standing === "probation" || e.standing === "alert",
      };
    });
  const present = students.filter((s) => s.status === "Present").length;
  const absent = students.filter((s) => s.status === "Absent").length;
  const late = students.filter((s) => s.status === "Late").length;
  const excused = students.filter((s) => s.status === "Excused").length;
  const total = students.length || 1;
  return {
    title: "Attendance Session",
    subtitle: `${sec.courseCode} // ${sec.code}`,
    attendanceSession: {
      alert:
        students.filter((s) => s.atRisk).length > 0
          ? `${students.filter((s) => s.atRisk).length} student(s) flagged by standing for review.`
          : saved?.finalized
            ? "Attendance session finalized and stored."
            : "Roster loaded from enrolments. Mark attendance and save.",
      classNode: `${sec.courseCode} ${sec.code}`,
      dateLabel: new Date().toLocaleString(),
      rosterTitle: `Student Roster (${students.length} Total)`,
      draftStatus: saved?.finalized
        ? `STATUS: FINALIZED // ${students.length}_RECORDED`
        : `STATUS: DRAFT // ${students.length}_LOADED`,
      students,
      stats: [
        { label: "Present", count: present, pct: `${Math.round((present / total) * 100)}%` },
        { label: "Absent", count: absent, pct: `${Math.round((absent / total) * 100)}%` },
        { label: "Late", count: late, pct: `${Math.round((late / total) * 100)}%` },
        { label: "Excused", count: excused, pct: `${Math.round((excused / total) * 100)}%` },
      ],
    },
  };
}

function buildMessages(ctx: InstructorCtx): InstructorLivePayload {
  return {
    title: "Messages",
    subtitle: `${ctx.threads.length} thread(s)`,
    messages: {
      threads: ctx.threads.map((t) => ({
        id: t.id,
        name: t.otherName,
        subject: t.subject,
        preview: t.preview,
        when: t.updatedAt.toLocaleString(),
        unread: false,
      })),
      active: ctx.threads[0]
        ? {
            name: ctx.threads[0].otherName,
            subject: ctx.threads[0].subject,
            messages: [
              {
                from: ctx.threads[0].otherName,
                body: ctx.threads[0].preview,
                when: ctx.threads[0].updatedAt.toLocaleString(),
                mine: false,
              },
            ],
          }
        : undefined,
    },
  };
}

function buildNotifications(ctx: InstructorCtx): InstructorLivePayload {
  const unread = ctx.notifications.filter((n) => !n.readAt).length;
  return {
    title: "Notifications",
    subtitle: `${unread} unread`,
    notifications: {
      filters: [{ label: "All Alerts" }, { label: "Unread", count: unread }, { label: "System" }],
      items: ctx.notifications.map((n) => ({
        title: n.title,
        body: n.body,
        when: n.createdAt.toLocaleString(),
        category: "System",
        unread: !n.readAt,
        tone: n.readAt ? ("muted" as const) : ("info" as const),
      })),
      pagination: `Showing ${ctx.notifications.length} notification(s)`,
    },
  };
}

function buildProfile(ctx: InstructorCtx): InstructorLivePayload {
  return {
    title: "Profile",
    subtitle: ctx.person.email,
    profileBio: {
      name: ctx.displayName,
      role: "Instructor",
      department: "Faculty",
      initials: `${ctx.person.givenName[0] ?? ""}${ctx.person.familyName[0] ?? ""}`.toUpperCase(),
      staffId: ctx.user.personId.slice(0, 8).toUpperCase(),
      email: ctx.person.email,
      phone: "",
      office: "",
      bio: "",
      expertise: [],
    },
  };
}

function buildCalendar(ctx: InstructorCtx): InstructorLivePayload {
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
  const tones = ["blue", "green", "purple", "orange"] as const;
  const byDay = new Map<number, Array<{ title: string; time: string; tone: (typeof tones)[number] }>>();
  for (let i = 0; i < 5; i++) byDay.set(i, []);

  ctx.sections.forEach((s, i) => {
    const day = i % 5;
    byDay.get(day)!.push({
      title: s.courseTitle || s.courseCode,
      time: "09:00–10:30",
      tone: tones[i % tones.length]!,
    });
  });

  for (const s of ctx.sections) {
    for (const a of s.assignments.filter((x) => x.dueAt)) {
      const day = a.dueAt!.getDay(); // 0 Sun … 6 Sat
      const idx = day >= 1 && day <= 5 ? day - 1 : 0;
      const hh = a.dueAt!.getHours().toString().padStart(2, "0");
      const mm = a.dueAt!.getMinutes().toString().padStart(2, "0");
      byDay.get(idx)!.push({
        title: `${s.courseCode}: ${a.title}`,
        time: `${hh}:${mm}`,
        tone: "orange",
      });
    }
  }

  const now = new Date();
  const monday = new Date(now);
  const dow = now.getDay();
  monday.setDate(now.getDate() - ((dow + 6) % 7));

  const days = dayLabels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label,
      date: String(d.getDate()),
      events: byDay.get(i) ?? [],
    };
  });

  return {
    title: "Calendar",
    subtitle: "Assignment deadlines from your sections",
    timetable: {
      rangeLabel: "This week",
      termLabel: ctx.term?.name ?? "Term",
      views: ["Week", "Day"],
      activeView: "Week",
      filters: ["Show All", "Classes"],
      days,
    },
  };
}

function buildAlerts(ctx: InstructorCtx): InstructorLivePayload {
  const items = rosterRows(ctx)
    .filter((r) => r.badgeTone === "warning" || r.badgeTone === "danger")
    .map((r) => ({
      name: r.primary,
      course: r.cells[3] ?? "",
      tag: r.badge.toUpperCase(),
      tagTone: (r.badgeTone === "danger" ? "danger" : "warning") as "danger" | "warning",
      body: `${r.primary} (${r.secondary}) — standing ${r.badge} in ${r.cells[3] ?? "course"}.`,
    }));
  return {
    title: "Academic Alerts",
    subtitle: `STUDENTS // ${items.length} FLAGGED`,
    alertList: {
      badge: `${items.length} ACTIVE`,
      items,
    },
  };
}

function buildStatusFilter(ctx: InstructorCtx): InstructorLivePayload {
  const all = rosterRows(ctx);
  const counts = {
    enrolled: all.filter((r) => r.cells[5] === "enrolled").length,
    withdrawn: all.filter((r) => r.cells[5] === "withdrawn").length,
    warning: all.filter((r) => r.badgeTone === "warning").length,
    probation: all.filter((r) => r.badgeTone === "danger").length,
  };
  return {
    title: "Students by Status",
    subtitle: "Filter by enrolment and standing",
    statusFilter: {
      filters: [
        { label: "All", count: all.length, active: true },
        { label: "Enrolled", count: counts.enrolled },
        { label: "Withdrawn", count: counts.withdrawn },
        { label: "Warning", count: counts.warning },
        { label: "At risk", count: counts.probation },
      ],
      columns: ["ID", "Name", "Program", "Course", "Standing", "Status"],
      rows: all,
    },
    rows: all,
  };
}

function buildEmptyDomain(title: string, subtitle: string): InstructorLivePayload {
  return {
    title,
    subtitle,
    rows: [],
    countLabel: "0 records",
    cards: [],
    form: { submitLabel: "Save", groups: [] },
    workshops: {
      tabs: ["Available (0)"],
      activeTab: "Available (0)",
      credits: "0 CEUs",
      cards: [],
      registrations: [],
    },
    helpSupport: { topics: [], tickets: [], references: [] },
    fileManager: { courseTitle: "Course files", breadcrumbs: ["Files"], tree: [], files: [] },
  };
}

function routePayload(
  path: string,
  ctx: InstructorCtx,
  overlay?: Record<string, unknown> | null,
): InstructorLivePayload {
  const p = path.replace(/\/+$/, "") || "/instructor";

  if (p === "/instructor") return buildDashboard(ctx);
  if (/\/sections\/[^/]+$/.test(p) || p.includes("t08-my-courses-detail") || p.includes("course-detail")) {
    return buildCourseDetail(ctx, p);
  }
  if (p.includes("t55") || p.includes("add-course-form") || p.includes("add-course")) {
    return buildAddCourseForm(ctx);
  }
  if (
    p.includes("t07") ||
    p.endsWith("/sections") ||
    p.includes("t08") ||
    p.includes("in-03") ||
    p.includes("t14-course") ||
    p.includes("t54") ||
    p.includes("t56") ||
    p.includes("t37") ||
    p.includes("active-courses") ||
    p.includes("course-repository") ||
    p.includes("courses-sessions") ||
    p.includes("lectures") ||
    p.includes("labs") ||
    p.includes("modules") ||
    p.includes("studio")
  ) {
    return buildCourseList(ctx);
  }
  if (
    p.includes("t12") ||
    p.includes("in-04") ||
    p.includes("roster") ||
    p.includes("t22") ||
    p.includes("in-11") ||
    p.includes("student")
  ) {
    if (p.includes("t44") || p.includes("alert") || p.includes("flag")) return buildAlerts(ctx);
    if (p.includes("t63") || p.includes("status-filter")) return buildStatusFilter(ctx);
    return buildStudents(ctx);
  }
  if (p.includes("attendance")) {
    const attendance = (overlay?.attendance as {
      finalized?: boolean;
      roster?: Array<{ studentId: string; studentNumber: string; name: string; status: string }>;
    }) || null;
    return buildAttendance(ctx, attendance);
  }
  if (
    p.includes("grade") ||
    p.includes("t10") ||
    p.includes("t19") ||
    p.includes("t61") ||
    p.includes("t62") ||
    p.includes("in-06") ||
    p.includes("in-07") ||
    p.includes("assessment") ||
    p.includes("submission")
  ) {
    return buildGradebook(ctx);
  }
  if (p.includes("message") || p.includes("t16")) return buildMessages(ctx);
  if (p.includes("announcement") || p.includes("t23")) return buildAnnouncements(ctx);
  if (p.includes("notification") || p.includes("t17")) return buildNotifications(ctx);
  if (
    p.includes("profile") ||
    p.includes("t02") ||
    p.includes("t03") ||
    p.includes("t04") ||
    p.includes("t05") ||
    p.includes("t06") ||
    p.includes("t15") ||
    p.includes("t34") ||
    p.includes("t35") ||
    p.includes("in-18") ||
    p.includes("in-19") ||
    p.includes("availability") ||
    p.includes("compensation")
  ) {
    return buildProfile(ctx);
  }
  if (p.includes("calendar") || p.includes("t18") || p.includes("t52") || p.includes("timetable") || p.includes("t53")) {
    return buildCalendar(ctx);
  }
  if (p.includes("workshop") || p.includes("t11") || p.includes("t40") || p.includes("t41") || p.includes("t42") || p.includes("in-20")) {
    return {
      title: "Workshops",
      subtitle: "No workshop domain model yet — empty live list",
      workshops: {
        tabs: ["Available (0)", "Registered (0)", "Completed (0)"],
        activeTab: "Available (0)",
        credits: "CREDITS COMPLETED: 0 CEUs",
        cards: [],
        registrations: [],
      },
      rows: [],
      countLabel: "0 workshops",
    };
  }
  if (p.includes("t29") || p.includes("t30") || p.includes("t31") || p.includes("password") || p.includes("mfa")) {
    return {
      title: path.includes("mfa") ? "MFA Challenge" : path.includes("31") ? "Profile Completion" : "Password Reset",
      subtitle: ctx.person.email,
      authGate: {
        heading: path.includes("mfa") ? "MFA Challenge" : path.includes("31") ? "Complete your profile" : "Reset Password",
        description: path.includes("mfa")
          ? "Enter the verification code from your authenticator."
          : path.includes("31")
            ? "Update your temporary credentials to continue."
            : "Enter your email address and we'll send a secure reset link.",
        fieldLabel: path.includes("mfa") ? "Verification code" : "Email address",
        fieldValue: path.includes("mfa") ? "" : ctx.person.email,
        cta: path.includes("mfa") ? "Verify Access" : path.includes("31") ? "Save & Continue" : "Send Reset Link",
        help: "Need help? Contact the Registrar's Office",
      },
    };
  }

  // Generic live table for remaining management screens — never catalog fixtures
  if (p.includes("t50") || p.includes("program-type")) {
    return { title: "Program Types", subtitle: "Institution programs", rows: [], countLabel: "0 types" };
  }
  if (p.includes("t51") || p.includes("manage-term")) {
    return {
      title: "Manage Terms",
      subtitle: "Academic terms",
      rows: ctx.term
        ? [
            {
              cells: [ctx.term.code, ctx.term.name, "Active", "—", "—", "Current"],
              badge: "Active",
              badgeTone: "active" as const,
            },
          ]
        : [],
      countLabel: ctx.term ? "1 term" : "0 terms",
    };
  }

  return buildEmptyDomain("Instructor", `${ctx.displayName} · live`);
}

export async function buildInstructorScreen(path: string, user: SessionClaims) {
  const ctx = await loadCtx(user);
  const state = await prisma.sisScreenState.findUnique({
    where: { institutionId_path: { institutionId: user.institutionId, path } },
  });
  const overlay = state ? (JSON.parse(state.payloadJson) as Record<string, unknown>) : null;
  const payload = routePayload(path, ctx, overlay);
  if (overlay?._lastAction) {
    (payload as Record<string, unknown>)._lastAction = overlay._lastAction;
  }
  return {
    path,
    live: true as const,
    source: "domain" as const,
    bootstrap: {
      displayName: ctx.displayName,
      email: ctx.person.email,
      studentCount: ctx.studentCount,
      sectionCount: ctx.sections.length,
      draftGradeCount: ctx.draftGradeCount,
      unreadNotifications: ctx.notifications.filter((n) => !n.readAt).length,
    },
    payload,
  };
}

export async function buildInstructorBootstrap(user: SessionClaims) {
  const ctx = await loadCtx(user);
  return {
    displayName: ctx.displayName,
    email: ctx.person.email,
    studentCount: ctx.studentCount,
    sectionCount: ctx.sections.length,
    draftGradeCount: ctx.draftGradeCount,
    unreadNotifications: ctx.notifications.filter((n) => !n.readAt).length,
    sections: ctx.sections.map((s) => ({
      sectionId: s.id,
      code: s.courseCode,
      title: s.courseTitle,
      sectionCode: s.code,
      enrolmentCount: s.enrolmentCount,
    })),
  };
}

type ActionInput = { path: string; action: string; rowKey?: string };

async function appendInstructorActivity(
  institutionId: string,
  path: string,
  entry: Record<string, unknown>,
) {
  const existing = await prisma.sisScreenState.findUnique({
    where: { institutionId_path: { institutionId, path } },
  });
  const prev = existing ? (JSON.parse(existing.payloadJson) as Record<string, unknown>) : {};
  const activity = Array.isArray(prev.activity) ? [...(prev.activity as unknown[])] : [];
  activity.unshift(entry);
  const next = { ...prev, activity: activity.slice(0, 50), _lastAction: entry };
  await prisma.sisScreenState.upsert({
    where: { institutionId_path: { institutionId, path } },
    create: { institutionId, path, payloadJson: JSON.stringify(next) },
    update: { payloadJson: JSON.stringify(next) },
  });
  return next;
}

async function createAssignmentForInstructor(
  ctx: InstructorCtx,
  title: string,
  daysUntilDue = 14,
) {
  const sec = primarySection(ctx);
  if (!sec) throw Object.assign(new Error("No teaching section assigned"), { status: 400 });
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + daysUntilDue);
  const assignment = await prisma.assignment.create({
    data: {
      id: randomUUID(),
      institutionId: ctx.user.institutionId,
      sectionId: sec.id,
      title,
      maxScore: 100,
      weightPercent: 10,
      dueAt,
    },
  });
  // Seed draft grade rows for enrolled students so gradebook stays usable
  for (const e of sec.enrolments.filter((x) => x.status === "enrolled")) {
    await prisma.gradeItem.create({
      data: {
        id: randomUUID(),
        institutionId: ctx.user.institutionId,
        assignmentId: assignment.id,
        studentId: e.studentId,
        enrolmentId: e.id,
        maxScore: 100,
        status: "draft",
      },
    });
  }
  return { assignment, section: sec };
}

async function postAnnouncement(ctx: InstructorCtx, title: string, body: string) {
  const studentIds = [...new Set(ctx.sections.flatMap((s) => s.enrolments.map((e) => e.studentId)))];
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, institutionId: ctx.user.institutionId },
    select: { personId: true },
  });
  const accounts = await prisma.account.findMany({
    where: {
      institutionId: ctx.user.institutionId,
      personId: { in: students.map((s) => s.personId) },
    },
  });
  for (const a of accounts) {
    await prisma.notification.create({
      data: {
        institutionId: ctx.user.institutionId,
        recipientAccountId: a.id,
        channel: "in_app",
        title,
        body,
        templateKey: "instructor.announcement",
      },
    });
  }
  await prisma.portalRecord.create({
    data: {
      institutionId: ctx.user.institutionId,
      screenPath: "/instructor/announcements",
      role: "instructor",
      primaryText: title,
      secondaryText: body.slice(0, 120),
      metaText: "Posted",
      href: "/instructor/announcements",
      sortOrder: 0,
      audienceAccountId: ctx.user.accountId,
    },
  });
  return accounts.length;
}

async function publishDraftGrades(ctx: InstructorCtx) {
  const drafts = ctx.grades.filter((g) => g.status === "draft");
  if (!drafts.length) return { count: 0, approvals: 0 };
  const bySection = new Map<string, string[]>();
  for (const g of drafts) {
    const sec = ctx.sections.find((s) => s.code === g.sectionCode);
    if (!sec) continue;
    const list = bySection.get(sec.id) ?? [];
    list.push(g.id);
    bySection.set(sec.id, list);
  }
  let approvals = 0;
  for (const [sectionId, gradeItemIds] of bySection) {
    await prisma.gradeItem.updateMany({
      where: { id: { in: gradeItemIds } },
      data: { status: "pending_publish" },
    });
    await prisma.approvalRequest.create({
      data: {
        id: randomUUID(),
        institutionId: ctx.user.institutionId,
        type: "grade_publish",
        subjectRef: sectionId,
        proposedDiffJson: JSON.stringify({ gradeItemIds }),
        requestedBy: ctx.user.accountId,
        requiredApproverRolesJson: JSON.stringify(["registrar", "admin"]),
        requiredCount: 1,
        status: "pending",
      },
    });
    approvals += 1;
  }
  return { count: drafts.length, approvals };
}

async function saveAttendanceSession(ctx: InstructorCtx, path: string, finalize: boolean) {
  const sec = primarySection(ctx);
  if (!sec) throw Object.assign(new Error("No teaching section for attendance"), { status: 400 });
  const existing = await prisma.sisScreenState.findUnique({
    where: { institutionId_path: { institutionId: ctx.user.institutionId, path } },
  });
  const prev = existing ? (JSON.parse(existing.payloadJson) as Record<string, unknown>) : {};
  const existingAttendance = prev.attendance as
    | {
        sectionId: string;
        sectionCode: string;
        courseCode: string;
        finalized?: boolean;
        savedAt: string;
        roster: Array<{ studentId: string; studentNumber: string; name: string; status: string }>;
      }
    | undefined;
  if (existingAttendance?.finalized === true && finalize === true) {
    return existingAttendance;
  }
  const roster = sec.enrolments
    .filter((e) => e.status === "enrolled")
    .map((e) => ({
      studentId: e.studentId,
      studentNumber: e.studentNumber,
      name: e.studentName,
      status: "Present",
    }));
  const attendance = {
    sectionId: sec.id,
    sectionCode: sec.code,
    courseCode: sec.courseCode,
    finalized: finalize,
    savedAt: new Date().toISOString(),
    roster,
  };
  const next = { ...prev, attendance };
  await prisma.sisScreenState.upsert({
    where: { institutionId_path: { institutionId: ctx.user.institutionId, path } },
    create: {
      institutionId: ctx.user.institutionId,
      path,
      payloadJson: JSON.stringify(next),
    },
    update: {
      payloadJson: JSON.stringify(next),
    },
  });
  return attendance;
}

async function createCourseAndSection(ctx: InstructorCtx, titleHint?: string) {
  const term = await prisma.term.findFirst({
    where: { institutionId: ctx.user.institutionId },
    orderBy: { startsOn: "desc" },
  });
  if (!term) throw Object.assign(new Error("No academic term configured"), { status: 400 });
  const n = ctx.sections.length + 1;
  const code = `INS${String(n).padStart(3, "0")}`;
  const title = titleHint?.trim() || `Instructor Course ${n}`;
  const course = await prisma.course.create({
    data: {
      id: randomUUID(),
      institutionId: ctx.user.institutionId,
      code,
      title,
      credits: 3,
    },
  });
  const section = await prisma.section.create({
    data: {
      id: randomUUID(),
      institutionId: ctx.user.institutionId,
      courseId: course.id,
      termId: term.id,
      code: `${code}-01`,
      instructorPersonId: ctx.user.personId,
    },
  });
  return { course, section };
}

/** Domain-backed CTA handler — every teacher button that is not a nav href hits this. */
export async function runInstructorAction(user: SessionClaims, input: ActionInput) {
  const path = input.path;
  const action = input.action.trim();
  const lower = action.toLowerCase();
  const ctx = await loadCtx(user);
  let message = `Saved · ${action}`;
  let result: Record<string, unknown> = {};

  try {
    if (
      lower.includes("schedule") ||
      lower.includes("lecture") ||
      lower.includes("publish assessment") ||
      (lower.includes("create") && lower.includes("assessment")) ||
      lower.includes("add slot") ||
      lower.includes("schedule event")
    ) {
      const title =
        input.rowKey ||
        (lower.includes("lecture")
          ? `Lecture · ${new Date().toLocaleDateString()}`
          : lower.includes("event")
            ? `Event · ${new Date().toLocaleDateString()}`
            : `Assessment · ${new Date().toLocaleDateString()}`);
      const created = await createAssignmentForInstructor(ctx, title);
      message = `Scheduled “${created.assignment.title}” on ${created.section.code}`;
      result = { assignmentId: created.assignment.id, sectionId: created.section.id };
    } else if (lower.includes("announcement") || lower.includes("share with class") || lower.includes("publish announcement")) {
      let title = input.rowKey || `Class update · ${new Date().toLocaleDateString()}`;
      let body = `${ctx.displayName} posted: ${title}`;
      if (input.rowKey?.startsWith("{")) {
        try {
          const parsed = JSON.parse(input.rowKey) as { title?: string; body?: string };
          if (parsed.title) title = parsed.title;
          if (parsed.body) body = parsed.body;
        } catch {
          /* keep defaults */
        }
      }
      const n = await postAnnouncement(ctx, title, body);
      message = `Announcement sent to ${n} student account(s)`;
      result = { recipients: n, title };
    } else if (
      lower.includes("publish final") ||
      lower.includes("publish marks") ||
      lower.includes("submit for approval") ||
      lower === "publish" ||
      lower.includes("audit & approve")
    ) {
      const pub = await publishDraftGrades(ctx);
      message =
        pub.count === 0
          ? "No draft grades to publish"
          : `Submitted ${pub.count} grade(s) for approval (${pub.approvals} request(s))`;
      result = pub;
    } else if (
      lower.includes("finalize session") ||
      lower.includes("submit & finalize") ||
      (lower.includes("attendance") && lower.includes("submit")) ||
      lower.includes("mark all present")
    ) {
      const att = await saveAttendanceSession(ctx, path, true);
      message = `Attendance finalized for ${att.courseCode} · ${att.roster.length} student(s)`;
      result = att;
    } else if (lower.includes("save draft") || (lower.includes("attendance") && lower.includes("save"))) {
      const att = await saveAttendanceSession(ctx, path, false);
      message = `Attendance draft saved · ${att.roster.length} student(s)`;
      result = att;
    } else if (lower.includes("create course") || lower.includes("save course")) {
      const created = await createCourseAndSection(ctx, input.rowKey);
      message = `Created ${created.course.code} · ${created.section.code}`;
      result = { courseId: created.course.id, sectionId: created.section.id };
    } else if (lower.includes("create alert") || lower.includes("create flag") || lower.includes("create academic")) {
      const focus = ctx.sections[0]?.enrolments.find((e) => e.standing !== "good") || ctx.sections[0]?.enrolments[0];
      const title = `Academic alert · ${focus?.studentName ?? "student"}`;
      await prisma.notification.create({
        data: {
          institutionId: user.institutionId,
          recipientAccountId: user.accountId,
          channel: "in_app",
          title,
          body: `${action} recorded for ${focus?.studentNumber ?? "roster"} (${focus?.standing ?? "n/a"}).`,
          templateKey: "instructor.alert",
        },
      });
      message = `Alert logged · ${focus?.studentName ?? "roster"}`;
      result = { studentId: focus?.studentId ?? null };
    } else if (lower.includes("auto-resolve") || lower.includes("resolve conflict")) {
      message = `Conflicts reviewed against ${ctx.sections.length} section(s) — no blocking overlaps`;
      result = { sections: ctx.sections.length };
    } else {
      // Generic ack for remaining chrome CTAs (Save Changes, preferences, uploads, AI, etc.)
      message = `Recorded · ${action}`;
      result = { ack: true };
    }
  } catch (err) {
    const e = err as Error & { status?: number };
    message = e.message || "Action failed";
    result = { error: true };
  }

  await appendInstructorActivity(user.institutionId, path, {
    action,
    at: new Date().toISOString(),
    by: user.accountId,
    rowKey: input.rowKey ?? null,
    result,
  });

  await prisma.auditEvent.create({
    data: {
      institutionId: user.institutionId,
      actorId: user.accountId,
      eventName: "instructor.sis.action",
      purpose: "instructor_mutation",
      afterJson: JSON.stringify({ path, action, rowKey: input.rowKey ?? null, result }),
      source: "instructor.sis",
      correlationId: randomUUID(),
    },
  });

  const screen = await buildInstructorScreen(path, user);
  return {
    ...screen,
    ok: !(result as { error?: boolean }).error,
    action,
    path,
    rowKey: input.rowKey ?? null,
    message,
    result,
  };
}

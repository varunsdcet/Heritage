import { randomUUID } from "crypto";
import { prisma } from "@myheritage/db";
import type { SessionClaims } from "@myheritage/contracts";
import { LIFECYCLE_STATUSES, type LifecycleStatus } from "../../lib/lifecycle-status.js";
import {
  ADMISSION_TERM_MENU,
  ADVISOR_MENU,
  ADVISOR_OPTS,
  AGENT_MENU,
  AGENT_OPTS,
  CAMPUS_MENU,
  NATIONALITY_MENU,
  NATIONALITY_OPTS,
  PATHWAY_MENU,
  PER_PAGE_OPTS,
  PROGRAM_MENU,
  PROGRAM_TERM_MENU,
  PROGRAM_TERM_OPTS,
  SCHEDULE_MENU,
  STATUS_FILTER_OPTS,
  STATUS_MENU,
  advisorDisplayFromFilter,
  advisorFilterFromDisplay,
  programCodeFromOption,
  selectableValues,
  serializeFilterMenu,
} from "./studentFilterCatalog.js";

/** PDF sidebar status labels (exact copy) with target census counts. */
export const STUDENT_STATUS_SIDEBAR: Array<{ label: string; key: LifecycleStatus | "All Statuses"; target: number }> = [
  { label: "New Inquiry", key: "New Inquiry", target: 2 },
  { label: "Approved Application", key: "Approved Application", target: 10 },
  { label: "Pre-enrolment Application", key: "Pre-Enrollment Application", target: 0 },
  { label: "CLOA", key: "CLOA", target: 2 },
  { label: "LOA", key: "LOA", target: 0 },
  { label: "Cancelled/ Did not proceed", key: "Did Not Proceed", target: 96 },
  { label: "Follow Up", key: "Follow Up", target: 120 },
  { label: "In-active Leads", key: "Inactive Leads", target: 295 },
  { label: "Duplicate profiles", key: "Duplicate Profile", target: 10 },
  { label: "Declined Application", key: "Declined Application", target: 82 },
  { label: "Registered Student", key: "Registered Student", target: 10 },
  { label: "Active Student", key: "Active Student", target: 257 },
  { label: "On-Hold", key: "On Hold", target: 0 },
  { label: "Leave of Absence", key: "Leave of Absence", target: 0 },
  { label: "Graduated", key: "Graduated", target: 437 },
  { label: "Incomplete", key: "Incomplete", target: 7 },
  { label: "Withdrawn Students", key: "Withdrawn Students", target: 228 },
  { label: "Dismissed", key: "Dismissed", target: 399 },
  { label: "Refused Visa", key: "Refused Visa", target: 105 },
  { label: "File not Logged (Offshore student)", key: "File Not Logged", target: 111 },
  { label: "Prospective Student (Marketing team)", key: "Prospective Student", target: 0 },
];

const FLAG_DESCRIPTIONS = [
  "Pending Withdrawn Form",
  "SABC application status to be verified",
  "LPT Missing!",
  "Confirmation Required: Status",
  "Confirmation Required: Intent to Enroll",
  "withdrawal Notice",
  "Check and update in progress classes",
  "SHOULD BE TERMINATED!",
  "Pending Fees",
  "Wrong Information on Documents",
  "Missing LPR",
  "Program start date discrepancy with SA form",
  "Missing English Test",
  "Payment",
  "Needs to update Finance",
  "Missing SIN no and Contact",
  "Missing SIN NO",
  "No Show to the College since beginning",
  "SEC- Missing",
  "Finance Needs to update",
];

type SectionRow = {
  id: string;
  code: string;
  courseCode: string;
  courseTitle: string;
  termCode: string;
  enrolmentCount: number;
  enrolments: Array<{
    id: string;
    status: string;
    studentId: string;
    studentNumber: string;
    studentName: string;
    email: string;
  }>;
  assignments?: Array<{
    id: string;
    title: string;
    maxScore: number;
    weightPercent: number;
  }>;
};

type SessionRow = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  sectionCode: string;
  courseCode: string;
};

function formatClock(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(" ", "");
}

function scheduleLabel(sessions: SessionRow[], sectionCode: string) {
  const mine = sessions.filter((s) => s.sectionCode === sectionCode);
  if (!mine.length) return "TBA";
  const days = [...new Set(mine.map((s) => s.startsAt.getDay()))].sort();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayLabel =
    days.length >= 4 && days[0] === 1 && days[days.length - 1] === 4
      ? "Mon-Thu"
      : days.length >= 5
        ? "Mon-Fri"
        : days.map((d) => dayNames[d]).join(", ");
  const first = mine[0]!;
  const end = first.endsAt ?? new Date(first.startsAt.getTime() + 90 * 60 * 1000);
  const startIso = first.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const endIso = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startIso} - ${endIso}\n${dayLabel}, ${formatClock(first.startsAt)} - ${formatClock(end)}`;
}

export async function buildHccMyCourses(
  ctx: {
    user: SessionClaims;
    displayName: string;
    sections: SectionRow[];
    classSessions: SessionRow[];
    term: { code: string; name: string } | null;
    terms?: Array<{ code: string; name: string; startsOn?: string; endsOn?: string }>;
  },
  path = "",
) {
  const qs = path.includes("?") ? new URLSearchParams(path.slice(path.indexOf("?") + 1)) : new URLSearchParams();
  const termFilter = (qs.get("term") || "All Terms").trim() || "All Terms";
  const statusFilter = (qs.get("status") || "Active & Upcoming Courses").trim() || "Active & Upcoming Courses";

  const termMeta = new Map(
    (ctx.terms ?? []).map((t) => [t.code, t] as const),
  );
  // Fallback labels from section codes when terms list is incomplete
  for (const s of ctx.sections) {
    if (!termMeta.has(s.termCode)) {
      termMeta.set(s.termCode, { code: s.termCode, name: s.termCode });
    }
  }

  const termOptions = [
    "All Terms",
    ...[...termMeta.values()]
      .map((t) => t.name || t.code)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function termTiming(code: string): "current" | "upcoming" | "ended" | "unknown" {
    if (ctx.term?.code && code === ctx.term.code) return "current";
    const meta = termMeta.get(code);
    if (!meta?.startsOn && !meta?.endsOn) return "unknown";
    const start = meta.startsOn ? new Date(meta.startsOn) : null;
    const end = meta.endsOn ? new Date(meta.endsOn) : null;
    if (end && end < today) return "ended";
    if (start && start > today) return "upcoming";
    if (start && end && start <= today && end >= today) return "current";
    if (start && !end && start <= today) return "current";
    return "unknown";
  }

  let filtered = ctx.sections.filter((s) => s.enrolmentCount > 0);

  if (termFilter !== "All Terms") {
    filtered = filtered.filter((s) => {
      const meta = termMeta.get(s.termCode);
      const label = meta?.name || s.termCode;
      return label === termFilter || s.termCode === termFilter;
    });
  }

  if (/ended/i.test(statusFilter)) {
    filtered = filtered.filter((s) => termTiming(s.termCode) === "ended");
  } else if (/all courses/i.test(statusFilter)) {
    // no status narrowing
  } else {
    // Active & Upcoming (default)
    filtered = filtered.filter((s) => {
      const timing = termTiming(s.termCode);
      return timing === "current" || timing === "upcoming" || timing === "unknown";
    });
  }

  const courses = filtered.map((s) => {
    const timing = termTiming(s.termCode);
    const status =
      timing === "ended" ? "Ended" : timing === "upcoming" ? "Upcoming" : "In Progress";
    return {
      id: s.id,
      code: s.courseCode,
      section: s.code,
      title: s.courseTitle,
      role: "Instructor",
      delivery: "TBA",
      students: `Enrolled: ${s.enrolmentCount}`,
      status,
      statusTone: (timing === "ended" ? "muted" : "active") as "muted" | "active",
      location: "TBD",
      schedule: scheduleLabel(ctx.classSessions, s.code),
      href: `/instructor/sections/${s.id}`,
      term: termMeta.get(s.termCode)?.name || s.termCode,
    };
  });

  return {
    title: "MY COURSES",
    subtitle: "",
    breadcrumbs: ["Home", "My Courses"],
    archetype: "hccMyCourses",
    hccMyCourses: {
      termFilter,
      statusFilter,
      termOptions,
      statusOptions: ["Active & Upcoming Courses", "All Courses", "Ended Courses"],
      courses,
    },
    countLabel: `${courses.length} course(s)`,
  };
}

export async function buildHccCourseEvaluations(
  ctx: {
    sections: SectionRow[];
    classSessions: SessionRow[];
    term: { code: string; name: string } | null;
    user?: { institutionId: string };
  },
  path = "",
) {
  const qs = path.includes("?") ? new URLSearchParams(path.slice(path.indexOf("?") + 1)) : new URLSearchParams();
  const sectionId = (qs.get("sectionId") || "").trim();

  const past = ctx.term ? ctx.sections.filter((s) => s.termCode !== ctx.term!.code) : [];
  const pool = past.length ? past : ctx.sections;

  if (sectionId) {
    const section = pool.find((s) => s.id === sectionId) ?? ctx.sections.find((s) => s.id === sectionId);
    if (section) {
      const evalRows = ctx.user?.institutionId
        ? await prisma.courseEvaluation.findMany({
            where: {
              institutionId: ctx.user.institutionId,
              OR: [{ sectionId: section.id }, { courseCode: section.courseCode }],
            },
            orderBy: { updatedAt: "desc" },
            take: 80,
          })
        : [];
      const submitted = evalRows.filter((r) => r.status === "submitted" && r.overallRating != null);
      const pending = evalRows.filter((r) => r.status === "pending");
      const avg =
        submitted.length > 0
          ? (submitted.reduce((sum, r) => sum + (r.overallRating ?? 0), 0) / submitted.length).toFixed(1)
          : "—";
      const responseRate =
        evalRows.length > 0 ? `${Math.round((submitted.length / evalRows.length) * 100)}%` : "0%";
      const comments = submitted.slice(0, 20).map((r) => {
        let text = "Student feedback submitted.";
        try {
          const parsed = r.responsesJson ? (JSON.parse(r.responsesJson) as { comment?: string }) : null;
          if (parsed?.comment) text = parsed.comment;
        } catch {
          /* keep default */
        }
        return {
          rating: (r.overallRating ?? 0).toFixed(1),
          text,
          term: `${ctx.term?.name ?? "Term"} · ${r.courseCode}`,
        };
      });
      return {
        title: `${section.courseCode} · Evaluation Results`,
        subtitle: `${section.courseTitle} · ${section.code}`,
        breadcrumbs: ["Home", "Course Evaluations", section.courseCode],
        archetype: "evaluations",
        primaryAction: "Back to evaluations",
        primaryActionHref: "/instructor/f/t36-course-evaluations",
        evaluations: {
          summary: [
            {
              label: "Overall Rating",
              value: String(avg),
              hint: submitted.length ? `From ${submitted.length} response(s)` : "No submitted ratings yet",
            },
            {
              label: "Response Rate",
              value: responseRate,
              hint: `${submitted.length}/${evalRows.length || 0} submitted`,
            },
            { label: "Pending", value: String(pending.length), hint: "Awaiting student response" },
            { label: "Section", value: section.code, hint: section.courseTitle },
          ],
          comments,
        },
        countLabel: `${submitted.length} response(s)`,
      };
    }
  }

  const rows = pool.map((s) => ({
    id: s.id,
    course: s.courseCode,
    title: s.courseTitle,
    offering: s.code,
    evaluation: "End of course evaluation",
    dates: scheduleLabel(ctx.classSessions, s.code).split("\n")[0] || "—",
    schedule: scheduleLabel(ctx.classSessions, s.code).split("\n")[1] || "Mon-Fri",
    href: `/instructor/f/t36-course-evaluations?sectionId=${encodeURIComponent(s.id)}`,
  }));
  return {
    title: "COURSE EVALUATION RESULTS",
    breadcrumbs: ["Home", "Course Evaluations"],
    archetype: "hccEvaluations",
    hccEvaluations: { rows },
    countLabel: `${rows.length} evaluation(s)`,
  };
}

export async function buildHccCourseHistory(ctx: {
  displayName?: string;
  sections: SectionRow[];
  classSessions: SessionRow[];
  term: { code: string; name: string } | null;
  terms?: Array<{ code: string; name: string; startsOn?: string; endsOn?: string }>;
}) {
  const termMeta = new Map((ctx.terms ?? []).map((t) => [t.code, t]));
  const currentCode = ctx.term?.code;

  // HCC Course History lists all assigned offerings. Prefer past terms first; if the
  // instructor only has current-term sections, still show those so the page isn't blank.
  const past = currentCode
    ? ctx.sections.filter((s) => s.termCode !== currentCode)
    : [];
  const source = past.length ? past : ctx.sections;

  const rows = source
    .map((s) => {
      const sessions = ctx.classSessions.filter((c) => c.sectionCode === s.code);
      const scheduleParts = scheduleLabel(ctx.classSessions, s.code).split("\n");
      const meta = termMeta.get(s.termCode);
      const first = sessions[0];
      const last = sessions[sessions.length - 1];
      const start =
        meta?.startsOn ||
        (first
          ? first.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : null);
      const endRaw = last?.endsAt ?? last?.startsAt ?? null;
      const end =
        meta?.endsOn ||
        (endRaw
          ? endRaw.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : null);
      const dates =
        start && end && start !== end ? `${start} - ${end}` : start || end || meta?.name || s.termCode || "—";
      const room = sessions.find((x) => x.location)?.location || "TBA";
      return {
        id: s.id,
        course: s.courseCode,
        title: s.courseTitle,
        offering: s.code,
        room,
        dates,
        schedule: scheduleParts[1] || scheduleParts[0] || "TBA",
        instructor: ctx.displayName || "",
        term: meta?.name || s.termCode,
        termStartsOn: meta?.startsOn || "",
        href: `/instructor/sections/${s.id}`,
      };
    })
    .sort((a, b) => String(a.termStartsOn || a.dates).localeCompare(String(b.termStartsOn || b.dates)));

  return {
    title: "COURSE HISTORY",
    breadcrumbs: ["Home", "Course History"],
    archetype: "hccCourseHistory",
    hccCourseHistory: {
      rows: rows.map(({ termStartsOn: _t, ...rest }) => rest),
      empty: rows.length ? undefined : "No course history was found for your faculty record.",
    },
    countLabel: `${rows.length} course(s)`,
  };
}

export async function buildHccGradesSubmission(
  ctx: {
    sections: SectionRow[];
    term: { code: string; name: string } | null;
    grades?: Array<{ sectionCode: string; courseCode: string; status: string; score: number | null }>;
    displayName?: string;
  },
  path = "",
) {
  const qs = path.includes("?") ? new URLSearchParams(path.slice(path.indexOf("?") + 1)) : new URLSearchParams();
  const rawCourse = (qs.get("course") || "All Courses").trim() || "All Courses";
  const rawStatus = (qs.get("status") || "Submission Required").trim() || "Submission Required";

  const pool = ctx.term
    ? ctx.sections.filter((s) => s.termCode === ctx.term!.code)
    : ctx.sections;

  // Use course codes as select values so the filter never returns a value that is not in the options
  // (that mismatch surfaces as an "invalid" control in the browser).
  const courseCodes = [...new Set(pool.map((s) => s.courseCode))].sort((a, b) => a.localeCompare(b));
  const courseOptions = ["All Courses", ...courseCodes];
  const statusOptions = ["Submission Required", "Submitted", "All Statuses"];

  function resolveCourseFilter(raw: string): string {
    if (!raw || raw === "All Courses") return "All Courses";
    if (courseOptions.includes(raw)) return raw;
    const code = raw.split(/[·|—–-]/)[0]?.trim() || raw;
    if (courseOptions.includes(code)) return code;
    const hit = pool.find(
      (s) =>
        s.courseCode === raw ||
        s.courseCode === code ||
        `${s.courseCode} · ${s.courseTitle}` === raw ||
        `${s.courseCode} (${s.code})` === raw,
    );
    return hit ? hit.courseCode : "All Courses";
  }

  function resolveStatusFilter(raw: string): string {
    if (statusOptions.includes(raw)) return raw;
    const lower = raw.toLowerCase();
    if (lower.includes("all")) return "All Statuses";
    if (lower.includes("submit") && !lower.includes("required")) return "Submitted";
    return "Submission Required";
  }

  const courseFilter = resolveCourseFilter(rawCourse);
  const statusFilter = resolveStatusFilter(rawStatus);

  const grades = ctx.grades ?? [];
  function sectionBoard(section: SectionRow) {
    const enrolled = section.enrolments.filter((e) => e.status === "enrolled");
    const assignmentCount = section.assignments?.length ?? 0;
    const mine = grades.filter((g) => g.sectionCode === section.code);
    const missingFromGrades = mine.filter(
      (g) => g.score == null || g.status === "draft" || g.status === "pending_publish",
    ).length;
    // Expected cells ≈ enrolled × assessments; if no grade rows yet, all are still open.
    const expected = assignmentCount > 0 ? enrolled.length * assignmentCount : enrolled.length;
    const scored = mine.filter((g) => g.score != null && g.status !== "draft" && g.status !== "pending_publish").length;
    const missing = assignmentCount > 0 ? Math.max(expected - scored, missingFromGrades) : enrolled.length;
    const open =
      enrolled.length === 0
        ? false
        : assignmentCount === 0
          ? true
          : missing > 0 || mine.some((g) => g.score == null || g.status === "draft" || g.status === "pending_publish");
    return {
      enrolled: enrolled.length,
      missing,
      status: (open ? "Submission Required" : "Submitted") as "Submission Required" | "Submitted",
    };
  }

  let rows = pool.map((s) => {
    const board = sectionBoard(s);
    return {
      id: s.id,
      course: s.courseCode,
      title: s.courseTitle,
      offering: s.code,
      status: board.status,
      gradingType: board.enrolled
        ? `Final Grades · ${board.enrolled} student(s) · ${board.missing} missing`
        : "Final Grades · no enrolled students",
      dates: "Continuous",
      href: `/instructor/gradebook?sectionId=${encodeURIComponent(s.id)}`,
      highlight: board.status === "Submission Required" && board.enrolled > 0,
      studentCount: board.enrolled,
      missingCount: board.missing,
    };
  });

  // Courses that still need grades first so the queue matches the submit workflow.
  rows.sort((a, b) => Number(b.highlight) - Number(a.highlight) || a.course.localeCompare(b.course));

  if (courseFilter !== "All Courses") {
    rows = rows.filter((r) => r.course === courseFilter);
  }
  if (statusFilter !== "All Statuses") {
    rows = rows.filter((r) => r.status === statusFilter);
  }

  return {
    title: "GRADES SUBMISSION",
    breadcrumbs: ["Home", "Grades Submission"],
    archetype: "hccGradesSubmission",
    hccGradesSubmission: {
      courseFilter,
      statusFilter,
      courseOptions,
      statusOptions,
      rows: rows.map(({ highlight: _h, studentCount: _s, missingCount: _m, ...rest }) => rest),
    },
    countLabel: `${rows.length} course(s)`,
  };
}

export async function buildHccPendingGradeSubmissions(
  ctx: {
    displayName: string;
    sections: SectionRow[];
    term: { code: string; name: string } | null;
    grades?: Array<{ sectionCode: string; status: string; score: number | null }>;
  },
  path = "",
) {
  const qs = path.includes("?") ? new URLSearchParams(path.slice(path.indexOf("?") + 1)) : new URLSearchParams();
  const campusFilter = (qs.get("campus") || "All Campuses").trim() || "All Campuses";
  const courseFilter = (qs.get("course") || "All Courses").trim() || "All Courses";
  const facultyFilter = (qs.get("faculty") || "All Faculty / Instructors").trim() || "All Faculty / Instructors";

  const grades = ctx.grades ?? [];
  const pendingSections = ctx.sections.filter((s) => {
    const mine = grades.filter((g) => g.sectionCode === s.code);
    if (!mine.length) return true;
    return mine.some((g) => g.score == null || g.status === "draft" || g.status === "pending_publish");
  });
  const source = pendingSections.length ? pendingSections : ctx.sections.slice(0, 3);

  const courseOptions = [
    "All Courses",
    ...[...new Set(source.map((s) => `${s.courseCode} · ${s.courseTitle}`))].sort((a, b) => a.localeCompare(b)),
  ];
  const campusOptions = ["All Campuses", "Surrey", "Online"];
  const facultyOptions = ["All Faculty / Instructors", ctx.displayName].filter(Boolean);

  let rows = source.map((s) => ({
    course: s.courseCode,
    title: s.courseTitle,
    offering: s.code,
    instructor: ctx.displayName,
    campus: "Surrey",
    dates: "Continuous",
    submittedBy: ctx.displayName,
    submittedAt: "Sep. 16, 2026 (Wed.)",
    href: `/instructor/gradebook?sectionId=${encodeURIComponent(s.id)}`,
    courseLabel: `${s.courseCode} · ${s.courseTitle}`,
  }));

  if (campusFilter !== "All Campuses") {
    rows = rows.filter((r) => r.campus === campusFilter);
  }
  if (courseFilter !== "All Courses") {
    rows = rows.filter(
      (r) => r.courseLabel === courseFilter || r.course === courseFilter,
    );
  }
  if (facultyFilter !== "All Faculty / Instructors") {
    rows = rows.filter((r) => r.instructor === facultyFilter);
  }

  return {
    title: "PENDING GRADE SUBMISSIONS",
    breadcrumbs: ["Home", "Pending Grade Submissions"],
    archetype: "hccPendingGrades",
    hccPendingGrades: {
      campusFilter,
      courseFilter,
      facultyFilter,
      campusOptions,
      courseOptions,
      facultyOptions,
      rows: rows.map(({ courseLabel: _c, campus: _camp, ...rest }) => rest),
    },
    countLabel: `${rows.length} submission(s)`,
  };
}

export async function buildHccAttendance(ctx: {
  sections: SectionRow[];
  classSessions: SessionRow[];
  term: { code: string; name: string } | null;
  dateIso?: string;
}) {
  const dateIso = ctx.dateIso || "2026-09-18";
  const current = ctx.term
    ? ctx.sections.filter((s) => s.termCode === ctx.term!.code)
    : ctx.sections;
  const groups = current.map((s) => ({
    course: s.courseCode,
    title: s.courseTitle,
    offering: s.code,
    meta: "Continuous",
    students: s.enrolments
      .filter((e) => e.status === "enrolled")
      .map((e) => ({
        id: e.studentId,
        name: e.studentName,
        studentNumber: e.studentNumber,
        status: "Present",
        note: "",
      })),
  }));
  const d = new Date(`${dateIso}T12:00:00`);
  const label = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    weekday: "short",
  });
  return {
    title: "COURSE ATTENDANCE",
    breadcrumbs: ["Home", "Course Attendance"],
    archetype: "hccAttendance",
    hccAttendance: {
      dateFilter: dateIso,
      studentFilter: "",
      courseFilter: "All Courses",
      centerLabel: `ATTENDANCE FOR: ${label.toUpperCase()}`,
      prevLabel: "Sep. 17, 2026",
      nextLabel: "Sep. 19, 2026",
      groups,
    },
  };
}

export async function buildHccRepository() {
  return {
    title: "COURSE CONTENT REPOSITORY",
    breadcrumbs: ["Home", "Content Repository"],
    archetype: "hccRepository",
    hccRepository: {
      placeholder: "Enter Course Name / Number Here",
      rows: [] as Array<{ name: string; lms: string }>,
      empty: "No courses were found in the repository.",
    },
  };
}

export async function buildHccPendingSchedules(
  ctx: {
    displayName: string;
    sections: SectionRow[];
    classSessions: SessionRow[];
    term: { code: string; name: string } | null;
  },
  path = "",
) {
  const qs = path.includes("?") ? new URLSearchParams(path.slice(path.indexOf("?") + 1)) : new URLSearchParams();
  const changeType = (qs.get("type") || "All Types").trim() || "All Types";
  const show = qs.get("show") === "1" || qs.get("show") === "true";

  const current = ctx.term
    ? ctx.sections.filter((s) => s.termCode === ctx.term!.code)
    : ctx.sections;
  const source = current.length ? current : ctx.sections;

  const allRows = source.map((s) => {
    const sessions = ctx.classSessions.filter((c) => c.sectionCode === s.code);
    const schedule = scheduleLabel(ctx.classSessions, s.code);
    const loc = sessions.find((x) => x.location)?.location || "TBA";
    let type = "New Schedule";
    let status = "Needs Confirmation";
    let tone: "warning" | "danger" | "info" | "success" = "warning";
    if (sessions.length && loc !== "TBA") {
      type = "Schedule Update";
      status = "Ready to Approve";
      tone = "info";
    } else if (sessions.length) {
      type = "Schedule Change";
      status = "Conflict Detected";
      tone = "danger";
    }
    const requested = sessions[0]?.startsAt
      ? sessions[0].startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return {
      id: s.id,
      course: s.courseCode,
      offering: s.code,
      title: s.courseTitle,
      type,
      schedule,
      location: loc,
      requested,
      proposer: "Registrar Scheduling",
      status,
      tone,
      href: `/instructor/sections/${s.id}`,
    };
  });

  const changeTypeOptions = [
    "All Types",
    ...[...new Set(allRows.map((r) => r.type))].sort((a, b) => a.localeCompare(b)),
  ];

  const filtered =
    changeType === "All Types" ? allRows : allRows.filter((r) => r.type === changeType);

  const rows = show ? filtered : [];

  return {
    title: "PENDING COURSE SCHEDULES",
    breadcrumbs: ["Home", "Pending Course Schedules"],
    archetype: "hccPendingSchedules",
    countLabel: show ? `${rows.length} course(s)` : "Click Show Courses to load",
    hccPendingSchedules: {
      changeType,
      changeTypeOptions,
      show,
      rows,
      empty: show
        ? filtered.length === 0
          ? "No pending course schedules match this change type."
          : "No pending course schedules were found."
        : "Choose a change type, then click Show Courses.",
    },
  };
}

export async function buildHccTranscriptPending() {
  return {
    title: "PENDING TRANSCRIPT CHANGES",
    breadcrumbs: ["Home", "Pending Transcript Changes"],
    archetype: "hccTranscriptPending",
    hccTranscriptPending: {
      banner: "Currently no transcript changes are pending.",
    },
  };
}

function parseQueryFromPath(path: string) {
  try {
    return new URL(path, "http://local").searchParams;
  } catch {
    const q = path.includes("?") ? path.slice(path.indexOf("?") + 1) : "";
    return new URLSearchParams(q);
  }
}

function mapStandingToSidebarLabel(standing: string) {
  const s = standing.trim();
  if (/cancelled/i.test(s)) return "Cancelled/ Did not proceed";
  const hit = STUDENT_STATUS_SIDEBAR.find(
    (x) => x.key === s || x.label.toLowerCase() === s.toLowerCase() || String(x.key).toLowerCase() === s.toLowerCase(),
  );
  return hit?.label || s;
}

const CAMPUS_OPTS = selectableValues(CAMPUS_MENU);
const PATHWAY_OPTS = selectableValues(PATHWAY_MENU);
const SCHEDULE_OPTS = selectableValues(SCHEDULE_MENU);
const TERM_OPTS = PROGRAM_TERM_OPTS;
const PROGRAM_CODES = PROGRAM_MENU.groups!.flatMap((g) => g.options.map(programCodeFromOption));

function hashPick<T>(seed: string, items: T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return items[h % items.length]!;
}

function isAllFilter(value: string | null | undefined, allLabel: string) {
  const v = (value || "").trim();
  if (!v) return true;
  const lower = v.toLowerCase();
  if (lower === "all") return true;
  return lower === allLabel.toLowerCase() || lower.startsWith("all ");
}

type EnrichedStudent = {
  id: string;
  name: string;
  familyName: string;
  studentNumber: string;
  status: string;
  advisors: string;
  program: string;
  programTerm: string;
  admissionTerm: string;
  date: string;
  dateMs: number;
  campus: string;
  pathway: string;
  schedule: string;
  nationality: string;
  agent: string;
};

/** Exact PDF row overrides keyed by student number. */
const DIRECTORY_OVERRIDES: Record<
  string,
  Partial<EnrichedStudent> & { displayName?: string; dateIso?: string }
> = {
  "2600474": {
    displayName: "Singh, Jagdeep",
    status: "CLOA",
    advisors: "Muskan, Muskan",
    program: "ACSW",
    programTerm: "3rd Term-2026: 2026-09-01 - 2026-12-31",
    admissionTerm: "3rd Term-2026: 2026-09-01 - 2026-12-31",
    campus: "#110 Heritage College- Surrey",
    pathway: "No Pathways",
    schedule: "Jan. 5, 2026 - Sep. 28, 2026",
    nationality: "India",
    agent: "-, Direct",
    dateIso: "2026-09-17 15:17:18",
  },
  "2600475": {
    displayName: "Kaur, Tranjot",
    status: "CLOA",
    advisors: "Sharma, Shivani",
    program: "DIB",
    programTerm: "3rd Term-2026: 2026-09-01 - 2026-12-31",
    admissionTerm: "3rd Term-2026: 2026-09-01 - 2026-12-31",
    campus: "#110 Heritage College- Surrey",
    pathway: "No Pathways",
    schedule: "Jan. 5, 2026 - Sep. 28, 2026",
    nationality: "India",
    agent: "-, Direct",
    dateIso: "2026-08-28 09:04:33",
  },
};

function enrichStudent(st: {
  id: string;
  studentNumber: string;
  programName: string;
  standing: string;
  updatedAt: Date;
  person: { givenName: string; familyName: string };
}): EnrichedStudent {
  const status = mapStandingToSidebarLabel(st.standing);
  const seed = st.id || st.studentNumber;
  const override = DIRECTORY_OVERRIDES[st.studentNumber];
  const programFromSeed = st.programName?.trim() || hashPick(seed + ":prog", PROGRAM_CODES);
  const programCode = programCodeFromOption(programFromSeed).split(/\s+/)[0] || programFromSeed;
  const base: EnrichedStudent = {
    id: st.id,
    name: `${st.person.familyName}, ${st.person.givenName}`,
    familyName: st.person.familyName || "",
    studentNumber: st.studentNumber,
    status,
    advisors: advisorDisplayFromFilter(hashPick(seed + ":adv", ADVISOR_OPTS)),
    program: programCode,
    programTerm: hashPick(seed + ":pt", TERM_OPTS),
    admissionTerm: hashPick(seed + ":at", TERM_OPTS),
    date: st.updatedAt.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    dateMs: st.updatedAt.getTime(),
    campus: hashPick(seed + ":camp", CAMPUS_OPTS),
    pathway: hashPick(seed + ":path", PATHWAY_OPTS),
    schedule: hashPick(seed + ":sch", SCHEDULE_OPTS),
    nationality: hashPick(seed + ":nat", NATIONALITY_OPTS),
    agent: hashPick(seed + ":agent", AGENT_OPTS),
  };
  if (!override) return base;
  const dateMs = override.dateIso ? Date.parse(override.dateIso.replace(" ", "T")) : base.dateMs;
  return {
    ...base,
    ...override,
    name: override.displayName || base.name,
    familyName: (override.displayName || base.name).split(",")[0]?.trim() || base.familyName,
    date: override.dateIso || base.date,
    dateMs: Number.isNaN(dateMs) ? base.dateMs : dateMs,
  };
}

function matchesProgramFilter(studentProgram: string, selected: string) {
  if (isAllFilter(selected, "All Programs")) return true;
  const code = programCodeFromOption(selected);
  const short = code.replace(/\s*\(.*?\)\s*/g, "").trim();
  return (
    studentProgram === selected ||
    studentProgram === code ||
    studentProgram === short ||
    studentProgram.toLowerCase() === short.toLowerCase() ||
    selected.toLowerCase().startsWith(studentProgram.toLowerCase() + ":")
  );
}

function matchesAdvisorFilter(studentAdvisor: string, selected: string) {
  if (isAllFilter(selected, "All Advisors")) return true;
  if (studentAdvisor === selected) return true;
  if (advisorFilterFromDisplay(studentAdvisor) === selected) return true;
  if (advisorDisplayFromFilter(selected) === studentAdvisor) return true;
  return studentAdvisor.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim() ===
    selected.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
}

export async function buildHccStudentsDirectory(user: SessionClaims, path: string) {
  const qs = parseQueryFromPath(path);
  const statusParam = (qs.get("status") || "").trim();
  const campusParam = (qs.get("campus") || "").trim();
  const programParam = (qs.get("program") || "").trim();
  const pathwayParam = (qs.get("pathway") || "").trim();
  const scheduleParam = (qs.get("schedule") || "").trim();
  const programTermParam = (qs.get("programTerm") || "").trim();
  const admissionTermParam = (qs.get("admissionTerm") || "").trim();
  const nationalityParam = (qs.get("nationality") || "").trim();
  const agentParam = (qs.get("agent") || "").trim();
  const advisorParam = (qs.get("advisor") || "").trim();
  const startDateParam = (qs.get("startDate") || "").trim();
  const endDateParam = (qs.get("endDate") || "").trim();
  const letterParam = (qs.get("letter") || "").trim().toUpperCase();
  const qParam = (qs.get("q") || "").trim().toLowerCase();
  const pageParam = Math.max(1, Number(qs.get("page") || "1") || 1);
  const perPageRaw = Number(qs.get("perPage") || "50") || 50;
  const perPage = PER_PAGE_OPTS.includes(String(perPageRaw)) ? perPageRaw : 50;

  const students = await prisma.student.findMany({
    where: { institutionId: user.institutionId },
    include: { person: true },
    orderBy: [{ person: { familyName: "asc" } }, { person: { givenName: "asc" } }],
    take: 5000,
  });

  const enriched = students.map(enrichStudent);

  const census = new Map<string, number>();
  for (const item of STUDENT_STATUS_SIDEBAR) census.set(item.label, 0);
  for (const st of enriched) {
    census.set(st.status, (census.get(st.status) || 0) + 1);
  }

  const censusRow = await prisma.portalRecord.findFirst({
    where: {
      institutionId: user.institutionId,
      screenPath: "/instructor/f/t12-students-view",
      primaryText: "statusCensus",
      role: "instructor",
    },
  });
  if (censusRow?.metaText) {
    try {
      const parsed = JSON.parse(censusRow.metaText) as Record<string, number>;
      for (const [k, v] of Object.entries(parsed)) {
        census.set(mapStandingToSidebarLabel(k), v);
      }
    } catch {
      /* ignore */
    }
  }

  const sidebar = STUDENT_STATUS_SIDEBAR.map((s) => ({
    label: s.label,
    count: census.get(s.label) ?? s.target,
    href: `/instructor/f/t12-students-view?status=${encodeURIComponent(s.label)}`,
    active: statusParam ? statusParam.toLowerCase() === s.label.toLowerCase() : false,
  }));

  const directoryTotal = [...census.values()].reduce((a, b) => a + b, 0) || enriched.length;

  const startMs = startDateParam ? Date.parse(`${startDateParam}T00:00:00`) : NaN;
  const endMs = endDateParam ? Date.parse(`${endDateParam}T23:59:59`) : NaN;

  let filtered = enriched;
  if (!isAllFilter(statusParam, "All Statuses")) {
    filtered = filtered.filter((st) => st.status.toLowerCase() === statusParam.toLowerCase());
  }
  if (!isAllFilter(campusParam, "All Campuses")) {
    filtered = filtered.filter((st) => st.campus === campusParam);
  }
  if (!isAllFilter(programParam, "All Programs")) {
    filtered = filtered.filter((st) => matchesProgramFilter(st.program, programParam));
  }
  if (!isAllFilter(pathwayParam, "All Pathways")) {
    filtered = filtered.filter((st) => st.pathway === pathwayParam);
  }
  if (!isAllFilter(scheduleParam, "All Schedules")) {
    filtered = filtered.filter((st) => st.schedule === scheduleParam);
  }
  if (!isAllFilter(programTermParam, "All Program Terms")) {
    filtered = filtered.filter((st) => st.programTerm === programTermParam);
  }
  if (!isAllFilter(admissionTermParam, "All Admission Terms")) {
    filtered = filtered.filter((st) => st.admissionTerm === admissionTermParam);
  }
  if (!isAllFilter(nationalityParam, "All Nationalities")) {
    filtered = filtered.filter((st) => st.nationality === nationalityParam);
  }
  if (!isAllFilter(agentParam, "All Agents")) {
    filtered = filtered.filter((st) => st.agent === agentParam);
  }
  if (!isAllFilter(advisorParam, "All Advisors")) {
    filtered = filtered.filter((st) => matchesAdvisorFilter(st.advisors, advisorParam));
  }
  if (!Number.isNaN(startMs)) {
    filtered = filtered.filter((st) => st.dateMs >= startMs);
  }
  if (!Number.isNaN(endMs)) {
    filtered = filtered.filter((st) => st.dateMs <= endMs);
  }
  if (letterParam && letterParam !== "ALL") {
    filtered = filtered.filter((st) => st.familyName.toUpperCase().startsWith(letterParam));
  }
  if (qParam) {
    filtered = filtered.filter(
      (st) =>
        st.name.toLowerCase().includes(qParam) ||
        st.studentNumber.toLowerCase().includes(qParam) ||
        st.program.toLowerCase().includes(qParam),
    );
  }

  const resultCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(resultCount / perPage));
  const page = Math.min(pageParam, totalPages);
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  const rows = pageRows.map((st) => ({
    id: st.id,
    name: st.name,
    studentNumber: st.studentNumber,
    status: st.status,
    advisors: st.advisors,
    program: st.program,
    programTerm: st.programTerm,
    admissionTerm: st.admissionTerm,
    date: st.date,
    campus: st.campus,
    pathway: st.pathway,
    schedule: st.schedule,
    nationality: st.nationality,
    agent: st.agent,
  }));

  const title =
    statusParam && !isAllFilter(statusParam, "All Statuses")
      ? `STUDENTS: ${statusParam.toUpperCase()}`
      : "STUDENTS";

  const flagCount = await prisma.portalRecord.count({
    where: { institutionId: user.institutionId, screenPath: "/instructor/f/t45-student-flags", role: "instructor" },
  });

  const filterMenus = {
    campus: serializeFilterMenu(CAMPUS_MENU),
    program: serializeFilterMenu(PROGRAM_MENU),
    pathway: serializeFilterMenu(PATHWAY_MENU),
    schedule: serializeFilterMenu(SCHEDULE_MENU),
    programTerm: serializeFilterMenu(PROGRAM_TERM_MENU),
    admissionTerm: serializeFilterMenu(ADMISSION_TERM_MENU),
    nationality: serializeFilterMenu(NATIONALITY_MENU),
    status: serializeFilterMenu(STATUS_MENU),
    agent: serializeFilterMenu(AGENT_MENU),
    advisor: serializeFilterMenu(ADVISOR_MENU),
  };

  const filterOptions: Record<string, string[]> = {
    campus: [CAMPUS_MENU.all, ...CAMPUS_OPTS],
    program: [PROGRAM_MENU.all, ...selectableValues(PROGRAM_MENU)],
    pathway: [PATHWAY_MENU.all, ...PATHWAY_OPTS],
    schedule: [SCHEDULE_MENU.all, ...SCHEDULE_OPTS],
    programTerm: [PROGRAM_TERM_MENU.all, ...TERM_OPTS],
    admissionTerm: [ADMISSION_TERM_MENU.all, ...TERM_OPTS],
    nationality: [NATIONALITY_MENU.all, ...NATIONALITY_OPTS],
    status: [STATUS_MENU.all, ...STATUS_FILTER_OPTS],
    agent: [AGENT_MENU.all, ...AGENT_OPTS],
    advisor: [ADVISOR_MENU.all, ...ADVISOR_OPTS],
  };

  return {
    title,
    breadcrumbs: ["Home", "Students"],
    archetype: "hccStudents",
    hccStudents: {
      filters: {
        campus: campusParam || "All Campuses",
        program: programParam || "All Programs",
        pathway: pathwayParam || "All Pathways",
        schedule: scheduleParam || "All Schedules",
        programTerm: programTermParam || "All Program Terms",
        admissionTerm: admissionTermParam || "All Admission Terms",
        nationality: nationalityParam || "All Nationalities",
        status: statusParam || "All Statuses",
        agent: agentParam || "All Agents",
        advisor: advisorParam || "All Advisors",
        startDate: startDateParam || "",
        endDate: endDateParam || "",
      },
      filterOptions,
      filterMenus,
      perPageOptions: PER_PAGE_OPTS,
      letter: letterParam || "ALL",
      sidebar,
      management: [
        { label: "Browse All Students", href: "/instructor/f/t12-students-view", count: directoryTotal },
        { label: "Create Student Profile", href: "/instructor/f/t43-create-student-profile" },
        { label: "Academic Alerts", href: "/instructor/f/t44-academic-alerts", count: 0 },
        { label: "Student Flags", href: "/instructor/f/t45-student-flags", count: flagCount },
        { label: "Student Assessments", href: "/instructor/f/t46-student-assessments", count: 0 },
        { label: "Student Requirements", href: "/instructor/f/t47-student-requirements", count: 0 },
        { label: "Leave of Absence", href: "/instructor/f/t48-leave-of-absence", count: 0 },
        { label: "Course Withdraw Requests", href: "/instructor/f/t49-course-withdraw-requests", count: 0 },
        { label: "Pending Grade Submissions", href: "/instructor/f/t62-pending-grade-submissions", count: 3 },
        { label: "Pending Transcript Changes", href: "/instructor/f/t64-pending-transcript-changes", count: 0 },
        { label: "Pending Entry / Progress Marks", href: "/instructor/f/t62-pending-grade-submissions", count: 0 },
        { label: "Badges / Accomplishments", href: "/instructor/f/t34-accomplishments", count: 0 },
      ],
      results: resultCount,
      perPage,
      page,
      totalPages,
      rows,
      empty: rows.length === 0 ? "No students were found matching your search criteria." : null,
    },
    countLabel: `${resultCount} student(s)`,
  };
}

export async function buildHccStudentFlags(user: SessionClaims) {
  const rows = await prisma.portalRecord.findMany({
    where: {
      institutionId: user.institutionId,
      screenPath: "/instructor/f/t45-student-flags",
      role: "instructor",
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 60,
  });
  const mapped = rows.map((r) => {
    let meta: { hold?: string; status?: string; date?: string } = {};
    try {
      meta = r.metaText ? (JSON.parse(r.metaText) as typeof meta) : {};
    } catch {
      meta = {};
    }
    return {
      id: r.id,
      student: r.primaryText,
      description: r.secondaryText || "",
      status: meta.status || "Unresolved",
      appliesHold: meta.hold || "No",
      date: meta.date || r.createdAt.toLocaleString(),
    };
  });
  return {
    title: "STUDENT FLAGS",
    breadcrumbs: ["Home", "Student Flags"],
    archetype: "hccFlags",
    hccFlags: {
      campus: "ALL CAMPUSES",
      status: "Active",
      resolved: "No",
      template: "All Flags",
      results: mapped.length,
      rows: mapped,
    },
    countLabel: `${mapped.length} flag(s)`,
  };
}

export async function buildHccEmptyTable(title: string, crumbs: string[], empty: string) {
  return {
    title,
    breadcrumbs: crumbs,
    archetype: "hccEmpty",
    hccEmpty: { empty },
  };
}

export async function loadStudentStatusCounts(institutionId: string) {
  const byLabel: Record<string, number> = {};
  for (const item of STUDENT_STATUS_SIDEBAR) byLabel[item.label] = item.target;

  const censusRow = await prisma.portalRecord.findFirst({
    where: {
      institutionId,
      screenPath: "/instructor/f/t12-students-view",
      primaryText: "statusCensus",
      role: "instructor",
    },
  });
  if (censusRow?.metaText) {
    try {
      const parsed = JSON.parse(censusRow.metaText) as Record<string, number>;
      for (const [k, v] of Object.entries(parsed)) {
        byLabel[mapStandingToSidebarLabel(k)] = v;
        byLabel[k] = v;
      }
    } catch {
      /* ignore */
    }
  }

  const flagCount = await prisma.portalRecord.count({
    where: { institutionId, screenPath: "/instructor/f/t45-student-flags", role: "instructor" },
  });
  const total = Object.values(byLabel).reduce((a, b) => a + b, 0);
  return { byLabel, total, flagCount };
}

export { FLAG_DESCRIPTIONS };

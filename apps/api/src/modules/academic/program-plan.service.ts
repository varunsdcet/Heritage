import { prisma } from "@myheritage/db";
import { ymdIn } from "../../lib/workshopPolicy.js";
import { sectionOfferings } from "../courses/sectionOffering.js";
import {
  DEFAULT_TZ,
  dateBoundsFromSessions,
  instructorDisplayName,
  roomFromSessions,
  scheduleTextFromSessions,
} from "../courses/sectionSchedule.js";

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

function gradePoints(letter: string) {
  const map: Record<string, number> = {
    A: 4.0,
    "A-": 3.7,
    "B+": 3.3,
    B: 3.0,
    "B-": 2.7,
    "C+": 2.3,
    C: 2.0,
    "C-": 1.7,
    D: 1.0,
    F: 0,
    P: 0,
    I: 0,
    IP: 0,
  };
  return map[letter] ?? 0;
}

/** Letter grades that show blank grade-points on Final Marks (MySIS). */
function gradePointsOrNull(letter: string): number | null {
  if (!letter || letter === "—" || letter === "P" || letter === "I" || letter === "IP" || letter === "W") {
    return null;
  }
  return gradePoints(letter);
}

function displayLetter(row: {
  status: string;
  letter: string;
  averagePercent: number | null;
}) {
  if (row.status === "enrolled" && (row.averagePercent == null || row.letter === "—")) return "IP";
  if (row.status === "withdrawn") return row.letter === "—" ? "W" : row.letter;
  return row.letter === "—" ? (row.averagePercent == null ? "I" : letterFromPct(row.averagePercent)) : row.letter;
}

export async function getProgramPlan(institutionId: string, studentId: string) {
  const plan = await prisma.programPlan.findFirst({
    where: { institutionId, studentId, status: "active" },
    include: {
      cohort: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!plan) {
    return {
      planId: null as string | null,
      status: "missing",
      cohort: null as null | {
        code: string;
        label: string;
        intakeYear: number;
        intakeMonth: number;
        sectionLabel: string;
      },
      summary: {
        totalCredits: 0,
        earnedCredits: 0,
        averagePercent: null as number | null,
        cgpa: null as number | null,
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        dropped: 0,
      },
      main: [] as Array<Record<string, unknown>>,
      practicum: [] as Array<Record<string, unknown>>,
      makeup: [] as Array<Record<string, unknown>>,
    };
  }

  const courseIds = [...new Set(plan.items.map((i) => i.courseId).filter(Boolean))] as string[];
  const courseCodes = [...new Set(plan.items.map((i) => i.courseCode).filter(Boolean))];
  const courses = await prisma.course.findMany({
    where: {
      institutionId,
      OR: [
        ...(courseIds.length ? [{ id: { in: courseIds } }] : []),
        ...(courseCodes.length ? [{ code: { in: courseCodes } }] : []),
      ],
    },
    select: { id: true, code: true, title: true },
  });
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const courseByCode = new Map(courses.map((c) => [c.code, c]));

  const looksLikeId = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim()) ||
    value.trim().length > 40;

  const mapItem = (item: (typeof plan.items)[number]) => {
    const fromCourse =
      (item.courseId ? courseById.get(item.courseId) : undefined) || courseByCode.get(item.courseCode);
    const rawTitle = (item.title || "").trim();
    const title =
      fromCourse?.title ||
      (!rawTitle || looksLikeId(rawTitle) || rawTitle === item.courseCode || rawTitle === item.courseId
        ? fromCourse?.title || item.courseCode
        : rawTitle);
    const courseCode = fromCourse?.code || item.courseCode;
    return {
      id: item.id,
      courseCode,
      title,
      credits: item.credits,
      category: item.category,
      status: item.status,
      startsOn: item.startsOn,
      endsOn: item.endsOn,
      scheduleText: item.scheduleText,
      sectionId: item.sectionId,
      sortOrder: item.sortOrder,
    };
  };

  const main = plan.items.filter((i) => i.category === "main").map(mapItem);
  const practicum = plan.items.filter((i) => i.category === "practicum").map(mapItem);
  const makeup = plan.items.filter((i) => i.category === "makeup").map(mapItem);

  const completedItems = plan.items.filter((i) => i.status === "completed");
  const earnedCredits = completedItems.reduce((n, i) => n + i.credits, 0);
  const totalCredits = plan.items.reduce((n, i) => n + i.credits, 0);

  const grades = await prisma.gradeItem.findMany({
    where: {
      institutionId,
      studentId,
      status: "published",
      enrolment: { countsTowardCgpa: true },
    },
  });
  const pcts = grades
    .filter((g) => g.score != null && g.maxScore > 0)
    .map((g) => ((g.score ?? 0) / g.maxScore) * 100);
  const averagePercent =
    pcts.length > 0 ? Number((pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)) : null;
  const points = grades
    .filter((g) => g.score != null && g.maxScore > 0)
    .map((g) => gradePoints(g.letter || letterFromPct(((g.score ?? 0) / g.maxScore) * 100)));
  const cgpa = points.length ? Number((points.reduce((a, b) => a + b, 0) / points.length).toFixed(2)) : null;

  return {
    planId: plan.id,
    status: plan.status,
    cohort: plan.cohort
      ? {
          code: plan.cohort.code,
          label: plan.cohort.label,
          intakeYear: plan.cohort.intakeYear,
          intakeMonth: plan.cohort.intakeMonth,
          sectionLabel: plan.cohort.sectionLabel,
        }
      : null,
    summary: {
      totalCredits,
      earnedCredits,
      averagePercent,
      cgpa,
      completed: plan.items.filter((i) => i.status === "completed").length,
      inProgress: plan.items.filter((i) => i.status === "in_progress").length,
      notStarted: plan.items.filter((i) => i.status === "not_started").length,
      dropped: plan.items.filter((i) => i.status === "dropped").length,
    },
    main,
    practicum,
    makeup,
  };
}

/**
 * Course mark used by every role: published scores weighted by assignment weight, the same formula as the instructor
 * gradebook total and the student's course grades page. Falls back to an even weighting when no weights are set.
 */
export function weightedPercent(items: Array<{ score: number | null; maxScore: number; weightPercent?: number | null }>) {
  const scored = items.filter((g) => g.score != null && g.maxScore > 0);
  if (!scored.length) return null;
  const weight = scored.reduce((n, g) => n + Math.max(Number(g.weightPercent) || 0, 0), 0);
  const pct = weight
    ? scored.reduce((n, g) => n + ((g.score ?? 0) / g.maxScore) * Math.max(Number(g.weightPercent) || 0, 0), 0) / weight
    : scored.reduce((n, g) => n + (g.score ?? 0) / g.maxScore, 0) / scored.length;
  return Number((pct * 100).toFixed(1));
}

/** Credit-weighted mean; an all-zero-credit set falls back to a plain mean. */
export function creditWeighted(rows: Array<{ credits: number; value: number }>) {
  if (!rows.length) return null;
  const credits = rows.reduce((n, r) => n + Math.max(r.credits, 0), 0);
  const v = credits ? rows.reduce((n, r) => n + r.value * Math.max(r.credits, 0), 0) / credits : rows.reduce((n, r) => n + r.value, 0) / rows.length;
  return Number(v.toFixed(2));
}

export async function getCourseHistory(institutionId: string, studentId: string) {
  const enrolments = await prisma.enrolment.findMany({
    where: { institutionId, studentId },
    include: {
      section: {
        include: {
          course: true,
          term: true,
          academicBlock: true,
          classSessions: { orderBy: { startsAt: "asc" } },
        },
      },
      gradeItems: { where: { status: "published" }, include: { assignment: { select: { weightPercent: true } } } },
    },
    orderBy: [{ attemptNumber: "asc" }, { createdAt: "desc" }],
  });
  const [offerings, institution] = await Promise.all([
    sectionOfferings(institutionId, [...new Set(enrolments.map((e) => e.sectionId))]),
    prisma.institution.findFirst({ where: { id: institutionId }, select: { timezone: true } }),
  ]);
  const tz = institution?.timezone || DEFAULT_TZ;

  const instructorIds = [...new Set(enrolments.map((e) => e.section.instructorPersonId))];
  const instructors = await prisma.person.findMany({
    where: { id: { in: instructorIds }, institutionId },
  });
  const instructorById = new Map(instructors.map((p) => [p.id, p]));

  const planItems = await prisma.programPlanItem.findMany({
    where: {
      institutionId,
      plan: { studentId, institutionId },
      OR: [
        { sectionId: { in: enrolments.map((e) => e.sectionId) } },
        { courseCode: { in: [...new Set(enrolments.map((e) => e.section.course.code))] } },
      ],
    },
  });
  const planBySection = new Map(planItems.filter((i) => i.sectionId).map((i) => [i.sectionId!, i]));
  const planByCode = new Map(planItems.map((i) => [i.courseCode, i]));

  const rows = enrolments.map((e) => {
    const published = e.gradeItems.filter((g) => g.score != null && g.maxScore > 0);
    const avgPct = weightedPercent(published.map((g) => ({ score: g.score, maxScore: g.maxScore, weightPercent: g.assignment.weightPercent })));
    const explicit = published.length === 1 ? published[0]!.letter : null;
    const letter = explicit || (avgPct != null ? letterFromPct(avgPct) : e.status === "withdrawn" ? "W" : "—");
    const sessions = e.section.classSessions;
    const fromSessions = dateBoundsFromSessions(sessions, tz);
    const plan = planBySection.get(e.sectionId) ?? planByCode.get(e.section.course.code);
    const offering = offerings.get(e.sectionId);
    const startsOn =
      offering?.startsOn || plan?.startsOn || e.section.academicBlock?.startsOn || fromSessions.startsOn || e.section.term.startsOn;
    const endsOn =
      offering?.endsOn || plan?.endsOn || e.section.academicBlock?.endsOn || fromSessions.endsOn || e.section.term.endsOn;
    return {
      enrolmentId: e.id,
      courseCode: e.section.course.code,
      title: e.section.course.title,
      credits: e.section.course.credits,
      termCode: e.section.term.code,
      termName: e.section.term.name,
      sectionCode: e.section.code,
      status: e.status,
      attemptNumber: e.attemptNumber,
      isRetake: e.attemptNumber > 1,
      countsTowardCgpa: e.countsTowardCgpa,
      continuous: e.continuous,
      averagePercent: avgPct,
      letter,
      sectionId: e.sectionId,
      instructorName: instructorDisplayName(instructorById.get(e.section.instructorPersonId)),
      room: offering?.location || roomFromSessions(sessions),
      deliveryMethod: offering?.deliveryMethod ?? null,
      scheduleText: offering?.scheduleText || scheduleTextFromSessions(sessions, tz) || plan?.scheduleText || null,
      startsOn,
      endsOn,
    };
  });

  return {
    previous: rows.filter((r) => r.status === "completed" && !r.isRetake),
    current: rows.filter((r) => r.status === "enrolled"),
    withdrawn: rows.filter((r) => r.status === "withdrawn"),
    retakes: rows.filter((r) => r.isRetake),
    all: rows,
    today: ymdIn(new Date(), tz),
  };
}

/**
 * A course carries a final mark once it is completed, or once an enrolled course has ended with published marks.
 * Until then it is "IP" (in progress) with its current percent, and stays out of credits earned and CGPA.
 */
export function hasFinalMark(row: { status: string; endsOn: string | null; averagePercent: number | null }, today: string) {
  if (row.status === "completed") return true;
  return row.status === "enrolled" && row.averagePercent != null && Boolean(row.endsOn) && row.endsOn!.slice(0, 10) < today;
}

export async function getTranscriptSummary(institutionId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId },
    include: { cohort: true, programVersion: { include: { program: true } } },
  });
  const history = await getCourseHistory(institutionId, studentId);
  const plan = await getProgramPlan(institutionId, studentId);

  const assigned = student?.programName && student.programName !== "Not assigned" ? student.programName : null;
  const programName = assigned ?? student?.programVersion?.program.name ?? plan.cohort?.label ?? student?.programName ?? "Programme";

  const courses = history.all.filter((r) => r.status !== "waitlisted").map((r) => {
    const final = hasFinalMark(r, history.today);
    const letter = r.status === "enrolled" && !final ? "IP" : displayLetter({ ...r, status: final ? "completed" : r.status });
    return {
      enrolmentId: r.enrolmentId,
      sectionId: r.sectionId,
      courseCode: r.courseCode,
      title: r.title,
      credits: r.credits,
      termCode: r.termCode,
      termName: r.termName,
      programName,
      startsOn: r.startsOn,
      endsOn: r.endsOn,
      status: r.status,
      final,
      letter,
      averagePercent: r.averagePercent,
      gradePoints: final ? gradePointsOrNull(letter) : null,
      attemptNumber: r.attemptNumber,
      isRetake: r.isRetake,
      countsTowardCgpa: r.countsTowardCgpa,
    };
  });

  const totals = summarizeCourses(courses);

  const termMap = new Map<string, string>();
  for (const c of courses) {
    if (c.termCode) termMap.set(c.termCode, c.termName || c.termCode);
  }

  return {
    studentNumber: student?.studentNumber ?? null,
    programName,
    programs: [
      { id: "all", name: "All" },
      { id: "primary", name: programName },
    ],
    terms: [
      { code: "all", name: "All Terms" },
      ...[...termMap.entries()].map(([code, name]) => ({ code, name })),
    ],
    cohort: student?.cohort
      ? {
          code: student.cohort.code,
          label: student.cohort.label,
        }
      : plan.cohort
        ? { code: plan.cohort.code, label: plan.cohort.label }
        : null,
    ...totals,
    courses,
  };
}

type SummaryRow = { status: string; final: boolean; credits: number; letter: string; averagePercent: number | null; gradePoints: number | null; countsTowardCgpa: boolean };

/** Credits, average and CGPA from the same per-course rows the Final Marks tables show (any subset, e.g. one term). */
export function summarizeCourses(rows: SummaryRow[]) {
  const finals = rows.filter((r) => r.final && r.countsTowardCgpa);
  const current = rows.filter((r) => r.status === "enrolled" && !r.final && r.averagePercent != null);
  return {
    earnedCredits: finals.filter((r) => r.letter !== "F" && r.gradePoints !== 0).reduce((n, r) => n + r.credits, 0),
    attemptedCredits: rows.filter((r) => r.status !== "withdrawn" && r.status !== "waitlisted").reduce((n, r) => n + r.credits, 0),
    averagePercent: creditWeighted(finals.filter((r) => r.averagePercent != null).map((r) => ({ credits: r.credits, value: r.averagePercent! }))),
    cgpa: creditWeighted(finals.filter((r) => r.gradePoints != null).map((r) => ({ credits: r.credits, value: r.gradePoints! }))),
    currentAverage: creditWeighted(current.map((r) => ({ credits: r.credits, value: r.averagePercent! }))),
  };
}

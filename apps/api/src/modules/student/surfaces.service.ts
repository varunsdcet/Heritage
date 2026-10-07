import type { SessionClaims } from "@myheritage/contracts";
import {
  CreateLeaveOfAbsenceRequest,
  CreateStudentServiceRequest,
  LogPracticumHoursRequest,
  RegisterWorkshopRequest,
  StartAssessmentAttemptResponse,
  StudentAssessmentsResponse,
  StudentAttendanceResponse,
  StudentBadgesResponse,
  StudentCareerResponse,
  StudentCredentialsResponse,
  StudentFinanceResponse,
  StudentFinanceStatementResponse,
  StudentLabNotebook,
  StudentLecturesResponse,
  StudentPracticumResponse,
  StudentResourcesResponse,
  StudentServiceRequestsResponse,
  StudentWorkshopsResponse,
  ExtracurricularResponse,
  LeaveOfAbsenceListResponse,
  RequiredTasksResponse,
  TaxDocumentsResponse,
  SubmitAssessmentAttemptResponse,
  UpsertLabNotebookRequest,
} from "@myheritage/contracts";
import { requireApproval } from "@myheritage/auth";
import { prisma } from "@myheritage/db";
import { writeAuditAndOutbox } from "@myheritage/events";
import { randomUUID } from "node:crypto";
import { sessionJoinUrl } from "../../lib/liveClass.js";
import {
  SEAT_STATUSES,
  feeFor,
  institutionTimezone,
  postWorkshopFee,
  storedStatus,
  studentMayRegister,
  workshopPhase,
  workshopSettings,
  ymdIn,
  type StudentAccess,
} from "../../lib/workshopPolicy.js";
import { studentMetaMap } from "../admin/superAdmin.service.js";
import { currentStudentId } from "../me/studentAlignment.js";

function httpError(message: string, code: string, status: number) {
  return Object.assign(new Error(message), { code, status });
}

export async function requireStudent(user: SessionClaims) {
  const student = await prisma.student.findFirst({
    where: { id: await currentStudentId(user.institutionId, user.personId), institutionId: user.institutionId },
  });
  if (!student) throw httpError("Student not found", "NOT_FOUND", 404);
  return student;
}

async function enrolledSectionIds(institutionId: string, studentId: string) {
  const enrolments = await prisma.enrolment.findMany({
    where: { institutionId, studentId, status: "enrolled" },
    select: { sectionId: true },
  });
  return enrolments.map((e) => e.sectionId);
}

export async function listStudentAssessments(user: SessionClaims) {
  const student = await requireStudent(user);
  const sectionIds = await enrolledSectionIds(user.institutionId, student.id);
  const now = new Date();
  const assessments = await prisma.assessment.findMany({
    where: {
      institutionId: user.institutionId,
      sectionId: { in: sectionIds },
      status: "published",
    },
    include: {
      section: { include: { course: true } },
      attempts: { where: { studentId: student.id }, orderBy: { startedAt: "desc" } },
    },
    orderBy: { opensAt: "asc" },
  });

  const mapped = assessments.map((a) => {
    const openAttempt = a.attempts.find((t) => t.status === "open" && t.expiresAt > now);
    const submitted = a.attempts.some((t) => t.status === "submitted");
    const attemptsRemaining = a.attempts.length < a.maxAttempts;
    let state: "upcoming" | "open" | "in_progress" | "submitted" | "closed" = "open";
    if (now < a.opensAt) state = "upcoming";
    else if (openAttempt) state = "in_progress";
    else if (now > a.closesAt) state = submitted ? "submitted" : "closed";
    else if (attemptsRemaining) state = "open";
    else if (submitted) state = "submitted";
    else state = "closed";
    return {
      id: a.id,
      sectionId: a.sectionId,
      courseCode: a.section.course.code,
      title: a.title,
      opensAt: a.opensAt.toISOString(),
      closesAt: a.closesAt.toISOString(),
      durationMinutes: a.durationMinutes,
      maxAttempts: a.maxAttempts,
      attemptCount: a.attempts.length,
      openAttemptId: openAttempt?.id ?? null,
      state,
    };
  });

  return StudentAssessmentsResponse.parse({
    assessments: mapped,
    assessmentAttemptOpen: mapped.some((a) => a.state === "in_progress"),
  });
}

export async function startAssessmentAttempt(
  user: SessionClaims,
  assessmentId: string,
  correlationId: string,
) {
  const student = await requireStudent(user);
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, institutionId: user.institutionId, status: "published" },
    include: { attempts: { where: { studentId: student.id } }, section: true },
  });
  if (!assessment) throw httpError("Assessment not found", "NOT_FOUND", 404);
  const enrolled = await prisma.enrolment.findFirst({
    where: {
      institutionId: user.institutionId,
      studentId: student.id,
      sectionId: assessment.sectionId,
      status: "enrolled",
    },
  });
  if (!enrolled) throw httpError("Not enrolled in section", "FORBIDDEN", 403);
  const now = new Date();
  if (now < assessment.opensAt || now > assessment.closesAt) {
    throw httpError("Assessment window is closed", "CONFLICT", 409);
  }
  const open = assessment.attempts.find((t) => t.status === "open" && t.expiresAt > now);
  if (open) {
    return StartAssessmentAttemptResponse.parse({
      attemptId: open.id,
      expiresAt: open.expiresAt.toISOString(),
      assessmentAttemptOpen: true,
    });
  }
  if (assessment.attempts.length >= assessment.maxAttempts) {
    throw httpError("Maximum attempts reached", "CONFLICT", 409);
  }
  const expiresAt = new Date(now.getTime() + assessment.durationMinutes * 60_000);
  const attempt = await prisma.$transaction(async (tx) => {
    const row = await tx.assessmentAttempt.create({
      data: {
        institutionId: user.institutionId,
        assessmentId: assessment.id,
        studentId: student.id,
        status: "open",
        startedAt: now,
        expiresAt,
      },
    });
    await writeAuditAndOutbox(tx, {
      institutionId: user.institutionId,
      actorId: user.accountId,
      eventName: "AssessmentAttempt.started",
      purpose: "assessment",
      before: null,
      after: row,
      source: "student.assessments.start",
      correlationId,
    });
    return row;
  });
  return StartAssessmentAttemptResponse.parse({
    attemptId: attempt.id,
    expiresAt: attempt.expiresAt.toISOString(),
    assessmentAttemptOpen: true,
  });
}

export async function submitAssessmentAttempt(
  user: SessionClaims,
  attemptId: string,
  correlationId: string,
) {
  const student = await requireStudent(user);
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, institutionId: user.institutionId, studentId: student.id },
  });
  if (!attempt) throw httpError("Attempt not found", "NOT_FOUND", 404);
  if (attempt.status !== "open") throw httpError("Attempt is not open", "CONFLICT", 409);
  const submittedAt = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: submittedAt > attempt.expiresAt ? "expired" : "submitted",
        submittedAt,
        rowVersion: { increment: 1 },
      },
    });
    await writeAuditAndOutbox(tx, {
      institutionId: user.institutionId,
      actorId: user.accountId,
      eventName: "AssessmentAttempt.submitted",
      purpose: "assessment",
      before: attempt,
      after: row,
      source: "student.assessments.submit",
      correlationId,
    });
    return row;
  });
  if (updated.status !== "submitted") {
    throw httpError("Attempt expired before submission", "CONFLICT", 409);
  }
  return SubmitAssessmentAttemptResponse.parse({
    attemptId: updated.id,
    status: "submitted",
    submittedAt: updated.submittedAt!.toISOString(),
  });
}

export async function listStudentAttendance(user: SessionClaims) {
  const student = await requireStudent(user);
  const records = await prisma.attendanceRecord.findMany({
    where: { institutionId: user.institutionId, studentId: student.id },
    include: { section: { include: { course: true } } },
    orderBy: { recordedAt: "desc" },
  });
  return StudentAttendanceResponse.parse({
    presentCount: records.filter((r) => r.status === "present").length,
    absentCount: records.filter((r) => r.status === "absent").length,
    lateCount: records.filter((r) => r.status === "late").length,
    records: records.map((r) => ({
      id: r.id,
      sectionId: r.sectionId,
      courseCode: r.section.course.code,
      meetingLabel: r.meetingLabel,
      status: r.status as "present" | "absent" | "late" | "excused",
      recordedAt: r.recordedAt.toISOString(),
    })),
  });
}

export async function listStudentSessions(user: SessionClaims, kind: "lecture" | "lab") {
  const student = await requireStudent(user);
  const sectionIds = await enrolledSectionIds(user.institutionId, student.id);
  const sessions = await prisma.classSession.findMany({
    where: {
      institutionId: user.institutionId,
      sectionId: { in: sectionIds },
      sessionKind: kind,
    },
    include: { section: { include: { course: true } } },
    orderBy: { startsAt: "asc" },
  });
  return StudentLecturesResponse.parse({
    lectures: sessions.map((s) => ({
      id: s.id,
      sectionId: s.sectionId,
      courseCode: s.section.course.code,
      title: s.title,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt?.toISOString() ?? null,
      location: s.location,
      joinUrl: sessionJoinUrl(s.sectionId, s.joinUrl),
      sessionKind: kind,
      deliveryMode: s.deliveryMode,
    })),
  });
}

export async function getStudentLecture(user: SessionClaims, sessionId: string) {
  const list = await listStudentSessions(user, "lecture");
  const hit = list.lectures.find((l) => l.id === sessionId);
  if (!hit) {
    const labs = await listStudentSessions(user, "lab");
    const lab = labs.lectures.find((l) => l.id === sessionId);
    if (!lab) throw httpError("Lecture not found", "NOT_FOUND", 404);
    return lab;
  }
  return hit;
}

export async function getOrCreateLabNotebook(user: SessionClaims, classSessionId: string) {
  const student = await requireStudent(user);
  const session = await prisma.classSession.findFirst({
    where: {
      id: classSessionId,
      institutionId: user.institutionId,
      sessionKind: "lab",
    },
  });
  if (!session) throw httpError("Lab session not found", "NOT_FOUND", 404);
  const enrolled = await prisma.enrolment.findFirst({
    where: {
      institutionId: user.institutionId,
      studentId: student.id,
      sectionId: session.sectionId,
      status: "enrolled",
    },
  });
  if (!enrolled) throw httpError("Not enrolled", "FORBIDDEN", 403);
  let entry = await prisma.labNotebookEntry.findUnique({
    where: { studentId_classSessionId: { studentId: student.id, classSessionId } },
  });
  if (!entry) {
    entry = await prisma.labNotebookEntry.create({
      data: {
        institutionId: user.institutionId,
        studentId: student.id,
        classSessionId,
        title: `${session.title} notebook`,
        body: "",
      },
    });
  }
  return StudentLabNotebook.parse({
    id: entry.id,
    classSessionId: entry.classSessionId,
    title: entry.title,
    body: entry.body,
    version: entry.version,
    rowVersion: entry.rowVersion,
    lockedAt: entry.lockedAt?.toISOString() ?? null,
    updatedAt: entry.updatedAt.toISOString(),
  });
}

export async function upsertLabNotebook(
  user: SessionClaims,
  classSessionId: string,
  body: unknown,
  correlationId: string,
) {
  const student = await requireStudent(user);
  const input = UpsertLabNotebookRequest.parse(body);
  const existing = await getOrCreateLabNotebook(user, classSessionId);
  const row = await prisma.labNotebookEntry.findUniqueOrThrow({ where: { id: existing.id } });
  if (row.lockedAt) throw httpError("Notebook is locked", "CONFLICT", 409);
  if (input.rowVersion != null && input.rowVersion !== row.rowVersion) {
    throw httpError("Stale notebook version", "CONFLICT", 409);
  }
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.labNotebookEntry.update({
      where: { id: row.id },
      data: {
        title: input.title,
        body: input.body,
        version: { increment: 1 },
        rowVersion: { increment: 1 },
      },
    });
    await writeAuditAndOutbox(tx, {
      institutionId: user.institutionId,
      actorId: user.accountId,
      eventName: "LabNotebook.updated",
      purpose: "lab_notebook",
      before: row,
      after: next,
      source: "student.labs.notebook",
      correlationId,
    });
    return next;
  });
  return StudentLabNotebook.parse({
    id: updated.id,
    classSessionId: updated.classSessionId,
    title: updated.title,
    body: updated.body,
    version: updated.version,
    rowVersion: updated.rowVersion,
    lockedAt: updated.lockedAt?.toISOString() ?? null,
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function listStudentServiceRequests(user: SessionClaims) {
  const student = await requireStudent(user);
  const rows = await prisma.serviceRequest.findMany({
    where: { institutionId: user.institutionId, studentId: student.id },
    orderBy: { createdAt: "desc" },
  });
  return StudentServiceRequestsResponse.parse({
    requests: rows.map((r) => ({
      id: r.id,
      type: r.type,
      subject: r.subject,
      details: r.details,
      status: r.status,
      approvalRequestId: r.approvalRequestId,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function createStudentServiceRequest(
  user: SessionClaims,
  body: unknown,
  correlationId: string,
) {
  const student = await requireStudent(user);
  const input = CreateStudentServiceRequest.parse(body);
  const needsApproval =
    input.type === "official_transcript" ||
    input.type === "enrollment_verification" ||
    input.type === "course_withdrawal" ||
    input.type === "course_change" ||
    input.type === "transcript_request" ||
    input.type === "academic_appeal" ||
    input.type === "leave_of_absence";

  const created = await prisma.$transaction(async (tx) => {
    let approvalRequestId: string | null = null;
    let status: "open" | "pending_approval" = "open";
    if (needsApproval) {
      const approval = await requireApproval({
        institutionId: user.institutionId,
        type: `service_request.${input.type}`,
        subjectRef: `student:${student.id}`,
        proposedDiff: { type: input.type, subject: input.subject, details: input.details },
        requestedBy: user.accountId,
        requiredApproverRoles: ["admin", "registrar"],
        requiredCount: 1,
        correlationId,
        tx,
      });
      approvalRequestId = approval.id;
      status = "pending_approval";
    }
    const row = await tx.serviceRequest.create({
      data: {
        institutionId: user.institutionId,
        studentId: student.id,
        type: input.type,
        subject: input.subject,
        details: input.details,
        status,
        approvalRequestId,
      },
    });
    await writeAuditAndOutbox(tx, {
      institutionId: user.institutionId,
      actorId: user.accountId,
      eventName: "ServiceRequest.created",
      purpose: "student_services",
      before: null,
      after: row,
      source: "student.services.create",
      correlationId,
    });
    return row;
  });

  return StudentServiceRequestsResponse.parse({
    requests: [
      {
        id: created.id,
        type: created.type as typeof input.type,
        subject: created.subject,
        details: created.details,
        status: created.status as "open" | "pending_approval" | "resolved" | "rejected" | "cancelled",
        approvalRequestId: created.approvalRequestId,
        createdAt: created.createdAt.toISOString(),
      },
    ],
  });
}

async function personDisplayName(personId: string) {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  return `${person?.givenName ?? ""} ${person?.familyName ?? ""}`.trim();
}

export async function listStudentPracticum(user: SessionClaims) {
  const student = await requireStudent(user);
  const name = await personDisplayName(user.personId);
  const placements = await prisma.placement.findMany({
    where: {
      institutionId: user.institutionId,
      OR: [{ studentId: student.id }, ...(name ? [{ studentName: name }] : [])],
    },
    include: { hours: { orderBy: { createdAt: "desc" } }, employerOrg: true },
    orderBy: { createdAt: "desc" },
  });
  return StudentPracticumResponse.parse({
    placements: placements.map((p) => ({
      id: p.id,
      programName: p.programName,
      siteName: p.employerOrg.siteName,
      status: p.status,
      startsOn: p.startsOn,
      endsOn: p.endsOn,
      hours: p.hours.map((h) => ({
        id: h.id,
        weekLabel: h.weekLabel,
        hours: h.hours,
        status: h.status as "pending" | "approved" | "rejected",
      })),
    })),
  });
}

export async function logPracticumHours(user: SessionClaims, body: unknown, correlationId: string) {
  const student = await requireStudent(user);
  const input = LogPracticumHoursRequest.parse(body);
  const name = await personDisplayName(user.personId);
  const owned = await prisma.placement.findFirst({
    where: {
      id: input.placementId,
      institutionId: user.institutionId,
      OR: [{ studentId: student.id }, ...(name ? [{ studentName: name }] : [])],
    },
  });
  if (!owned) throw httpError("Placement not found", "NOT_FOUND", 404);
  const entry = await prisma.$transaction(async (tx) => {
    if (!owned.studentId) {
      await tx.placement.update({
        where: { id: owned.id },
        data: { studentId: student.id },
      });
    }
    const row = await tx.hoursEntry.create({
      data: {
        institutionId: user.institutionId,
        placementId: owned.id,
        weekLabel: input.weekLabel,
        hours: input.hours,
        status: "pending",
      },
    });
    await writeAuditAndOutbox(tx, {
      institutionId: user.institutionId,
      actorId: user.accountId,
      eventName: "PracticumHours.logged",
      purpose: "practicum_log",
      before: null,
      after: row,
      source: "student.practicum.hours",
      correlationId,
    });
    return row;
  });
  return {
    id: entry.id,
    weekLabel: entry.weekLabel,
    hours: entry.hours,
    status: "pending" as const,
  };
}

export async function listStudentFinance(user: SessionClaims, financialTermId?: string | null) {
  const student = await requireStudent(user);
  const terms = await prisma.financialTerm.findMany({
    where: { institutionId: user.institutionId },
    orderBy: { startsOn: "desc" },
  });
  // Without an explicit term the statement covers the whole account, so entries posted without a
  // financial term are included and the balance matches the admin ledger.
  const selectedId = financialTermId && terms.some((t) => t.id === financialTermId) ? financialTermId : null;
  const allEntries = await prisma.financeLedgerEntry.findMany({
    where: { institutionId: user.institutionId, studentId: student.id },
    include: { financialTerm: true },
    orderBy: { postedAt: "desc" },
  });
  const entries = selectedId ? allEntries.filter((e) => e.financialTermId === selectedId) : allEntries;
  const isCounted = (e: (typeof allEntries)[number]) => e.status !== "waived" && e.status !== "void";
  const raisesBalance = (e: (typeof allEntries)[number]) => e.kind === "charge" || e.kind === "refund";
  const lowersBalance = (e: (typeof allEntries)[number]) => e.kind === "payment" || e.kind === "credit";
  const signed = (e: (typeof allEntries)[number]) => (raisesBalance(e) ? e.amountCad : lowersBalance(e) ? -e.amountCad : 0);
  const accountBalanceCad = Math.round(allEntries.filter(isCounted).reduce((sum, e) => sum + signed(e), 0) * 100) / 100;
  const openCharges = allEntries.filter((e) => e.kind === "charge" && e.status === "open");
  const pastDue = openCharges.filter((e) => e.dueAt && e.dueAt < new Date()).reduce((sum, e) => sum + e.amountCad, 0);
  const nextDue = openCharges
    .filter((e) => e.dueAt)
    .map((e) => e.dueAt!)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const counted = entries.filter(isCounted);
  const selectedTerm = terms.find((t) => t.id === selectedId) ?? null;
  const charges = counted.filter(raisesBalance);
  const totalChargesCad = charges.reduce((sum, e) => sum + e.amountCad, 0);
  const totalPaymentsCad = counted.filter(lowersBalance).reduce((sum, e) => sum + e.amountCad, 0);
  const gstRatePercent = 0;
  const pstRatePercent = 0;
  const gstCad = Math.round(totalChargesCad * (gstRatePercent / 100) * 100) / 100;
  const pstCad = Math.round(totalChargesCad * (pstRatePercent / 100) * 100) / 100;
  const balanceCad = Math.round((totalChargesCad + gstCad + pstCad - totalPaymentsCad) * 100) / 100;

  const mapEntry = (e: (typeof entries)[number]) => ({
    id: e.id,
    label: e.kind === "refund" ? `Refund: ${e.label}` : e.label,
    amountCad: e.amountCad,
    // The portal contract predates refunds; a refund raises the balance like a charge.
    kind: (e.kind === "refund" ? "charge" : e.kind) as "charge" | "credit" | "payment",
    status: (e.status === "void" ? "waived" : e.status) as "open" | "paid" | "waived",
    source: e.source ?? null,
    dueAt: e.dueAt?.toISOString() ?? null,
    postedAt: e.postedAt.toISOString(),
    financialTermId: e.financialTermId,
    financialTermCode: e.financialTerm?.code ?? null,
    financialTermName: e.financialTerm?.name ?? null,
  });

  const history = buildFinanceHistory(allEntries);

  return StudentFinanceResponse.parse({
    summary: {
      balance: { amountCents: Math.round(accountBalanceCad * 100), currency: "CAD" },
      pastDue: { amountCents: Math.round(pastDue * 100), currency: "CAD" },
      nextDueAt: nextDue?.toISOString() ?? null,
      paymentExecutionEnabled: false,
    },
    entries: entries.map(mapEntry),
    financialTerms: terms.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      startsOn: t.startsOn,
      endsOn: t.endsOn,
    })),
    selectedFinancialTermId: selectedId,
    statement: {
      termCode: selectedTerm?.code ?? "All terms",
      termName: selectedTerm?.name ?? "All terms",
      charges: charges.map((c) => ({ id: c.id, label: c.kind === "refund" ? `Refund: ${c.label}` : c.label, amountCad: c.amountCad })),
      totalChargesCad,
      gstRatePercent,
      gstCad,
      pstRatePercent,
      pstCad,
      totalPaymentsCad,
      balanceCad,
    },
    history,
  });
}

function buildFinanceHistory(
  entries: Array<{
    id: string;
    label: string;
    amountCad: number;
    kind: string;
    source: string | null;
    postedAt: Date;
  }>,
) {
  type Event = {
    id: string;
    date: string;
    kind: "payment" | "accounts_receivable" | "credit";
    title: string;
    amountCad: number;
    source: string | null;
    receiptAvailable: boolean;
    lines: Array<{ id: string; label: string; amountCad: number }>;
    sortKey: number;
  };

  const events: Event[] = [];
  const chargesByDay = new Map<string, typeof entries>();

  for (const e of entries) {
    if (e.kind === "charge") {
      const day = e.postedAt.toISOString().slice(0, 10);
      const bucket = chargesByDay.get(day) ?? [];
      bucket.push(e);
      chargesByDay.set(day, bucket);
      continue;
    }
    if (e.kind === "payment" || e.kind === "credit") {
      events.push({
        id: e.id,
        date: e.postedAt.toISOString(),
        kind: e.kind === "payment" ? "payment" : "credit",
        title: e.kind === "payment" ? `Payment Applied: $${e.amountCad.toFixed(2)}` : e.label,
        amountCad: e.amountCad,
        source: e.source,
        receiptAvailable: e.kind === "payment",
        lines: [],
        sortKey: e.postedAt.getTime(),
      });
    }
  }

  for (const [, dayCharges] of chargesByDay) {
    const total = dayCharges.reduce((sum, c) => sum + c.amountCad, 0);
    const first = dayCharges[0]!;
    events.push({
      id: `ar-${first.id}`,
      date: first.postedAt.toISOString(),
      kind: "accounts_receivable",
      title: `Accounts Receivable Added: $${total.toFixed(2)}`,
      amountCad: total,
      source: null,
      receiptAvailable: false,
      lines: dayCharges.map((c) => ({ id: c.id, label: c.label, amountCad: c.amountCad })),
      sortKey: first.postedAt.getTime(),
    });
  }

  events.sort((a, b) => b.sortKey - a.sortKey);

  const months = new Map<string, { key: string; label: string; events: typeof events }>();
  for (const event of events) {
    const d = new Date(event.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = d
      .toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
      .toUpperCase();
    const bucket = months.get(key) ?? { key, label, events: [] };
    bucket.events.push(event);
    months.set(key, bucket);
  }

  return [...months.values()].map((m) => ({
    key: m.key,
    label: m.label,
    events: m.events.map(({ sortKey: _s, ...rest }) => rest),
  }));
}

export async function listStudentCredentials(user: SessionClaims) {
  const student = await requireStudent(user);
  const rows = await prisma.credentialRecord.findMany({
    where: { institutionId: user.institutionId, studentId: student.id },
    orderBy: { createdAt: "desc" },
  });
  return StudentCredentialsResponse.parse({
    credentials: rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status as "earned" | "pending" | "revoked",
      detail: r.detail,
      earnedAt: r.earnedAt?.toISOString() ?? null,
    })),
    issuanceEnabled: false,
  });
}

export async function listStudentResources(user: SessionClaims) {
  const docs = await prisma.knowledgeDocument.findMany({
    where: { institutionId: user.institutionId, status: "published" },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return StudentResourcesResponse.parse({
    resources: docs.map((d) => ({
      id: d.id,
      title: d.title,
      snippet: d.body.slice(0, 240),
      sourceKind: d.docType,
      href: d.uri.startsWith("/") ? d.uri : "/student/library",
    })),
  });
}

export async function toPortalRowsFromAssessments(user: SessionClaims) {
  const data = await listStudentAssessments(user);
  return data.assessments.map((a) => ({
    primary: a.title,
    secondary: `${a.courseCode} · ${a.state}`,
    meta: a.closesAt.slice(0, 10),
    href: "/student/assessments",
  }));
}

export async function toPortalRowsFromAttendance(user: SessionClaims) {
  const data = await listStudentAttendance(user);
  return data.records.map((r) => ({
    primary: r.meetingLabel,
    secondary: `${r.courseCode} · ${r.status}`,
    meta: r.recordedAt.slice(0, 10),
    href: "/student/attendance",
  }));
}

export async function toPortalRowsFromLectures(user: SessionClaims, kind: "lecture" | "lab") {
  const data = await listStudentSessions(user, kind);
  return data.lectures.map((l) => ({
    primary: l.title,
    secondary: `${l.courseCode} · ${l.location ?? l.deliveryMode}`,
    meta: l.startsAt.slice(0, 16).replace("T", " "),
    href: kind === "lab" ? "/student/labs" : `/student/f/st-11-lecture-detail?sessionId=${l.id}`,
  }));
}

export async function toPortalRowsFromFinance(user: SessionClaims) {
  const data = await listStudentFinance(user);
  return data.entries.map((e) => ({
    primary: e.label,
    secondary: `${e.kind} · ${e.status}`,
    meta: `CAD ${e.amountCad.toFixed(2)}`,
    href: "/student/fees",
  }));
}

export async function toPortalRowsFromCredentials(user: SessionClaims) {
  const data = await listStudentCredentials(user);
  return data.credentials.map((c) => ({
    primary: c.title,
    secondary: c.detail ?? c.status,
    meta: c.status,
    href: "/student/f/st-19-credentials",
  }));
}

export async function toPortalRowsFromResources(user: SessionClaims) {
  const data = await listStudentResources(user);
  return data.resources.map((r) => ({
    primary: r.title,
    secondary: r.snippet,
    meta: r.sourceKind,
    href: r.href ?? "/student/library",
  }));
}

export async function toPortalRowsFromServices(user: SessionClaims) {
  const data = await listStudentServiceRequests(user);
  return data.requests.map((r) => ({
    primary: r.subject,
    secondary: `${r.type} · ${r.status}`,
    meta: r.createdAt.slice(0, 10),
    href: "/student/f/st-16-services",
  }));
}

export async function toPortalRowsFromPracticum(user: SessionClaims) {
  const data = await listStudentPracticum(user);
  return data.placements.flatMap((p) => [
    {
      primary: p.programName,
      secondary: `${p.siteName} · ${p.status}`,
      meta: p.startsOn ?? undefined,
      href: "/student/f/st-17-practicum",
    },
    ...p.hours.map((h) => ({
      primary: h.weekLabel,
      secondary: `${h.hours}h · ${h.status}`,
      meta: p.programName,
      href: "/student/f/st-17-practicum",
    })),
  ]);
}

function mapWorkshop(
  w: {
    id: string;
    code: string;
    title: string;
    description: string;
    creditsCeu: number;
    startsAt: Date;
    endsAt: Date | null;
    location: string | null;
    capacity: number;
    status: string;
    registrations: Array<{ studentId: string; status: string }>;
  },
  studentId: string,
) {
  const mine = w.registrations.find((r) => r.studentId === studentId);
  const seatStatuses = new Set(["registered", "approved", "pending", "completed"]);
  const studentStatus =
    !mine
      ? "none"
      : mine.status === "declined" || mine.status === "dropped" || mine.status === "cancelled"
        ? "cancelled"
        : mine.status === "completed" || w.status === "completed"
          ? "completed"
          : "registered";
  return {
    id: w.id,
    code: w.code,
    title: w.title,
    description: w.description,
    creditsCeu: w.creditsCeu,
    startsAt: w.startsAt.toISOString(),
    endsAt: w.endsAt?.toISOString() ?? null,
    location: w.location,
    capacity: w.capacity,
    registeredCount: w.registrations.filter((r) => seatStatuses.has(r.status)).length,
    status: w.status as "upcoming" | "active" | "completed" | "cancelled",
    registrationStatus: studentStatus,
  };
}

async function workshopAccess(institutionId: string, student: { id: string; programName: string; cohortId: string | null }) {
  const [meta, cohort] = await Promise.all([
    studentMetaMap(institutionId),
    student.cohortId ? prisma.cohort.findFirst({ where: { id: student.cohortId }, select: { campus: true } }) : null,
  ]);
  const m = meta[student.id] ?? {};
  const access: StudentAccess = { status: m.status ?? "", programName: student.programName, campus: m.campus || cohort?.campus || "" };
  return { access, residency: m.residency };
}

export async function listStudentWorkshops(user: SessionClaims) {
  const student = await requireStudent(user);
  const [workshops, tz, { access }] = await Promise.all([
    prisma.workshop.findMany({
      where: { institutionId: user.institutionId },
      include: { registrations: true },
      orderBy: { startsAt: "asc" },
    }),
    institutionTimezone(user.institutionId),
    workshopAccess(user.institutionId, student),
  ]);
  const now = new Date();
  const today = ymdIn(now, tz);
  const open = new Set<string>();
  const mapped = workshops.map((w) => {
    const settings = workshopSettings(w, tz);
    if (!studentMayRegister(w, settings, access, now, tz)) open.add(w.id);
    return mapWorkshop({ ...w, status: storedStatus(workshopPhase(w, settings, today)) }, student.id);
  });
  return StudentWorkshopsResponse.parse({
    available: mapped.filter((w) => w.registrationStatus === "none" && open.has(w.id)),
    mine: mapped.filter((w) => w.registrationStatus === "registered"),
    completed: mapped.filter((w) => w.registrationStatus === "completed" || w.status === "completed"),
  });
}

export async function registerStudentWorkshop(user: SessionClaims, body: unknown, correlationId: string) {
  const student = await requireStudent(user);
  const input = RegisterWorkshopRequest.parse(body);
  const workshop = await prisma.workshop.findFirst({
    where: { id: input.workshopId, institutionId: user.institutionId },
    include: { registrations: true },
  });
  if (!workshop) throw httpError("Workshop not found", "NOT_FOUND", 404);
  const tz = await institutionTimezone(user.institutionId);
  const settings = workshopSettings(workshop, tz);
  const { access, residency } = await workshopAccess(user.institutionId, student);
  const blocked = studentMayRegister(workshop, settings, access, new Date(), tz);
  if (blocked) throw httpError(blocked, "VALIDATION_ERROR", 400);
  const existing = workshop.registrations.find((r) => r.studentId === student.id);
  if (existing) return listStudentWorkshops(user);
  const active = workshop.registrations.filter((r) => SEAT_STATUSES.includes(r.status)).length;
  if (active >= workshop.capacity) throw httpError("Workshop is full", "CONFLICT", 409);
  const status = settings.approval === "Automatic Approval" ? "approved" : "pending";
  const postFee = settings.feeCollection === "Immediately" || (settings.feeCollection === "Upon Approval" && status === "approved");

  await prisma.$transaction(async (tx) => {
    const reg = await tx.workshopRegistration.create({
      data: {
        institutionId: user.institutionId,
        workshopId: workshop.id,
        studentId: student.id,
        status,
      },
    });
    if (postFee) {
      await postWorkshopFee(tx, {
        institutionId: user.institutionId,
        registrationId: reg.id,
        studentId: student.id,
        workshop,
        amount: feeFor(settings, residency),
      });
    }
    await writeAuditAndOutbox(tx, {
      institutionId: user.institutionId,
      actorId: user.accountId,
      eventName: "Workshop.registered",
      purpose: "student_services",
      before: null,
      after: { workshopId: workshop.id, studentId: student.id },
      source: "student.workshops.register",
      correlationId,
    });
  });
  return listStudentWorkshops(user);
}

export async function listLeaveOfAbsence(user: SessionClaims) {
  const student = await requireStudent(user);
  const rows = await prisma.leaveOfAbsenceRequest.findMany({
    where: { institutionId: user.institutionId, studentId: student.id },
    orderBy: { createdAt: "desc" },
  });
  return LeaveOfAbsenceListResponse.parse({
    requests: rows.map((r) => ({
      id: r.id,
      reason: r.reason,
      startsOn: r.startsOn,
      endsOn: r.endsOn,
      status: r.status as "pending" | "approved" | "rejected" | "cancelled",
      approvalRequestId: r.approvalRequestId,
      decisionNote: r.decisionNote,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function createLeaveOfAbsence(user: SessionClaims, body: unknown, correlationId: string) {
  const student = await requireStudent(user);
  const input = CreateLeaveOfAbsenceRequest.parse(body);
  if (input.endsOn < input.startsOn) {
    throw httpError("End date must be on or after start date", "VALIDATION_ERROR", 400);
  }
  await prisma.$transaction(async (tx) => {
    const approval = await requireApproval({
      institutionId: user.institutionId,
      type: "leave_of_absence",
      subjectRef: `student:${student.id}`,
      proposedDiff: input,
      requestedBy: user.accountId,
      requiredApproverRoles: ["registrar", "admin"],
      requiredCount: 1,
      correlationId,
      tx,
    });
    await tx.leaveOfAbsenceRequest.create({
      data: {
        institutionId: user.institutionId,
        studentId: student.id,
        reason: input.reason,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        status: "pending",
        approvalRequestId: approval.id,
      },
    });
    await writeAuditAndOutbox(tx, {
      institutionId: user.institutionId,
      actorId: user.accountId,
      eventName: "LeaveOfAbsence.requested",
      purpose: "student_services",
      before: null,
      after: input,
      source: "student.leave.create",
      correlationId,
    });
  });
  return listLeaveOfAbsence(user);
}

export async function listRequiredTasks(user: SessionClaims) {
  const student = await requireStudent(user);
  const rows = await prisma.requiredTask.findMany({
    where: { institutionId: user.institutionId, studentId: student.id },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });
  const map = (r: (typeof rows)[number]) => ({
    id: r.id,
    title: r.title,
    detail: r.detail,
    dueAt: r.dueAt?.toISOString() ?? null,
    requestedAt: r.createdAt.toISOString(),
    status: r.status as "pending" | "completed" | "waived",
    href: r.href,
    completedAt: r.completedAt?.toISOString() ?? null,
  });
  return RequiredTasksResponse.parse({
    pending: rows.filter((r) => r.status === "pending").map(map),
    completed: rows.filter((r) => r.status !== "pending").map(map),
  });
}

export async function completeRequiredTask(user: SessionClaims, taskId: string, correlationId: string) {
  const student = await requireStudent(user);
  const task = await prisma.requiredTask.findFirst({
    where: { id: taskId, institutionId: user.institutionId, studentId: student.id },
  });
  if (!task) throw httpError("Task not found", "NOT_FOUND", 404);
  await prisma.requiredTask.update({
    where: { id: task.id },
    data: { status: "completed", completedAt: new Date() },
  });
  await writeAuditAndOutbox(prisma, {
    institutionId: user.institutionId,
    actorId: user.accountId,
    eventName: "RequiredTask.completed",
    purpose: "student_services",
    before: { status: task.status },
    after: { status: "completed" },
    source: "student.tasks.complete",
    correlationId: correlationId || randomUUID(),
  });
  return listRequiredTasks(user);
}

export function studentTaxPdfPath(id: string) {
  return `/student/tax-documents/${id}/pdf`;
}

export async function listTaxDocuments(user: SessionClaims) {
  const student = await requireStudent(user);
  const rows = await prisma.taxDocument.findMany({
    where: { institutionId: user.institutionId, studentId: student.id },
    orderBy: { taxYear: "desc" },
  });
  const documents = rows.map((r) => ({
    id: r.id,
    docType: r.docType,
    taxYear: r.taxYear,
    title: r.title,
    status: r.status as "available" | "pending" | "expired",
    issuedAt: r.issuedAt?.toISOString() ?? null,
    downloadUrl: studentTaxPdfPath(r.id),
  }));
  return TaxDocumentsResponse.parse({
    documents,
    formOptions: documents.map((d) => ({
      value: d.id,
      label: `${d.docType} — ${d.taxYear} · ${d.title}`,
    })),
    emptyNotice: documents.length
      ? null
      : "There are currently no tax documents or forms available.",
  });
}

export async function getStudentTaxPdf(user: SessionClaims, documentId: string) {
  const student = await requireStudent(user);
  const row = await prisma.taxDocument.findFirst({
    where: { id: documentId, institutionId: user.institutionId, studentId: student.id },
    include: { student: { include: { person: true } } },
  });
  if (!row) throw httpError("Tax document not found", "NOT_FOUND", 404);
  const { renderTaxCertificatePdf, taxPdfFilename } = await import("../../lib/taxPdf.js");
  const inst = await prisma.institution.findFirst({ where: { id: user.institutionId } });
  const pdf = renderTaxCertificatePdf({
    institutionName: inst?.name ?? "Heritage College",
    legalName: inst?.legalName,
    addressLine1: inst?.addressLine1,
    city: inst?.city,
    region: inst?.region,
    postalCode: inst?.postalCode,
    country: inst?.country,
    docType: row.docType,
    title: row.title,
    taxYear: row.taxYear,
    recipientName: `${row.student.person.givenName} ${row.student.person.familyName}`.trim(),
    recipientIdLabel: "Student number",
    recipientId: row.student.studentNumber,
    programName: row.student.programName,
    eligibleTuitionCad: row.eligibleTuitionCad,
    enrolmentMonths: row.enrolmentMonths,
    craStatus: row.craStatus,
    status: row.status,
    issuedAt: row.issuedAt,
  });
  return { pdf, filename: taxPdfFilename(row.docType, row.taxYear) };
}

export async function listExtracurricular(user: SessionClaims) {
  const student = await requireStudent(user);
  const rows = await prisma.extracurricularRecord.findMany({
    where: { institutionId: user.institutionId, studentId: student.id },
    orderBy: { createdAt: "desc" },
  });
  const categories = [...new Set(rows.map((r) => r.category))].sort((a, b) => a.localeCompare(b));
  const terms = [...new Set(rows.map((r) => r.termCode).filter((t): t is string => Boolean(t)))].sort((a, b) =>
    b.localeCompare(a),
  );
  return ExtracurricularResponse.parse({
    records: rows.map((r) => ({
      id: r.id,
      termCode: r.termCode,
      category: r.category,
      title: r.title,
      detail: r.detail,
      status: r.status,
    })),
    categories,
    terms,
  });
}

export async function listStudentBadges(user: SessionClaims) {
  const student = await requireStudent(user);
  const rows = await prisma.studentBadge.findMany({
    where: { institutionId: user.institutionId, studentId: student.id },
    orderBy: { createdAt: "desc" },
  });
  return StudentBadgesResponse.parse({
    badges: rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      description: r.description,
      status: r.status as "available" | "earned" | "revoked",
      earnedAt: r.earnedAt?.toISOString() ?? null,
    })),
  });
}

function parseJsonStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function listStudentCareer(user: SessionClaims) {
  await requireStudent(user);
  const rows = await prisma.careerOpportunity.findMany({
    where: { institutionId: user.institutionId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 40,
  });
  return StudentCareerResponse.parse({
    opportunities: rows.map((o) => {
      const href =
        o.href && (o.href.startsWith("https://") || o.href.startsWith("/")) && !o.href.includes("st-20-career") && o.href !== "/student/career"
          ? o.href
          : "/student/messages";
      return {
        id: o.id,
        title: o.title,
        employerName: o.employerName,
        skills: parseJsonStringArray(o.skillsJson),
        programCodes: parseJsonStringArray(o.programCodesJson),
        status: (o.status === "open" || o.status === "closed" || o.status === "draft" ? o.status : "open") as
          | "open"
          | "closed"
          | "draft",
        href,
        updatedAt: o.updatedAt.toISOString(),
      };
    }),
    services: [
      {
        title: "Career coaching",
        body: "Resume review, interview practice, and job-search planning with Career Services.",
        href: "/student/messages",
        cta: "Message Career Services",
      },
      {
        title: "Work-integrated learning",
        body: "Explore practicum placements, hours, and employer agreements tied to your program.",
        href: "/student/f/st-17-practicum",
        cta: "Open practicum",
      },
      {
        title: "Ask Heritage",
        body: "Get grounded answers about co-op timing, resume tips, and campus career resources.",
        href: "/student/ask",
        cta: "Ask a career question",
      },
    ],
  });
}

export async function buildFinanceStatement(user: SessionClaims, financialTermId?: string | null) {
  const student = await requireStudent(user);
  const finance = await listStudentFinance(user, financialTermId);
  const statement = finance.statement;
  const lines = [
    "MyHeritage · Financial Statement",
    `Student: ${student.studentNumber} · ${student.programName}`,
    statement ? `Term: ${statement.termName}` : "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "NEW FEES & CHARGES",
    ...(statement?.charges.map((c) => `  ${c.label}: $${c.amountCad.toFixed(2)}`) ??
      finance.entries.filter((e) => e.kind === "charge").map((e) => `  ${e.label}: $${e.amountCad.toFixed(2)}`)),
    "",
    `Total New Fees & Charges: ($${(statement?.totalChargesCad ?? 0).toFixed(2)})`,
    `GST ${statement?.gstRatePercent ?? 0}%: ($${(statement?.gstCad ?? 0).toFixed(2)})`,
    `PST ${statement?.pstRatePercent ?? 0}%: ($${(statement?.pstCad ?? 0).toFixed(2)})`,
    `Total Payments: $${(statement?.totalPaymentsCad ?? 0).toFixed(2)}`,
    `Statement Balance: ($${(statement?.balanceCad ?? finance.summary.balance.amountCents / 100).toFixed(2)})`,
  ].filter((line) => line !== undefined);
  return StudentFinanceStatementResponse.parse({
    generatedAt: new Date().toISOString(),
    studentNumber: student.studentNumber,
    programName: student.programName,
    summary: finance.summary,
    entries: finance.entries,
    statementText: lines.join("\n"),
  });
}

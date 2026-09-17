import type { SessionClaims } from "@myheritage/contracts";
import {
  CreateStudentServiceRequest,
  LogPracticumHoursRequest,
  StartAssessmentAttemptResponse,
  StudentAssessmentsResponse,
  StudentAttendanceResponse,
  StudentCredentialsResponse,
  StudentFinanceResponse,
  StudentLabNotebook,
  StudentLecturesResponse,
  StudentPracticumResponse,
  StudentResourcesResponse,
  StudentServiceRequestsResponse,
  SubmitAssessmentAttemptResponse,
  UpsertLabNotebookRequest,
} from "@myheritage/contracts";
import { requireApproval } from "@myheritage/auth";
import { prisma } from "@myheritage/db";
import { writeAuditAndOutbox } from "@myheritage/events";

function httpError(message: string, code: string, status: number) {
  return Object.assign(new Error(message), { code, status });
}

export async function requireStudent(user: SessionClaims) {
  const student = await prisma.student.findFirst({
    where: { institutionId: user.institutionId, personId: user.personId },
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
    let state: "upcoming" | "open" | "in_progress" | "submitted" | "closed" = "open";
    if (now < a.opensAt) state = "upcoming";
    else if (now > a.closesAt && !openAttempt) state = submitted ? "submitted" : "closed";
    else if (openAttempt) state = "in_progress";
    else if (submitted) state = "submitted";
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
      joinUrl: s.joinUrl,
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
      type: r.type as "official_transcript" | "enrollment_verification" | "advising_referral" | "general_inquiry",
      subject: r.subject,
      details: r.details,
      status: r.status as "open" | "pending_approval" | "resolved" | "rejected",
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
    input.type === "official_transcript" || input.type === "enrollment_verification";

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
        type: created.type as "official_transcript" | "enrollment_verification" | "advising_referral" | "general_inquiry",
        subject: created.subject,
        details: created.details,
        status: created.status as "open" | "pending_approval" | "resolved" | "rejected",
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

export async function listStudentFinance(user: SessionClaims) {
  const student = await requireStudent(user);
  const entries = await prisma.financeLedgerEntry.findMany({
    where: { institutionId: user.institutionId, studentId: student.id },
    orderBy: { postedAt: "desc" },
  });
  const balance = entries.reduce((sum, e) => {
    if (e.kind === "charge") return sum + e.amountCad;
    return sum - e.amountCad;
  }, 0);
  const pastDue = entries
    .filter((e) => e.kind === "charge" && e.status === "open" && e.dueAt && e.dueAt < new Date())
    .reduce((sum, e) => sum + e.amountCad, 0);
  const nextDue = entries
    .filter((e) => e.kind === "charge" && e.status === "open" && e.dueAt)
    .map((e) => e.dueAt!)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return StudentFinanceResponse.parse({
    summary: {
      balance: { amountCents: Math.round(balance * 100), currency: "CAD" },
      pastDue: { amountCents: Math.round(pastDue * 100), currency: "CAD" },
      nextDueAt: nextDue?.toISOString() ?? null,
      paymentExecutionEnabled: false,
    },
    entries: entries.map((e) => ({
      id: e.id,
      label: e.label,
      amountCad: e.amountCad,
      kind: e.kind as "charge" | "credit" | "payment",
      status: e.status as "open" | "paid" | "waived",
      dueAt: e.dueAt?.toISOString() ?? null,
      postedAt: e.postedAt.toISOString(),
    })),
  });
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

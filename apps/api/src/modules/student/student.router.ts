import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import {
  StudentAssignmentsResponse,
  SubmitStudentAssignmentResponse,
  UploadStudentSubmissionFileRequest,
  UploadStudentSubmissionFileResponse,
} from "@myheritage/contracts";
import { prisma } from "@myheritage/db";
import { writeAuditAndOutbox } from "@myheritage/events";
import { requireAuth, requireRoles, type AuthedRequest } from "../../middleware/auth.js";
import {
  createStudentServiceRequest,
  getOrCreateLabNotebook,
  getStudentLecture,
  listStudentAssessments,
  listStudentAttendance,
  listStudentCredentials,
  listStudentFinance,
  listStudentPracticum,
  listStudentResources,
  listStudentServiceRequests,
  listStudentSessions,
  listStudentWorkshops,
  registerStudentWorkshop,
  listLeaveOfAbsence,
  createLeaveOfAbsence,
  listRequiredTasks,
  completeRequiredTask,
  listTaxDocuments,
  getStudentTaxPdf,
  listExtracurricular,
  listStudentBadges,
  listStudentCareer,
  buildFinanceStatement,
  logPracticumHours,
  startAssessmentAttempt,
  submitAssessmentAttempt,
  upsertLabNotebook,
} from "./surfaces.service.js";
import {
  composeMail,
  createCustomMailFolder,
  getCourseEvaluation,
  getMailboxSettings,
  getStudentCourseLms,
  listAudienceAccounts,
  listMailbox,
  listStudentCalendars,
  replyMail,
  submitCourseEvaluation,
  updateMailboxSettings,
} from "./wave3.service.js";
import { sessionJoinUrl } from "../../lib/liveClass.js";
import { currentStudentId } from "../me/studentAlignment.js";

export const studentRouter: Router = Router();

const extensionByMime: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/csv": [".csv"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "application/zip": [".zip"],
};

function httpError(message: string, code: string, status: number) {
  return Object.assign(new Error(message), { code, status });
}

function parseUploadBody(body: unknown) {
  const parsed = UploadStudentSubmissionFileRequest.safeParse(body);
  if (!parsed.success) {
    throw Object.assign(new Error("Invalid upload"), {
      code: "VALIDATION_ERROR",
      status: 400,
      issues: parsed.error.issues,
    });
  }
  return parsed.data;
}

function decodeAndValidateFile(input: ReturnType<typeof parseUploadBody>) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.contentBase64) || input.contentBase64.length % 4 !== 0) {
    throw httpError("File content is not valid base64", "VALIDATION_ERROR", 400);
  }
  if (path.basename(input.filename) !== input.filename || input.filename.includes("\0")) {
    throw httpError("Filename must not contain a path", "VALIDATION_ERROR", 400);
  }
  const allowedExtensions = extensionByMime[input.mimeType] ?? [];
  const extension = path.extname(input.filename).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    throw httpError("Filename extension does not match the file type", "VALIDATION_ERROR", 400);
  }

  const content = Buffer.from(input.contentBase64, "base64");
  if (content.byteLength !== input.sizeBytes) {
    throw httpError("Decoded file size does not match sizeBytes", "VALIDATION_ERROR", 400);
  }

  const startsWith = (...bytes: number[]) => bytes.every((byte, index) => content[index] === byte);
  const isZip = startsWith(0x50, 0x4b, 0x03, 0x04) || startsWith(0x50, 0x4b, 0x05, 0x06);
  const signatureValid =
    (input.mimeType === "application/pdf" && content.subarray(0, 5).toString() === "%PDF-") ||
    (input.mimeType === "image/png" && startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) ||
    (input.mimeType === "image/jpeg" && startsWith(0xff, 0xd8, 0xff)) ||
    ([
      "application/zip",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ].includes(input.mimeType) && isZip) ||
    (["application/msword", "application/vnd.ms-excel"].includes(input.mimeType) &&
      startsWith(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)) ||
    (input.mimeType === "text/csv" && !content.includes(0));

  if (!signatureValid) {
    throw httpError("File signature does not match the declared type", "VALIDATION_ERROR", 400);
  }
  return content;
}

async function getStudent(user: AuthedRequest["user"]) {
  const student = await prisma.student.findFirst({
    where: { id: await currentStudentId(user.institutionId, user.personId), institutionId: user.institutionId },
  });
  if (!student) throw httpError("Student record not found", "NOT_FOUND", 404);
  return student;
}

type AssignmentRow = Awaited<ReturnType<typeof getAssignments>>[number];

async function getAssignments(institutionId: string, studentId: string, assignmentId?: string) {
  return prisma.assignment.findMany({
    where: {
      institutionId,
      ...(assignmentId ? { id: assignmentId } : {}),
      section: {
        institutionId,
        enrolments: { some: { institutionId, studentId, status: { in: ["enrolled", "completed"] } } },
      },
    },
    include: {
      section: { include: { course: true } },
      submissions: {
        where: { institutionId, studentId },
        include: { files: { where: { institutionId, archivedAt: null }, orderBy: { version: "asc" } } },
      },
      gradeItems: { where: { institutionId, studentId, status: "published" }, select: { id: true } },
    },
    orderBy: [{ dueAt: "asc" }, { title: "asc" }],
  });
}

function presentSubmission(submission: AssignmentRow["submissions"][number] | undefined) {
  if (!submission) return null;
  return {
    id: submission.id,
    status: submission.status as "draft" | "submitted" | "returned",
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    files: submission.files.map((file) => ({
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      version: file.version,
      createdAt: file.createdAt.toISOString(),
    })),
  };
}

function presentAssignment(row: AssignmentRow) {
  const submission = row.submissions[0];
  const now = Date.now();
  const dueSoon = row.dueAt != null && row.dueAt.getTime() >= now && row.dueAt.getTime() - now < 72 * 60 * 60 * 1000;
  const state = row.gradeItems.length
    ? "graded"
    : submission?.status === "submitted"
      ? "submitted"
      : submission
        ? "draft"
        : row.dueAt && row.dueAt.getTime() < now
          ? "overdue"
          : dueSoon
            ? "due"
            : "upcoming";
  return {
    id: row.id,
    sectionId: row.sectionId,
    courseCode: row.section.course.code,
    courseTitle: row.section.course.title,
    title: row.title,
    dueAt: row.dueAt?.toISOString() ?? null,
    maxScore: row.maxScore,
    weightPercent: row.weightPercent,
    state,
    submission: presentSubmission(submission),
  };
}

studentRouter.use(requireAuth, requireRoles("student"));

studentRouter.get("/assignments", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const student = await getStudent(user);
    const rows = await getAssignments(user.institutionId, student.id);
    res.json(StudentAssignmentsResponse.parse({ assignments: rows.map(presentAssignment) }));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/assignments/:assignmentId", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const student = await getStudent(user);
    const [row] = await getAssignments(user.institutionId, student.id, req.params.assignmentId);
    if (!row) throw httpError("Assignment not found", "NOT_FOUND", 404);
    res.json({ assignment: presentAssignment(row) });
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/assignments/:assignmentId/files", async (req, res, next) => {
  let storedPath: string | undefined;
  try {
    const user = (req as unknown as AuthedRequest).user;
    const student = await getStudent(user);
    const input = parseUploadBody(req.body);
    const content = decodeAndValidateFile(input);
    const [assignment] = await getAssignments(user.institutionId, student.id, req.params.assignmentId);
    if (!assignment) throw httpError("Assignment not found", "NOT_FOUND", 404);
    if (assignment.gradeItems.length > 0) {
      throw httpError("Graded work is locked", "SUBMISSION_LOCKED", 409);
    }
    if (assignment.dueAt && assignment.dueAt.getTime() < Date.now()) {
      throw httpError("The submission deadline has passed", "SUBMISSION_LOCKED", 409);
    }
    const existing = assignment.submissions[0];
    if (existing?.status === "submitted") {
      throw httpError("The submission is already submitted", "SUBMISSION_LOCKED", 409);
    }

    const fileId = randomUUID();
    const submissionId = existing?.id ?? randomUUID();
    const latestFile = existing
      ? await prisma.fileObject.findFirst({
          where: { institutionId: user.institutionId, submissionId: existing.id },
          orderBy: { version: "desc" },
          select: { version: true },
        })
      : null;
    const version = (latestFile?.version ?? 0) + 1;
    const relativePath = path.join(user.institutionId, student.id, assignment.id, submissionId, `${fileId}-${version}`);
    const storageRoot = path.resolve(process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), "var", "uploads"));
    storedPath = path.resolve(storageRoot, relativePath);
    if (!storedPath.startsWith(`${storageRoot}${path.sep}`)) {
      throw httpError("Invalid storage path", "VALIDATION_ERROR", 400);
    }
    await mkdir(path.dirname(storedPath), { recursive: true });
    await writeFile(storedPath, content, { flag: "wx" });

    const submission = await prisma.$transaction(async (tx) => {
      const row = await tx.submission.upsert({
        where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
        create: {
          id: submissionId,
          institutionId: user.institutionId,
          assignmentId: assignment.id,
          studentId: student.id,
          status: "draft",
        },
        update: { rowVersion: { increment: 1 } },
      });
      await tx.fileObject.create({
        data: {
          id: fileId,
          institutionId: user.institutionId,
          submissionId: row.id,
          path: relativePath,
          filename: input.filename,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          version,
        },
      });
      await writeAuditAndOutbox(tx, {
        institutionId: user.institutionId,
        actorId: user.accountId,
        eventName: "StudentSubmission.fileUploaded",
        purpose: "assignment_submission",
        before: null,
        after: { submissionId: row.id, assignmentId: assignment.id, fileId, version },
        source: "student.assignments",
        correlationId: (req as unknown as AuthedRequest).correlationId,
      });
      return tx.submission.findUniqueOrThrow({
        where: { id: row.id },
        include: { files: { where: { archivedAt: null }, orderBy: { version: "asc" } } },
      });
    });

    res.status(201).json(
      UploadStudentSubmissionFileResponse.parse({ submission: presentSubmission(submission) }),
    );
  } catch (error) {
    if (storedPath) await unlink(storedPath).catch(() => undefined);
    next(error);
  }
});

studentRouter.delete("/submission-files/:fileId", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const student = await getStudent(user);
    const file = await prisma.fileObject.findFirst({
      where: {
        id: req.params.fileId,
        institutionId: user.institutionId,
        archivedAt: null,
        submission: { institutionId: user.institutionId, studentId: student.id },
      },
      include: {
        submission: {
          include: {
            assignment: {
              include: {
                gradeItems: {
                  where: { institutionId: user.institutionId, studentId: student.id, status: "published" },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });
    if (!file) throw httpError("Submission file not found", "NOT_FOUND", 404);
    if (
      file.submission.status !== "draft" ||
      file.submission.assignment.gradeItems.length > 0 ||
      (file.submission.assignment.dueAt?.getTime() ?? Infinity) < Date.now()
    ) {
      throw httpError("The submission file is locked", "SUBMISSION_LOCKED", 409);
    }

    const archivedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.fileObject.update({
        where: { id: file.id },
        data: { archivedAt, rowVersion: { increment: 1 } },
      });
      await writeAuditAndOutbox(tx, {
        institutionId: user.institutionId,
        actorId: user.accountId,
        eventName: "StudentSubmission.fileArchived",
        purpose: "assignment_submission",
        before: { archivedAt: null },
        after: { archivedAt: archivedAt.toISOString(), fileId: file.id, submissionId: file.submissionId },
        source: "student.assignments",
        correlationId: (req as unknown as AuthedRequest).correlationId,
      });
    });
    res.json({ archived: true, fileId: file.id });
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/assignments/:assignmentId/submit", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const student = await getStudent(user);
    const [assignment] = await getAssignments(user.institutionId, student.id, req.params.assignmentId);
    if (!assignment) throw httpError("Assignment not found", "NOT_FOUND", 404);
    const submission = assignment.submissions[0];
    if (!submission) throw httpError("Upload at least one file before submitting", "VALIDATION_ERROR", 400);
    if (submission.status === "submitted") {
      res.json(SubmitStudentAssignmentResponse.parse({ submission: presentSubmission(submission), alreadySubmitted: true }));
      return;
    }
    if (assignment.gradeItems.length > 0) {
      throw httpError("Graded work is locked", "SUBMISSION_LOCKED", 409);
    }
    if (submission.files.length === 0) {
      throw httpError("Upload at least one file before submitting", "VALIDATION_ERROR", 400);
    }
    if (assignment.dueAt && assignment.dueAt.getTime() < Date.now()) {
      throw httpError("The submission deadline has passed", "SUBMISSION_LOCKED", 409);
    }

    const submittedAt = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.submission.updateMany({
        where: {
          id: submission.id,
          institutionId: user.institutionId,
          studentId: student.id,
          status: "draft",
        },
        data: { status: "submitted", submittedAt, rowVersion: { increment: 1 } },
      });
      if (result.count !== 1) throw httpError("The submission changed; refresh and try again", "CONFLICT", 409);
      await writeAuditAndOutbox(tx, {
        institutionId: user.institutionId,
        actorId: user.accountId,
        eventName: "StudentSubmission.submitted",
        purpose: "assignment_submission",
        before: { status: "draft" },
        after: { status: "submitted", submissionId: submission.id, assignmentId: assignment.id },
        source: "student.assignments",
        correlationId: (req as unknown as AuthedRequest).correlationId,
      });
      return tx.submission.findUniqueOrThrow({
        where: { id: submission.id },
        include: { files: { where: { archivedAt: null }, orderBy: { version: "asc" } } },
      });
    });
    res.json(SubmitStudentAssignmentResponse.parse({ submission: presentSubmission(updated), alreadySubmitted: false }));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/courses/:sectionId/content", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const sectionId = String(req.params.sectionId);
    const student = await prisma.student.findFirst({
      where: { id: await currentStudentId(user.institutionId, user.personId), institutionId: user.institutionId },
    });
    if (!student) {
      res.status(404).json({ error: { message: "Student record not found" } });
      return;
    }
    const enrolment = await prisma.enrolment.findFirst({
      where: { institutionId: user.institutionId, studentId: student.id, sectionId, status: "enrolled" },
      include: {
        section: {
          include: {
            course: true,
            assignments: { orderBy: { dueAt: "asc" } },
            classSessions: { orderBy: { startsAt: "asc" } },
          },
        },
      },
    });
    if (!enrolment) {
      res.status(404).json({ error: { message: "Section not in your enrolment" } });
      return;
    }
    const progressPath = `/student/content-progress/${user.accountId}/${sectionId}`;
    const state = await prisma.sisScreenState.findUnique({
      where: { institutionId_path: { institutionId: user.institutionId, path: progressPath } },
    });
    const completed = new Set<string>(
      state ? ((JSON.parse(state.payloadJson) as { completed?: string[] }).completed ?? []) : [],
    );
    const items = [
      ...enrolment.section.classSessions.map((session) => {
        const isLab = session.sessionKind === "lab";
        const detailHref = isLab
          ? `/student/labs`
          : `/student/f/st-11-lecture-detail?sessionId=${session.id}`;
        return {
          id: `session:${session.id}`,
          kind: (isLab ? "lab" : "lecture") as "lecture" | "lab",
          title: session.title,
          detail: `${session.startsAt.toISOString()}${session.location ? ` · ${session.location}` : ""}`,
          href: detailHref,
          joinUrl: sessionJoinUrl(session.sectionId, session.joinUrl),
          completed: completed.has(`session:${session.id}`),
        };
      }),
      ...enrolment.section.assignments.map((assignment) => ({
        id: `assignment:${assignment.id}`,
        kind: "resource" as const,
        title: assignment.title,
        detail: assignment.dueAt ? `Due ${assignment.dueAt.toISOString()}` : "Assignment resource",
        href: `/student/assignments/${assignment.id}`,
        joinUrl: null as string | null,
        completed: completed.has(`assignment:${assignment.id}`),
      })),
    ];
    const done = items.filter((i) => i.completed).length;
    res.json({
      sectionId,
      courseCode: enrolment.section.course.code,
      courseTitle: enrolment.section.course.title,
      progressPct: items.length ? Math.round((done / items.length) * 100) : 0,
      completedCount: done,
      totalCount: items.length,
      items,
    });
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/courses/:sectionId/content/:itemId/complete", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const sectionId = String(req.params.sectionId);
    const itemId = decodeURIComponent(String(req.params.itemId));
    const student = await prisma.student.findFirst({
      where: { id: await currentStudentId(user.institutionId, user.personId), institutionId: user.institutionId },
    });
    if (!student) {
      res.status(404).json({ error: { message: "Student record not found" } });
      return;
    }
    const enrolment = await prisma.enrolment.findFirst({
      where: { institutionId: user.institutionId, studentId: student.id, sectionId, status: "enrolled" },
    });
    if (!enrolment) {
      res.status(404).json({ error: { message: "Section not in your enrolment" } });
      return;
    }
    const progressPath = `/student/content-progress/${user.accountId}/${sectionId}`;
    const existing = await prisma.sisScreenState.findUnique({
      where: { institutionId_path: { institutionId: user.institutionId, path: progressPath } },
    });
    const prev = existing ? (JSON.parse(existing.payloadJson) as { completed?: string[] }) : { completed: [] };
    const completed = new Set(prev.completed ?? []);
    completed.add(itemId);
    const payload = { completed: [...completed], updatedAt: new Date().toISOString() };
    await prisma.sisScreenState.upsert({
      where: { institutionId_path: { institutionId: user.institutionId, path: progressPath } },
      create: {
        institutionId: user.institutionId,
        path: progressPath,
        payloadJson: JSON.stringify(payload),
      },
      update: { payloadJson: JSON.stringify(payload) },
    });
    await writeAuditAndOutbox(prisma, {
      institutionId: user.institutionId,
      actorId: user.accountId,
      eventName: "StudentContent.completed",
      purpose: "course_consumption",
      before: { sectionId, completed: prev.completed ?? [] },
      after: { sectionId, itemId, completed: [...completed] },
      source: "student.content",
      correlationId: randomUUID(),
      outboxPayload: { sectionId, itemId },
    });
    res.json({ ok: true, sectionId, itemId, completed: [...completed] });
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/assessments", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listStudentAssessments((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/assessments/:id/start", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    res.status(201).json(
      await startAssessmentAttempt(user, String(req.params.id), (req as AuthedRequest).correlationId),
    );
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/assessments/attempts/:id/submit", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    res.json(
      await submitAssessmentAttempt(user, String(req.params.id), (req as AuthedRequest).correlationId),
    );
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/attendance", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listStudentAttendance((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/lectures", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listStudentSessions((req as AuthedRequest).user, "lecture"));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/lectures/:id", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json({ lecture: await getStudentLecture((req as AuthedRequest).user, String(req.params.id)) });
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/labs", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listStudentSessions((req as AuthedRequest).user, "lab"));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/labs/:sessionId/notebook", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await getOrCreateLabNotebook((req as AuthedRequest).user, String(req.params.sessionId)));
  } catch (error) {
    next(error);
  }
});

studentRouter.put("/labs/:sessionId/notebook", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    res.json(
      await upsertLabNotebook(
        user,
        String(req.params.sessionId),
        req.body,
        (req as AuthedRequest).correlationId,
      ),
    );
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/services", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listStudentServiceRequests((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/services", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    res.status(201).json(
      await createStudentServiceRequest(user, req.body, (req as AuthedRequest).correlationId),
    );
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/practicum", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listStudentPracticum((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/practicum/hours", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    res.status(201).json(await logPracticumHours(user, req.body, (req as AuthedRequest).correlationId));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/finance", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const termId = typeof req.query.financialTermId === "string" ? req.query.financialTermId : null;
    res.json(await listStudentFinance((req as AuthedRequest).user, termId));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/calendars", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listStudentCalendars((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/courses/:sectionId/lms", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await getStudentCourseLms((req as AuthedRequest).user, String(req.params.sectionId)));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/evaluations/:id", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json({ evaluation: await getCourseEvaluation((req as AuthedRequest).user, String(req.params.id)) });
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/evaluations/:id/submit", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    res.json(
      await submitCourseEvaluation(user, String(req.params.id), req.body, (req as AuthedRequest).correlationId),
    );
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/mail", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const folderId = typeof req.query.folderId === "string" ? req.query.folderId : null;
    res.json(await listMailbox((req as AuthedRequest).user, folderId));
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/mail/folders", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.status(201).json(await createCustomMailFolder((req as AuthedRequest).user, req.body));
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/mail/compose", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    res.status(201).json(await composeMail(user, req.body, (req as AuthedRequest).correlationId));
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/mail/threads/:threadId/reply", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const threadId = String(req.params.threadId || "");
    res.json(await replyMail(user, threadId, req.body, (req as AuthedRequest).correlationId));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/mail/settings", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json({ settings: await getMailboxSettings((req as AuthedRequest).user) });
  } catch (error) {
    next(error);
  }
});

studentRouter.patch("/mail/settings", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json({ settings: await updateMailboxSettings((req as AuthedRequest).user, req.body) });
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/mail/audience", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listAudienceAccounts((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/credentials", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listStudentCredentials((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/resources", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listStudentResources((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/workshops", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listStudentWorkshops((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/workshops/register", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    res.json(await registerStudentWorkshop(user, req.body, (req as AuthedRequest).correlationId));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/leave-of-absence", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listLeaveOfAbsence((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/leave-of-absence", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    res.status(201).json(await createLeaveOfAbsence(user, req.body, (req as AuthedRequest).correlationId));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/required-tasks", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listRequiredTasks((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.post("/required-tasks/:taskId/complete", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    res.json(await completeRequiredTask(user, String(req.params.taskId), (req as AuthedRequest).correlationId));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/tax-documents", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listTaxDocuments((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/tax-documents/:id/pdf", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const { sendPdf } = await import("../../lib/taxPdf.js");
    const { pdf, filename } = await getStudentTaxPdf((req as unknown as AuthedRequest).user, String(req.params.id));
    sendPdf(res, pdf, filename);
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/extracurricular", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listExtracurricular((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/documents", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const student = await prisma.student.findFirst({
      where: { id: await currentStudentId(user.institutionId, user.personId), institutionId: user.institutionId },
    });
    if (!student) {
      res.status(404).json({ error: { message: "Student not found" } });
      return;
    }
    const { listStudentDocumentsForStudent } = await import("../admin/registrar-gaps.service.js");
    res.json(await listStudentDocumentsForStudent(user.institutionId, student.id));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/badges", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listStudentBadges((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/career", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    res.json(await listStudentCareer((req as AuthedRequest).user));
  } catch (error) {
    next(error);
  }
});

studentRouter.get("/finance/statement", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const termId = typeof req.query.financialTermId === "string" ? req.query.financialTermId : null;
    res.json(await buildFinanceStatement((req as AuthedRequest).user, termId));
  } catch (error) {
    next(error);
  }
});

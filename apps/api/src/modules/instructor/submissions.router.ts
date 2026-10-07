import { Router } from "express";
import { prisma } from "@myheritage/db";
import type { SessionClaims } from "@myheritage/contracts";
import type { AuthedRequest } from "../../middleware/auth.js";
import { readSubmissionFile } from "../../lib/submissionFiles.js";

/** Student work for one section, readable only by the section's instructor or an admin/registrar. */
export const submissionsRouter: Router = Router();

function httpError(message: string, code: string, status: number) {
  return Object.assign(new Error(message), { code, status });
}

function canManageAnySection(user: SessionClaims) {
  return user.roles.includes("admin") || user.roles.includes("registrar");
}

async function sectionForReviewer(user: SessionClaims, sectionId: string) {
  const section = await prisma.section.findFirst({
    where: { id: sectionId, institutionId: user.institutionId },
    select: { id: true, instructorPersonId: true, course: { select: { code: true, title: true } } },
  });
  if (!section) throw httpError("Course section not found", "NOT_FOUND", 404);
  if (section.instructorPersonId !== user.personId && !canManageAnySection(user)) {
    throw httpError("You do not teach this course section", "FORBIDDEN", 403);
  }
  return section;
}

submissionsRouter.get("/sections/:sectionId/submissions", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const section = await sectionForReviewer(user, String(req.params.sectionId));
    const assignments = await prisma.assignment.findMany({
      where: { institutionId: user.institutionId, sectionId: section.id },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, dueAt: true, maxScore: true, hidden: true },
    });
    const wanted = typeof req.query.assignmentId === "string" ? req.query.assignmentId : "";
    const selected = assignments.find((a) => a.id === wanted) ?? assignments[0] ?? null;
    if (wanted && selected?.id !== wanted) throw httpError("Assignment not found in this section", "NOT_FOUND", 404);

    const enrolments = await prisma.enrolment.findMany({
      where: { institutionId: user.institutionId, sectionId: section.id, status: { in: ["enrolled", "completed"] } },
      select: {
        studentId: true,
        student: { select: { studentNumber: true, person: { select: { givenName: true, familyName: true } } } },
      },
      orderBy: { student: { person: { familyName: "asc" } } },
    });
    const [submissions, grades] = selected
      ? await Promise.all([
          prisma.submission.findMany({
            where: { institutionId: user.institutionId, assignmentId: selected.id },
            include: { files: { where: { archivedAt: null }, orderBy: { version: "asc" } } },
          }),
          prisma.gradeItem.findMany({
            where: { institutionId: user.institutionId, assignmentId: selected.id },
            select: { studentId: true, score: true, maxScore: true, status: true, feedback: true },
          }),
        ])
      : [[], []];
    const submissionByStudent = new Map(submissions.map((s) => [s.studentId, s]));
    const gradeByStudent = new Map(grades.map((g) => [g.studentId, g]));

    res.json({
      section: { id: section.id, code: section.course.code, title: section.course.title },
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        dueAt: a.dueAt?.toISOString() ?? null,
        maxScore: Number(a.maxScore),
        hidden: a.hidden,
      })),
      assignmentId: selected?.id ?? null,
      rows: enrolments.map((e) => {
        const submission = submissionByStudent.get(e.studentId);
        const grade = gradeByStudent.get(e.studentId);
        return {
          studentId: e.studentId,
          name: `${e.student.person.givenName} ${e.student.person.familyName}`.trim(),
          studentNumber: e.student.studentNumber,
          submission: submission
            ? {
                id: submission.id,
                status: submission.status,
                submittedAt: submission.submittedAt?.toISOString() ?? null,
                textBody: submission.textBody ?? null,
                files: submission.files.map((f) => ({
                  id: f.id,
                  filename: f.filename,
                  mimeType: f.mimeType,
                  sizeBytes: f.sizeBytes,
                  version: f.version,
                  createdAt: f.createdAt.toISOString(),
                })),
              }
            : null,
          grade: grade
            ? {
                score: grade.score == null ? null : Number(grade.score),
                maxScore: Number(grade.maxScore),
                status: grade.status,
                feedback: grade.feedback ?? null,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

submissionsRouter.get("/submission-files/:fileId", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const file = await prisma.fileObject.findFirst({
      where: { id: String(req.params.fileId), institutionId: user.institutionId, archivedAt: null },
      include: { submission: { select: { assignment: { select: { sectionId: true } } } } },
    });
    if (!file) throw httpError("Submission file not found", "NOT_FOUND", 404);
    await sectionForReviewer(user, file.submission.assignment.sectionId);
    const content = await readSubmissionFile(file.path);
    res.json({ name: file.filename, mime: file.mimeType, base64: content.toString("base64") });
  } catch (error) {
    next(error);
  }
});

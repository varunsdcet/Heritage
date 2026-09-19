import { Router } from "express";
import { z } from "zod";
import {
  CreateGradeItemRequest,
  GradebookResponse,
  PublishGradesRequest,
  StudentGradesResponse,
  UpsertGradeRequest,
} from "@myheritage/contracts";
import { prisma } from "@myheritage/db";
import { requireApproval } from "@myheritage/auth";
import { writeAuditAndOutbox } from "@myheritage/events";
import { requireAuth, requireRoles, type AuthedRequest } from "../../middleware/auth.js";

export const gradesRouter: Router = Router();

function letterFor(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct >= 90) return "A";
  if (pct >= 85) return "A-";
  if (pct >= 80) return "B+";
  if (pct >= 75) return "B";
  if (pct >= 70) return "B-";
  if (pct >= 65) return "C+";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

gradesRouter.get("/me", requireAuth, requireRoles("student"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const student = await prisma.student.findFirst({
      where: { institutionId: user.institutionId, personId: user.personId },
    });
    if (!student) throw Object.assign(new Error("Student not found"), { code: "NOT_FOUND", status: 404 });

    const enrolments = await prisma.enrolment.findMany({
      where: { institutionId: user.institutionId, studentId: student.id, status: "enrolled" },
      include: {
        section: { include: { course: true, assignments: { orderBy: { dueAt: "asc" } } } },
        gradeItems: {
          where: { institutionId: user.institutionId },
          include: { assignment: true },
        },
      },
    });

    const instructorIds = [...new Set(enrolments.map((e) => e.section.instructorPersonId))];
    const instructors = await prisma.person.findMany({
      where: { id: { in: instructorIds }, institutionId: user.institutionId },
    });
    const instructorMap = new Map(instructors.map((p) => [p.id, `${p.givenName} ${p.familyName}`]));

    const courses = enrolments.map((e) => {
      // Published scores only; assignment shells still list so students see the gradebook structure.
      const publishedByAssignment = new Map(
        e.gradeItems.filter((g) => g.status === "published").map((g) => [g.assignmentId, g]),
      );
      const items = e.section.assignments.map((a) => {
        const g = publishedByAssignment.get(a.id);
        return {
          id: g?.id ?? a.id,
          title: a.title,
          weightPercent: a.weightPercent,
          score: g && g.status === "published" ? g.score : null,
          maxScore: g?.maxScore ?? a.maxScore,
          letter: g && g.status === "published" ? g.letter : null,
          status: (g?.status === "published" ? "published" : "draft") as "draft" | "published",
          publishedAt: g?.status === "published" ? (g.publishedAt?.toISOString() ?? null) : null,
          underReview: false,
        };
      });
      const weighted = items.reduce(
        (acc, item) => {
          if (item.status !== "published" || item.score == null) return acc;
          return {
            w: acc.w + item.weightPercent,
            s: acc.s + (item.score / item.maxScore) * item.weightPercent,
          };
        },
        { w: 0, s: 0 },
      );
      const currentPercent = weighted.w ? Math.round((weighted.s / weighted.w) * 1000) / 10 : null;
      return {
        sectionId: e.sectionId,
        code: e.section.course.code,
        title: e.section.course.title,
        instructorName: instructorMap.get(e.section.instructorPersonId) ?? "Instructor",
        credits: e.section.course.credits,
        currentPercent,
        letter: currentPercent == null ? null : letterFor(currentPercent, 100),
        items,
      };
    });

    const withScores = courses.filter((c) => c.currentPercent != null);
    const cumulativeGpa =
      withScores.length === 0
        ? 0
        : Math.round(
            (withScores.reduce((sum, c) => sum + (c.currentPercent as number), 0) / withScores.length / 25) *
              100,
          ) / 100;

    await prisma.auditEvent.create({
      data: {
        institutionId: user.institutionId,
        actorId: user.accountId,
        eventName: "Student.grades.view",
        purpose: "read",
        beforeJson: null,
        afterJson: JSON.stringify({ studentId: student.id }),
        source: "grades.me",
        correlationId: (req as AuthedRequest).correlationId,
        version: 1,
      },
    });

    res.json(
      StudentGradesResponse.parse({
        cumulativeGpa,
        standing: student.standing as "good" | "warning" | "probation" | "alert",
        courses,
      }),
    );
  } catch (err) {
    next(err);
  }
});

const GRADE_STATUSES = new Set(["draft", "pending_publish", "published", "under_review"]);

function normalizeGradeStatus(status: string | null | undefined) {
  const raw = (status ?? "draft").trim().toLowerCase();
  return (GRADE_STATUSES.has(raw) ? raw : "draft") as
    | "draft"
    | "pending_publish"
    | "published"
    | "under_review";
}

gradesRouter.get(
  "/:sectionId",
  requireAuth,
  requireRoles("instructor", "admin"),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const sectionIdRaw = String(req.params.sectionId ?? "");
      const sectionIdParsed = z.string().uuid().safeParse(sectionIdRaw);
      if (!sectionIdParsed.success) {
        throw Object.assign(new Error("Invalid section id — open gradebook from My Courses or pick a section tab"), {
          code: "VALIDATION_ERROR",
          status: 400,
        });
      }
      const sectionId = sectionIdParsed.data;
      const section = await prisma.section.findFirst({
        where: {
          id: sectionId,
          institutionId: user.institutionId,
          ...(user.roles.includes("admin") ? {} : { instructorPersonId: user.personId }),
        },
        include: {
          course: true,
          assignments: { orderBy: { createdAt: "asc" } },
          enrolments: {
            where: { status: "enrolled" },
            include: { student: { include: { person: true } }, gradeItems: true },
            orderBy: { student: { person: { familyName: "asc" } } },
          },
        },
      });
      if (!section) throw Object.assign(new Error("Section not found"), { code: "NOT_FOUND", status: 404 });

      const payload = GradebookResponse.parse({
        sectionId: section.id,
        courseCode: section.course.code,
        courseTitle: section.course.title,
        assignments: section.assignments.map((a) => ({
          id: a.id,
          title: a.title,
          maxScore: Number(a.maxScore),
          weightPercent: Number(a.weightPercent),
        })),
        rows: section.enrolments.map((e) => ({
          studentId: e.studentId,
          studentNumber: e.student.studentNumber || "—",
          name: `${e.student.person?.givenName ?? ""} ${e.student.person?.familyName ?? ""}`.trim() || "Student",
          cells: section.assignments.map((a) => {
            const cell = e.gradeItems.find((g) => g.assignmentId === a.id);
            return {
              gradeItemId: cell?.id ?? "00000000-0000-4000-8000-000000000000",
              assignmentId: a.id,
              score: cell?.score == null ? null : Number(cell.score),
              maxScore: Number(a.maxScore),
              status: normalizeGradeStatus(cell?.status),
              rowVersion: Number(cell?.rowVersion ?? 1) || 1,
            };
          }),
        })),
      });
      res.json(payload);
    } catch (err) {
      next(err);
    }
  },
);

gradesRouter.post("/", requireAuth, requireRoles("instructor", "admin"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const body = CreateGradeItemRequest.parse(req.body);
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: body.assignmentId,
        institutionId: user.institutionId,
        ...(user.roles.includes("admin")
          ? {}
          : { section: { instructorPersonId: user.personId, institutionId: user.institutionId } }),
      },
    });
    if (!assignment) throw Object.assign(new Error("Assignment not found"), { code: "NOT_FOUND", status: 404 });
    const enrolment = await prisma.enrolment.findFirst({
      where: {
        institutionId: user.institutionId,
        sectionId: assignment.sectionId,
        studentId: body.studentId,
        status: "enrolled",
      },
    });
    if (!enrolment) throw Object.assign(new Error("Enrolment not found"), { code: "NOT_FOUND", status: 404 });
    if (body.score > assignment.maxScore) {
      throw Object.assign(new Error("Score cannot exceed the maximum score"), {
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }
    const letter = letterFor(body.score, assignment.maxScore);
    const existing = await prisma.gradeItem.findFirst({
      where: { assignmentId: assignment.id, studentId: body.studentId, institutionId: user.institutionId },
    });
    if (existing) {
      if (existing.status === "published") {
        throw Object.assign(new Error("Published grades are read-only"), { code: "CONFLICT", status: 409 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.gradeItem.update({
          where: { id: existing.id },
          data: { score: body.score, letter, status: "draft", rowVersion: { increment: 1 } },
        });
        await writeAuditAndOutbox(tx, {
          institutionId: user.institutionId,
          actorId: user.accountId,
          eventName: "GradeItem.updated",
          purpose: "gradebook_edit",
          before: existing,
          after: row,
          source: "grade-items.post",
          correlationId: (req as AuthedRequest).correlationId,
        });
        return row;
      });
      res.json(updated);
      return;
    }
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.gradeItem.create({
        data: {
          institutionId: user.institutionId,
          assignmentId: assignment.id,
          studentId: body.studentId,
          enrolmentId: enrolment.id,
          score: body.score,
          maxScore: assignment.maxScore,
          letter,
          status: "draft",
        },
      });
      await writeAuditAndOutbox(tx, {
        institutionId: user.institutionId,
        actorId: user.accountId,
        eventName: "GradeItem.created",
        purpose: "gradebook_edit",
        before: null,
        after: row,
        source: "grade-items.post",
        correlationId: (req as AuthedRequest).correlationId,
      });
      return row;
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

gradesRouter.patch("/:id", requireAuth, requireRoles("instructor", "admin"), async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const id = z.string().uuid().parse(req.params.id);
    const body = UpsertGradeRequest.parse(req.body);
    const existing = await prisma.gradeItem.findFirst({
      where: {
        id,
        institutionId: user.institutionId,
        ...(user.roles.includes("admin")
          ? {}
          : {
              assignment: {
                institutionId: user.institutionId,
                section: { institutionId: user.institutionId, instructorPersonId: user.personId },
              },
            }),
      },
    });
    if (!existing) throw Object.assign(new Error("Grade not found"), { code: "NOT_FOUND", status: 404 });
    if (existing.status === "published") {
      throw Object.assign(new Error("Published grades are read-only"), { code: "CONFLICT", status: 409 });
    }
    // pending_publish can be recalled to draft when instructor edits before approval is applied
    if (existing.rowVersion !== body.rowVersion) {
      throw Object.assign(new Error("Stale row_version — refresh and try again"), { code: "CONFLICT", status: 409 });
    }
    if (body.score > existing.maxScore) {
      throw Object.assign(new Error("Score cannot exceed the maximum score"), {
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }
    const letter = letterFor(body.score, existing.maxScore);
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.gradeItem.update({
        where: { id },
        data: { score: body.score, letter, status: "draft", rowVersion: { increment: 1 } },
      });
      await writeAuditAndOutbox(tx, {
        institutionId: user.institutionId,
        actorId: user.accountId,
        eventName: "GradeItem.updated",
        purpose: "gradebook_edit",
        before: existing,
        after: row,
        source: "grade-items.patch",
        correlationId: (req as AuthedRequest).correlationId,
      });
      return row;
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

gradesRouter.post(
  "/:sectionId/publish",
  requireAuth,
  requireRoles("instructor", "admin"),
  async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const sectionId = z.string().uuid().parse(req.params.sectionId);
      const body = PublishGradesRequest.parse(req.body);
      const idempotencyKey = req.header("idempotency-key")?.trim();
      if (!idempotencyKey) {
        throw Object.assign(new Error("Idempotency-Key header is required"), {
          code: "VALIDATION_ERROR",
          status: 400,
        });
      }
      const idempotencyPath = `/gradebooks/${sectionId}/publish`;
      const existingRequest = await prisma.idempotencyKey.findUnique({
        where: {
          institutionId_key_method_path: {
            institutionId: user.institutionId,
            key: idempotencyKey,
            method: "POST",
            path: idempotencyPath,
          },
        },
      });
      if (existingRequest) {
        if (existingRequest.statusCode === 0) {
          throw Object.assign(new Error("An identical publish request is still processing"), {
            code: "CONFLICT",
            status: 409,
          });
        }
        res.status(existingRequest.statusCode).json(JSON.parse(existingRequest.responseJson));
        return;
      }
      const section = await prisma.section.findFirst({
        where: {
          id: sectionId,
          institutionId: user.institutionId,
          ...(user.roles.includes("admin") ? {} : { instructorPersonId: user.personId }),
        },
        select: { id: true },
      });
      if (!section) throw Object.assign(new Error("Section not found"), { code: "NOT_FOUND", status: 404 });
      const grades = await prisma.gradeItem.findMany({
        where: {
          id: { in: body.gradeItemIds },
          institutionId: user.institutionId,
          assignment: { sectionId },
        },
      });
      if (grades.length !== body.gradeItemIds.length) {
        throw Object.assign(new Error("One or more grade items not found"), { code: "NOT_FOUND", status: 404 });
      }
      try {
        const response = await prisma.$transaction(async (tx) => {
          await tx.idempotencyKey.create({
            data: {
              institutionId: user.institutionId,
              key: idempotencyKey,
              method: "POST",
              path: idempotencyPath,
              responseJson: "{}",
              statusCode: 0,
            },
          });
          await tx.gradeItem.updateMany({
            where: { id: { in: body.gradeItemIds }, institutionId: user.institutionId },
            data: { status: "pending_publish" },
          });
          const approval = await requireApproval({
            institutionId: user.institutionId,
            type: "grade.publish",
            subjectRef: `section:${sectionId}`,
            proposedDiff: {
              gradeItemIds: body.gradeItemIds,
              studentIds: [...new Set(grades.map((g) => g.studentId))],
            },
            requestedBy: user.accountId,
            requiredApproverRoles: ["admin", "registrar"],
            requiredCount: 1,
            correlationId: (req as AuthedRequest).correlationId,
            tx,
          });
          const storedResponse = { approvalRequestId: approval.id, status: approval.status };
          await tx.idempotencyKey.update({
            where: {
              institutionId_key_method_path: {
                institutionId: user.institutionId,
                key: idempotencyKey,
                method: "POST",
                path: idempotencyPath,
              },
            },
            data: { responseJson: JSON.stringify(storedResponse), statusCode: 202 },
          });
          return storedResponse;
        });
        res.status(202).json(response);
      } catch (error) {
        if ((error as { code?: string }).code === "P2002") {
          const completed = await prisma.idempotencyKey.findUnique({
            where: {
              institutionId_key_method_path: {
                institutionId: user.institutionId,
                key: idempotencyKey,
                method: "POST",
                path: idempotencyPath,
              },
            },
          });
          if (completed && completed.statusCode > 0) {
            res.status(completed.statusCode).json(JSON.parse(completed.responseJson));
            return;
          }
          throw Object.assign(new Error("An identical publish request is already processing"), {
            code: "CONFLICT",
            status: 409,
          });
        }
        throw error;
      }
    } catch (err) {
      next(err);
    }
  },
);

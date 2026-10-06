import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@myheritage/db";
import { hashPassword } from "@myheritage/auth";
import { requireAuth, requireRoles, type AuthedRequest } from "../../middleware/auth.js";
import { getSisScreen, runSisAction, seedAllSisScreens, getCampusOverview } from "./sis.service.js";
import { superAdminRouter } from "./superAdmin.router.js";
import { heritageRouter } from "./heritage/heritage.router.js";
import {
  UpsertCohortBody,
  GeneratePlanBody,
  LedgerPostBody,
  LedgerAdjustBody,
  GenerateTaxBody,
  ExtracurricularBody,
  StudentDocumentBody,
  RetakeBody,
  MailPolicyBody,
  listCohorts,
  upsertCohort,
  generateProgramPlan,
  listLedger,
  postLedgerEntry,
  adjustLedgerEntry,
  listTaxDocumentsAdmin,
  generateT2202,
  getAdminTaxPdf,
  listExtracurricularAdmin,
  upsertExtracurricular,
  deleteExtracurricular,
  listStudentDocumentsAdmin,
  upsertStudentDocument,
  deleteStudentDocument,
  listRetakes,
  createRetake,
  getMailPolicy,
  updateMailPolicy,
  listProgramsLite,
  listStudentsLite,
  listSectionsLite,
  listFinancialTerms,
} from "./registrar-gaps.service.js";

export const adminRouter: Router = Router();

const CreateUser = z.object({
  email: z.string().email(),
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  role: z.enum(["student", "instructor", "admin", "registrar", "applicant", "employer"]),
  password: z.string().min(8).default("Heritage!2026"),
  studentNumber: z.string().optional(),
  programName: z.string().optional(),
});

const CreateSection = z.object({
  courseCode: z.string().min(2),
  courseTitle: z.string().min(2),
  credits: z.number().positive().default(3),
  sectionCode: z.string().min(2),
  instructorEmail: z.string().email(),
  termCode: z.string().default("2026F"),
});

const CreateEnrolment = z.object({
  studentEmail: z.string().email(),
  sectionId: z.string().uuid(),
});

const CreateAssignment = z.object({
  sectionId: z.string().uuid(),
  title: z.string().min(1),
  maxScore: z.number().positive().default(100),
  weightPercent: z.number().positive().default(10),
  dueAt: z.string().datetime().optional(),
});

adminRouter.use(requireAuth, requireRoles("admin", "registrar"));
adminRouter.use("/super", superAdminRouter);
adminRouter.use("/heritage", heritageRouter);

adminRouter.get("/campus-overview", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    res.json(await getCampusOverview(user.institutionId));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/users", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const accounts = await prisma.account.findMany({
      where: { institutionId: user.institutionId },
      include: { person: true },
      orderBy: { email: "asc" },
    });
    const students = await prisma.student.findMany({ where: { institutionId: user.institutionId } });
    const byPerson = new Map(students.map((s) => [s.personId, s]));
    res.json({
      items: accounts.map((a) => ({
        accountId: a.id,
        personId: a.personId,
        email: a.email,
        givenName: a.person.givenName,
        familyName: a.person.familyName,
        roles: JSON.parse(a.rolesJson) as string[],
        status: a.status,
        studentNumber: byPerson.get(a.personId)?.studentNumber ?? null,
        programName: byPerson.get(a.personId)?.programName ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/users", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const body = CreateUser.parse(req.body);
    const email = body.email.trim().toLowerCase();
    const existing = await prisma.account.findFirst({
      where: { institutionId: user.institutionId, email },
    });
    if (existing) {
      res.status(409).json({ error: { message: "Account already exists" } });
      return;
    }

    const personId = randomUUID();
    const accountId = randomUUID();
    const passwordHash = await hashPassword(body.password);
    const role = body.role === "registrar" ? "registrar" : body.role;
    const portalHref =
      role === "instructor"
        ? "/instructor"
        : role === "student"
          ? "/student"
          : role === "applicant"
            ? "/applicant"
            : role === "employer"
              ? "/employer"
              : role === "admin" || role === "registrar"
                ? "/admin"
                : "/login";

    let studentNumber: string | null = null;
    let studentId: string | null = null;

    await prisma.$transaction(async (tx) => {
      await tx.person.create({
        data: {
          id: personId,
          institutionId: user.institutionId,
          givenName: body.givenName.trim(),
          familyName: body.familyName.trim(),
          email,
        },
      });
      await tx.account.create({
        data: {
          id: accountId,
          institutionId: user.institutionId,
          personId,
          email,
          passwordHash,
          status: "active",
          rolesJson: JSON.stringify([role]),
        },
      });

      if (role === "student") {
        studentNumber =
          body.studentNumber?.trim() ||
          `ST-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        const clash = await tx.student.findFirst({
          where: { institutionId: user.institutionId, studentNumber },
        });
        if (clash) {
          studentNumber = `ST-${new Date().getFullYear()}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
        }
        const student = await tx.student.create({
          data: {
            institutionId: user.institutionId,
            personId,
            studentNumber,
            programName: body.programName?.trim() || "General Studies",
            standing: "good",
          },
        });
        studentId = student.id;
      }

      if (role === "applicant") {
        await tx.admissionsApplication.create({
          data: {
            institutionId: user.institutionId,
            accountId,
            personId,
            programName: body.programName?.trim() || "General Studies",
            intakeTerm: "Fall 2026",
            status: "draft",
            progressPct: 10,
            documents: {
              create: [
                { institutionId: user.institutionId, label: "Official transcript", status: "missing" },
                { institutionId: user.institutionId, label: "Government ID", status: "missing" },
              ],
            },
            timeline: {
              create: [
                {
                  institutionId: user.institutionId,
                  title: "Application started",
                  detail: "Account provisioned by campus admin",
                },
              ],
            },
          },
        });
      }

      if (role === "employer") {
        await tx.employerOrg.create({
          data: {
            institutionId: user.institutionId,
            accountId,
            name: body.programName?.trim() || `${body.givenName} ${body.familyName} Org`,
            siteName: "Primary practicum site",
            contactEmail: email,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          institutionId: user.institutionId,
          actorId: user.accountId,
          eventName: "admin.user.create",
          purpose: "provision",
          afterJson: JSON.stringify({ email, role, accountId, portalHref }),
          source: "api",
          correlationId: randomUUID(),
        },
      });

      const loginHint =
        role === "student" && studentNumber
          ? `Sign in at /login with email ${email} or student number ${studentNumber}.`
          : `Sign in at /login with email ${email}.`;

      await tx.notification.create({
        data: {
          institutionId: user.institutionId,
          recipientAccountId: accountId,
          channel: "in_app",
          title: "Welcome to MyHeritage",
          body: `${loginHint} Temporary password was set by your administrator. Portal: ${portalHref}`,
          templateKey: "account.welcome",
        },
      });
    });

    try {
      const { sendMailViaHumanitix, mailConfigured } = await import("../../lib/mailer.js");
      if (mailConfigured()) {
        const web = (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(",")[0];
        await sendMailViaHumanitix({
          email,
          title: "Welcome to MyHeritage",
          message: [
            `Hello ${body.givenName},`,
            "",
            `Your ${role} account is ready.`,
            `Sign in: ${web}/login`,
            `Email: ${email}`,
            studentNumber ? `Student number: ${studentNumber}` : "",
            `After sign-in you land on: ${web}${portalHref}`,
            "",
            "Use the temporary password your administrator shared with you.",
            "",
            "— MyHeritage",
          ]
            .filter(Boolean)
            .join("\n"),
        });
      }
    } catch (err) {
      console.error("welcome mail failed", err);
    }

    res.status(201).json({
      accountId,
      personId,
      email,
      role,
      studentId,
      studentNumber,
      temporaryPassword: body.password,
      portalHref,
      loginHint:
        role === "student" && studentNumber
          ? `Login at /login with ${email} or ${studentNumber} → ${portalHref}`
          : `Login at /login with ${email} → ${portalHref}`,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/sections", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const sections = await prisma.section.findMany({
      where: { institutionId: user.institutionId },
      include: { course: true, term: true, _count: { select: { enrolments: true } } },
      orderBy: { code: "asc" },
    });
    const instructors = await prisma.person.findMany({
      where: { id: { in: [...new Set(sections.map((s) => s.instructorPersonId))] } },
    });
    const names = new Map(instructors.map((p) => [p.id, `${p.givenName} ${p.familyName}`]));
    res.json({
      items: sections.map((s) => ({
        sectionId: s.id,
        code: s.code,
        courseCode: s.course.code,
        courseTitle: s.course.title,
        credits: s.course.credits,
        termCode: s.term.code,
        instructorName: names.get(s.instructorPersonId) ?? "TBA",
        instructorPersonId: s.instructorPersonId,
        enrolmentCount: s._count.enrolments,
      })),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/sections", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const body = CreateSection.parse(req.body);
    const instructor = await prisma.account.findFirst({
      where: { institutionId: user.institutionId, email: body.instructorEmail.toLowerCase() },
      include: { person: true },
    });
    if (!instructor) {
      res.status(404).json({ error: { message: "Instructor account not found. Create the teacher first." } });
      return;
    }
    const roles = JSON.parse(instructor.rolesJson) as string[];
    if (!roles.includes("instructor") && !roles.includes("admin")) {
      res.status(400).json({ error: { message: "Target account is not an instructor" } });
      return;
    }

    let term = await prisma.term.findFirst({
      where: { institutionId: user.institutionId, code: body.termCode },
    });
    if (!term) {
      term = await prisma.term.create({
        data: {
          institutionId: user.institutionId,
          code: body.termCode,
          name: body.termCode,
          startsOn: "2026-09-01",
          endsOn: "2026-12-18",
        },
      });
    }

    let course = await prisma.course.findFirst({
      where: { institutionId: user.institutionId, code: body.courseCode.toUpperCase() },
    });
    if (!course) {
      course = await prisma.course.create({
        data: {
          institutionId: user.institutionId,
          code: body.courseCode.toUpperCase(),
          title: body.courseTitle,
          credits: body.credits,
        },
      });
    }

    const existing = await prisma.section.findFirst({
      where: { institutionId: user.institutionId, code: body.sectionCode },
    });
    if (existing) {
      res.status(409).json({ error: { message: "Section code already exists" } });
      return;
    }

    const section = await prisma.section.create({
      data: {
        institutionId: user.institutionId,
        courseId: course.id,
        termId: term.id,
        code: body.sectionCode,
        instructorPersonId: instructor.personId,
      },
    });

    await prisma.notification.create({
      data: {
        institutionId: user.institutionId,
        recipientAccountId: instructor.id,
        channel: "in_app",
        title: `Section assigned · ${section.code}`,
        body: `You are teaching ${course.code} ${course.title}.`,
        templateKey: "section.assigned",
      },
    });

    res.status(201).json({
      sectionId: section.id,
      code: section.code,
      courseCode: course.code,
      instructorEmail: instructor.email,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/sections/:sectionId", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const sectionId = String(req.params.sectionId || "");
    const section = await prisma.section.findFirst({
      where: { id: sectionId, institutionId: user.institutionId },
      include: { _count: { select: { enrolments: true } } },
    });
    if (!section) {
      res.status(404).json({ error: { message: "Section not found" } });
      return;
    }
    if (section._count.enrolments > 0) {
      res.status(409).json({
        error: { message: `Cannot delete section with ${section._count.enrolments} enrolment(s)` },
      });
      return;
    }
    await prisma.$transaction(async (tx) => {
      const assignments = await tx.assignment.findMany({
        where: { sectionId: section.id, institutionId: user.institutionId },
        select: { id: true },
      });
      const assignmentIds = assignments.map((a) => a.id);
      if (assignmentIds.length) {
        const submissions = await tx.submission.findMany({
          where: { assignmentId: { in: assignmentIds }, institutionId: user.institutionId },
          select: { id: true },
        });
        const submissionIds = submissions.map((s) => s.id);
        if (submissionIds.length) {
          await tx.fileObject.deleteMany({ where: { submissionId: { in: submissionIds }, institutionId: user.institutionId } });
          await tx.submission.deleteMany({ where: { id: { in: submissionIds } } });
        }
        await tx.gradeItem.deleteMany({ where: { assignmentId: { in: assignmentIds }, institutionId: user.institutionId } });
        await tx.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
      }
      await tx.classSession.deleteMany({ where: { sectionId: section.id, institutionId: user.institutionId } });
      await tx.section.delete({ where: { id: section.id } });
      await tx.auditEvent.create({
        data: {
          institutionId: user.institutionId,
          actorId: user.accountId,
          eventName: "Section.deleted",
          purpose: "admin_mutation",
          afterJson: JSON.stringify({ sectionId: section.id, code: section.code }),
          source: "admin.sections",
          correlationId: randomUUID(),
        },
      });
    });
    res.json({ ok: true, sectionId: section.id, code: section.code });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/enrolments", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const body = CreateEnrolment.parse(req.body);
    const account = await prisma.account.findFirst({
      where: { institutionId: user.institutionId, email: body.studentEmail.toLowerCase() },
    });
    if (!account) {
      res.status(404).json({ error: { message: "Student account not found" } });
      return;
    }
    const student = await prisma.student.findFirst({
      where: { institutionId: user.institutionId, personId: account.personId },
    });
    if (!student) {
      res.status(404).json({ error: { message: "Student profile missing for account" } });
      return;
    }
    const section = await prisma.section.findFirst({
      where: { id: body.sectionId, institutionId: user.institutionId },
      include: { course: true },
    });
    if (!section) {
      res.status(404).json({ error: { message: "Section not found" } });
      return;
    }
    const existing = await prisma.enrolment.findFirst({
      where: { sectionId: section.id, studentId: student.id },
    });
    if (existing) {
      res.status(409).json({ error: { message: "Already enrolled" } });
      return;
    }
    const enrolment = await prisma.enrolment.create({
      data: {
        institutionId: user.institutionId,
        sectionId: section.id,
        studentId: student.id,
        status: "enrolled",
      },
    });
    await prisma.notification.create({
      data: {
        institutionId: user.institutionId,
        recipientAccountId: account.id,
        channel: "in_app",
        title: `Enrolled · ${section.course.code}`,
        body: `You are enrolled in ${section.code} ${section.course.title}.`,
        templateKey: "enrolment.created",
      },
    });
    res.status(201).json({
      enrolmentId: enrolment.id,
      sectionId: section.id,
      studentId: student.id,
      courseCode: section.course.code,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/assignments", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const body = CreateAssignment.parse(req.body);
    const section = await prisma.section.findFirst({
      where: { id: body.sectionId, institutionId: user.institutionId },
    });
    if (!section) {
      res.status(404).json({ error: { message: "Section not found" } });
      return;
    }
    const assignment = await prisma.assignment.create({
      data: {
        institutionId: user.institutionId,
        sectionId: body.sectionId,
        title: body.title,
        maxScore: body.maxScore,
        weightPercent: body.weightPercent,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
      },
    });
    res.status(201).json({ assignmentId: assignment.id, title: assignment.title, sectionId: assignment.sectionId });
  } catch (err) {
    next(err);
  }
});

const SisActionBody = z.object({
  path: z.string().min(1),
  action: z.string().min(1),
  rowKey: z.string().optional(),
  note: z.string().optional(),
});

adminRouter.get("/sis/screen", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const path = String(req.query.path ?? "").trim();
    if (!path.startsWith("/admin")) {
      res.status(400).json({ error: { message: "path must be an /admin route" } });
      return;
    }
    const view = await getSisScreen(user, path);
    res.json(view);
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/sis/action", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const body = SisActionBody.parse(req.body);
    if (!body.path.startsWith("/admin")) {
      res.status(400).json({ error: { message: "path must be an /admin route" } });
      return;
    }
    const view = await runSisAction(user, body);
    res.json(view);
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/sis/seed", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const n = await seedAllSisScreens(user.institutionId);
    res.json({ ok: true, screens: n });
  } catch (err) {
    next(err);
  }
});

// --- PART D registrar / finance / records gaps (live writes, no hardcoding) ---

adminRouter.get("/programs-lite", async (req, res, next) => {
  try {
    res.json(await listProgramsLite((req as AuthedRequest).user.institutionId));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/students-lite", async (req, res, next) => {
  try {
    res.json(await listStudentsLite((req as AuthedRequest).user.institutionId));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/sections-lite", async (req, res, next) => {
  try {
    res.json(await listSectionsLite((req as AuthedRequest).user.institutionId));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/financial-terms", async (req, res, next) => {
  try {
    res.json(await listFinancialTerms((req as AuthedRequest).user.institutionId));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/cohorts", async (req, res, next) => {
  try {
    res.json(await listCohorts((req as AuthedRequest).user.institutionId));
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/cohorts", async (req, res, next) => {
  try {
    const body = UpsertCohortBody.parse(req.body);
    const row = await upsertCohort((req as AuthedRequest).user, body);
    res.status(body.id ? 200 : 201).json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/cohorts/generate-plan", async (req, res, next) => {
  try {
    const body = GeneratePlanBody.parse(req.body);
    res.json(await generateProgramPlan((req as AuthedRequest).user, body));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/finance/ledger", async (req, res, next) => {
  try {
    const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
    res.json(await listLedger((req as AuthedRequest).user.institutionId, studentId));
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/finance/ledger", async (req, res, next) => {
  try {
    const body = LedgerPostBody.parse(req.body);
    const row = await postLedgerEntry((req as AuthedRequest).user, body);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/finance/ledger/adjust", async (req, res, next) => {
  try {
    const body = LedgerAdjustBody.parse(req.body);
    res.json(await adjustLedgerEntry((req as AuthedRequest).user, body));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/tax-documents", async (req, res, next) => {
  try {
    res.json(await listTaxDocumentsAdmin((req as AuthedRequest).user.institutionId));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/tax-documents/:id/pdf", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const { sendPdf } = await import("../../lib/taxPdf.js");
    const { pdf, filename } = await getAdminTaxPdf((req as unknown as AuthedRequest).user, id);
    sendPdf(res, pdf, filename);
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/tax-documents/generate", async (req, res, next) => {
  try {
    const body = GenerateTaxBody.parse(req.body);
    const row = await generateT2202((req as AuthedRequest).user, body);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/extracurricular", async (req, res, next) => {
  try {
    const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
    res.json(await listExtracurricularAdmin((req as AuthedRequest).user.institutionId, studentId));
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/extracurricular", async (req, res, next) => {
  try {
    const body = ExtracurricularBody.parse(req.body);
    const row = await upsertExtracurricular((req as AuthedRequest).user, body);
    res.status(body.id ? 200 : 201).json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/extracurricular/:id", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const id = z.string().uuid().parse(req.params.id);
    res.json(await deleteExtracurricular(user, id));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/student-documents", async (req, res, next) => {
  try {
    const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
    res.json(await listStudentDocumentsAdmin((req as AuthedRequest).user.institutionId, studentId));
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/student-documents", async (req, res, next) => {
  try {
    const body = StudentDocumentBody.parse(req.body);
    const row = await upsertStudentDocument((req as AuthedRequest).user, body);
    res.status(body.id ? 200 : 201).json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/student-documents/:id", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const id = z.string().uuid().parse(req.params.id);
    res.json(await deleteStudentDocument(user, id));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/retakes", async (req, res, next) => {
  try {
    res.json(await listRetakes((req as AuthedRequest).user.institutionId));
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/retakes", async (req, res, next) => {
  try {
    const body = RetakeBody.parse(req.body);
    const row = await createRetake((req as AuthedRequest).user, body);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/mail-policy", async (req, res, next) => {
  try {
    res.json(await getMailPolicy((req as AuthedRequest).user.institutionId));
  } catch (err) {
    next(err);
  }
});

adminRouter.put("/mail-policy", async (req, res, next) => {
  try {
    const body = MailPolicyBody.parse(req.body);
    res.json(await updateMailPolicy((req as AuthedRequest).user, body));
  } catch (err) {
    next(err);
  }
});

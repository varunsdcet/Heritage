import { Router } from "express";
import { prisma } from "@myheritage/db";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";

export const searchRouter: Router = Router();

searchRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const q = String(req.query.q ?? "").trim().toLowerCase();
    if (!q) {
      res.json({ groups: [] });
      return;
    }
    if (user.roles.includes("student") && !user.roles.some((role) => role === "admin" || role === "registrar")) {
      const student = await prisma.student.findFirst({
        where: { institutionId: user.institutionId, personId: user.personId },
      });
      if (!student) {
        res.json({ groups: [] });
        return;
      }
      const [enrolments, assignments, resources] = await Promise.all([
        prisma.enrolment.findMany({
          where: {
            institutionId: user.institutionId,
            studentId: student.id,
            status: { in: ["enrolled", "completed"] },
            section: {
              institutionId: user.institutionId,
              course: {
                institutionId: user.institutionId,
                OR: [
                  { code: { contains: q, mode: "insensitive" } },
                  { title: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          },
          include: { section: { include: { course: true } } },
          take: 8,
        }),
        prisma.assignment.findMany({
          where: {
            institutionId: user.institutionId,
            title: { contains: q, mode: "insensitive" },
            section: {
              institutionId: user.institutionId,
              enrolments: {
                some: {
                  institutionId: user.institutionId,
                  studentId: student.id,
                  status: { in: ["enrolled", "completed"] },
                },
              },
            },
          },
          include: { section: { include: { course: true } } },
          take: 8,
        }),
        prisma.portalRecord.findMany({
          where: {
            institutionId: user.institutionId,
            role: "student",
            screenPath: { in: ["/student/library", "/student/resources"] },
            OR: [
              { audienceAccountId: null },
              { audienceAccountId: user.accountId },
            ],
            AND: [
              {
                OR: [
                  { primaryText: { contains: q, mode: "insensitive" } },
                  { secondaryText: { contains: q, mode: "insensitive" } },
                ],
              },
            ],
          },
          take: 8,
        }),
      ]);
      res.json({
        groups: [
          {
            type: "courses",
            items: enrolments.map((entry) => ({
              id: entry.sectionId,
              label: `${entry.section.course.code} · ${entry.section.course.title}`,
              sub: entry.section.code,
              href: `/student/courses/${entry.sectionId}`,
            })),
          },
          {
            type: "assignments",
            items: assignments.map((assignment) => ({
              id: assignment.id,
              label: assignment.title,
              sub: assignment.section.course.code,
              href: `/student/assignments/${assignment.id}`,
            })),
          },
          {
            type: "resources",
            items: resources.map((resource) => ({
              id: resource.id,
              label: resource.primaryText,
              sub: resource.secondaryText,
              href: resource.href,
            })),
          },
        ].filter((group) => group.items.length > 0),
      });
      return;
    }

    if (user.roles.includes("applicant") && !user.roles.some((r) => r === "admin" || r === "registrar")) {
      const app = await prisma.admissionsApplication.findFirst({
        where: { institutionId: user.institutionId, accountId: user.accountId },
        include: { documents: true, offers: true, timeline: true },
      });
      const groups: Array<{ type: string; items: Array<{ id: string; label: string; sub?: string; href?: string }> }> = [];
      if (app) {
        const hay = `${app.programName} ${app.status} ${app.intakeTerm}`.toLowerCase();
        if (hay.includes(q) || q.includes("application") || q.includes("nursing")) {
          groups.push({
            type: "application",
            items: [
              {
                id: app.id,
                label: app.programName,
                sub: `${app.status} · ${app.progressPct}%`,
                href: "/applicant/application",
              },
            ],
          });
        }
        const docs = app.documents.filter(
          (d) => d.label.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
        );
        if (docs.length || q.includes("document") || q.includes("passport") || q.includes("transcript")) {
          groups.push({
            type: "documents",
            items: (docs.length ? docs : app.documents).slice(0, 8).map((d) => ({
              id: d.id,
              label: d.label,
              sub: d.status,
              href: "/applicant/documents",
            })),
          });
        }
        const offers = app.offers.filter(
          (o) => o.title.toLowerCase().includes(q) || o.status.toLowerCase().includes(q),
        );
        if (offers.length || q.includes("offer")) {
          groups.push({
            type: "offers",
            items: (offers.length ? offers : app.offers).map((o) => ({
              id: o.id,
              label: o.title,
              sub: o.status,
              href: "/applicant/offers",
            })),
          });
        }
      }
      res.json({ groups: groups.filter((g) => g.items.length > 0) });
      return;
    }

    if (user.roles.includes("employer") && !user.roles.some((r) => r === "admin" || r === "registrar")) {
      const org = await prisma.employerOrg.findFirst({
        where: { institutionId: user.institutionId, accountId: user.accountId },
        include: {
          placements: { include: { hours: true, evaluations: true } },
          agreements: true,
        },
      });
      const groups: Array<{ type: string; items: Array<{ id: string; label: string; sub?: string; href?: string }> }> = [];
      if (org) {
        const placements = org.placements.filter(
          (p) =>
            p.studentName.toLowerCase().includes(q) ||
            p.programName.toLowerCase().includes(q) ||
            q.includes("placement"),
        );
        if (placements.length || q.includes("mei") || q.includes("fatima")) {
          groups.push({
            type: "placements",
            items: (placements.length ? placements : org.placements).map((p) => ({
              id: p.id,
              label: p.studentName,
              sub: p.programName,
              href: "/employer/placements",
            })),
          });
        }
        const hours = org.placements.flatMap((p) =>
          p.hours
            .filter((h) => h.weekLabel.toLowerCase().includes(q) || h.status.toLowerCase().includes(q) || q.includes("hour"))
            .map((h) => ({
              id: h.id,
              label: `${p.studentName} · ${h.weekLabel}`,
              sub: `${h.hours}h · ${h.status}`,
              href: "/employer/hours",
            })),
        );
        if (hours.length) {
          groups.push({ type: "hours", items: hours.slice(0, 8) });
        }
        const agreements = org.agreements.filter(
          (a) => a.title.toLowerCase().includes(q) || q.includes("agreement") || q.includes("mou"),
        );
        if (agreements.length || q.includes("agreement")) {
          groups.push({
            type: "agreements",
            items: (agreements.length ? agreements : org.agreements).map((a) => ({
              id: a.id,
              label: a.title,
              sub: a.status,
              href: "/employer/agreements",
            })),
          });
        }
      }
      res.json({ groups: groups.filter((g) => g.items.length > 0) });
      return;
    }

    const people = await prisma.person.findMany({
      where: {
        institutionId: user.institutionId,
        OR: [
          { givenName: { contains: q, mode: "insensitive" } },
          { familyName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { students: true, accounts: true },
      take: 8,
    });
    const courses = await prisma.course.findMany({
      where: {
        institutionId: user.institutionId,
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
    });
    res.json({
      groups: [
        {
          type: "people",
          items: people.map((p) => {
            const isStudent = (p.students?.length ?? 0) > 0;
            const roles = (p.accounts ?? []).flatMap((a) => {
              try {
                return JSON.parse(a.rolesJson) as string[];
              } catch {
                return [];
              }
            });
            return {
              id: p.id,
              label: `${p.givenName} ${p.familyName}`,
              sub: p.email,
              href: isStudent
                ? "/admin/f/rg-01-student-360"
                : roles.includes("instructor")
                  ? "/admin/f/ac-14-faculty"
                  : "/admin/f/pl-01-users-and-roles",
            };
          }),
        },
        {
          type: "courses",
          items: courses.map((c) => ({
            id: c.id,
            label: `${c.code} · ${c.title}`,
            sub: `${c.credits} credits`,
            href: "/admin/f/ac-06-course-catalogue",
          })),
        },
      ],
    });
  } catch (err) {
    next(err);
  }
});

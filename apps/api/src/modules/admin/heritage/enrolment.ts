/* Section enrolment shared by every enrolment path: seat / waitlist rules and the optional course fee posted with it. */

import { randomUUID } from "node:crypto";
import { prisma } from "@myheritage/db";
import type { SessionClaims } from "@myheritage/contracts";
import { S as CM, settingsOf } from "./courses.js";
import {
  EPS,
  assertPeriodOpen,
  cad,
  ensureFinancialTerm,
  finAudit,
  httpError,
  loadConfig,
  nameOf,
  num,
  postEntry,
  r2,
  requireStudent,
  s,
  type Config,
  type Data,
  type Db,
} from "./finance.core.js";
import { isInternational } from "./finance.ledger.js";
import { withStudentMoneyLock } from "./studentLock.js";

export type SeatRule = { capacity: number | null; waitlist: boolean; waitlistSize: number | null };
export type SeatStatus = "enrolled" | "waitlisted";

const blank = (v: unknown) => v === null || v === undefined || v === "";

/** Seat rule from the section's session settings (Maximum Enrolments, Enrolment Waitlist, Wait List Size). */
export function seatRule(st: Data | undefined): SeatRule {
  const capacity = !st || blank(st.maxEnrolments) ? null : Math.max(0, Math.floor(num(st.maxEnrolments)));
  const waitlistSize = !st || blank(st.waitlistSize) ? null : Math.max(0, Math.floor(num(st.waitlistSize)));
  return { capacity, waitlist: s(st?.waitlist || "Enabled") !== "Disabled", waitlistSize };
}

/** Enrolled while seats remain, waitlisted when the section is full and its waitlist is open, otherwise refused (409). */
export function seatDecision(rule: SeatRule, counts: { enrolled: number; waitlisted: number }, label: string): SeatStatus {
  if (rule.capacity === null || counts.enrolled < rule.capacity) return "enrolled";
  if (!rule.waitlist) throw httpError(409, `${label} is full (${counts.enrolled}/${rule.capacity} enrolled) and its waitlist is disabled`, "SECTION_FULL");
  if (rule.waitlistSize !== null && counts.waitlisted >= rule.waitlistSize) throw httpError(409, `${label} is full (${counts.enrolled}/${rule.capacity} enrolled) and its waitlist is full (${counts.waitlisted}/${rule.waitlistSize})`, "WAITLIST_FULL");
  return "waitlisted";
}

export type CourseFeeQuote = { amount: number; included: boolean; source: "session" | "course" | "none"; domestic: number; international: number };

/**
 * Course cost for a student: the session fee when the session is not covered by program tuition, else the course cost
 * (per credit / per hour as configured) when the course is not covered, else nothing (tuition is part of the program cost).
 */
export function courseFeeQuote(course: Data | undefined, session: Data | undefined, credits: number, international: boolean): CourseFeeQuote {
  if (session && session.tuitionIncluded === false) {
    const domestic = r2(num(session.domestic));
    const intl = r2(num(session.international));
    return { amount: international ? intl : domestic, included: false, source: "session", domestic, international: intl };
  }
  if (course && course.tuitionIncluded === false) {
    const calc = s(course.costCalculation);
    const factor = calc === "Per Credit" ? num(course.credits) || credits : calc === "Per Hour" ? num(course.totalHours) : 1;
    const domestic = r2(num(course.domestic) * factor);
    const intl = r2(num(course.international) * factor);
    return { amount: international ? intl : domestic, included: false, source: "course", domestic, international: intl };
  }
  return { amount: 0, included: true, source: "none", domestic: 0, international: 0 };
}

type LoadedSection = NonNullable<Awaited<ReturnType<typeof loadSection>>>;

function loadSection(inst: string, sectionId: string) {
  return prisma.section.findFirst({ where: { id: sectionId, institutionId: inst }, include: { course: true, term: true } });
}

async function sectionOr404(inst: string, sectionId: string) {
  const section = await loadSection(inst, sectionId);
  if (!section) throw httpError(404, "Section not found", "NOT_FOUND");
  return section;
}

async function settingsFor(inst: string, section: { id: string; courseId: string }) {
  const [ss, cs] = await Promise.all([settingsOf(inst, CM.session, [section.id]), settingsOf(inst, CM.courseSettings, [section.courseId])]);
  return { session: ss.get(section.id)?.data, course: cs.get(section.courseId)?.data };
}

async function seatCounts(db: Db, sectionId: string) {
  const [enrolled, waitlisted] = await Promise.all([
    db.enrolment.count({ where: { sectionId, status: "enrolled" } }),
    db.enrolment.count({ where: { sectionId, status: "waitlisted" } }),
  ]);
  return { enrolled, waitlisted };
}

/** What the "Post course fee" option would charge this student for the section, with the section's seat position. */
export async function quoteSectionFee(inst: string, sectionId: string, studentId?: string | null) {
  const section = await sectionOr404(inst, sectionId);
  const { session, course } = await settingsFor(inst, section);
  const st = studentId ? await requireStudent(inst, studentId) : null;
  const quote = courseFeeQuote(course, session, section.course.credits, st ? isInternational(st) : false);
  return {
    sectionId: section.id,
    label: `${section.course.code} ${section.code}`,
    termName: section.term.name,
    rateCategory: st?.rateCategory ?? null,
    ...quote,
    seats: { ...seatRule(session), ...(await seatCounts(prisma, section.id)) },
  };
}

function courseFeeType(cfg: Config) {
  return cfg.ledgerTypes.find((t) => /course\s*fee/i.test(nameOf(t))) ?? cfg.ledgerTypes.find((t) => /tuition/i.test(nameOf(t)));
}

export type EnrolOptions = {
  /** Post each section's course fee to the student's ledger in the same transaction as the enrolment. */
  postFee?: boolean;
  source: string;
  /** Leave an existing active enrolment in place instead of refusing (program enrolment). */
  skipExisting?: boolean;
  notify?: boolean;
};

export type EnrolResult = {
  enrolmentId: string;
  sectionId: string;
  studentId: string;
  courseCode: string;
  sectionCode: string;
  status: SeatStatus | "existing";
  fee: { id: string; number: number; amount: number } | null;
  feeNote: string | null;
};

type Plan = { section: LoadedSection; label: string; rule: SeatRule; fee: number; feeNote: string | null };

/**
 * Enrols a student in one or more sections under the per-student money lock. Every seat check, enrolment and optional
 * course fee is written in a single transaction (all or nothing), serialised per section so two enrolments cannot
 * both take the last seat.
 */
export async function enrolInSections(user: SessionClaims, studentId: string, sectionIds: string[], opts: EnrolOptions): Promise<EnrolResult[]> {
  const inst = user.institutionId;
  const ids = [...new Set(sectionIds.filter(Boolean))].sort();
  if (!ids.length) return [];
  const student = await prisma.student.findFirst({ where: { id: studentId, institutionId: inst } });
  if (!student) throw httpError(404, "Student not found", "NOT_FOUND");
  const info = opts.postFee ? await requireStudent(inst, student.id) : null;
  const plans: Plan[] = [];
  for (const id of ids) {
    const section = await sectionOr404(inst, id);
    const { session, course } = await settingsFor(inst, section);
    const label = `${section.course.code} ${section.code}`;
    let fee = 0;
    let feeNote: string | null = null;
    if (info) {
      const quote = courseFeeQuote(course, session, section.course.credits, isInternational(info));
      if (quote.amount >= EPS) fee = quote.amount;
      else feeNote = quote.included ? `${label} tuition is included in the program cost; no course fee was posted.` : `${label} has no course cost set; no course fee was posted.`;
    }
    plans.push({ section, label, rule: seatRule(session), fee, feeNote });
  }
  let cfg: Config | null = null;
  if (info && plans.some((p) => p.fee >= EPS)) {
    cfg = await loadConfig(inst);
    await assertPeriodOpen(user, cfg, info.campus, new Date(), "This course fee");
  }
  const type = cfg ? courseFeeType(cfg) : undefined;
  const typeName = type ? nameOf(type) : "Course Fee";

  const written = await withStudentMoneyLock(inst, student.id, () =>
    prisma.$transaction(async (tx) => {
      const out: Array<{ plan: Plan; enrolmentId: string; status: SeatStatus | "existing"; fee: EnrolResult["fee"] }> = [];
      for (const plan of plans) {
        const { section, label } = plan;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`section-seats:${section.id}`}))`;
        const existing = await tx.enrolment.findFirst({ where: { institutionId: inst, sectionId: section.id, studentId: student.id }, orderBy: { attemptNumber: "desc" } });
        if (existing && existing.status !== "withdrawn") {
          if (opts.skipExisting) {
            out.push({ plan, enrolmentId: existing.id, status: "existing", fee: null });
            continue;
          }
          throw httpError(409, existing.status === "waitlisted" ? `The student is already on the waitlist for ${label}` : `The student is already enrolled in ${label}`, "ALREADY_ENROLLED");
        }
        const status = seatDecision(plan.rule, await seatCounts(tx, section.id), label);
        const enrolment = existing
          ? await tx.enrolment.update({ where: { id: existing.id }, data: { status, rowVersion: { increment: 1 } } })
          : await tx.enrolment.create({ data: { institutionId: inst, sectionId: section.id, studentId: student.id, status } });
        let fee: EnrolResult["fee"] = null;
        if (plan.fee >= EPS && status === "enrolled") {
          const term = await ensureFinancialTerm(inst, section.term, tx);
          const { entry, number } = await postEntry(
            user,
            {
              studentId: student.id,
              kind: "charge",
              label: `${typeName} · ${label}`,
              amount: plan.fee,
              termId: term.id,
              note: `Course fee for ${section.course.code} ${section.course.title} (${section.code}), ${section.term.name}`,
              courseId: section.courseId,
              sectionId: section.id,
            },
            { ledgerTypeId: type?.id ?? "", unitAmount: plan.fee, quantity: 1, subtotal: plan.fee, taxes: [], paymentStatus: "Not Paid", courseId: section.courseId, sectionId: section.id, enrolmentId: enrolment.id, courseLabel: label },
            tx,
          );
          fee = { id: entry.id, number, amount: plan.fee };
        } else if (plan.fee >= EPS) plan.feeNote = `${label} is full, so the student was waitlisted; post the course fee when a seat is confirmed.`;
        await tx.auditEvent.create({
          data: {
            institutionId: inst,
            actorId: user.accountId,
            eventName: status === "waitlisted" ? "Enrolment.waitlisted" : "Enrolment.created",
            purpose: "admin_mutation",
            afterJson: JSON.stringify({ enrolmentId: enrolment.id, sectionId: section.id, studentId: student.id, status, feeEntryId: fee?.id ?? null }),
            source: opts.source,
            correlationId: randomUUID(),
          },
        });
        out.push({ plan, enrolmentId: enrolment.id, status, fee });
      }
      return out;
    }),
  );

  for (const w of written)
    if (w.fee) await finAudit(user, student.id, "Receivable added", `Receivable #${w.fee.number}`, { type: `${typeName} · ${w.plan.label}`, amount: cad(w.fee.amount), quantity: 1, taxes: "None", note: "Posted with the course enrolment" }, w.fee.id);
  const fresh = written.filter((w) => w.status !== "existing");
  if (opts.notify !== false && fresh.length) {
    const account = await prisma.account.findFirst({ where: { institutionId: inst, personId: student.personId } });
    if (account)
      for (const w of fresh) {
        const { section } = w.plan;
        const waitlisted = w.status === "waitlisted";
        await prisma.notification.create({
          data: {
            institutionId: inst,
            recipientAccountId: account.id,
            channel: "in_app",
            title: `${waitlisted ? "Waitlisted" : "Enrolled"} · ${section.course.code}`,
            body: waitlisted ? `You are on the waitlist for ${section.code} ${section.course.title}.` : `You are enrolled in ${section.code} ${section.course.title}.`,
            templateKey: waitlisted ? "enrolment.waitlisted" : "enrolment.created",
          },
        });
      }
  }
  return written.map((w) => ({
    enrolmentId: w.enrolmentId,
    sectionId: w.plan.section.id,
    studentId: student.id,
    courseCode: w.plan.section.course.code,
    sectionCode: w.plan.section.code,
    status: w.status,
    fee: w.fee,
    feeNote: w.status === "existing" ? null : w.plan.feeNote,
  }));
}

export async function enrolInSection(user: SessionClaims, input: EnrolOptions & { studentId: string; sectionId: string }): Promise<EnrolResult> {
  const [result] = await enrolInSections(user, input.studentId, [input.sectionId], input);
  return result!;
}

/** Seat check for paths that create enrolments inside their own transaction (retakes, instructor-created profiles). */
export async function assertSeat(db: Db, inst: string, sectionId: string, label: string): Promise<SeatStatus> {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`section-seats:${sectionId}`}))`;
  const st = (await settingsOf(inst, CM.session, [sectionId])).get(sectionId)?.data;
  return seatDecision(seatRule(st), await seatCounts(db, sectionId), label);
}

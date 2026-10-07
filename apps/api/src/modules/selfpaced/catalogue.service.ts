import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@myheritage/db";
import type { SessionClaims } from "@myheritage/contracts";
import { hashPassword } from "@myheritage/auth";
import { writeAuditAndOutbox } from "@myheritage/events";

const fail = (status: number, code: string, message: string) => Object.assign(new Error(message), { status, code });
const pathFor = (slug: string) => `selfpaced:catalogue:${slug}`;

const LearnerRegistrationBody = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

export type PublicSelfpacedProgram = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  blurb: string;
  description: string;
  hours: number;
  chapters: number;
  priceCad: number;
  internationalCad?: number;
  image: string;
  features: string[];
  status: "draft" | "review" | "published";
  curriculum?: Array<{
    id: string;
    title: string;
    description: string;
    activities: Array<{ id: string; type: "reading" | "lecture" | "quiz" | "assessment"; title: string; minutes: number; content?: string }>;
  }>;
  assignedSectionId?: string;
  updatedAt?: string;
};

// Current public HCCB catalogue. Pharmacy Assistant is deliberately free so the complete
// enrolment/learning/certificate flow can be acceptance-tested without charging a card.
const LIVE_DESCRIPTIONS: Record<string, string> = {
  "cap-101-applied-business-capstone": "CAP 101 is an applied business capstone built around a realistic Canadian workplace case. Learners define a client problem, analyse evidence, design a practical recommendation, plan implementation, and present a professional solution through guided readings, narrated video slides, practice and assessment.",
  "office-administration-diploma": "As professional offices become more complex, it becomes critical for offices to employ specialists in Office Administration. Graduates of this Office Administration program will be highly organized and well-trained in various administrative processes. This Office Administration expertise is crucial for success in today’s workplace.",
  "pharmacy-assistant": "The Pharmacy Assistant Certificate Program prepares students for a rewarding career in retail, hospital, and community pharmacies. Students gain hands-on training in prescription processing, pharmacy software, pharmacology, medical terminology, inventory management, customer service, and pharmacy operations while working under the supervision of licensed pharmacists. The program combines classroom learning with practical experience to help graduates become job-ready for the growing healthcare industry.",
  "red-seal-exam-preparation-electrician": "This course is designed to help construction electricians and apprentices prepare for the Red Seal certification exam. It provides a structured approach to mastering the knowledge, skills, and strategies required to achieve Red Seal certification, a respected credential that recognizes excellence in the electrical trade.",
  "red-seal-exam-preparation-carpentry": "This course is tailored to help carpenters and apprentices successfully prepare for the Red Seal certification exam. Through targeted training, practice exams, and expert guidance, participants will develop the knowledge and confidence needed to achieve the Red Seal endorsement—a hallmark of professional excellence in the carpentry trade.",
  "red-seal-exam-preparation-plumber": "This course is designed to help journeyperson plumbers and apprentices prepare for the Red Seal certification exam. The program provides comprehensive support through focused study materials, practice exams, and guidance to ensure participants are well-equipped to pass the exam and earn the prestigious Red Seal endorsement.",
  "red-seal-exam-preparation-chef": "This course is tailored for chefs and culinary professionals preparing to achieve their Red Seal certification. The program provides comprehensive guidance on culinary theory, practical skills, and exam strategies to ensure success in obtaining this prestigious certification, a hallmark of excellence in the culinary industry.",
  "red-seal-exam-preparation-hvac": "This comprehensive Red Seal Exam Preparation course is designed to assist experienced HVAC technicians, apprentices, and trade qualifiers in preparing for the Red Seal HVAC and Refrigeration Mechanic Certification Examination. Participants review heating, refrigeration, ventilation, electrical controls, troubleshooting, trade mathematics, safety regulations and Canadian codes.",
  "red-seal-exam-preparation-machinist": "This course is specifically designed to assist machinists and apprentices in preparing for the Red Seal certification exam. It combines theoretical knowledge, practical skills, and exam-focused strategies to help participants confidently achieve their Red Seal endorsement, a symbol of excellence in the machining trade.",
};

export const DEFAULT_PROGRAMS: PublicSelfpacedProgram[] = [
  ["cap-101", "cap-101-applied-business-capstone", "CAP 101 – Applied Business Capstone Project", "Business", "Intermediate", 120, 12, 100, undefined, "/brand/campus/learn.png"],
  ["office-admin", "office-administration-diploma", "Office Administration Diploma", "Business", "Intermediate", 361, 11, 9500, 11750, "https://hccbconline.com/api/files/public/8cfa958b-9646-4810-bf05-5866eafdeebe"],
  ["pharmacy-assistant", "pharmacy-assistant", "Pharmacy Assistant", "Pharmacy Assistant", "Beginner", 135.5, 9, 0, undefined, "https://hccbconline.com/api/files/public/136289e2-3c80-490a-a41c-53978b062a20"],
  ["red-seal-electrician", "red-seal-exam-preparation-electrician", "Red Seal Exam Preparation Electrician (Construction)", "Red Seal Exam Preparation", "Advanced", 350, 5, 3990, undefined, "https://hccbconline.com/api/files/public/6d0bcc8e-a785-4ed7-9e4d-9b2858ed6abc"],
  ["red-seal-carpentry", "red-seal-exam-preparation-carpentry", "Red Seal Exam Preparation Carpentry", "Red Seal Exam Preparation", "Advanced", 350, 5, 3990, undefined, "https://hccbconline.com/api/files/public/4f177812-0398-4b9c-8104-96165dd95f14"],
  ["red-seal-plumber", "red-seal-exam-preparation-plumber", "Red Seal Exam Preparation Plumber", "Red Seal Trades Exam Preparation", "Advanced", 350, 5, 3999, undefined, "https://hccbconline.com/api/files/public/cfd178a3-3b54-464e-80c6-c2483f883a41"],
  ["red-seal-chef", "red-seal-exam-preparation-chef", "Red Seal Exam Preparation Chef", "Red Seal Exam Trades Preparation", "Advanced", 350, 15, 3990, undefined, "https://hccbconline.com/api/files/public/881ca2e7-8e41-4c38-89d1-406c0a90f5b8"],
  ["red-seal-hvac", "red-seal-exam-preparation-hvac", "Red Seal Exam HVAC Technician", "Red Seal Exam Preparation", "Advanced", 350, 5, 3990, undefined, "https://hccbconline.com/api/files/public/e124a768-3986-4e6f-99d5-046b312cdb61"],
  ["red-seal-machinist", "red-seal-exam-preparation-machinist", "Red Seal Exam Preparation Machinist", "Red Seal Trades Exam Preparation", "Advanced", 200, 1, 3999, undefined, "https://hccbconline.com/api/files/public/5b0e5401-43a0-4658-8576-2d942a00d0e4"],
].map(([id, slug, title, subject, level, hours, chapters, priceCad, internationalCad, image]) => {
  const copy = LIVE_DESCRIPTIONS[String(slug)] || `${title} provides structured, self-paced preparation with instructor-designed lessons, practice activities, assessments and a verifiable Heritage certificate.`;
  return {
    id: String(id), slug: String(slug), title: String(title), subject: String(subject), level: level as PublicSelfpacedProgram["level"],
    blurb: copy, description: copy, hours: Number(hours), chapters: Number(chapters), priceCad: Number(priceCad),
    internationalCad: internationalCad === undefined ? undefined : Number(internationalCad), image: String(image),
    features: [`${chapters} chapters`, "Video lectures and slides", "Knowledge checks and assessments", "Verifiable certificate on completion"],
    status: "published" as const,
  };
});

const ProgramBody = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).optional(),
  subject: z.string().trim().min(2).max(120),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  description: z.string().trim().min(20).max(5000),
  hours: z.number().positive().max(5000),
  priceCad: z.number().min(0).max(1_000_000),
  internationalCad: z.number().min(0).max(1_000_000).optional(),
  image: z.string().url().max(2000),
  chapterTitles: z.array(z.string().trim().min(2).max(180)).min(1).max(100),
  assignedSectionId: z.string().uuid().optional(),
});

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

function curriculum(slug: string, titles: string[]) {
  return titles.map((title, index) => {
    const chapter = `${slug}-${String(index + 1).padStart(2, "0")}`;
    return {
      id: chapter,
      title,
      description: `Build practical competency in ${title}.`,
      activities: [
        { id: `${chapter}-read-1`, type: "reading" as const, title: `${title}: concepts and examples`, minutes: 35, content: `Instructor-approved learning material for ${title}.` },
        { id: `${chapter}-lecture`, type: "lecture" as const, title: `${title}: video lecture and slides`, minutes: 30, content: `Narrated lesson, transcript and accessible slide deck for ${title}.` },
        { id: `${chapter}-quiz`, type: "quiz" as const, title: `${title}: knowledge check`, minutes: 15 },
        { id: `${chapter}-assessment`, type: "assessment" as const, title: `${title}: chapter assessment`, minutes: 30 },
      ],
    };
  });
}

function parseRow(row: { payloadJson: string; updatedAt: Date }) {
  try {
    return { ...(JSON.parse(row.payloadJson) as PublicSelfpacedProgram), updatedAt: row.updatedAt.toISOString() };
  } catch {
    return null;
  }
}

export async function publicInstitutionId() {
  const institution = await prisma.institution.findFirst({
    where: process.env.PUBLIC_INSTITUTION_ID ? { institutionId: process.env.PUBLIC_INSTITUTION_ID } : {},
    orderBy: { createdAt: "asc" },
    select: { institutionId: true },
  });
  if (!institution) throw fail(503, "UNAVAILABLE", "Self-paced catalogue is not available right now.");
  return institution.institutionId;
}

/** Creates a self-paced learner login without starting the separate campus admission workflow. */
export async function registerSelfpacedLearner(input: unknown) {
  const body = LearnerRegistrationBody.parse(input);
  const institutionId = await publicInstitutionId();
  const email = body.email.toLowerCase();
  const existing = await prisma.account.findFirst({ where: { institutionId, email }, select: { id: true } });
  if (existing) throw fail(409, "ACCOUNT_EXISTS", "An account already exists for this email. Sign in instead.");

  // Do not attach a public signup to a pre-existing SIS identity; staff can resolve that account safely.
  const existingPerson = await prisma.person.findFirst({ where: { institutionId, email }, select: { id: true } });
  if (existingPerson) throw fail(409, "ACCOUNT_EXISTS", "This email already belongs to a Heritage profile. Sign in or reset your password.");

  const words = body.name.split(/\s+/).filter(Boolean);
  const givenName = words.shift()!;
  const familyName = words.join(" ") || "Learner";
  const passwordHash = await hashPassword(body.password);
  const studentNumber = `SP-${new Date().getFullYear()}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  try {
    return await prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: { institutionId, givenName, familyName, email, personalEmail: email },
      });
      const account = await tx.account.create({
        data: { institutionId, personId: person.id, email, passwordHash, status: "active", rolesJson: JSON.stringify(["student"]) },
      });
      await tx.student.create({
        data: { institutionId, personId: person.id, studentNumber, programName: "Self-paced eLearning", standing: "good" },
      });
      await writeAuditAndOutbox(tx, {
        institutionId,
        actorId: account.id,
        eventName: "SelfpacedLearner.registered",
        purpose: "selfpaced_registration",
        before: null,
        after: { accountId: account.id, personId: person.id, studentNumber },
        source: "selfpaced.register",
        correlationId: randomUUID(),
        outboxPayload: { accountId: account.id, studentNumber },
      });
      return { created: true as const, email, studentNumber };
    });
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      throw fail(409, "ACCOUNT_EXISTS", "An account already exists for this email. Sign in instead.");
    }
    throw err;
  }
}

export async function listSelfpacedPrograms(institutionId: string, includeDrafts = false) {
  let rows = await prisma.sisScreenState.findMany({ where: { institutionId, path: { startsWith: "selfpaced:catalogue:" } }, orderBy: { updatedAt: "desc" } });
  // One-time migration: make the verified launch catalogue real admin-managed records.
  // After this seed, the public catalogue has no hard-coded fallback: publish/unpublish is
  // controlled only by the records maintained in the Heritage admin workspace.
  if (rows.length === 0) {
    await prisma.$transaction(
      DEFAULT_PROGRAMS.map((item) => prisma.sisScreenState.upsert({
        where: { institutionId_path: { institutionId, path: pathFor(item.slug) } },
        create: { institutionId, path: pathFor(item.slug), payloadJson: JSON.stringify(item) },
        update: {},
      })),
    );
    rows = await prisma.sisScreenState.findMany({ where: { institutionId, path: { startsWith: "selfpaced:catalogue:" } }, orderBy: { updatedAt: "desc" } });
  }
  // Versioned launch addition: add CAP 101 once to existing installations. Its row remains
  // admin-managed afterwards, so draft/review status is respected and never overwritten.
  const cap101 = DEFAULT_PROGRAMS.find((item) => item.slug === "cap-101-applied-business-capstone")!;
  if (!rows.some((row) => row.path === pathFor(cap101.slug))) {
    await prisma.sisScreenState.upsert({
      where: { institutionId_path: { institutionId, path: pathFor(cap101.slug) } },
      create: { institutionId, path: pathFor(cap101.slug), payloadJson: JSON.stringify(cap101) },
      update: {},
    });
    rows = await prisma.sisScreenState.findMany({ where: { institutionId, path: { startsWith: "selfpaced:catalogue:" } }, orderBy: { updatedAt: "desc" } });
  }
  const saved: PublicSelfpacedProgram[] = rows.flatMap((row) => {
    const item = parseRow(row);
    return item ? [item] : [];
  });
  return saved.filter((item) => includeDrafts || item.status === "published");
}

export async function saveSelfpacedProgram(user: SessionClaims, input: unknown, existingSlug?: string) {
  const body = ProgramBody.parse(input);
  const slug = existingSlug || body.slug || slugify(body.title);
  if (!slug) throw fail(400, "VALIDATION_ERROR", "A valid program title and slug are required.");
  const previous = await prisma.sisScreenState.findUnique({ where: { institutionId_path: { institutionId: user.institutionId, path: pathFor(slug) } } });
  const previousValue = previous ? parseRow(previous) : DEFAULT_PROGRAMS.find((item) => item.slug === slug) || null;
  const item: PublicSelfpacedProgram = {
    id: previousValue?.id || randomUUID(), slug, title: body.title, subject: body.subject, level: body.level,
    blurb: body.description.slice(0, 300), description: body.description, hours: body.hours, chapters: body.chapterTitles.length,
    priceCad: body.priceCad, internationalCad: body.internationalCad, image: body.image,
    features: [`${body.chapterTitles.length} chapters`, "Video lectures and slides", "Knowledge checks and assessments", "Verifiable certificate on completion"],
    status: previousValue?.status === "published" ? "review" : "draft", curriculum: curriculum(slug, body.chapterTitles),
    assignedSectionId: body.assignedSectionId,
  };
  const row = await prisma.$transaction(async (tx) => {
    const saved = await tx.sisScreenState.upsert({
      where: { institutionId_path: { institutionId: user.institutionId, path: pathFor(slug) } },
      create: { institutionId: user.institutionId, path: pathFor(slug), payloadJson: JSON.stringify(item) },
      update: { payloadJson: JSON.stringify(item), rowVersion: { increment: 1 } },
    });
    await writeAuditAndOutbox(tx, {
      institutionId: user.institutionId, actorId: user.accountId, eventName: previous ? "SelfpacedProgram.updated" : "SelfpacedProgram.created",
      purpose: "selfpaced_catalogue", before: previousValue, after: item, source: "selfpaced.catalogue", correlationId: randomUUID(),
      outboxPayload: { slug, status: item.status },
    });
    return saved;
  });
  return { ...item, updatedAt: row.updatedAt.toISOString() };
}

export async function setSelfpacedProgramStatus(user: SessionClaims, slug: string, status: "draft" | "review" | "published") {
  const programs = await listSelfpacedPrograms(user.institutionId, true);
  const current = programs.find((item) => item.slug === slug);
  if (!current) throw fail(404, "NOT_FOUND", "Program not found.");
  const isMigratedLaunchProgram = DEFAULT_PROGRAMS.some((item) => item.slug === current.slug);
  if (status === "published" && ((!current.curriculum?.length && !isMigratedLaunchProgram) || !current.image || current.priceCad < 0)) {
    throw fail(409, "PROGRAM_INCOMPLETE", "Add an image, tuition and at least one curriculum chapter before publishing.");
  }
  const next = { ...current, status };
  const saved = await prisma.sisScreenState.upsert({
    where: { institutionId_path: { institutionId: user.institutionId, path: pathFor(slug) } },
    create: { institutionId: user.institutionId, path: pathFor(slug), payloadJson: JSON.stringify(next) },
    update: { payloadJson: JSON.stringify(next), rowVersion: { increment: 1 } },
  });
  return { ...next, updatedAt: saved.updatedAt.toISOString() };
}

export async function enrolFreeProgram(user: SessionClaims, slug: string) {
  const programs = await listSelfpacedPrograms(user.institutionId);
  const program = programs.find((item) => item.slug === slug);
  if (!program) throw fail(404, "NOT_FOUND", "Published program not found.");
  if (program.priceCad !== 0) throw fail(402, "PAYMENT_REQUIRED", "Payment verification is required for this program.");
  const path = `selfpaced:enrolment:${user.accountId}:${slug}`;
  const enrolledAt = new Date().toISOString();
  const row = await prisma.sisScreenState.upsert({
    where: { institutionId_path: { institutionId: user.institutionId, path } },
    create: { institutionId: user.institutionId, path, payloadJson: JSON.stringify({ slug, enrolledAt, method: "free" }) },
    update: {},
  });
  return JSON.parse(row.payloadJson) as { slug: string; enrolledAt: string; method: string };
}

export async function enrolPaidProgram(user: SessionClaims, input: unknown) {
  const body = z.object({ slug: z.string().min(1).max(120), sessionId: z.string().startsWith("cs_").max(255), accountId: z.string().uuid(), timestamp: z.number().int(), proof: z.string().regex(/^[a-f0-9]{64}$/) }).parse(input);
  if (body.accountId !== user.accountId) throw fail(403, "PAYMENT_OWNER_MISMATCH", "This payment confirmation belongs to another account.");
  if (Math.abs(Date.now() - body.timestamp) > 5 * 60_000) throw fail(409, "PAYMENT_PROOF_EXPIRED", "Payment confirmation expired. Verify the checkout again.");
  const secret = process.env.STRIPE_SECRET_KEY || "";
  if (!secret) throw fail(503, "PAYMENT_UNAVAILABLE", "Payment confirmation is not configured.");
  const message = `${body.accountId}.${body.slug}.${body.sessionId}.${body.timestamp}`;
  const expected = createHmac("sha256", secret).update(message).digest("hex");
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(body.proof))) throw fail(403, "INVALID_PAYMENT_PROOF", "Payment confirmation is invalid.");
  const programs = await listSelfpacedPrograms(user.institutionId);
  const program = programs.find((item) => item.slug === body.slug);
  if (!program) throw fail(404, "NOT_FOUND", "Published program not found.");
  if (program.priceCad <= 0) throw fail(409, "FREE_PROGRAM", "Use free enrolment for this program.");
  const path = `selfpaced:enrolment:${user.accountId}:${body.slug}`;
  const enrolledAt = new Date().toISOString();
  const row = await prisma.sisScreenState.upsert({
    where: { institutionId_path: { institutionId: user.institutionId, path } },
    create: { institutionId: user.institutionId, path, payloadJson: JSON.stringify({ slug: body.slug, enrolledAt, method: "stripe", paymentReference: body.sessionId }) },
    update: {},
  });
  return JSON.parse(row.payloadJson) as { slug: string; enrolledAt: string; method: string; paymentReference: string };
}

export async function listMySelfpacedEnrolments(user: SessionClaims) {
  const rows = await prisma.sisScreenState.findMany({ where: { institutionId: user.institutionId, path: { startsWith: `selfpaced:enrolment:${user.accountId}:` } }, orderBy: { createdAt: "desc" } });
  return rows.flatMap((row) => { try { return [JSON.parse(row.payloadJson)]; } catch { return []; } });
}

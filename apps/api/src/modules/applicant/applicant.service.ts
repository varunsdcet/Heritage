import { prisma } from "@myheritage/db";
import type { SessionClaims } from "@myheritage/contracts";
import type { PortalRow, PortalView } from "../portal/portal.service.js";

function requireApplicant(user: SessionClaims) {
  if (!user.roles.includes("applicant")) {
    throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN", status: 403 });
  }
}

async function applicationFor(user: SessionClaims) {
  return prisma.admissionsApplication.findFirst({
    where: { institutionId: user.institutionId, accountId: user.accountId },
    include: {
      documents: { orderBy: { label: "asc" } },
      offers: { orderBy: { createdAt: "desc" } },
      timeline: { orderBy: { occurredAt: "desc" } },
    },
  });
}

async function addTimeline(applicationId: string, institutionId: string, title: string, detail?: string) {
  await prisma.applicationTimelineEvent.create({
    data: { institutionId, applicationId, title, detail },
  });
}

export async function buildApplicantView(user: SessionClaims, path: string): Promise<PortalView> {
  requireApplicant(user);
  const app = await applicationFor(user);
  const normalized = path.replace(/\/$/, "") || path;
  const base: PortalView = {
    path: normalized,
    title: "Applicant",
    subtitle: app ? `${app.programName} · ${app.intakeTerm}` : "Admissions portal",
    role: "applicant",
    active: "Home",
    breadcrumb: ["Applicant", "Home"],
    metrics: [
      { label: "Status", value: app?.status ?? "—" },
      { label: "Progress", value: app ? `${app.progressPct}%` : "—" },
      { label: "Documents", value: String(app?.documents.length ?? 0) },
    ],
    sections: [],
    actions: [
      { label: "Ask Heritage", href: "/applicant/ask", variant: "ai" },
      { label: "Search", href: "/applicant/search", variant: "secondary" },
      { label: "All screens", href: "/applicant/all", variant: "secondary" },
    ],
    live: true,
  };

  if (!app) {
    base.sections = [{ title: "Application", rows: [{ primary: "No application yet", secondary: "Contact admissions" }] }];
    return base;
  }

  if (normalized === "/applicant" || normalized.endsWith("/applicant")) {
    base.title = "Applicant home";
    base.active = "Home";
    base.sections = [
      {
        title: "Next steps",
        rows: [
          {
            primary: app.programName,
            secondary: `Intake ${app.intakeTerm} · ${app.status.replace(/_/g, " ")}`,
            meta: `${app.progressPct}%`,
            href: "/applicant/application",
          },
          {
            primary: "Documents",
            secondary: `${app.documents.filter((d) => d.status === "uploaded" || d.status === "accepted").length}/${app.documents.length} ready`,
            meta: "Open",
            href: "/applicant/documents",
          },
          {
            primary: "Offers",
            secondary: app.offers[0] ? `${app.offers[0].title} · ${app.offers[0].status}` : "No offer yet",
            meta: app.offers[0]?.status ?? "—",
            href: "/applicant/offers",
          },
        ],
      },
      {
        title: "Recent timeline",
        rows: app.timeline.slice(0, 5).map((e) => ({
          primary: e.title,
          secondary: e.detail ?? undefined,
          meta: new Date(e.occurredAt).toLocaleDateString(),
          href: "/applicant/timeline",
        })),
      },
    ];
    base.actions = [
      ...(app.status === "draft"
        ? [{ label: "Submit application", action: "submit_application", variant: "primary" as const }]
        : []),
      { label: "Continue application", href: "/applicant/application" },
      { label: "Ask Heritage", href: "/applicant/ask", variant: "ai" },
      { label: "All screens", href: "/applicant/all", variant: "secondary" },
    ];
    return base;
  }

  if (normalized.includes("/application") || normalized.includes("/ap-02") || normalized.includes("/ap-06") || normalized.includes("/ap-03") || normalized.includes("/ap-11")) {
    base.title = "Application";
    base.active = "Application";
    base.breadcrumb = ["Applicant", "Application"];
    const reqRows: PortalRow[] = [
      { primary: "Program", secondary: app.programName, meta: app.intakeTerm },
      { primary: "Status", secondary: app.status.replace(/_/g, " "), meta: `${app.progressPct}% complete` },
      { primary: "Personal details", secondary: "Profile captured", meta: "Done" },
      { primary: "Academic history", secondary: "Transcript checklist", meta: app.progressPct >= 40 ? "Done" : "Todo" },
      { primary: "Requirements", secondary: "Program prerequisites", meta: app.progressPct >= 60 ? "Done" : "In progress", href: "/applicant/f/ap-03-requirements" },
    ];
    base.sections = [{ title: "Wizard steps", rows: reqRows }];
    base.actions = [
      ...(app.status === "draft"
        ? [
            { label: "Save progress", action: "save_progress", variant: "secondary" as const },
            { label: "Submit application", action: "submit_application", variant: "primary" as const },
          ]
        : [{ label: "View status", href: "/applicant/f/ap-06-application-status" }]),
      { label: "Upload documents", href: "/applicant/documents", variant: "secondary" },
      { label: "Ask Heritage", href: "/applicant/ask", variant: "ai" },
    ];
    return base;
  }

  if (normalized.includes("/documents") || normalized.includes("/ap-04")) {
    base.title = "Documents";
    base.active = "Documents";
    base.breadcrumb = ["Applicant", "Documents"];
    base.metrics = [
      { label: "Required", value: String(app.documents.length) },
      { label: "Uploaded", value: String(app.documents.filter((d) => d.status !== "missing").length) },
      { label: "Accepted", value: String(app.documents.filter((d) => d.status === "accepted").length) },
    ];
    base.sections = [
      {
        title: "Document packet",
        rows: app.documents.map((d) => ({
          primary: d.label,
          secondary: d.fileName ?? "Not uploaded",
          meta: d.status.replace(/_/g, " "),
        })),
      },
    ];
    const missing = app.documents.find((d) => d.status === "missing");
    base.actions = [
      ...(missing
        ? [{ label: `Upload ${missing.label}`, action: "upload_document", payload: { documentId: missing.id }, variant: "primary" as const }]
        : [{ label: "All documents uploaded", href: "/applicant/application", variant: "secondary" as const }]),
      { label: "Ask Heritage", href: "/applicant/ask", variant: "ai" },
    ];
    return base;
  }

  if (normalized.includes("/offers") || normalized.includes("/ap-07") || normalized.includes("/ap-08") || normalized.includes("/ap-09") || normalized.includes("/ap-10")) {
    base.title = "Offers";
    base.active = "Offers";
    base.breadcrumb = ["Applicant", "Offers"];
    base.sections = [
      {
        title: "Offer package",
        rows: app.offers.length
          ? app.offers.map((o) => ({
              primary: o.title,
              secondary: o.conditions ?? "Standard conditions",
              meta: `${o.status}${o.expiresOn ? ` · expires ${o.expiresOn}` : ""}`,
            }))
          : [{ primary: "No offer yet", secondary: "Admissions will notify you when a decision is ready" }],
      },
    ];
    const pending = app.offers.find((o) => o.status === "pending");
    base.actions = [
      ...(pending
        ? [
            { label: "Accept offer", action: "accept_offer", payload: { offerId: pending.id }, variant: "primary" as const },
            { label: "Decline offer", action: "decline_offer", payload: { offerId: pending.id }, variant: "secondary" as const },
          ]
        : []),
      { label: "Contract", href: "/applicant/f/ap-08-contract", variant: "secondary" },
      { label: "Payment", href: "/applicant/f/ap-10-payment", variant: "secondary" },
      { label: "Ask Heritage", href: "/applicant/ask", variant: "ai" },
    ];
    return base;
  }

  if (normalized.includes("/timeline")) {
    base.title = "Timeline";
    base.active = "Home";
    base.breadcrumb = ["Applicant", "Timeline"];
    base.sections = [
      {
        title: "Application timeline",
        rows: app.timeline.map((e) => ({
          primary: e.title,
          secondary: e.detail ?? undefined,
          meta: new Date(e.occurredAt).toLocaleString(),
        })),
      },
    ];
    base.actions = [
      { label: "Application", href: "/applicant/application" },
      { label: "Ask Heritage", href: "/applicant/ask", variant: "ai" },
    ];
    return base;
  }

  if (normalized.includes("/messages")) {
    base.title = "Messages";
    base.active = "Messages";
    base.breadcrumb = ["Applicant", "Messages"];
    const threads = await prisma.messageThread.findMany({
      where: {
        institutionId: user.institutionId,
        participantAccountIdsJson: { contains: user.accountId },
      },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    base.sections = [
      {
        title: "Admissions messages",
        rows: threads.length
          ? threads.map((t) => ({
              primary: t.subject,
              secondary: t.messages[0]?.body ?? "No messages yet",
              meta: t.messages[0] ? new Date(t.messages[0].createdAt).toLocaleString() : "",
            }))
          : [{ primary: "Welcome from Admissions", secondary: "Ask Heritage or reply after interview scheduling.", meta: "Info" }],
      },
    ];
    base.actions = [
      { label: "Ask Heritage", href: "/applicant/ask", variant: "ai" },
      { label: "Timeline", href: "/applicant/timeline", variant: "secondary" },
    ];
    return base;
  }

  if (normalized.includes("/interview") || normalized.includes("/ap-05")) {
    base.title = "Interview";
    base.active = "Application";
    base.breadcrumb = ["Applicant", "Interview"];
    base.sections = [
      {
        title: "Interview workspace",
        rows: [
          {
            primary: app.status === "interview" || app.status === "offered" ? "Interview scheduled" : "Interview not yet scheduled",
            secondary: "Admissions will confirm time after document review",
            meta: app.status.replace(/_/g, " "),
          },
        ],
      },
    ];
    base.actions = [
      ...(app.status === "under_review" || app.status === "submitted"
        ? [{ label: "Mark ready for interview", action: "ready_interview", variant: "primary" as const }]
        : []),
      { label: "Ask Heritage", href: "/applicant/ask", variant: "ai" },
    ];
    return base;
  }

  // Figma/other applicant screens — domain summary
  base.title = titleFromPath(normalized);
  base.breadcrumb = ["Applicant", base.title];
  base.sections = [
    {
      title: `${base.title} · live`,
      rows: [
        {
          primary: app.programName,
          secondary: `${app.status.replace(/_/g, " ")} · ${app.progressPct}%`,
          meta: app.intakeTerm,
          href: "/applicant",
        },
      ],
    },
  ];
  base.actions = [
    { label: "Home", href: "/applicant" },
    { label: "Ask Heritage", href: "/applicant/ask", variant: "ai" },
    { label: "All screens", href: "/applicant/all", variant: "secondary" },
  ];
  return base;
}

function titleFromPath(path: string): string {
  const leaf = path.split("/").filter(Boolean).pop() ?? "Home";
  return leaf.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function runApplicantAction(
  user: SessionClaims,
  action: string,
  payload?: Record<string, unknown>,
) {
  requireApplicant(user);
  const app = await applicationFor(user);
  if (!app) throw Object.assign(new Error("Application not found"), { status: 404, code: "NOT_FOUND" });

  if (action === "save_progress") {
    const next = Math.min(90, app.progressPct + 15);
    await prisma.admissionsApplication.update({
      where: { id: app.id },
      data: { progressPct: next },
    });
    await addTimeline(app.id, user.institutionId, "Progress saved", `Application now ${next}% complete`);
    return { ok: true, progressPct: next };
  }

  if (action === "submit_application") {
    await prisma.admissionsApplication.update({
      where: { id: app.id },
      data: { status: "submitted", progressPct: Math.max(app.progressPct, 80), submittedAt: new Date() },
    });
    await addTimeline(app.id, user.institutionId, "Application submitted", "Packet sent to admissions review");
    await prisma.notification.create({
      data: {
        institutionId: user.institutionId,
        recipientAccountId: user.accountId,
        channel: "in_app",
        title: "Application submitted",
        body: `Your ${app.programName} application is under review.`,
        templateKey: "admissions.submitted",
      },
    });
    return { ok: true, status: "submitted" };
  }

  if (action === "upload_document") {
    const documentId = String(payload?.documentId ?? "");
    let doc = app.documents.find((d) => d.id === documentId) ?? app.documents.find((d) => d.status === "missing");
    if (!doc) {
      // Idempotent re-runs: mark oldest uploaded as re-uploaded confirmation
      doc = app.documents[0];
      if (!doc) throw Object.assign(new Error("No document to upload"), { status: 400, code: "BAD_REQUEST" });
      return { ok: true, documentId: doc.id, status: doc.status, message: "All documents already uploaded" };
    }
    await prisma.applicationDocument.update({
      where: { id: doc.id },
      data: { status: "uploaded", fileName: `${doc.label.replace(/\s+/g, "_").toLowerCase()}.pdf` },
    });
    await addTimeline(app.id, user.institutionId, "Document uploaded", doc.label);
    const remaining = await prisma.applicationDocument.count({
      where: { applicationId: app.id, status: "missing" },
    });
    if (remaining === 0 && app.progressPct < 70) {
      await prisma.admissionsApplication.update({
        where: { id: app.id },
        data: { progressPct: 70, status: app.status === "draft" ? "draft" : app.status },
      });
    }
    return { ok: true, documentId: doc.id, status: "uploaded" };
  }

  if (action === "ready_interview") {
    await prisma.admissionsApplication.update({
      where: { id: app.id },
      data: { status: "interview", progressPct: Math.max(app.progressPct, 85) },
    });
    await addTimeline(app.id, user.institutionId, "Interview readiness confirmed", "Applicant marked ready for interview");
    return { ok: true, status: "interview" };
  }

  if (action === "accept_offer" || action === "decline_offer") {
    const offerId = String(payload?.offerId ?? app.offers[0]?.id ?? "");
    const offer = app.offers.find((o) => o.id === offerId);
    if (!offer) throw Object.assign(new Error("Offer not found"), { status: 404, code: "NOT_FOUND" });
    const status = action === "accept_offer" ? "accepted" : "declined";
    await prisma.applicationOffer.update({ where: { id: offer.id }, data: { status } });
    await prisma.admissionsApplication.update({
      where: { id: app.id },
      data: { status, progressPct: status === "accepted" ? 100 : app.progressPct },
    });
    await addTimeline(
      app.id,
      user.institutionId,
      status === "accepted" ? "Offer accepted" : "Offer declined",
      offer.title,
    );
    return { ok: true, offerId: offer.id, status };
  }

  throw Object.assign(new Error(`Unknown action: ${action}`), { status: 400, code: "BAD_REQUEST" });
}

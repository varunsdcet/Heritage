"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminSisShell } from "@/components/AdminSisShell";
import {
  LabDashView,
  LabIncidentView,
  LabNotebookView,
  LabRoomsView,
  LabSafetyView,
  LabSessionView,
  LabVirtualView,
} from "@/components/AdminLabsViews";
import {
  ComplianceDashView,
  CpAccreditationView,
  CpCompletenessView,
  CpDisposalView,
  CpEvidenceView,
  CpHoldsView,
  CpInspectionView,
  CpPrivacyView,
  CpRetentionView,
} from "@/components/AdminComplianceViews";
import { AiDashView } from "@/components/AdminAiHubViews";
import { ADMIN_SIS_SCREENS, type SisBadgeTone, type SisScreenConfig } from "@/lib/adminSisCatalog";
import { loadSession } from "@/lib/api";
import { SisLiveProvider, mergeSisLive, useSisLive } from "@/lib/useAdminSisLive";
import { SisActionBtn } from "@/components/SisActionBtn";

function badgeClass(tone?: SisBadgeTone) {
  return `mh-sis-badge mh-sis-badge--${tone || "active"}`;
}

const PLATFORM_NAV = [
  { label: "Users & Roles", href: "/admin/f/pl-01-users-and-roles" },
  { label: "Permission Matrix", href: "/admin/f/pl-02-permission-matrix" },
  { label: "Security Policy", href: "/admin/f/pl-03-security-policy" },
  { label: "Session & Login Audit", href: "/admin/f/pl-04-session-login-audit" },
  { label: "Integrations", href: "/admin/f/pl-05-integrations" },
  { label: "System Operations", href: "/admin/f/pl-06-operations" },
  { label: "Institution Settings", href: "/admin/f/pl-07-institution-settings" },
  { label: "Notification Templates", href: "/admin/f/pl-08-notification-templates" },
];

const LABS_NAV = [
  { label: "Lab Dashboard", href: "/admin/f/lb-01-lab-dashboard" },
  { label: "Rooms", href: "/admin/f/lb-02-lab-rooms" },
  { label: "Equipment", href: "/admin/f/lb-03-lab-equipment-list" },
  { label: "Inventory", href: "/admin/f/lb-05-inventory" },
  { label: "Safety Rules", href: "/admin/f/lb-06-safety-rules" },
  { label: "Eligibility", href: "/admin/f/lb-07-student-eligibility" },
  { label: "Lab Session", href: "/admin/f/lb-08-lab-session" },
  { label: "Notebook", href: "/admin/f/lb-09-lab-notebook" },
  { label: "Incidents", href: "/admin/f/lb-10-incident" },
  { label: "Virtual Labs", href: "/admin/f/lb-11-virtual-labs" },
  { label: "Environments", href: "/admin/f/lb-12-computer-environments" },
  { label: "Booking Calendar", href: "/admin/f/xx-1-lab-booking-calendar" },
  { label: "Usage Analytics", href: "/admin/f/xx-2-lab-usage-analytics" },
  { label: "Simulation Templates", href: "/admin/f/xx-3-simulation-templates" },
  { label: "Lab Compliance", href: "/admin/f/xx-4-lab-compliance" },
];

const COMPLIANCE_NAV = [
  { label: "Dashboard", href: "/admin/f/cp-01-compliance-dashboard" },
  { label: "Completeness", href: "/admin/f/cp-02-record-completeness" },
  { label: "Record Vault", href: "/admin/f/cp-03-record-vault" },
  { label: "Retention", href: "/admin/f/cp-04-retention-policies" },
  { label: "Legal Holds", href: "/admin/f/cp-05-legal-holds" },
  { label: "Evidence Mapping", href: "/admin/f/cp-06-evidence-mapping" },
  { label: "Accreditation", href: "/admin/f/cp-07-accreditation-assistant" },
  { label: "Inspection Pack", href: "/admin/f/cp-08-inspection-pack" },
  { label: "Disposal Review", href: "/admin/f/cp-09-disposal-review" },
  { label: "Privacy Requests", href: "/admin/f/cp-10-privacy-requests" },
  { label: "Disposal Queue", href: "/admin/f/xx-9-disposal-review-queue" },
];

const AI_NAV = [
  { label: "AI Dashboard", href: "/admin/f/ai-01-ai-dashboard" },
  { label: "Models", href: "/admin/f/ai-02-model-registry" },
  { label: "Prompts", href: "/admin/f/ai-03-prompt-registry" },
  { label: "Tools", href: "/admin/f/ai-04-tool-registry" },
  { label: "Knowledge", href: "/admin/f/ai-05-knowledge-sources" },
  { label: "Ingestion", href: "/admin/f/ai-06-ingestion-jobs" },
  { label: "Retrieval", href: "/admin/f/ai-07-retrieval-inspector" },
  { label: "Evaluation", href: "/admin/f/ai-08-evaluation-dashboard" },
  { label: "Citations", href: "/admin/f/ai-09-citation-failures" },
  { label: "Usage & Cost", href: "/admin/f/ai-10-usage-cost" },
  { label: "AI Policy", href: "/admin/f/ai-11-ai-policy" },
  { label: "Tool Audit", href: "/admin/f/ai-12-tool-call-audit" },
];

const ACADEMICS_NAV = [
  { label: "Programs", href: "/admin/f/ac-03-programs" },
  { label: "Academic Terms", href: "/admin/f/ac-01-academic-terms" },
  { label: "Calendar", href: "/admin/f/ac-02-academic-calendar" },
  { label: "Program Detail", href: "/admin/f/ac-04-program-detail" },
  { label: "Change Requests", href: "/admin/f/ac-05-program-change-request" },
  { label: "Course Catalogue", href: "/admin/f/ac-06-course-catalogue" },
  { label: "Course Setup", href: "/admin/f/ac-07-course-setup" },
  { label: "Categories", href: "/admin/f/ac-08-course-categories" },
  { label: "Sections", href: "/admin/f/ac-09-sections" },
  { label: "Master Scheduling", href: "/admin/f/ac-10-master-scheduling" },
  { label: "Pending Schedules", href: "/admin/f/ac-11-pending-schedules" },
  { label: "Grading Schemes", href: "/admin/f/ac-12-grading-schemes" },
  { label: "Pending Grades", href: "/admin/f/ac-13-pending-grades" },
  { label: "Faculty", href: "/admin/f/ac-14-faculty" },
  { label: "Evaluations", href: "/admin/f/ac-15-course-evaluations" },
  { label: "Resources", href: "/admin/f/ac-16-course-resources" },
  { label: "Requirements", href: "/admin/f/ac-17-student-requirements" },
  { label: "LOA Requests", href: "/admin/f/ac-18-loa-requests" },
  { label: "Withdrawals", href: "/admin/f/ac-19-withdraw-requests" },
  { label: "Create Student", href: "/admin/f/ac-20-create-student" },
];

const ADMISSIONS_NAV = [
  { label: "Dashboard", href: "/admin/f/ad-01-admissions-dashboard" },
  { label: "Application Queue", href: "/admin/f/ad-02-application-queue" },
  { label: "Application Detail", href: "/admin/f/ad-03-application-detail" },
  { label: "Requirement Review", href: "/admin/f/ad-04-requirement-review" },
  { label: "Document Review", href: "/admin/f/ad-05-document-review" },
  { label: "Interviews", href: "/admin/f/ad-06-interview-workspace" },
  { label: "Decision", href: "/admin/f/ad-07-decision-workspace" },
  { label: "Offer Builder", href: "/admin/f/ad-08-offer-builder" },
  { label: "LOA Builder", href: "/admin/f/ad-09-loa-builder" },
  { label: "Conversion", href: "/admin/f/ad-10-conversion" },
  { label: "Intake Capacity", href: "/admin/f/ad-11-intake-capacity" },
];

const PRACTICUM_NAV = [
  { label: "Dashboard", href: "/admin/f/pr-01-practicum-dashboard" },
  { label: "Employers", href: "/admin/f/pr-02-employers-registry" },
  { label: "Sites", href: "/admin/f/pr-03-sites" },
  { label: "Opportunities", href: "/admin/f/pr-04-opportunities" },
  { label: "Placements", href: "/admin/f/pr-05-placements-workspace" },
  { label: "Agreements", href: "/admin/f/pr-06-agreements" },
  { label: "Logs", href: "/admin/f/pr-07-logs" },
  { label: "Evaluations", href: "/admin/f/pr-08-evaluations" },
  { label: "Incidents", href: "/admin/f/pr-09-incidents" },
  { label: "Employer Portal", href: "/admin/f/pr-10-employer-portal" },
  { label: "Preceptors", href: "/admin/f/xx-5-preceptor-management" },
  { label: "Competency", href: "/admin/f/xx-6-competency-tracking" },
  { label: "Clinical Compliance", href: "/admin/f/xx-7-clinical-compliance" },
  { label: "Practicum Reports", href: "/admin/f/xx-8-practicum-reports" },
];

const REGISTRAR_NAV = [
  { label: "Dashboard", href: "/admin/f/rg-00-registrar-dashboard" },
  { label: "Student 360", href: "/admin/f/rg-01-student-360" },
  { label: "Academic History", href: "/admin/f/rg-02-academic-history" },
  { label: "Status History", href: "/admin/f/rg-03-status-history" },
  { label: "Transfer Credits", href: "/admin/f/rg-04-transfer-credits" },
  { label: "Academic Standing", href: "/admin/f/rg-05-academic-standing" },
  { label: "Completion Audit", href: "/admin/f/rg-06-completion-audit" },
  { label: "Transcript", href: "/admin/f/rg-07-transcript" },
  { label: "Corrections", href: "/admin/f/rg-08-registrar-correction" },
  { label: "Official Export", href: "/admin/f/rg-09-official-export" },
];

const CRM_NAV = [
  { label: "Dashboard", href: "/admin/f/crm-01-dashboard" },
  { label: "Leads", href: "/admin/f/crm-02-leads" },
  { label: "Lead 360", href: "/admin/f/crm-03-lead-360" },
  { label: "Campaigns", href: "/admin/f/crm-04-campaigns" },
  { label: "Campaign Detail", href: "/admin/f/crm-05-campaign-detail" },
  { label: "Events", href: "/admin/f/crm-06-events" },
  { label: "Counsellor Queue", href: "/admin/f/crm-07-counsellor-queue" },
  { label: "Funnel Analytics", href: "/admin/f/crm-08-funnel-analytics" },
];

const FINANCE_NAV = [
  { label: "Dashboard", href: "/admin/f/fn-01-finance-dashboard" },
  { label: "Student Account", href: "/admin/f/fn-02-student-account" },
  { label: "Charges", href: "/admin/f/fn-03-charges" },
  { label: "Payments", href: "/admin/f/fn-04-payments" },
  { label: "Reconciliation", href: "/admin/f/fn-05-reconciliation" },
  { label: "Refund Queue", href: "/admin/f/fn-06-refund-queue" },
  { label: "Holds", href: "/admin/f/fn-07-holds" },
  { label: "Export", href: "/admin/f/fn-08-finance-export" },
];

const SUCCESS_NAV = [
  { label: "Dashboard", href: "/admin/f/ss-01-success-dashboard" },
  { label: "Alert Queue", href: "/admin/f/ss-02-alert-queue" },
  { label: "Student 360", href: "/admin/f/ss-03-student-success-360" },
  { label: "Case", href: "/admin/f/ss-04-case" },
  { label: "Action Plan", href: "/admin/f/ss-05-action-plan" },
  { label: "Appointments", href: "/admin/f/ss-06-appointments" },
  { label: "Analytics", href: "/admin/f/ss-07-intervention-analytics" },
];

const WORKFLOW_NAV = [
  { label: "Workflows", href: "/admin/f/wf-01-workflow-list" },
  { label: "Designer", href: "/admin/f/wf-02-workflow-designer" },
  { label: "Test Runner", href: "/admin/f/wf-03-workflow-test" },
  { label: "Runs", href: "/admin/f/wf-04-workflow-runs" },
];

const FORMS_NAV = [
  { label: "Form List", href: "/admin/f/fm-01-form-list" },
  { label: "Designer", href: "/admin/f/fm-02-form-designer" },
  { label: "Versions", href: "/admin/f/fm-03-form-version" },
  { label: "Submissions", href: "/admin/f/fm-04-form-submissions" },
];

const RULES_NAV = [
  { label: "Rule Sets", href: "/admin/f/rl-01-rule-sets" },
  { label: "Designer", href: "/admin/f/rl-02-rule-designer" },
  { label: "Simulator", href: "/admin/f/rl-03-rule-simulator" },
];

const ActionBtn = SisActionBtn;

function SisLiveStatusBar() {
  const live = useSisLive();
  if (!live.loading && !live.error && !live.toast && !live.source) return null;
  return (
    <div
      className="mh-sis-live-bar"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        marginBottom: 12,
        fontSize: 12,
        color: "var(--mh-text-muted, #64748b)",
      }}
      aria-live="polite"
    >
      {live.loading ? <span>Loading live data…</span> : null}
      {!live.loading && live.source ? (
        <span>Live · {live.source === "domain" ? "domain API" : "SIS store"}</span>
      ) : null}
      {live.error ? <span style={{ color: "#b91c1c" }}>{live.error}</span> : null}
      {live.toast ? <span style={{ color: "#0f766e" }}>{live.toast}</span> : null}
    </div>
  );
}

function PlatformSubnav({ activePath }: { activePath: string }) {
  const router = useRouter();
  return (
    <aside className="mh-sis-platform-nav" aria-label="Platform Admin">
      <div className="mh-sis-platform-nav__label">Platform Admin</div>
      {PLATFORM_NAV.map((item) => (
        <button
          key={item.href}
          type="button"
          className={`mh-sis-platform-nav__item${activePath === item.href ? " is-active" : ""}`}
          onClick={() => router.push(item.href)}
        >
          {item.label}
        </button>
      ))}
    </aside>
  );
}

function LabsSubnav({ activePath }: { activePath: string }) {
  const router = useRouter();
  return (
    <aside className="mh-sis-platform-nav" aria-label="Labs">
      <div className="mh-sis-platform-nav__label">Labs</div>
      {LABS_NAV.map((item) => (
        <button
          key={item.href}
          type="button"
          className={`mh-sis-platform-nav__item${activePath === item.href ? " is-active" : ""}`}
          onClick={() => router.push(item.href)}
        >
          {item.label}
        </button>
      ))}
    </aside>
  );
}

function ComplianceSubnav({ activePath }: { activePath: string }) {
  const router = useRouter();
  return (
    <aside className="mh-sis-platform-nav" aria-label="Compliance">
      <div className="mh-sis-platform-nav__label">Compliance</div>
      {COMPLIANCE_NAV.map((item) => (
        <button
          key={item.href}
          type="button"
          className={`mh-sis-platform-nav__item${activePath === item.href ? " is-active" : ""}`}
          onClick={() => router.push(item.href)}
        >
          {item.label}
        </button>
      ))}
    </aside>
  );
}

function AiHubSubnav({ activePath }: { activePath: string }) {
  const router = useRouter();
  return (
    <aside className="mh-sis-platform-nav" aria-label="AI Hub">
      <div className="mh-sis-platform-nav__label">AI Hub</div>
      {AI_NAV.map((item) => (
        <button
          key={item.href}
          type="button"
          className={`mh-sis-platform-nav__item${activePath === item.href ? " is-active" : ""}`}
          onClick={() => router.push(item.href)}
        >
          {item.label}
        </button>
      ))}
    </aside>
  );
}

function AcademicsSubnav({ activePath }: { activePath: string }) {
  const router = useRouter();
  return (
    <aside className="mh-sis-platform-nav" aria-label="Academics">
      <div className="mh-sis-platform-nav__label">Academics</div>
      {ACADEMICS_NAV.map((item) => (
        <button
          key={item.href}
          type="button"
          className={`mh-sis-platform-nav__item${activePath === item.href ? " is-active" : ""}`}
          onClick={() => router.push(item.href)}
        >
          {item.label}
        </button>
      ))}
    </aside>
  );
}

function ModuleSubnav({
  label,
  items,
  activePath,
}: {
  label: string;
  items: Array<{ label: string; href: string }>;
  activePath: string;
}) {
  const router = useRouter();
  return (
    <aside className="mh-sis-platform-nav" aria-label={label}>
      <div className="mh-sis-platform-nav__label">{label}</div>
      {items.map((item) => (
        <button
          key={item.href}
          type="button"
          className={`mh-sis-platform-nav__item${activePath === item.href ? " is-active" : ""}`}
          onClick={() => router.push(item.href)}
        >
          {item.label}
        </button>
      ))}
    </aside>
  );
}

function QueueView({ config }: { config: SisScreenConfig }) {
  const router = useRouter();
  const live = useSisLive();
  const [q, setQ] = useState("");
  const rows = (config.rows || []).filter((row) => {
    if (!q.trim()) return true;
    const hay = `${row.primary || ""} ${row.secondary || ""} ${row.cells.join(" ")}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      {config.infoBanner ? (
        <div className="mh-sis-info-banner">
          <div>
            <strong>{config.infoBanner.title}</strong>
            <span>{config.infoBanner.body}</span>
          </div>
          <ActionBtn label={config.infoBanner.cta} className="mh-sis-info-banner__cta" />
        </div>
      ) : (
        <div className="mh-sis-dash__welcome">
          <div className="mh-sis-dash__welcome-text">
            <h1>{config.title}</h1>
            <p>{config.subtitle}</p>
          </div>
          <div className="mh-sis-dash__banner-actions">
            {(config.secondaryActions || (config.secondaryAction ? [config.secondaryAction] : [])).map((label) => (
              <ActionBtn
                key={label}
                label={label}
                tone="secondary"
                href={
                  config.secondaryActionHrefs?.[label] ??
                  (label === config.secondaryAction ? config.secondaryActionHref : undefined)
                }
              />
            ))}
            {config.primaryAction ? (
              <ActionBtn label={config.primaryAction} href={config.primaryActionHref} />
            ) : null}
          </div>
        </div>
      )}

      {config.kpis?.length ? (
        <div className="mh-sis-dash__kpis">
          {config.kpis.map((k) =>
            k.href ? (
              <button
                key={k.label}
                type="button"
                className="mh-sis-dash__kpi mh-sis-dash__kpi--link"
                onClick={() => router.push(k.href!)}
              >
                <div className="mh-sis-dash__kpi-label">{k.label}</div>
                <div className="mh-sis-dash__kpi-value">{k.value}</div>
                <div
                  className={`mh-sis-dash__kpi-hint${k.tone === "up" ? " is-up" : ""}${
                    k.tone === "danger" ? " is-danger" : ""
                  }`}
                >
                  {k.hint}
                </div>
              </button>
            ) : (
              <article key={k.label} className="mh-sis-dash__kpi">
                <div className="mh-sis-dash__kpi-label">{k.label}</div>
                <div className="mh-sis-dash__kpi-value">{k.value}</div>
                <div
                  className={`mh-sis-dash__kpi-hint${k.tone === "up" ? " is-up" : ""}${
                    k.tone === "danger" ? " is-danger" : ""
                  }`}
                >
                  {k.hint}
                </div>
              </article>
            ),
          )}
        </div>
      ) : null}

      {!config.infoBanner ? (
        <>
          <div className="mh-sis-filters">
            <div className="mh-sis-filters__search">
              <img src="/brand/icons/search.svg" alt="" width={14} height={14} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={config.searchPlaceholder || "Search…"}
                aria-label="Search"
              />
            </div>
            {(config.filters || []).map((f) => (
              <button key={f} type="button" className="mh-sis-filters__pill">
                {f} ▾
              </button>
            ))}
            <button type="button" className="mh-sis-filters__reset" onClick={() => setQ("")}>
              Clear all
            </button>
          </div>

          <div className="mh-sis-queue-meta">
            <span>{config.countLabel || `${rows.length} records found`}</span>
            <span>
              Sort by: <strong>Submission Date</strong> ▾
            </span>
          </div>
        </>
      ) : (
        <h2 className="mh-sis-section-title">{config.title}</h2>
      )}

      <div className="mh-sis-table mh-sis-table--card">
        <div className="mh-sis-table__head" style={{ gridTemplateColumns: config.columnTemplate }}>
          {(config.columns || []).map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        {rows.map((row, idx) => (
          <button
            key={(row.primary || row.cells[0]) + idx}
            type="button"
            className="mh-sis-table__row"
            style={{ gridTemplateColumns: config.columnTemplate }}
            onClick={() => {
              if (row.href) {
                router.push(row.href);
                return;
              }
              void live.runAction("Open", row.primary || row.cells[0]);
            }}
          >
            <span className="mh-sis-table__stack">
              {config.rowActions === "refund" ? <span className="mh-sis-plan-task__check" /> : null}
              <span className="mh-sis-table__primary">{row.primary || row.cells[0]}</span>
              {row.secondary ? <span className="mh-sis-table__secondary">{row.secondary}</span> : null}
            </span>
            {row.cells.slice(1).map((cell, i) => {
              const colName = (config.columns || [])[i + 1] || "";
              const isStage = /stage|severity|status|health|condition/i.test(colName);
              if (isStage && row.badge) {
                return (
                  <span key={i}>
                    <span className={badgeClass(row.badgeTone)}>{row.badge}</span>
                  </span>
                );
              }
              const isAmount = /amount/i.test(colName) && config.rowActions === "refund";
              const isSla = String(cell).toLowerCase() === "passed";
              return (
                <span key={i} className={isSla || isAmount ? "is-danger" : undefined}>
                  {cell}
                </span>
              );
            })}
            {config.rowActions === "refund" ? (
              <span className="mh-sis-refund-actions">
                <ActionBtn
                  label="Reject"
                  tone="secondary"
                  rowKey={row.primary || row.cells[0]}
                  className="mh-sis-btn-return"
                />
                <ActionBtn
                  label="Approve Refund"
                  rowKey={row.primary || row.cells[0]}
                  className="mh-sis-btn-accept"
                />
              </span>
            ) : config.hideRowAction ? null : row.href ? (
              <span className="mh-sis-table__link">
                {config.actionLabel || (config.path.includes("/ss-02") ? "Take Action" : "Review")}
              </span>
            ) : (
              <ActionBtn
                label={config.actionLabel || (config.path.includes("/ss-02") ? "Take Action" : "Review")}
                rowKey={row.primary || row.cells[0]}
                className="mh-sis-table__link"
                tone="secondary"
              />
            )}
          </button>
        ))}
      </div>

      {!config.infoBanner && config.rowActions !== "refund" ? (
        <div className="mh-sis-pager">
          <span>
            Show <strong>10</strong> per page ▾
          </span>
          <div className="mh-sis-pager__controls">
            <span>Showing 1–10 of 247 results</span>
            <button type="button" className="mh-sis-pager__btn">
              ‹
            </button>
            <button type="button" className="mh-sis-pager__btn is-active">
              1
            </button>
            <button type="button" className="mh-sis-pager__btn">
              2
            </button>
            <button type="button" className="mh-sis-pager__btn">
              3
            </button>
            <button type="button" className="mh-sis-pager__btn">
              ›
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailView({ config }: { config: SisScreenConfig }) {
  const d = config.detail!;
  const [tab, setTab] = useState(d.tabs[0] || "Summary");
  const secondaryLabels =
    config.secondaryActions || (config.secondaryAction ? [config.secondaryAction] : []);

  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-profile">
        <div className="mh-sis-profile__top">
          <div>
            <h1>{d.name}</h1>
            <p>{d.meta}</p>
          </div>
          <div className="mh-sis-dash__banner-actions">
            {secondaryLabels.map((label) => (
              <ActionBtn
                key={label}
                label={label}
                tone="secondary"
                href={
                  config.secondaryActionHrefs?.[label] ??
                  (label === config.secondaryAction ? config.secondaryActionHref : undefined)
                }
              />
            ))}
            {config.primaryAction ? (
              <ActionBtn label={config.primaryAction} href={config.primaryActionHref} />
            ) : null}
          </div>
        </div>

        <div className="mh-sis-stepper">
          {d.steps.map((step, i) => (
            <div key={step.label} className={`mh-sis-stepper__item is-${step.state}`}>
              <div className="mh-sis-stepper__node">{step.state === "done" ? "✓" : i + 1}</div>
              <div className="mh-sis-stepper__label">{step.label}</div>
              {i < d.steps.length - 1 ? <div className="mh-sis-stepper__line" /> : null}
            </div>
          ))}
        </div>

        <div className="mh-sis-tabs">
          {d.tabs.map((t) => (
            <button key={t} type="button" className={`mh-sis-tabs__item${tab === t ? " is-active" : ""}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mh-sis-detail-grid">
        <div className="mh-sis-stack">
          <section className="mh-sis-dash__card">
            <h2>Application Summary</h2>
            <div className="mh-sis-fields">
              {d.fields.map((f) => (
                <label key={f.label} className="mh-sis-field">
                  <span>{f.label}</span>
                  <div>{f.value}</div>
                </label>
              ))}
            </div>
            <div className="mh-sis-consent">Applicant confirmed all academic disclosures are truthful and accurate.</div>
          </section>

          <section className="mh-sis-dash__card">
            <h2>Requirements Checklist</h2>
            <div className="mh-sis-check">
              {d.checklist.map((item) => (
                <div key={item.label} className="mh-sis-check__row">
                  <span>{item.label}</span>
                  <span className={badgeClass(item.tone)}>{item.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mh-sis-stack">
          {d.aiBlurb ? (
            <section className="mh-sis-dash__card mh-sis-ai">
              <h2>AI Candidate Evaluation</h2>
              <p>{d.aiBlurb}</p>
              <div className="mh-sis-ai__foot">
                <span>Based on 4 documents</span>
                <span>Advisory only</span>
              </div>
            </section>
          ) : null}
          {d.reviewer ? (
            <section className="mh-sis-dash__card">
              <h2>Assigned Reviewer</h2>
              <div className="mh-sis-reviewer">
                <span className="mh-sis-reviewer__avatar">
                  {d.reviewer.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")}
                </span>
                <div>
                  <strong>{d.reviewer.name}</strong>
                  <div>{d.reviewer.role}</div>
                </div>
              </div>
              <button type="button" className="mh-sis-filters__reset" style={{ marginTop: 12, padding: 0 }}>
                Reassign Reviewer
              </button>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DashboardView({ config }: { config: SisScreenConfig }) {
  const router = useRouter();
  const registrarDash = config.registrarDash;
  const hasSuccessPanels = Boolean(config.riskFeed?.length || config.caseload?.length);
  const hideExport =
    Boolean(registrarDash) ||
    hasSuccessPanels ||
    Boolean(config.financeDash) ||
    Boolean(config.crmDash) ||
    Boolean(config.evalRuns);
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          {config.secondaryAction ? (
            <ActionBtn
              label={config.secondaryAction}
              tone="secondary"
              href={config.secondaryActionHref}
            />
          ) : hideExport ? null : (
            <ActionBtn label="Export" tone="secondary" />
          )}
          {config.primaryAction ? (
            <ActionBtn label={config.primaryAction} href={config.primaryActionHref} />
          ) : null}
        </div>
      </div>
      {config.searchPlaceholder && registrarDash ? (
        <section className="mh-sis-dash__card mh-sis-rg-search">
          <div className="mh-sis-rg-search__row">
            <div className="mh-sis-filters__search mh-sis-rg-search__input">
              <img src="/brand/icons/search.svg" alt="" width={14} height={14} />
              <input placeholder={config.searchPlaceholder} aria-label="Quick student search" />
            </div>
            <ActionBtn label={(registrarDash.searchEnterLabel || "Enter") || "Save"} />
          </div>
        </section>
      ) : config.searchPlaceholder ? (
        <div className="mh-sis-filters" style={{ marginBottom: 20 }}>
          <div className="mh-sis-filters__search" style={{ flex: 1, maxWidth: 480 }}>
            <img src="/brand/icons/search.svg" alt="" width={14} height={14} />
            <input placeholder={config.searchPlaceholder} aria-label="Quick search" />
          </div>
        </div>
      ) : null}
      <div className="mh-sis-dash__kpis">
        {(config.kpis || []).map((k) =>
          k.href ? (
            <button
              key={k.label}
              type="button"
              className="mh-sis-dash__kpi mh-sis-dash__kpi--link"
              onClick={() => router.push(k.href!)}
            >
              <div className="mh-sis-dash__kpi-label">{k.label}</div>
              <div className="mh-sis-dash__kpi-value">{k.value}</div>
              <div className={`mh-sis-dash__kpi-hint${k.tone === "up" ? " is-up" : ""}${k.tone === "danger" ? " is-danger" : ""}`}>
                {k.hint}
              </div>
            </button>
          ) : (
            <article key={k.label} className="mh-sis-dash__kpi">
              <div className="mh-sis-dash__kpi-label">{k.label}</div>
              <div className="mh-sis-dash__kpi-value">{k.value}</div>
              <div className={`mh-sis-dash__kpi-hint${k.tone === "up" ? " is-up" : ""}${k.tone === "danger" ? " is-danger" : ""}`}>
                {k.hint}
              </div>
            </article>
          ),
        )}
      </div>
      {registrarDash ? (
        <div className="mh-sis-dash__split mh-sis-dash__split--registrar">
          <section className="mh-sis-dash__card">
            <h2>{registrarDash.auditsTitle}</h2>
            <div className="mh-sis-rg-activity">
              {registrarDash.audits.map((row) => (
                <div key={row.text} className="mh-sis-rg-activity__row">
                  <p>{row.text}</p>
                  <span>{row.when}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="mh-sis-dash__card">
            <h2>{registrarDash.clearanceTitle}</h2>
            <div className="mh-sis-rg-clearance">
              {registrarDash.clearance.map((row) => (
                <div key={row.name} className="mh-sis-rg-clearance__row">
                  <div>
                    <strong>{row.name}</strong>
                    <span>{row.detail}</span>
                  </div>
                  <span className={badgeClass(row.badgeTone)}>{row.badge}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : hasSuccessPanels ? (
        <div className="mh-sis-dash__split mh-sis-dash__split--success">
          <section className="mh-sis-dash__card">
            <h2>{config.riskFeedTitle || "High Priority Student Risk List"}</h2>
            <div className="mh-sis-risk">
              {(config.riskFeed || []).map((row) => (
                <div key={row.name} className="mh-sis-risk__row">
                  <div className="mh-sis-risk__person">
                    <span className="mh-sis-reviewer__avatar mh-sis-reviewer__avatar--sm">
                      {row.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")}
                    </span>
                    <div>
                      <strong>{row.name}</strong>
                      <span>{row.detail}</span>
                    </div>
                  </div>
                  <span className={badgeClass(row.badgeTone)}>{row.badge}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="mh-sis-dash__card mh-sis-dash__caseload">
            <h2>{config.caseloadTitle || "Caseload by Counselor"}</h2>
            <div className="mh-sis-caseload">
              {(config.caseload || []).map((c) => (
                <div key={c.name} className="mh-sis-caseload__row">
                  <div className="mh-sis-caseload__meta">
                    <strong>{c.name}</strong>
                    <span>{c.cases}</span>
                  </div>
                  <div className="mh-sis-caseload__track">
                    <div className="mh-sis-caseload__fill" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : config.crmDash ? (
        <div className="mh-sis-dash__split mh-sis-crm-split">
          <section className="mh-sis-dash__card">
            <h2>Lead Pipeline Funnel</h2>
            <div className="mh-sis-funnel">
              {config.crmDash.funnel.map((row) => (
                <div key={row.label} className="mh-sis-funnel__row">
                  <div className="mh-sis-funnel__labels">
                    <strong>{row.label}</strong>
                    <span>{row.value}</span>
                  </div>
                  <div className="mh-sis-funnel__track">
                    <div className="mh-sis-funnel__fill" style={{ width: `${row.pct}%`, background: row.color }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="mh-sis-dash__card mh-sis-crm-recent">
            <h2>Recent Leads & Actions</h2>
            <div className="mh-sis-risk">
              {config.crmDash.recent.map((row) => (
                <div key={row.name} className="mh-sis-risk__row">
                  <div>
                    <strong>{row.name}</strong>
                    <span className="mh-sis-table__secondary">{row.detail}</span>
                  </div>
                  <span className={badgeClass(row.badgeTone)}>{row.badge}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : config.financeDash ? (
        <>
          <div className="mh-sis-detail-grid">
            <section className="mh-sis-dash__card">
              <h2>Monthly Revenue Trend</h2>
              <div className="mh-sis-chart mh-sis-chart--finance">
                {config.financeDash.months.map((m) => (
                  <div key={m.label} className="mh-sis-chart__col">
                    <div className={`mh-sis-chart__bar${m.active ? " is-active" : ""}`} style={{ height: m.height }} />
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="mh-sis-dash__card">
              <h2>Payment Method Distribution</h2>
              <div className="mh-sis-outcomes">
                {config.financeDash.methods.map((m) => (
                  <div key={m.label} className="mh-sis-method-row">
                    <div className="mh-sis-outcomes__row">
                      <span className="mh-sis-outcomes__dot" style={{ background: m.color }} />
                      <strong>{m.label}</strong>
                    </div>
                    <span>{m.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="mh-sis-detail-grid" style={{ marginTop: 24 }}>
            <section className="mh-sis-dash__card">
              <h2>Recent Transactions</h2>
              <div className="mh-sis-risk">
                {config.financeDash.transactions.map((t) => (
                  <div key={t.name + t.amount} className="mh-sis-risk__row">
                    <div>
                      <strong>{t.name}</strong>
                      <span className="mh-sis-table__secondary">{t.detail}</span>
                    </div>
                    <strong className="mh-sis-money">{t.amount}</strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="mh-sis-dash__card">
              <h2>Overdue Accounts Alerts</h2>
              <div className="mh-sis-overdue">
                {config.financeDash.overdue.map((o) => (
                  <div key={o.name} className="mh-sis-overdue__row">
                    <strong>{o.name}</strong>
                    <span>{o.detail}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : config.evalRuns ? (
        <section className="mh-sis-dash__card">
          <h2>Recent Evaluation Runs</h2>
          <div className="mh-sis-table">
            <div
              className="mh-sis-table__head"
              style={{ gridTemplateColumns: "110px 150px minmax(140px,1.1fr) minmax(140px,1.1fr) minmax(180px,1.4fr)" }}
            >
              <span>Run ID</span>
              <span>Date</span>
              <span>Model Under Test</span>
              <span>Dataset</span>
              <span>Evaluation Metric Scores</span>
            </div>
            {config.evalRuns.map((r) => (
              <div
                key={r.id}
                className="mh-sis-table__row mh-sis-grades__row"
                style={{ gridTemplateColumns: "110px 150px minmax(140px,1.1fr) minmax(140px,1.1fr) minmax(180px,1.4fr)" }}
              >
                <span className="mh-sis-table__primary">{r.id}</span>
                <span style={{ fontSize: 13 }}>{r.date}</span>
                <span style={{ fontSize: 13 }}>{r.model}</span>
                <span style={{ fontSize: 13 }}>{r.dataset}</span>
                <span style={{ fontSize: 13 }}>{r.scores}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="mh-sis-dash__card">
          <h2>Operational feed</h2>
          <p style={{ margin: 0, color: "#5C5F5A", fontSize: 13 }}>
            Live portal metrics for {config.title}. Open related queues from the sidebar to continue workflow.
          </p>
        </section>
      )}
    </div>
  );
}

function BuilderView({ config }: { config: SisScreenConfig }) {
  const b = config.builder;
  const palette = b?.palette || ["Section", "Field", "Rule", "Approval", "AI action"];
  const inspector = b?.inspector || [
    { label: "Name", value: config.title },
    { label: "Owner", value: "admin" },
  ];
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          {(config.secondaryActions || (config.secondaryAction ? [config.secondaryAction] : ["Save"])).map((label) => (
            <ActionBtn
              key={label}
              label={label}
              tone="secondary"
              href={
                config.secondaryActionHrefs?.[label] ??
                (label === config.secondaryAction ? config.secondaryActionHref : undefined)
              }
            />
          ))}
          <ActionBtn label={config.primaryAction || "Publish"} href={config.primaryActionHref} />
        </div>
      </div>
      <div className="mh-sis-builder">
        <aside className="mh-sis-dash__card">
          <h2>{b?.paletteTitle || "Palette"}</h2>
          {palette.map((item) => (
            <div key={item} className="mh-sis-builder__chip">
              {item}
            </div>
          ))}
        </aside>
        <main className="mh-sis-dash__card mh-sis-builder__canvas">
          <h2>{b?.canvasTitle || `${config.title} canvas`}</h2>
          {b?.canvasFields?.length ? (
            <div className="mh-sis-fields" style={{ gridTemplateColumns: "1fr", marginTop: 12 }}>
              {b.canvasFields.map((f) => (
                <label key={f.label} className="mh-sis-field">
                  <span>{f.label}</span>
                  <div>{f.value}</div>
                </label>
              ))}
            </div>
          ) : (
            <>
              <p>Figma {config.figmaId} · compose blocks, then publish with audit trail.</p>
              {["Start trigger", "Validation", "Human approval", "Write to SIS"].map((step, i) => (
                <div key={step} className="mh-sis-builder__step">
                  <span>
                    {i + 1}. {step}
                  </span>
                  <span className={badgeClass(i === 2 ? "review" : "active")}>{i === 2 ? "Required" : "Ready"}</span>
                </div>
              ))}
            </>
          )}
        </main>
        <aside className="mh-sis-dash__card">
          <h2>{b?.inspectorTitle || "Inspector"}</h2>
          {inspector.map((f) => (
            <label key={f.label} className="mh-sis-field">
              <span>{f.label}</span>
              <div>{f.value}</div>
            </label>
          ))}
        </aside>
      </div>
    </div>
  );
}

function WorkspaceView({ config }: { config: SisScreenConfig }) {
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <ActionBtn
            label={config.secondaryAction || "Escalate"}
            tone="secondary"
            href={config.secondaryActionHref}
          />
          <ActionBtn label={config.primaryAction || "Save"} href={config.primaryActionHref} />
        </div>
      </div>
      <div className="mh-sis-detail-grid">
        <section className="mh-sis-dash__card">
          <h2>Work queue</h2>
          {(config.rows || queueFallback(config.title)).slice(0, 5).map((row, i) => (
            <div key={i} className="mh-sis-check__row">
              <div>
                <div className="mh-sis-table__primary">{row.primary || row.cells[0]}</div>
                <div className="mh-sis-table__secondary">{row.secondary || row.cells[1]}</div>
              </div>
              {row.badge ? <span className={badgeClass(row.badgeTone)}>{row.badge}</span> : null}
            </div>
          ))}
        </section>
        <section className="mh-sis-dash__card">
          <h2>Active workspace</h2>
          <p style={{ margin: 0, color: "#5C5F5A", fontSize: 13 }}>
            {config.title} panel · Figma node {config.figmaId}. Capture notes, attach evidence, and commit consequential actions with audit motive.
          </p>
          <label className="mh-sis-field" style={{ marginTop: 16 }}>
            <span>Internal note</span>
            <div style={{ minHeight: 72 }}>Add reviewer notes…</div>
          </label>
        </section>
      </div>
    </div>
  );
}

function GradesView({ config }: { config: SisScreenConfig }) {
  const router = useRouter();
  const grades = config.grades || [];
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <ActionBtn
            label={config.secondaryAction || "Fall 2025 Term"}
            tone="secondary"
            href={config.secondaryActionHref}
          />
          <ActionBtn
            label={config.primaryAction || "Accept All Outstanding"}
            href={config.primaryActionHref}
          />
        </div>
      </div>

      <div className="mh-sis-table mh-sis-table--card">
        <div
          className="mh-sis-table__head"
          style={{
            gridTemplateColumns: "minmax(180px,1.3fr) minmax(140px,1fr) 120px 110px minmax(140px,1fr) 120px minmax(180px,1fr)",
          }}
        >
          <span>Course / Section</span>
          <span>Instructor</span>
          <span>Submitted Date</span>
          <span>Enrolled Students</span>
          <span>Grade Distribution</span>
          <span>Review Status</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>
        {grades.map((g) => (
          <div
            key={g.code}
            className="mh-sis-table__row mh-sis-grades__row"
            style={{
              gridTemplateColumns: "minmax(180px,1.3fr) minmax(140px,1fr) 120px 110px minmax(140px,1fr) 120px minmax(180px,1fr)",
            }}
          >
            <span className="mh-sis-table__stack">
              <span className="mh-sis-table__primary">{g.code}</span>
              <span className="mh-sis-table__secondary">{g.title}</span>
            </span>
            <span>{g.instructor}</span>
            <span style={{ color: "#5C5F5A", fontSize: 13 }}>{g.submitted}</span>
            <span>{g.enrolled}</span>
            <span className="mh-sis-dist">
              <span className="mh-sis-dist__label">{g.distribution}</span>
              <span className="mh-sis-dist__bar">
                <span style={{ width: `${g.bars[0]}%`, background: "#1B7A3D" }} />
                <span style={{ width: `${g.bars[1]}%`, background: "#849F38" }} />
                <span style={{ width: `${g.bars[2]}%`, background: "#D97706" }} />
                <span style={{ width: `${g.bars[3] || 0}%`, background: "#BA1A1A" }} />
              </span>
            </span>
            <span>
              <span className="mh-sis-badge mh-sis-badge--review">{g.status}</span>
            </span>
            <span className="mh-sis-grades__actions">
              <button
                type="button"
                className="mh-sis-btn-return"
                onClick={() => router.push("/admin/f/ac-14-faculty")}
              >
                Return
              </button>
              <button
                type="button"
                className="mh-sis-btn-accept"
                onClick={() => router.push(config.primaryActionHref || "/admin/f/ac-12-grading-schemes")}
              >
                Accept
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WizardView({ config }: { config: SisScreenConfig }) {
  const router = useRouter();
  const w = config.wizard!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          {config.secondaryAction ? (
            <ActionBtn label={config.secondaryAction} tone="secondary" href={config.secondaryActionHref} />
          ) : null}
          {config.primaryAction ? (
            <ActionBtn label={config.primaryAction} href={config.primaryActionHref} />
          ) : null}
        </div>
      </div>

      <div className="mh-sis-stepper mh-sis-stepper--wizard">
        {w.steps.map((step, i) => (
          <div key={step.label} className={`mh-sis-stepper__item is-${step.state}`}>
            <div className="mh-sis-stepper__node">{step.state === "done" ? "✓" : i + 1}</div>
            <div className="mh-sis-stepper__label">{step.label}</div>
            {i < w.steps.length - 1 ? <div className="mh-sis-stepper__line" /> : null}
          </div>
        ))}
      </div>

      <div className="mh-sis-detail-grid">
        <section className="mh-sis-dash__card">
          <h2>Potential Duplicate Match Check</h2>
          <p style={{ margin: "0 0 16px", color: "#5C5F5A", fontSize: 13 }}>
            Registrar Match Logic identified potential matches based on SSN, name, and birthdate.
          </p>
          <div className="mh-sis-warn">
            <strong>2 High Probability Matches Found</strong>
            <span>If the record being created matches one of the profiles below, please merge/resolve instead of creating a duplicate.</span>
          </div>
          <div className="mh-sis-matches">
            {w.matches.map((m) => (
              <div key={m.name} className="mh-sis-match">
                <span className="mh-sis-reviewer__avatar">
                  {m.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")}
                </span>
                <div className="mh-sis-match__body">
                  <strong>{m.name}</strong>
                  <span>{m.reason}</span>
                </div>
                <ActionBtn label="View Profile" tone="secondary" href="/admin/f/rg-01-student-360" />
              </div>
            ))}
          </div>
          <div className="mh-sis-wizard-actions">
            <ActionBtn
              label="Back to Step 2"
              tone="secondary"
              href={config.secondaryActionHref || "/admin/f/ac-17-student-requirements"}
            />
            <button
              type="button"
              className="mh-sis-btn-merge"
              onClick={() => router.push("/admin/f/rg-01-student-360")}
            >
              Merge with Existing
            </button>
            <ActionBtn
              label="Ignore matches, continue to Step 4"
              href={config.primaryActionHref || "/admin/f/rg-01-student-360"}
            />
          </div>
        </section>

        <section className="mh-sis-dash__card">
          <h2>Record Summary</h2>
          <div className="mh-sis-summary">
            {w.summary.map((s) => (
              <div key={s.label}>
                <span>{s.label}</span>
                <strong>{s.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Profile360View({ config }: { config: SisScreenConfig }) {
  const p = config.profile360!;
  const [tab, setTab] = useState(p.tabs[0] || "Overview");
  const courseLayout = Boolean(p.courses?.rows.length);
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <section className="mh-sis-dash__card mh-sis-profile360">
        <span className="mh-sis-reviewer__avatar mh-sis-reviewer__avatar--lg">
          {p.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </span>
        <div className="mh-sis-profile360__main">
          <div className="mh-sis-profile360__title-row">
            <h1>{p.name}</h1>
            {p.badge ? <span className="mh-sis-badge mh-sis-badge--active">{p.badge}</span> : null}
          </div>
          <p>{p.meta}</p>
        </div>
        {p.actions?.length ? (
          <div className="mh-sis-dash__banner-actions mh-sis-profile360__actions">
            {p.actions.map((label) => (
              <ActionBtn key={label} label={label} tone="secondary" />
            ))}
          </div>
        ) : null}
      </section>
      {p.stats?.length ? (
        <div className="mh-sis-dash__kpis mh-sis-profile360__stats">
          {p.stats.map((s) => (
            <article key={s.label} className="mh-sis-dash__kpi">
              <div className="mh-sis-dash__kpi-label">{s.label}</div>
              <div className="mh-sis-dash__kpi-value">{s.value}</div>
              {s.hint ? <div className="mh-sis-dash__kpi-hint">{s.hint}</div> : null}
            </article>
          ))}
        </div>
      ) : null}
      <div className="mh-sis-tabs">
        {p.tabs.map((t) => (
          <button key={t} type="button" className={`mh-sis-tabs__item${tab === t ? " is-active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {courseLayout ? (
        <>
          <div className="mh-sis-detail-grid mh-sis-profile360__overview">
            <section className="mh-sis-dash__card">
              <h2>{p.courses!.title}</h2>
              <div className="mh-sis-table">
                <div
                  className="mh-sis-table__head"
                  style={{ gridTemplateColumns: "minmax(200px,1.6fr) 120px 100px 140px" }}
                >
                  {p.courses!.columns.map((col) => (
                    <span key={col}>{col}</span>
                  ))}
                </div>
                {p.courses!.rows.map((row) => (
                  <div
                    key={row.course}
                    className="mh-sis-table__row mh-sis-grades__row"
                    style={{ gridTemplateColumns: "minmax(200px,1.6fr) 120px 100px 140px" }}
                  >
                    <span className="mh-sis-table__primary">{row.course}</span>
                    <span style={{ fontSize: 13 }}>{row.midterm}</span>
                    <span style={{ fontSize: 13 }}>{row.attendance}</span>
                    <span className={badgeClass(row.statusTone)}>{row.status}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="mh-sis-dash__card">
              <h2>Registration Timeline</h2>
              <div className="mh-sis-timeline mh-sis-profile360__timeline">
                {(p.timeline || []).map((item) => (
                  <div key={item.title + item.date} className="mh-sis-timeline__item">
                    <p>{item.title}</p>
                    <span>{item.date}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
          {p.interactions?.length ? (
            <section className="mh-sis-dash__card mh-sis-profile360__interactions">
              <h2>Recent Advisor Interactions</h2>
              <div className="mh-sis-rg-interactions">
                {p.interactions.map((item) => (
                  <div key={item.title + item.date} className="mh-sis-rg-interactions__row">
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.date}</span>
                    </div>
                    <span className="mh-sis-rg-interactions__auth">Authorized by: {item.authorizedBy}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <>
          {p.aiBlurb ? (
            <section className="mh-sis-ai-banner">
              <div className="mh-sis-ai-banner__title">
                <img src="/brand/icons/sparkle.svg" alt="" width={16} height={16} />
                <strong>AI suggested interventions</strong>
              </div>
              <p>{p.aiBlurb}</p>
            </section>
          ) : null}
          <div className="mh-sis-detail-grid">
            <section className="mh-sis-dash__card">
              <h2>Active Alerts</h2>
              <div className="mh-sis-alert-box">{p.alert}</div>
            </section>
            <section className="mh-sis-dash__card">
              <h2>Pending Action Plans</h2>
              <p style={{ margin: 0, color: "#5C5F5A", fontSize: 13 }}>{p.plan}</p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function PartnerDetailView({ config }: { config: SisScreenConfig }) {
  const p = config.partnerDetail!;
  return (
    <div className="mh-sis-partner" data-figma-id={config.figmaId}>
      <aside className="mh-sis-partner__list mh-sis-dash__card">
        <div className="mh-sis-partner__list-head">
          <h2>{config.title}</h2>
          <p>{config.subtitle}</p>
        </div>
        {p.partners.map((item) => (
          <button key={item.name} type="button" className={`mh-sis-partner__item${item.active ? " is-active" : ""}`}>
            <strong>{item.name}</strong>
            <span>{item.meta}</span>
          </button>
        ))}
      </aside>
      <div className="mh-sis-partner__main">
        <div className="mh-sis-dash__welcome">
          <div className="mh-sis-dash__welcome-text">
            <h1>{p.selected.name}</h1>
            <p>{p.selected.meta}</p>
          </div>
          <div className="mh-sis-dash__banner-actions">
            {config.secondaryAction ? (
              <ActionBtn label={(config.secondaryAction) || "Action"} tone="secondary" />
            ) : null}
            <ActionBtn label={(config.primaryAction || "Edit Partner") || "Save"} />
          </div>
        </div>
        <div className="mh-sis-detail-grid">
          <section className="mh-sis-dash__card">
            <h2>Partner profile</h2>
            <div className="mh-sis-summary">
              {p.selected.fields.map((f) => (
                <div key={f.label}>
                  <span>{f.label}</span>
                  <strong>{f.value}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="mh-sis-dash__card">
            <h2>Locations</h2>
            <div className="mh-sis-partner__locations">
              {p.selected.locations.map((loc) => (
                <div key={loc} className="mh-sis-check__row">
                  <div className="mh-sis-table__primary">{loc}</div>
                  <span className="mh-sis-badge mh-sis-badge--active">Active</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

function EmployerPortalView({ config }: { config: SisScreenConfig }) {
  const portal = config.employerPortal!;
  const iconSrc = (icon: "calendar" | "file" | "user") => {
    if (icon === "file") return "/brand/icons/file-text.svg";
    if (icon === "calendar") return "/brand/icons/calendar.svg";
    return "/brand/icons/user.svg";
  };

  return (
    <div className="mh-sis-dash mh-sis-dash--wide mh-sis-employer" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          {config.primaryAction ? (
            <ActionBtn label={(config.primaryAction) || "Save"} />
          ) : null}
        </div>
      </div>

      <div className="mh-sis-dash__kpis mh-sis-employer__kpis">
        {(config.kpis || []).map((k) => (
          <article
            key={k.label}
            className={`mh-sis-dash__kpi${k.tone === "highlight" ? " mh-sis-dash__kpi--highlight" : ""}`}
          >
            <div className="mh-sis-dash__kpi-label">{k.label}</div>
            <div
              className={`mh-sis-dash__kpi-value${k.tone === "highlight" ? " is-highlight" : ""}`}
            >
              {k.value}
            </div>
            <div className="mh-sis-dash__kpi-hint">{k.hint}</div>
          </article>
        ))}
      </div>

      <div className="mh-sis-employer__split">
        <section className="mh-sis-dash__card mh-sis-employer__placements">
          <div className="mh-sis-employer__card-head">
            <h2>{portal.placementsTitle}</h2>
            <button type="button" className="mh-sis-employer__link">
              {portal.placementsLink}
            </button>
          </div>
          <div className="mh-sis-employer__divider" />
          <div className="mh-sis-employer__list">
            {portal.placements.map((row) => (
              <div key={row.name} className="mh-sis-employer__placement">
                <div className="mh-sis-employer__person">
                  <span className="mh-sis-reviewer__avatar mh-sis-reviewer__avatar--sm">
                    {initials(row.name)}
                  </span>
                  <div>
                    <strong>{row.name}</strong>
                    <span>{row.meta}</span>
                  </div>
                </div>
                <span className="mh-sis-employer__dates">{row.dates}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="mh-sis-employer__aside">
          <section className="mh-sis-dash__card">
            <h2>{portal.appraisalsTitle}</h2>
            <div className="mh-sis-employer__divider" />
            <div className="mh-sis-employer__appraisals">
              {portal.appraisals.map((row) => (
                <div key={row.name} className="mh-sis-employer__appraisal">
                  <div className="mh-sis-employer__appraisal-head">
                    <strong>{row.name}</strong>
                    <span>{row.due}</span>
                  </div>
                  <button type="button" className="mh-sis-employer__eval-btn">
                    {row.action}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="mh-sis-dash__card">
            <h2>{portal.quickLinksTitle}</h2>
            <div className="mh-sis-employer__divider" />
            <div className="mh-sis-employer__links">
              {portal.quickLinks.map((link) => (
                <button key={link.label} type="button" className="mh-sis-employer__quick">
                  <img src={iconSrc(link.icon)} alt="" width={16} height={16} />
                  <span>{link.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SearchResultsView({ config }: { config: SisScreenConfig }) {
  const s = config.searchResults!;
  const router = useRouter();
  const [tab, setTab] = useState(s.tabs[0]?.label || "All");
  const results = s.results.filter((r) => {
    if (tab === "All") return true;
    const singular = tab.replace(/s$/i, "");
    return r.type.toLowerCase().includes(singular.toLowerCase()) || tab.toLowerCase().includes(r.type.toLowerCase());
  });

  const iconFor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("student")) return { bg: "#eaf6ef", stroke: "#017f3f", path: "user" as const };
    if (t.includes("application")) return { bg: "#fef9e7", stroke: "#996600", path: "file" as const };
    if (t.includes("finance")) return { bg: "rgba(29,78,216,0.1)", stroke: "#1d4ed8", path: "card" as const };
    return { bg: "#fef9e7", stroke: "#996600", path: "shield" as const };
  };

  return (
    <div className="mh-sis-dash mh-sis-dash--wide mh-sis-search-page" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>
            {s.resultCount} for &ldquo;{s.query}&rdquo;
          </p>
        </div>
      </div>

      <div className="mh-sis-search-pills">
        {s.tabs.map((t) => (
          <button
            key={t.label}
            type="button"
            className={`mh-sis-search-pill-tab${tab === t.label ? " is-active" : ""}`}
            onClick={() => setTab(t.label)}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="mh-sis-search-cards">
        {results.map((r) => {
          const icon = iconFor(r.type);
          return (
            <article key={r.type + r.title + (r.action || "")} className="mh-sis-search-card">
              <div className="mh-sis-search-card__icon" style={{ background: icon.bg }}>
                {icon.path === "user" ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="8" r="4" stroke={icon.stroke} strokeWidth="2" />
                    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={icon.stroke} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : null}
                {icon.path === "file" ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" stroke={icon.stroke} strokeWidth="2" />
                    <path d="M14 2v6h6" stroke={icon.stroke} strokeWidth="2" />
                  </svg>
                ) : null}
                {icon.path === "card" ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="2" y="5" width="20" height="14" rx="2" stroke={icon.stroke} strokeWidth="2" />
                    <path d="M2 10h20" stroke={icon.stroke} strokeWidth="2" />
                  </svg>
                ) : null}
                {icon.path === "shield" ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 3 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-3z" stroke={icon.stroke} strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </div>
              <div className="mh-sis-search-card__body">
                <div className="mh-sis-search-card__title-row">
                  <strong>{r.title}</strong>
                  {(r.badges || [r.type]).map((b) => (
                    <span
                      key={b}
                      className={`mh-sis-search-card__badge is-${r.badgeTone || "green"}`}
                    >
                      {b}
                    </span>
                  ))}
                </div>
                {r.fields?.length ? (
                  <div className="mh-sis-search-card__fields">
                    {r.fields.map((f) => (
                      <p key={f.label}>
                        <span>{f.label}: </span>
                        <span className={f.tone === "danger" ? "is-danger" : f.tone === "up" ? "is-up" : "is-value"}>
                          {f.value}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : r.meta ? (
                  <p className="mh-sis-search-card__meta">{r.meta}</p>
                ) : null}
              </div>
              <button
                type="button"
                className={`mh-sis-search-card__action${r.actionTone === "primary" ? " is-primary" : ""}`}
                onClick={() => (r.href ? router.push(r.href) : undefined)}
              >
                {r.action || "Open"}
              </button>
            </article>
          );
        })}
        {!results.length ? <p className="mh-sis-search-empty">No results in this category.</p> : null}
      </div>
    </div>
  );
}

function CaseView({ config }: { config: SisScreenConfig }) {
  const c = config.caseDetail!;
  const [tab, setTab] = useState(c.tabs[0] || "Details");
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <section className="mh-sis-dash__card mh-sis-case-header">
        <div>
          <div className="mh-sis-case-header__type">{c.type}</div>
          <h1>{c.title}</h1>
        </div>
        <div className="mh-sis-case-header__meta">
          <span className="mh-sis-badge mh-sis-badge--review">{c.status}</span>
          <span>Owner: {c.owner}</span>
        </div>
      </section>
      <div className="mh-sis-detail-grid">
        <div className="mh-sis-stack">
          <div className="mh-sis-tabs">
            {c.tabs.map((t) => (
              <button key={t} type="button" className={`mh-sis-tabs__item${tab === t ? " is-active" : ""}`} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          <section className="mh-sis-dash__card">
            <h2>Case Details</h2>
            <p style={{ margin: 0, color: "#5C5F5A", fontSize: 13 }}>{c.body}</p>
          </section>
        </div>
        <section className="mh-sis-dash__card">
          <h2>Close Case Workflow</h2>
          <label className="mh-sis-field">
            <span>Resolution Outcome</span>
            <div className="mh-sis-select">{c.outcome} ▾</div>
          </label>
          <ActionBtn label="Close Case" />
        </section>
      </div>
    </div>
  );
}

function PlanView({ config }: { config: SisScreenConfig }) {
  const tasks = config.planTasks || [];
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <section className="mh-sis-dash__card">
        <div className="mh-sis-dash__welcome" style={{ marginBottom: 20 }}>
          <div className="mh-sis-dash__welcome-text">
            <h1 style={{ fontSize: 18 }}>{config.title}</h1>
            <p>{config.subtitle}</p>
          </div>
          <ActionBtn label={(config.primaryAction || "Add Task") || "Save"} />
        </div>
        <div className="mh-sis-table">
          <div
            className="mh-sis-table__head"
            style={{ gridTemplateColumns: "minmax(220px,1.6fr) minmax(120px,0.9fr) 120px 140px" }}
          >
            <span>Task Item</span>
            <span>Owner</span>
            <span>Due Date</span>
            <span style={{ textAlign: "right" }}>Shared with Student</span>
          </div>
          {tasks.map((t) => (
            <div
              key={t.task}
              className="mh-sis-table__row mh-sis-grades__row"
              style={{ gridTemplateColumns: "minmax(220px,1.6fr) minmax(120px,0.9fr) 120px 140px" }}
            >
              <span className="mh-sis-plan-task">
                <span className="mh-sis-plan-task__check" />
                {t.task}
              </span>
              <span style={{ color: "#5C5F5A", fontSize: 13 }}>{t.owner}</span>
              <span style={{ color: "#5C5F5A", fontSize: 13 }}>{t.due}</span>
              <span className="mh-sis-toggle" data-on={t.shared ? "true" : "false"} aria-hidden>
                <span />
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AppointmentsView({ config }: { config: SisScreenConfig }) {
  const a = config.appointments!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-detail-grid">
        <section className="mh-sis-dash__card">
          <h2>Appointment Slots (Today)</h2>
          <div className="mh-sis-slots">
            {a.slots.map((s) => (
              <div key={s.time} className="mh-sis-slots__row">
                <div>
                  <strong>{s.time}</strong>
                  <span>{s.title}</span>
                </div>
                <span className={`mh-sis-badge mh-sis-badge--${s.status === "Booked" ? "active" : "new"}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="mh-sis-dash__card">
          <h2>Book New Appointment</h2>
          <label className="mh-sis-field">
            <span>Select Student</span>
            <div>{a.student}</div>
          </label>
          <label className="mh-sis-field">
            <span>Advisor</span>
            <div>{a.advisor}</div>
          </label>
          <ActionBtn label="Schedule Booking" />
        </section>
      </div>
    </div>
  );
}

function AnalyticsView({ config }: { config: SisScreenConfig }) {
  const a = config.analytics!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      {(config.primaryAction || config.title) && config.archetype === "analytics" ? (
        <div className="mh-sis-dash__welcome">
          <div className="mh-sis-dash__welcome-text">
            <h1>{config.title}</h1>
            <p>{config.subtitle}</p>
          </div>
          {config.primaryAction ? (
            <div className="mh-sis-dash__banner-actions">
              <ActionBtn label={(config.primaryAction) || "Save"} />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mh-sis-detail-grid">
        <section className="mh-sis-dash__card">
          <h2>{a.leftTitle || "Interventions by Type"}</h2>
          <div className="mh-sis-analytics-bars">
            {a.bars.map((b) => (
              <div key={b.label} className="mh-sis-analytics-bars__row">
                <span>{b.label}</span>
                <div className="mh-sis-analytics-bars__track">
                  <div style={{ width: b.width, background: b.color }} />
                </div>
                <strong>{b.value}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="mh-sis-dash__card">
          <h2>{a.rightTitle || "Outcomes Distribution"}</h2>
          <div className="mh-sis-outcomes">
            {a.outcomes.map((o) => (
              <div key={o.label} className="mh-sis-outcomes__row mh-sis-outcomes__row--valued">
                <span className="mh-sis-outcomes__dot" style={{ background: o.color }} />
                <span>{o.label}</span>
                {o.value ? <strong>{o.value}</strong> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
      {a.weeks?.length ? (
        <section className="mh-sis-dash__card" style={{ marginTop: 24 }}>
          <h2>{a.bottomTitle || "Average Time-to-Close Trend (Days)"}</h2>
          <div className="mh-sis-chart">
            {a.weeks.map((w) => (
              <div key={w.label} className="mh-sis-chart__col">
                <div className="mh-sis-chart__bar" style={{ height: w.height }} />
                <span>{w.label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Lead360View({ config }: { config: SisScreenConfig }) {
  const l = config.lead360!;
  const [tab, setTab] = useState(l.tabs[0] || "Activity");
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{l.name}</h1>
          <p>{l.meta}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          {config.secondaryAction ? (
            <ActionBtn label={(config.secondaryAction) || "Action"} tone="secondary" />
          ) : null}
          <ActionBtn label={(config.primaryAction || "Convert") || "Save"} />
        </div>
      </div>
      <div className="mh-sis-stepper mh-sis-lead-steps">
        {l.steps.map((s, i) => (
          <div key={s.label} className={`mh-sis-stepper__item is-${s.state}`}>
            <div className="mh-sis-stepper__node">{s.state === "done" ? "✓" : i + 1}</div>
            <div className="mh-sis-stepper__label">{s.label}</div>
            {i < l.steps.length - 1 ? <div className="mh-sis-stepper__line" /> : null}
          </div>
        ))}
        <div className="mh-sis-lead-score">
          Score <strong>{l.score}</strong>
        </div>
      </div>
      <div className="mh-sis-tabs">
        {l.tabs.map((t) => (
          <button key={t} type="button" className={`mh-sis-tabs__item${tab === t ? " is-active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="mh-sis-detail-grid">
        <div className="mh-sis-stack">
          <section className="mh-sis-dash__card">
            <h2>Quick Log / Compose</h2>
            <div className="mh-sis-dash__banner-actions" style={{ marginBottom: 12 }}>
              <ActionBtn label="Log Call" tone="secondary" />
              <ActionBtn label="Compose Email" tone="secondary" />
              <ActionBtn label="Add Note" tone="secondary" />
            </div>
            <label className="mh-sis-field">
              <span>Note Details</span>
              <div>Type notes here from the phone call...</div>
            </label>
          </section>
          <section className="mh-sis-dash__card">
            <h2>Lead Details</h2>
            <div className="mh-sis-fields">
              {l.fields.map((f) => (
                <label key={f.label} className="mh-sis-field">
                  <span>{f.label}</span>
                  <div>{f.value}</div>
                </label>
              ))}
            </div>
          </section>
        </div>
        <section className="mh-sis-dash__card">
          <h2>Timeline</h2>
          <div className="mh-sis-timeline">
            {l.timeline.map((t) => (
              <div key={t.when + t.text} className="mh-sis-timeline__item">
                <span>{t.when}</span>
                <p>{t.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CampaignDetailView({ config }: { config: SisScreenConfig }) {
  const c = config.campaignDetail!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{c.name}</h1>
          <p>
            Status: <span className={badgeClass("active")}>{c.status}</span>
          </p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          {config.secondaryAction ? (
            <ActionBtn label={(config.secondaryAction) || "Action"} tone="secondary" />
          ) : null}
          <ActionBtn label="Test Run" tone="secondary" />
          <ActionBtn label={(config.primaryAction || "Publish") || "Save"} />
        </div>
      </div>
      <div className="mh-sis-dash__kpis">
        {c.kpis.map((k) => (
          <article key={k.label} className="mh-sis-dash__kpi">
            <div className="mh-sis-dash__kpi-label">{k.label}</div>
            <div className="mh-sis-dash__kpi-value">{k.value}</div>
            <div className="mh-sis-dash__kpi-hint">{k.hint}</div>
          </article>
        ))}
      </div>
      <div className="mh-sis-detail-grid">
        <section className="mh-sis-dash__card">
          <h2>Audience Rules</h2>
          <div className="mh-sis-rules">
            {c.rules.map((rule, i) => (
              <div key={rule} className="mh-sis-rules__row">
                <div className="mh-sis-rules__rule">{rule}</div>
                {i < c.rules.length - 1 ? <span className="mh-sis-rules__and">AND</span> : null}
              </div>
            ))}
          </div>
        </section>
        <section className="mh-sis-dash__card">
          <h2>Message</h2>
          <p style={{ margin: 0, color: "#5C5F5A", fontSize: 13 }}>Subject: {c.subject}</p>
        </section>
      </div>
    </div>
  );
}

function EventsView({ config }: { config: SisScreenConfig }) {
  const e = config.events!;
  return (
    <div className="mh-sis-events" data-figma-id={config.figmaId}>
      <aside className="mh-sis-events__list mh-sis-dash__card">
        <h2>Upcoming Recruitment Events</h2>
        {e.list.map((item) => (
          <button key={item.title} type="button" className={`mh-sis-events__item${item.active ? " is-active" : ""}`}>
            <strong>{item.title}</strong>
            <span>{item.meta}</span>
          </button>
        ))}
      </aside>
      <div className="mh-sis-events__main">
        <div className="mh-sis-dash__welcome">
          <div className="mh-sis-dash__welcome-text">
            <h1>{e.selectedTitle}</h1>
            <p>{e.selectedMeta}</p>
          </div>
          <div className="mh-sis-dash__banner-actions">
            {config.secondaryAction ? (
              <ActionBtn label={(config.secondaryAction) || "Action"} tone="secondary" />
            ) : null}
            <ActionBtn label={(config.primaryAction || "New Check-In") || "Save"} />
          </div>
        </div>
        <div className="mh-sis-table mh-sis-table--card">
          <div className="mh-sis-table__head" style={{ gridTemplateColumns: "minmax(140px,1fr) minmax(180px,1.2fr) 120px 120px" }}>
            <span>Registered Student</span>
            <span>Email</span>
            <span>Registration Date</span>
            <span>Status / Check-in</span>
          </div>
          {e.roster.map((row) => (
            <div
              key={row.email}
              className="mh-sis-table__row mh-sis-grades__row"
              style={{ gridTemplateColumns: "minmax(140px,1fr) minmax(180px,1.2fr) 120px 120px" }}
            >
              <span className="mh-sis-table__primary">{row.name}</span>
              <span style={{ fontSize: 13, color: "#5c5f5a" }}>{row.email}</span>
              <span style={{ fontSize: 13, color: "#5c5f5a" }}>{row.date}</span>
              <span className={badgeClass(row.tone)}>{row.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TasksView({ config }: { config: SisScreenConfig }) {
  const t = config.tasks!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <ActionBtn label={(config.primaryAction || "Task Settings") || "Action"} tone="secondary" />
        </div>
      </div>
      {t.groups.map((group) => (
        <section key={group.title} className="mh-sis-task-group">
          <h2 className={group.tone === "danger" ? "is-danger" : undefined}>{group.title}</h2>
          <div className="mh-sis-task-list">
            {group.items.map((item) => (
              <div key={item.name + item.detail} className={`mh-sis-task-card is-${group.tone}`}>
                <div className="mh-sis-task-card__body">
                  <span className={`mh-sis-task-card__icon is-${group.tone}`} aria-hidden />
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.detail}</span>
                  </div>
                </div>
                <div className="mh-sis-task-card__actions">
                  <span>{item.when}</span>
                  <ActionBtn label="Execute Task" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MatrixView({ config }: { config: SisScreenConfig }) {
  const m = config.matrix!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <ActionBtn label={(config.primaryAction || "Submit Changes") || "Save"} />
        </div>
      </div>
      {m.banner ? (
        <div className="mh-sis-info-banner">
          <div>
            <strong>Pending matrix changes</strong>
            <span>{m.banner.body}</span>
          </div>
          <button type="button" className="mh-sis-info-banner__cta">
            {m.banner.cta}
          </button>
        </div>
      ) : null}
      <div className="mh-sis-table mh-sis-table--card mh-sis-matrix">
        <div
          className="mh-sis-table__head"
          style={{ gridTemplateColumns: `minmax(220px,1.6fr) repeat(${m.roles.length}, minmax(90px,1fr))` }}
        >
          <span>Module & Target Capability</span>
          {m.roles.map((r) => (
            <span key={r} style={{ textAlign: "center" }}>
              {r}
            </span>
          ))}
        </div>
        {m.rows.map((row) => (
          <div
            key={row.capability}
            className="mh-sis-table__row mh-sis-grades__row mh-sis-matrix__row"
            style={{ gridTemplateColumns: `minmax(220px,1.6fr) repeat(${m.roles.length}, minmax(90px,1fr))` }}
          >
            <div className="mh-sis-matrix__cap">
              <span className="mh-sis-matrix__mod">{row.module}</span>
              <strong>{row.capability}</strong>
              <span>{row.detail}</span>
            </div>
            {row.checks.map((on, i) => (
              <span key={m.roles[i]} className="mh-sis-matrix__check" aria-label={`${m.roles[i]} ${on ? "allowed" : "denied"}`}>
                <span className={`mh-sis-matrix__box${on ? " is-on" : ""}`}>{on ? "✓" : ""}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PolicyView({ config }: { config: SisScreenConfig }) {
  const router = useRouter();
  const p = config.policy!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <button
            type="button"
            className="mh-sis-dash__btn mh-sis-dash__btn--primary"
            onClick={() => {
              if (config.primaryActionHref) router.push(config.primaryActionHref);
            }}
          >
            {config.primaryAction || "Save"}
          </button>
        </div>
      </div>
      <div className="mh-sis-policy-grid">
        {p.sections.map((section) => (
          <section key={section.title} className="mh-sis-dash__card">
            <h2>{section.title}</h2>
            {section.toggles?.map((t) => (
              <div key={t.label} className="mh-sis-policy-toggle">
                <div>
                  <strong>{t.label}</strong>
                  <span>{t.detail}</span>
                </div>
                <span className={`mh-sis-switch${t.on ? " is-on" : ""}`} aria-hidden />
              </div>
            ))}
            {section.fields?.map((f) => (
              <label key={f.label} className="mh-sis-field">
                <span>{f.label}</span>
                <div>{f.value}</div>
                {f.hint ? <em className="mh-sis-policy-hint">{f.hint}</em> : null}
              </label>
            ))}
            {section.checks?.map((c) => (
              <div key={c} className="mh-sis-policy-check">
                <span className="mh-sis-matrix__box is-on">✓</span>
                <span>{c}</span>
              </div>
            ))}
            {section.textarea ? (
              <label className="mh-sis-field">
                <span>{section.textarea.label}</span>
                <div className="mh-sis-policy-textarea">{section.textarea.value}</div>
                {section.textarea.hint ? <em className="mh-sis-policy-hint">{section.textarea.hint}</em> : null}
              </label>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}

function IntegrationsView({ config }: { config: SisScreenConfig }) {
  const i = config.integrations!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <ActionBtn label={(config.primaryAction || "Connect") || "Save"} />
        </div>
      </div>
      <div className="mh-sis-dash__kpis">
        {i.kpis.map((k) => (
          <article key={k.label} className="mh-sis-dash__kpi">
            <div className="mh-sis-dash__kpi-label">{k.label}</div>
            <div className="mh-sis-dash__kpi-value">{k.value}</div>
          </article>
        ))}
      </div>
      <div className="mh-sis-integration-grid">
        {i.cards.map((card) => (
          <article key={card.name} className="mh-sis-dash__card mh-sis-integration-card">
            <div className="mh-sis-integration-card__top">
              <span className="mh-sis-reviewer__avatar mh-sis-reviewer__avatar--sm">{card.name.slice(0, 1)}</span>
              <span className={badgeClass(card.tone)}>{card.status}</span>
            </div>
            <h3>{card.name}</h3>
            <p>{card.detail}</p>
            <div className="mh-sis-integration-card__foot">
              <span>{card.sync}</span>
              <button type="button" className="mh-sis-filters__reset" style={{ padding: 0 }}>
                Configure
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function OperationsView({ config }: { config: SisScreenConfig }) {
  const o = config.operations!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          {config.secondaryAction ? (
            <ActionBtn label={(config.secondaryAction) || "Action"} tone="secondary" />
          ) : null}
          <ActionBtn label={(config.primaryAction || "Resync") || "Save"} />
        </div>
      </div>
      <div className="mh-sis-dash__kpis">
        {o.health.map((h) => (
          <article key={h.label} className="mh-sis-dash__kpi mh-sis-ops-health">
            <div className="mh-sis-dash__kpi-label">{h.label}</div>
            <div className="mh-sis-dash__kpi-value" style={{ fontSize: 20 }}>
              {h.value}
            </div>
            <span className={`mh-sis-ops-dot${h.ok === false ? " is-warn" : ""}`} />
          </article>
        ))}
      </div>
      <div className="mh-sis-detail-grid">
        <section className="mh-sis-dash__card">
          <div className="mh-sis-ops-jobs-head">
            <h2>Background Jobs Queue</h2>
            <ActionBtn label="Retry All Failed (1)" tone="secondary" />
          </div>
          <div className="mh-sis-ops-jobs">
            {o.jobs.map((job) => (
              <div key={job.id} className="mh-sis-ops-job">
                <div>
                  <span className="mh-sis-ops-job__id">{job.id}</span>
                  <strong>{job.title}</strong>
                  <span>{job.meta}</span>
                </div>
                <div className="mh-sis-ops-job__actions">
                  <span className={badgeClass(job.tone)}>{job.status}</span>
                  {job.retry ? (
                    <ActionBtn label="Force Retry" tone="secondary" />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="mh-sis-dash__card">
          <h2>Real-Time Telemetry</h2>
          <div className="mh-sis-ops-telem">
            <strong>LTI Sandbox API Errors</strong>
            <div className="mh-sis-ops-spark" aria-hidden>
              {[40, 28, 55, 72, 90, 48, 35].map((h, idx) => (
                <span key={idx} style={{ height: `${h}%` }} />
              ))}
            </div>
            <p>{o.telemetry.note}</p>
            <div className="mh-sis-ops-metrics">
              <div>
                <span>CPU Usage</span>
                <strong>{o.telemetry.cpu}</strong>
              </div>
              <div>
                <span>Memory Util</span>
                <strong>{o.telemetry.memory}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsView({ config }: { config: SisScreenConfig }) {
  const s = config.settingsForm!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          {config.secondaryAction ? (
            <ActionBtn label={(config.secondaryAction) || "Action"} tone="secondary" />
          ) : null}
          <ActionBtn label={(config.primaryAction || "Save Settings") || "Save"} />
        </div>
      </div>
      <section className="mh-sis-dash__card mh-sis-settings-card">
        <div className="mh-sis-fields">
          {s.fields.map((f) => (
            <label key={f.label} className="mh-sis-field">
              <span>{f.label}</span>
              <div>{f.value}</div>
            </label>
          ))}
        </div>
        <div className="mh-sis-settings-brand">
          <div className="mh-sis-settings-upload">
            <strong>Campus Logo Branding (Header Version)</strong>
            <p>{s.uploadHint}</p>
          </div>
          <div className="mh-sis-settings-preview">
            <strong>Active Header Branding Preview</strong>
            <div className="mh-sis-settings-logo">
              <span className="mh-sis-reviewer__avatar mh-sis-reviewer__avatar--sm">H</span>
              <div>
                <div>Heritage</div>
                <small>Community College</small>
              </div>
            </div>
            <p>{s.previewNote}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function TemplatesView({ config }: { config: SisScreenConfig }) {
  const t = config.templates!;
  const router = useRouter();
  const [selected, setSelected] = useState(t.rows[1]?.name || t.rows[0]?.name || "");
  const active = t.rows.find((r) => r.name === selected) || t.rows[0];
  const preview = active?.preview || t.preview;

  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <ActionBtn
            label={config.primaryAction || "Create Template"}
            href={config.primaryActionHref || t.createHref}
          />
        </div>
      </div>
      <div className="mh-sis-templates">
        <section className="mh-sis-dash__card">
          <h2>Active System Templates</h2>
          <div className="mh-sis-table">
            <div className="mh-sis-table__head" style={{ gridTemplateColumns: "minmax(160px,1.4fr) 80px 90px 110px" }}>
              <span>Template Name</span>
              <span>Channel</span>
              <span>Status</span>
              <span>Last Edited</span>
            </div>
            {t.rows.map((row) => (
              <button
                key={row.name}
                type="button"
                className={`mh-sis-table__row mh-sis-grades__row mh-sis-template-row${selected === row.name ? " is-active" : ""}`}
                style={{ gridTemplateColumns: "minmax(160px,1.4fr) 80px 90px 110px" }}
                onClick={() => setSelected(row.name)}
              >
                <span className="mh-sis-table__primary">{row.name}</span>
                <span style={{ fontSize: 13 }}>{row.channel}</span>
                <span className={badgeClass(row.tone)}>{row.status}</span>
                <span style={{ fontSize: 13, color: "#8d928a" }}>{row.edited}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="mh-sis-dash__card mh-sis-template-preview">
          <div className="mh-sis-ops-jobs-head">
            <h2>Live Template Preview</h2>
            <ActionBtn
              label="Edit Template Source"
              tone="secondary"
              href={t.editHref || "/admin/f/pl-06-operations"}
            />
          </div>
          <div className="mh-sis-template-mail">
            <div className="mh-sis-template-mail__meta">
              <span>To: {preview.to}</span>
              <span>{preview.channel}</span>
            </div>
            <div className="mh-sis-template-mail__body">
              <div className="mh-sis-settings-logo">
                <span className="mh-sis-reviewer__avatar mh-sis-reviewer__avatar--sm">H</span>
                <strong>Heritage Community College</strong>
              </div>
              <h3>{preview.subject}</h3>
              <p>{preview.body}</p>
              <button
                type="button"
                className="mh-sis-dash__btn mh-sis-dash__btn--primary"
                onClick={() => router.push("/admin/f/pl-06-operations")}
              >
                Launch Live Class Session
              </button>
            </div>
          </div>
          <p className="mh-sis-policy-hint">
            * Variable tags like {"{{student_name}}"} and {"{{course_title}}"} are parsed dynamically by workers in pl-06.
          </p>
        </section>
      </div>
    </div>
  );
}

function VersionDiffView({ config }: { config: SisScreenConfig }) {
  const v = config.versionDiff!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <ActionBtn label={(config.primaryAction || "Publish") || "Save"} />
        </div>
      </div>
      <section className="mh-sis-dash__card">
        <h2>{v.heading}</h2>
        <div className="mh-sis-diff">
          {v.changes.map((c) => (
            <div key={c.text} className="mh-sis-diff__row">
              <span className={badgeClass(c.tone)}>{c.label}</span>
              <span>{c.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RuleDesignerView({ config }: { config: SisScreenConfig }) {
  const r = config.ruleDesigner!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
      </div>
      <div className="mh-sis-detail-grid">
        <section className="mh-sis-dash__card">
          <h2>When all of these conditions match:</h2>
          <div className="mh-sis-rule-rows">
            {r.conditions.map((c) => (
              <div key={c.field + c.value} className="mh-sis-rule-row">
                <div>{c.field}</div>
                <div>{c.op}</div>
                <div>{c.value}</div>
              </div>
            ))}
          </div>
          <button type="button" className="mh-sis-filters__reset" style={{ marginTop: 12, padding: 0 }}>
            + Add Condition Row
          </button>
        </section>
        <section className="mh-sis-dash__card">
          <h2>Outcome & Trigger</h2>
          <label className="mh-sis-field">
            <span>Outcome Trigger</span>
            <div>{r.outcome}</div>
          </label>
          <label className="mh-sis-field">
            <span>Plain Language Preview</span>
            <div>{r.preview}</div>
          </label>
        </section>
      </div>
    </div>
  );
}

function SimulatorView({ config }: { config: SisScreenConfig }) {
  const s = config.simulator!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
      </div>
      <div className="mh-sis-sim">
        <aside className="mh-sis-dash__card">
          <h2>Configure Simulator</h2>
          <label className="mh-sis-field">
            <span>Test Cohort</span>
            <div>{s.cohort}</div>
          </label>
          <ActionBtn label={(config.primaryAction || "Run Simulation") || "Save"} />
        </aside>
        <section className="mh-sis-dash__card">
          <h2>Simulation Outcomes</h2>
          <div className="mh-sis-table">
            <div className="mh-sis-table__head" style={{ gridTemplateColumns: "minmax(120px,1fr) 90px minmax(140px,1.2fr) 120px" }}>
              <span>Student Name</span>
              <span>GPA Score</span>
              <span>Matched Rules</span>
              <span>Final Actions</span>
            </div>
            {s.results.map((row) => (
              <div
                key={row.name}
                className="mh-sis-table__row mh-sis-grades__row"
                style={{ gridTemplateColumns: "minmax(120px,1fr) 90px minmax(140px,1.2fr) 120px" }}
              >
                <span className="mh-sis-table__primary">{row.name}</span>
                <span>{row.gpa}</span>
                <span style={{ fontSize: 13 }}>{row.rules}</span>
                <span style={{ fontSize: 13 }}>{row.action}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TestRunnerView({ config }: { config: SisScreenConfig }) {
  const t = config.testRunner!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <ActionBtn label={(config.primaryAction || "Run Dry-Test") || "Save"} />
        </div>
      </div>
      <div className="mh-sis-detail-grid">
        <section className="mh-sis-dash__card">
          <h2>Step-by-Step Run Log</h2>
          <pre className="mh-sis-code-log">{t.logs.join("\n")}</pre>
        </section>
        <section className="mh-sis-dash__card">
          <h2>Final Compiled Output (JSON)</h2>
          <pre className="mh-sis-code-log">{t.output}</pre>
        </section>
      </div>
    </div>
  );
}

function RetrievalView({ config }: { config: SisScreenConfig }) {
  const r = config.retrieval!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <ActionBtn label={(r.model) || "Action"} tone="secondary" />
        </div>
      </div>
      <div className="mh-sis-retrieval">
        <div className="mh-sis-retrieval__main">
          <section className="mh-sis-dash__card">
            <h2>Test Retrieval Query</h2>
            <div className="mh-sis-retrieval__query">
              <div className="mh-sis-field">
                <span>Query</span>
                <div>{r.query}</div>
              </div>
              <ActionBtn label="Inspect" />
            </div>
          </section>
          <section className="mh-sis-dash__card">
            <div className="mh-sis-ops-jobs-head">
              <h2>Retrieved Chunks ({r.matches.length} matches)</h2>
              <span className="mh-sis-table__secondary">Query latency: {r.latency}</span>
            </div>
            <div className="mh-sis-retrieval__matches">
              {r.matches.map((m) => (
                <div key={m.chunkId} className="mh-sis-retrieval__match">
                  <div>
                    <strong>
                      {m.rank} · {m.source}
                    </strong>
                    <span className="mh-sis-table__secondary">Chunk ID: {m.chunkId}</span>
                  </div>
                  <span className={badgeClass("active")}>{m.score}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="mh-sis-dash__card">
          <h2>Retrieval Config</h2>
          <label className="mh-sis-field">
            <span>Similarity Threshold</span>
            <div>{r.threshold}</div>
          </label>
          <p className="mh-sis-policy-hint">Matches below this cosine similarity won&apos;t be retrieved.</p>
          <label className="mh-sis-field">
            <span>Top-K Chunks</span>
            <div>{r.topK}</div>
          </label>
          <p className="mh-sis-policy-hint">Max chunks passed to LLM context window.</p>
          <h2 style={{ marginTop: 20 }}>Vector Database Info</h2>
          <label className="mh-sis-field">
            <span>Active Index</span>
            <div>{r.index}</div>
          </label>
          <label className="mh-sis-field">
            <span>Embedding Dimension</span>
            <div>{r.dimension}</div>
          </label>
          <label className="mh-sis-field">
            <span>Total Vector Count</span>
            <div>{r.vectors}</div>
          </label>
        </aside>
      </div>
    </div>
  );
}

function CitationView({ config }: { config: SisScreenConfig }) {
  const c = config.citation!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
      </div>
      <div className="mh-sis-filters">
        {c.filters.map((f, i) => (
          <button key={f} type="button" className={`mh-sis-filters__pill${i === 0 ? " is-active" : ""}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="mh-sis-citation">
        <section className="mh-sis-dash__card">
          <div className="mh-sis-table">
            <div
              className="mh-sis-table__head"
              style={{ gridTemplateColumns: "100px 90px minmax(160px,1.4fr) 110px 90px 90px 110px" }}
            >
              <span>Response ID</span>
              <span>User</span>
              <span>Query Preview</span>
              <span>Failure Type</span>
              <span>Severity</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {c.rows.map((row) => (
              <div
                key={row.id}
                className="mh-sis-table__row mh-sis-grades__row"
                style={{ gridTemplateColumns: "100px 90px minmax(160px,1.4fr) 110px 90px 90px 110px" }}
              >
                <span className="mh-sis-table__primary">{row.id}</span>
                <span style={{ fontSize: 13 }}>{row.user}</span>
                <span style={{ fontSize: 13 }}>{row.query}</span>
                <span style={{ fontSize: 13 }}>{row.type}</span>
                <span className={badgeClass(row.severityTone)}>{row.severity}</span>
                <span className={badgeClass(row.statusTone)}>{row.status}</span>
                <span className="mh-sis-table__link">Inspect Details</span>
              </div>
            ))}
          </div>
        </section>
        <aside className="mh-sis-dash__card">
          <div className="mh-sis-ops-jobs-head">
            <h2>Detailed Analysis: {c.detail.id}</h2>
            <span className={badgeClass("danger")}>{c.detail.flag}</span>
          </div>
          <label className="mh-sis-field">
            <span>System Response Text</span>
            <div>{c.detail.response}</div>
          </label>
          <label className="mh-sis-field">
            <span>Actual Document Reference (Ground Truth)</span>
            <div>{c.detail.groundTruth}</div>
          </label>
          <div className="mh-sis-dash__banner-actions" style={{ marginTop: 16 }}>
            <ActionBtn label="Re-index Citation Document" tone="secondary" />
            <ActionBtn label="Resolve Issue" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function UsageCostView({ config }: { config: SisScreenConfig }) {
  const u = config.usageCost!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <ActionBtn label={(u.cycle) || "Action"} tone="secondary" />
        </div>
      </div>
      <div className="mh-sis-dash__kpis">
        {(config.kpis || []).map((k) => (
          <article key={k.label} className="mh-sis-dash__kpi">
            <div className="mh-sis-dash__kpi-label">{k.label}</div>
            <div className="mh-sis-dash__kpi-value">{k.value}</div>
            <div className="mh-sis-dash__kpi-hint">{k.hint}</div>
          </article>
        ))}
      </div>
      <div className="mh-sis-usage">
        <section className="mh-sis-dash__card">
          <h2>Usage by AI Model</h2>
          <div className="mh-sis-table">
            <div
              className="mh-sis-table__head"
              style={{ gridTemplateColumns: "minmax(140px,1.2fr) 90px 100px 100px 90px" }}
            >
              <span>Model</span>
              <span>Calls</span>
              <span>Tokens In</span>
              <span>Tokens Out</span>
              <span>Cost</span>
            </div>
            {u.models.map((m) => (
              <div
                key={m.model}
                className="mh-sis-table__row mh-sis-grades__row"
                style={{ gridTemplateColumns: "minmax(140px,1.2fr) 90px 100px 100px 90px" }}
              >
                <span className="mh-sis-table__primary">{m.model}</span>
                <span>{m.calls}</span>
                <span style={{ fontSize: 13, color: "#5c5f5a" }}>{m.tokensIn}</span>
                <span style={{ fontSize: 13, color: "#5c5f5a" }}>{m.tokensOut}</span>
                <strong>{m.cost}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="mh-sis-dash__card">
          <h2>Cost Trend (Past 10 Days)</h2>
          <div className="mh-sis-chart mh-sis-chart--finance">
            {u.trend.map((t) => (
              <div key={t.label} className="mh-sis-chart__col">
                <div className="mh-sis-chart__bar" style={{ height: t.height }} />
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AccountView({ config }: { config: SisScreenConfig }) {
  const a = config.account!;
  const [tab, setTab] = useState(a.tabs[0]);
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>{a.name}</h1>
          <p>{a.meta}</p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <ActionBtn label={(config.secondaryAction || "Record Payment") || "Action"} tone="secondary" />
          <ActionBtn label={(config.primaryAction || "Apply Charge") || "Save"} />
        </div>
      </div>
      <section className="mh-sis-dash__card mh-sis-account-balance">
        <div>
          <div className="mh-sis-case-header__type">Current Account Balance</div>
          <div className="mh-sis-account-balance__value">{a.balance}</div>
          <p className="mh-sis-account-balance__due">{a.dueNote}</p>
        </div>
        <div className="mh-sis-plan-card">
          <strong>{a.planTitle}</strong>
          <p>{a.planBody}</p>
        </div>
      </section>
      <div className="mh-sis-tabs">
        {a.tabs.map((t) => (
          <button key={t} type="button" className={`mh-sis-tabs__item${tab === t ? " is-active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="mh-sis-table mh-sis-table--card">
        <div className="mh-sis-table__head" style={{ gridTemplateColumns: "120px minmax(180px,1.6fr) 120px 120px 130px" }}>
          <span>Date</span>
          <span>Transaction Description</span>
          <span style={{ textAlign: "right" }}>Debit (+)</span>
          <span style={{ textAlign: "right" }}>Credit (-)</span>
          <span style={{ textAlign: "right" }}>Running Balance</span>
        </div>
        {a.ledger.map((row) => (
          <div
            key={row.date + row.desc}
            className="mh-sis-table__row mh-sis-grades__row"
            style={{ gridTemplateColumns: "120px minmax(180px,1.6fr) 120px 120px 130px" }}
          >
            <span style={{ color: "#8d928a", fontSize: 13 }}>{row.date}</span>
            <span className="mh-sis-table__primary">{row.desc}</span>
            <span style={{ textAlign: "right", fontSize: 13 }}>{row.debit}</span>
            <span style={{ textAlign: "right", fontSize: 13, color: row.creditTone ? "#047857" : undefined }}>{row.credit}</span>
            <span style={{ textAlign: "right", fontWeight: 600, fontSize: 13 }}>{row.balance}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReconcileView({ config }: { config: SisScreenConfig }) {
  const r = config.reconcile!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-detail-grid">
        <section className="mh-sis-dash__card">
          <h2>Stripe Clearing Statement</h2>
          {r.stripe.map((row) => (
            <div key={row.label} className={`mh-sis-recon-row${row.status === "UNMATCHED" ? " is-warn" : ""}`}>
              <span>{row.label}</span>
              <div className="mh-sis-recon-row__meta">
                <strong>{row.amount}</strong>
                <span className={`mh-sis-badge mh-sis-badge--${row.status === "MATCHED" ? "active" : "review"}`}>{row.status}</span>
              </div>
            </div>
          ))}
        </section>
        <section className="mh-sis-dash__card">
          <h2>Internal Student Ledger</h2>
          {r.ledger.map((row) => (
            <div key={row.label} className={`mh-sis-recon-row${row.highlight ? " is-warn" : ""}`}>
              <span>{row.label}</span>
              <strong>{row.amount}</strong>
            </div>
          ))}
        </section>
      </div>
      <div className="mh-sis-recon-actions">
        <ActionBtn label="Create Adjustment" tone="secondary" />
        <ActionBtn label="Match & Reconcile Selected" />
      </div>
    </div>
  );
}

function HoldsView({ config }: { config: SisScreenConfig }) {
  const h = config.holds!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-detail-grid">
        <section className="mh-sis-dash__card">
          <h2>Active Financial Holds Log</h2>
          <div className="mh-sis-table">
            <div className="mh-sis-table__head" style={{ gridTemplateColumns: "minmax(100px,1fr) 120px minmax(140px,1.2fr) 110px" }}>
              <span>Student</span>
              <span>Type</span>
              <span>Hold Reason</span>
              <span>Placed By</span>
            </div>
            {h.rows.map((row) => (
              <div
                key={row.student + row.type}
                className="mh-sis-table__row mh-sis-grades__row"
                style={{ gridTemplateColumns: "minmax(100px,1fr) 120px minmax(140px,1.2fr) 110px" }}
              >
                <span className="mh-sis-table__primary">{row.student}</span>
                <span>
                  <span className="mh-sis-badge mh-sis-badge--danger">{row.type}</span>
                </span>
                <span style={{ color: "#5c5f5a", fontSize: 13 }}>{row.reason}</span>
                <span style={{ color: "#5c5f5a", fontSize: 13 }}>{row.placedBy}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="mh-sis-dash__card">
          <h2>Release Financial Hold</h2>
          <label className="mh-sis-field">
            <span>Student Name</span>
            <div>{h.student}</div>
          </label>
          <label className="mh-sis-field">
            <span>Release Reason / Code</span>
            <div style={{ color: "#8d928a" }}>{h.releaseReason}</div>
          </label>
          <ActionBtn label="Release Selected Hold" />
        </section>
      </div>
    </div>
  );
}

function ExportView({ config }: { config: SisScreenConfig }) {
  const e = config.exportPanel!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          {e.eyebrow ? <div className="mh-sis-case-header__type">{e.eyebrow}</div> : null}
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <ActionBtn label={(config.primaryAction || "Generate New Export") || "Save"} />
      </div>
      <div className="mh-sis-detail-grid">
        <div className="mh-sis-stack">
          <section className="mh-sis-dash__card">
            <h2>Export Configurations</h2>
            <div className="mh-sis-summary">
              {e.configs.map((c) => (
                <div key={c.label}>
                  <span>{c.label}</span>
                  <strong>{c.value}</strong>
                </div>
              ))}
            </div>
          </section>
          {e.deliveries?.length ? (
            <section className="mh-sis-dash__card">
              <h2>Recent Deliveries</h2>
              <div className="mh-sis-table">
                <div className="mh-sis-table__head" style={{ gridTemplateColumns: "90px minmax(140px,1.2fr) 80px 110px" }}>
                  <span>Date</span>
                  <span>Destination</span>
                  <span>Count</span>
                  <span>Status</span>
                </div>
                {e.deliveries.map((d) => (
                  <div
                    key={d.date + d.destination}
                    className="mh-sis-table__row mh-sis-grades__row"
                    style={{ gridTemplateColumns: "90px minmax(140px,1.2fr) 80px 110px" }}
                  >
                    <span style={{ fontSize: 13 }}>{d.date}</span>
                    <span className="mh-sis-table__primary">{d.destination}</span>
                    <span style={{ fontSize: 13 }}>{d.count}</span>
                    <span className="mh-sis-badge mh-sis-badge--active">{d.status}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="mh-sis-dash__card">
              <h2>Live Export Schema Preview</h2>
              <div className="mh-sis-schema">
                {e.schema.map((field) => (
                  <code key={field}>{field}</code>
                ))}
              </div>
            </section>
          )}
        </div>
        <section className="mh-sis-dash__card mh-sis-rg-export-side">
          <h2>Publish Batch File</h2>
          {e.publishNote ? <p className="mh-sis-rg-export-side__note">{e.publishNote}</p> : null}
          <div className="mh-sis-schema" style={{ marginBottom: 16 }}>
            {e.schema.map((field) => (
              <code key={field}>{field}</code>
            ))}
          </div>
          <ActionBtn label={(config.primaryAction || "Run Secure Export") || "Save"} />
        </section>
      </div>
      <section className="mh-sis-dash__card" style={{ marginTop: 24 }}>
        <h2>Recent Exports History</h2>
        <div className="mh-sis-table">
          <div className="mh-sis-table__head" style={{ gridTemplateColumns: "minmax(180px,1.4fr) 140px 100px" }}>
            <span>File</span>
            <span>Generated Date</span>
            <span>Status</span>
          </div>
          {e.history.map((h) => (
            <div key={h.name} className="mh-sis-table__row mh-sis-grades__row" style={{ gridTemplateColumns: "minmax(180px,1.4fr) 140px 100px" }}>
              <span className="mh-sis-table__primary">{h.name}</span>
              <span style={{ color: "#5c5f5a", fontSize: 13 }}>{h.date}</span>
              <span className="mh-sis-badge mh-sis-badge--active">{h.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RegistrarRecordView({ config }: { config: SisScreenConfig }) {
  const r = config.registrarRecord!;
  const s = r.student;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide mh-sis-rg-record" data-figma-id={config.figmaId}>
      <section className="mh-sis-dash__card mh-sis-rg-record__student">
        <span className="mh-sis-reviewer__avatar mh-sis-reviewer__avatar--lg">
          {s.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </span>
        <div>
          <div className="mh-sis-profile360__title-row">
            <h1>{s.name}</h1>
            <span className="mh-sis-badge mh-sis-badge--active">{s.badge}</span>
          </div>
          <p className="mh-sis-rg-record__meta">
            {s.id} · {s.program} · {s.admit} · {s.gpa} · {s.credits}
          </p>
        </div>
      </section>
      {r.tabs?.length ? (
        <nav className="mh-sis-tabs mh-sis-rg-record__tabs" aria-label="Registrar record sections">
          {r.tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`mh-sis-tabs__item${r.activeTab === t.label ? " is-active" : ""}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      ) : (
        <p className="mh-sis-rg-record__transcript-link">
          <Link href="/admin/f/rg-02-academic-history">View Academic History Record →</Link>
        </p>
      )}
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <div className="mh-sis-case-header__type">{r.eyebrow}</div>
          <h1>{r.pageTitle}</h1>
        </div>
        <div className="mh-sis-dash__banner-actions">
          {(config.secondaryActions || (config.secondaryAction ? [config.secondaryAction] : [])).map((label) => (
            <ActionBtn
              key={label}
              label={label}
              tone="secondary"
              href={
                config.secondaryActionHrefs?.[label] ??
                (label === config.secondaryAction ? config.secondaryActionHref : undefined)
              }
            />
          ))}
          {config.primaryAction ? (
            <ActionBtn label={config.primaryAction} href={config.primaryActionHref} />
          ) : null}
        </div>
      </div>

      {r.history ? (
        <div className="mh-sis-detail-grid">
          <div className="mh-sis-stack">
            {r.history.terms.map((term) => (
              <section key={term.label} className="mh-sis-dash__card">
                <div className="mh-sis-rg-term__head">
                  <div className="mh-sis-profile360__title-row">
                    <h2 style={{ margin: 0 }}>{term.label}</h2>
                    {term.badge ? <span className="mh-sis-badge mh-sis-badge--new">{term.badge}</span> : null}
                  </div>
                  <span className="mh-sis-rg-term__meta">
                    GPA {term.gpa} · {term.credits}
                  </span>
                </div>
                <div className="mh-sis-rg-term__courses">
                  {term.courses.map((c) => (
                    <div key={c.code} className="mh-sis-rg-term__course">
                      <strong>{c.code}</strong>
                      <span className="mh-sis-badge mh-sis-badge--active">{c.grade}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="mh-sis-stack">
            <section className="mh-sis-dash__card">
              <h2>Cumulative Stats</h2>
              <div className="mh-sis-summary">
                {r.history.cumulative.map((row) => (
                  <div key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            </section>
            {r.history.aiNote ? (
              <section className="mh-sis-ai-banner">
                <div className="mh-sis-ai-banner__title">
                  <img src="/brand/icons/sparkle.svg" alt="" width={16} height={16} />
                  <strong>AI note</strong>
                </div>
                <p>{r.history.aiNote}</p>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {r.statusTimeline ? (
        <section className="mh-sis-dash__card">
          <div className="mh-sis-rg-status">
            {r.statusTimeline.map((item) => (
              <div key={item.status + item.date} className="mh-sis-rg-status__item">
                <span className={badgeClass(item.tone)}>{item.status}</span>
                <div>
                  <strong>{item.detail}</strong>
                  <span>
                    {item.date}
                    {item.actor ? ` · ${item.actor}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {r.transfer ? (
        <section className="mh-sis-dash__card">
          <div className="mh-sis-rg-transfer__inst">
            <strong>{r.transfer.institution}</strong>
            <span className="mh-sis-badge mh-sis-badge--active">{r.transfer.accreditation}</span>
          </div>
          <div className="mh-sis-table">
            <div className="mh-sis-table__head" style={{ gridTemplateColumns: "minmax(120px,1fr) minmax(120px,1fr) 120px" }}>
              <span>External Course</span>
              <span>Heritage Equivalent</span>
              <span>Status</span>
            </div>
            {r.transfer.rows.map((row) => (
              <div
                key={row.external}
                className="mh-sis-table__row mh-sis-grades__row"
                style={{ gridTemplateColumns: "minmax(120px,1fr) minmax(120px,1fr) 120px" }}
              >
                <span className="mh-sis-table__primary">{row.external}</span>
                <span style={{ fontSize: 13 }}>{row.equivalent}</span>
                <span className={badgeClass(row.tone)}>{row.status}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {r.standing ? (
        <div className="mh-sis-detail-grid">
          <div className="mh-sis-stack">
            <section className="mh-sis-dash__card">
              <h2>Current Standing</h2>
              <div className="mh-sis-rg-standing-current">
                <span className="mh-sis-badge mh-sis-badge--active">{r.standing.current.label}</span>
                <span>Effective {r.standing.current.effective}</span>
              </div>
            </section>
            <section className="mh-sis-dash__card">
              <h2>Standing Audit</h2>
              <div className="mh-sis-table">
                <div className="mh-sis-table__head" style={{ gridTemplateColumns: "110px 130px 80px minmax(140px,1fr)" }}>
                  <span>Term</span>
                  <span>Standing</span>
                  <span>GPA</span>
                  <span>Notes</span>
                </div>
                {r.standing.audits.map((row) => (
                  <div
                    key={row.term}
                    className="mh-sis-table__row mh-sis-grades__row"
                    style={{ gridTemplateColumns: "110px 130px 80px minmax(140px,1fr)" }}
                  >
                    <span className="mh-sis-table__primary">{row.term}</span>
                    <span style={{ fontSize: 13 }}>{row.standing}</span>
                    <span style={{ fontSize: 13 }}>{row.gpa}</span>
                    <span style={{ fontSize: 13, color: "#5c5f5a" }}>{row.notes || "—"}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <section className="mh-sis-dash__card">
            <h2>Policy Guidelines</h2>
            <ul className="mh-sis-rg-policies">
              {r.standing.policies.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {r.audit ? (
        <div className="mh-sis-detail-grid">
          <div className="mh-sis-stack">
            {r.audit.sections.map((sec) => (
              <section key={sec.title} className="mh-sis-dash__card">
                <div className="mh-sis-rg-term__head">
                  <h2 style={{ margin: 0 }}>{sec.title}</h2>
                  <span className={sec.complete ? "mh-sis-badge mh-sis-badge--active" : "mh-sis-rg-term__meta"}>
                    {sec.progress}
                  </span>
                </div>
                {sec.courses?.length ? (
                  <div className="mh-sis-rg-audit-courses">
                    {sec.courses.map((c) => (
                      <div key={c.code} className="mh-sis-rg-audit-courses__row">
                        <div>
                          <strong>{c.code}</strong>
                          <span>{c.title}</span>
                        </div>
                        <span className={badgeClass(c.tone)}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
          <section className="mh-sis-dash__card">
            <h2>Audit Overview</h2>
            <div className="mh-sis-summary">
              {r.audit.overview.map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {r.transcript ? (
        <section className="mh-sis-dash__card mh-sis-rg-transcript">
          <div className="mh-sis-rg-transcript__header">
            <strong>{r.transcript.school}</strong>
            <span>Official Transcript Preview</span>
          </div>
          <p className="mh-sis-rg-transcript__student">{r.transcript.studentLine}</p>
          <p className="mh-sis-rg-transcript__program">{r.transcript.program}</p>
          {r.transcript.terms.map((term) => (
            <div key={term.label} className="mh-sis-rg-transcript__term">
              <h3>{term.label}</h3>
              {term.courses.map((c) => (
                <div key={c.code} className="mh-sis-rg-transcript__course">
                  <span>
                    {c.code}
                    {c.title ? ` ${c.title}` : ""}
                  </span>
                  <span>
                    {c.grade}
                    {c.credits ? ` · ${c.credits}` : ""}
                  </span>
                </div>
              ))}
            </div>
          ))}
          <div className="mh-sis-rg-transcript__totals">
            <span>Total Credits: {r.transcript.totals.credits}</span>
            <span>Cumulative GPA: {r.transcript.totals.gpa}</span>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CorrectionView({ config }: { config: SisScreenConfig }) {
  const c = config.correction!;
  return (
    <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={config.figmaId}>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <div className="mh-sis-case-header__type">{c.eyebrow}</div>
          <h1>{c.title}</h1>
          <p>{config.subtitle}</p>
        </div>
      </div>
      <div className="mh-sis-detail-grid mh-sis-rg-correction">
        <section className="mh-sis-dash__card">
          <h2>Step 1 · Identify Record</h2>
          <div className="mh-sis-summary" style={{ marginBottom: 20 }}>
            <div>
              <span>Student ID</span>
              <strong>{c.record.id}</strong>
            </div>
            <div>
              <span>Student</span>
              <strong>{c.record.name}</strong>
            </div>
            <div>
              <span>Correction Type</span>
              <strong>{c.record.type}</strong>
            </div>
          </div>
          <h2>Step 2 · Before / After</h2>
          <div className="mh-sis-rg-correction__compare">
            <div className="mh-sis-rg-correction__pane is-before">
              <span>Before</span>
              <strong>
                {c.before.value} · {c.before.label}
              </strong>
            </div>
            <div className="mh-sis-rg-correction__pane is-after">
              <span>After</span>
              <strong>
                {c.after.value} · {c.after.label}
              </strong>
            </div>
          </div>
          <label className="mh-sis-field" style={{ marginTop: 16 }}>
            <span>{c.reasonLabel || "Correction Reason"}</span>
            <textarea className="mh-sis-rg-correction__reason" placeholder={c.reasonPlaceholder || "Enter reason…"} rows={4} />
          </label>
        </section>
        <section className="mh-sis-dash__card">
          <h2>Audit & Authorization</h2>
          <div className="mh-sis-rg-correction__auth">
            <span className="mh-sis-reviewer__avatar mh-sis-reviewer__avatar--sm">
              {c.authorizer.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")}
            </span>
            <div>
              <strong>{c.authorizer.name}</strong>
              <span>{c.authorizer.role}</span>
            </div>
          </div>
          <div className="mh-sis-rg-correction__notice">{c.notice}</div>
          <ActionBtn label={(c.applyLabel) || "Save"} />
        </section>
      </div>
    </div>
  );
}

function queueFallback(_title: string) {
  return [];
}

function AdminSisBody({ path, chrome }: { path: string; chrome: SisScreenConfig }) {
  const [payload, setPayload] = useState<Partial<SisScreenConfig> | null>(null);
  const onPayload = useCallback((next: Partial<SisScreenConfig> | null) => {
    setPayload(next);
  }, []);
  const config = mergeSisLive(chrome, payload);

  const showPlatformNav = Boolean(config.platformNav || path.startsWith("/admin/f/pl-"));
  const showLabsNav =
    Boolean(config.labsNav || path.startsWith("/admin/f/lb-") || /^\/admin\/f\/xx-[1-4]-/.test(path));
  const showComplianceNav =
    Boolean(config.complianceNav || path.startsWith("/admin/f/cp-") || path.startsWith("/admin/f/xx-9-"));
  const showAiNav = Boolean(config.aiNav || path.startsWith("/admin/f/ai-"));
  const showAcademicsNav = Boolean(config.academicsNav || path.startsWith("/admin/f/ac-"));
  const showAdmissionsNav = path.startsWith("/admin/f/ad-");
  const showPracticumNav =
    path.startsWith("/admin/f/pr-") || /^\/admin\/f\/xx-[5-8]-/.test(path);
  const showRegistrarNav = path.startsWith("/admin/f/rg-");
  const showCrmNav = path.startsWith("/admin/f/crm-");
  const showFinanceNav = path.startsWith("/admin/f/fn-");
  const showSuccessNav = path.startsWith("/admin/f/ss-");
  const showWorkflowNav = path.startsWith("/admin/f/wf-");
  const showFormsNav = path.startsWith("/admin/f/fm-");
  const showRulesNav = path.startsWith("/admin/f/rl-");
  const showSideNav =
    showPlatformNav ||
    showLabsNav ||
    showComplianceNav ||
    showAiNav ||
    showAcademicsNav ||
    showAdmissionsNav ||
    showPracticumNav ||
    showRegistrarNav ||
    showCrmNav ||
    showFinanceNav ||
    showSuccessNav ||
    showWorkflowNav ||
    showFormsNav ||
    showRulesNav;

  return (
    <SisLiveProvider path={path} onPayload={onPayload}>
      <div className={showSideNav ? "mh-sis-platform-layout" : undefined}>
        {showPlatformNav ? <PlatformSubnav activePath={path} /> : null}
        {showLabsNav ? <LabsSubnav activePath={path} /> : null}
        {showComplianceNav ? <ComplianceSubnav activePath={path} /> : null}
        {showAiNav ? <AiHubSubnav activePath={path} /> : null}
        {showAcademicsNav ? <AcademicsSubnav activePath={path} /> : null}
        {showAdmissionsNav ? <ModuleSubnav label="Admissions" items={ADMISSIONS_NAV} activePath={path} /> : null}
        {showPracticumNav ? <ModuleSubnav label="Practicum" items={PRACTICUM_NAV} activePath={path} /> : null}
        {showRegistrarNav ? <ModuleSubnav label="Registrar" items={REGISTRAR_NAV} activePath={path} /> : null}
        {showCrmNav ? <ModuleSubnav label="CRM" items={CRM_NAV} activePath={path} /> : null}
        {showFinanceNav ? <ModuleSubnav label="Finance" items={FINANCE_NAV} activePath={path} /> : null}
        {showSuccessNav ? <ModuleSubnav label="Student Success" items={SUCCESS_NAV} activePath={path} /> : null}
        {showWorkflowNav ? <ModuleSubnav label="Workflows" items={WORKFLOW_NAV} activePath={path} /> : null}
        {showFormsNav ? <ModuleSubnav label="Forms" items={FORMS_NAV} activePath={path} /> : null}
        {showRulesNav ? <ModuleSubnav label="Rules" items={RULES_NAV} activePath={path} /> : null}
        <div className={showSideNav ? "mh-sis-platform-content" : undefined}>
          <SisLiveStatusBar />
          {!payload ? (
            <div className="mh-sis-dash mh-sis-dash--wide" data-figma-id={chrome.figmaId}>
              <div className="mh-sis-dash__welcome">
                <div className="mh-sis-dash__welcome-text">
                  <h1>{chrome.title}</h1>
                  <p>Loading live campus data…</p>
                </div>
              </div>
            </div>
          ) : (
            <>
          {config.archetype === "queue" ? <QueueView config={config} /> : null}
          {config.archetype === "detail" ? <DetailView config={config} /> : null}
          {config.archetype === "dashboard" ? <DashboardView config={config} /> : null}
          {config.archetype === "builder" ? <BuilderView config={config} /> : null}
          {config.archetype === "workspace" ? <WorkspaceView config={config} /> : null}
          {config.archetype === "grades" ? <GradesView config={config} /> : null}
          {config.archetype === "wizard" ? <WizardView config={config} /> : null}
          {config.archetype === "profile360" ? <Profile360View config={config} /> : null}
          {config.archetype === "case" ? <CaseView config={config} /> : null}
          {config.archetype === "plan" ? <PlanView config={config} /> : null}
          {config.archetype === "appointments" ? <AppointmentsView config={config} /> : null}
          {config.archetype === "analytics" ? <AnalyticsView config={config} /> : null}
          {config.archetype === "account" ? <AccountView config={config} /> : null}
          {config.archetype === "reconcile" ? <ReconcileView config={config} /> : null}
          {config.archetype === "holds" ? <HoldsView config={config} /> : null}
          {config.archetype === "export" ? <ExportView config={config} /> : null}
          {config.archetype === "registrarRecord" ? <RegistrarRecordView config={config} /> : null}
          {config.archetype === "correction" ? <CorrectionView config={config} /> : null}
          {config.archetype === "lead360" ? <Lead360View config={config} /> : null}
          {config.archetype === "campaignDetail" ? <CampaignDetailView config={config} /> : null}
          {config.archetype === "events" ? <EventsView config={config} /> : null}
          {config.archetype === "tasks" ? <TasksView config={config} /> : null}
          {config.archetype === "matrix" ? <MatrixView config={config} /> : null}
          {config.archetype === "policy" ? <PolicyView config={config} /> : null}
          {config.archetype === "integrations" ? <IntegrationsView config={config} /> : null}
          {config.archetype === "operations" ? <OperationsView config={config} /> : null}
          {config.archetype === "settings" ? <SettingsView config={config} /> : null}
          {config.archetype === "templates" ? <TemplatesView config={config} /> : null}
          {config.archetype === "versionDiff" ? <VersionDiffView config={config} /> : null}
          {config.archetype === "ruleDesigner" ? <RuleDesignerView config={config} /> : null}
          {config.archetype === "simulator" ? <SimulatorView config={config} /> : null}
          {config.archetype === "testRunner" ? <TestRunnerView config={config} /> : null}
          {config.archetype === "retrieval" ? <RetrievalView config={config} /> : null}
          {config.archetype === "citation" ? <CitationView config={config} /> : null}
          {config.archetype === "usageCost" ? <UsageCostView config={config} /> : null}
          {config.archetype === "partnerDetail" ? <PartnerDetailView config={config} /> : null}
          {config.archetype === "employerPortal" ? <EmployerPortalView config={config} /> : null}
          {config.archetype === "searchResults" ? <SearchResultsView config={config} /> : null}
          {config.archetype === "labDash" ? <LabDashView config={config} /> : null}
          {config.archetype === "labRooms" ? <LabRoomsView config={config} /> : null}
          {config.archetype === "labSafety" ? <LabSafetyView config={config} /> : null}
          {config.archetype === "labSession" ? <LabSessionView config={config} /> : null}
          {config.archetype === "labNotebook" ? <LabNotebookView config={config} /> : null}
          {config.archetype === "labIncident" ? <LabIncidentView config={config} /> : null}
          {config.archetype === "labVirtual" ? <LabVirtualView config={config} /> : null}
          {config.archetype === "complianceDash" ? <ComplianceDashView config={config} /> : null}
          {config.archetype === "cpCompleteness" ? <CpCompletenessView config={config} /> : null}
          {config.archetype === "cpRetention" ? <CpRetentionView config={config} /> : null}
          {config.archetype === "cpHolds" ? <CpHoldsView config={config} /> : null}
          {config.archetype === "cpEvidence" ? <CpEvidenceView config={config} /> : null}
          {config.archetype === "cpAccreditation" ? <CpAccreditationView config={config} /> : null}
          {config.archetype === "cpInspection" ? <CpInspectionView config={config} /> : null}
          {config.archetype === "cpDisposal" ? <CpDisposalView config={config} /> : null}
          {config.archetype === "cpPrivacy" ? <CpPrivacyView config={config} /> : null}
          {config.archetype === "aiDash" ? <AiDashView config={config} /> : null}
            </>
          )}
        </div>
      </div>
    </SisLiveProvider>
  );
}

export function AdminSisScreen({ path }: { path: string }) {
  const router = useRouter();
  const chrome = ADMIN_SIS_SCREENS[path];
  const [userName, setUserName] = useState("Admin User");

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setUserName(`${s.givenName} ${s.familyName}`.trim() || "Admin User");
  }, [router]);

  if (!chrome) {
    return <p style={{ padding: 32 }}>Unknown SIS screen: {path}</p>;
  }

  return (
    <AdminSisShell
      activeHref={chrome.activeHref}
      breadcrumbs={chrome.breadcrumbs}
      userName={userName}
      userRole="Registrar's Office"
    >
      <AdminSisBody key={path} path={path} chrome={chrome} />
    </AdminSisShell>
  );
}

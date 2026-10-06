"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSisShell } from "@/components/AdminSisShell";
import { AdminQuickAccess, type AdminTodo } from "@/components/dashboard/AdminQuickAccess";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { SisActionBtn } from "@/components/SisActionBtn";
import { SisLiveProvider, useSisLive } from "@/lib/useAdminSisLive";
import { api, loadSession } from "@/lib/api";

type CampusOverview = {
  institutionName: string;
  termName: string;
  termProgressPct: number;
  students: number;
  teachers: number;
  programs: number;
  courses: number;
  sections: number;
  enrolments: number;
  accounts: number;
  pendingApprovals: number;
  pendingGrades: number;
  publishedGrades: number;
  atRisk: number;
  pendingEvaluations: number;
  pendingLoa: number;
  pendingTasks: number;
  feesPostedCad: number;
  feesOpenCad: number;
  feesPastDueCad: number;
  activity: Array<{ actor: string; detail: string; when: string }>;
  health: Array<{ label: string; value: string }>;
};

function money(n: number) {
  return `CAD ${n.toLocaleString()}`;
}

function KpiButton({
  label,
  value,
  hint,
  href,
  danger,
}: {
  label: string;
  value: string | number;
  hint: string;
  href: string;
  danger?: boolean;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="mh-sis-dash__kpi mh-sis-dash__kpi--link"
      onClick={() => router.push(href)}
    >
      <div className="mh-sis-dash__kpi-label">{label}</div>
      <div className="mh-sis-dash__kpi-value">{value}</div>
      <div className={`mh-sis-dash__kpi-hint${danger ? " is-danger" : " is-up"}`}>{hint}</div>
    </button>
  );
}

function AdminHomeBody({ stats }: { stats: CampusOverview | null }) {
  const router = useRouter();
  const live = useSisLive();
  const loading = stats === null;
  const todos: AdminTodo[] | null = stats
    ? [
        { count: stats.pendingApprovals, one: "pending approval", many: "pending approvals", href: "/admin/approvals" },
        { count: stats.pendingGrades, one: "grade awaiting publish", many: "grades awaiting publish", href: "/admin/f/ac-13-pending-grades" },
        { count: stats.pendingLoa, one: "leave of absence request", many: "leave of absence requests", href: "/admin/f/ac-18-loa-requests" },
        { count: stats.atRisk, one: "at-risk student", many: "at-risk students", href: "/admin/f/ss-02-alert-queue" },
        { count: stats.pendingEvaluations, one: "pending evaluation", many: "pending evaluations", href: "/admin/f/ac-15-course-evaluations" },
      ]
        .filter((t) => t.count > 0)
        .map((t) => ({ label: `${t.count} ${t.count === 1 ? t.one : t.many}`, href: t.href }))
    : null;

  return (
    <div className="mh-sis-dash" data-figma-id="168:10">
      <div className="mh-ct-dash">
        <div className="mh-ct-dash__main">
          <DashboardContent />
        </div>
        <AdminQuickAccess todos={todos} />
      </div>
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>Welcome back, Administrator</h1>
          <p>
            {stats
              ? `${stats.institutionName} · ${stats.termName} · ${stats.pendingApprovals} pending approvals · ${stats.enrolments} enrolments`
              : "Loading live campus data…"}
          </p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <SisActionBtn label="Student onboard" href="/admin/users/create?role=student" tone="secondary" />
          <SisActionBtn label="Instructor onboard" href="/admin/users/create?role=instructor" tone="secondary" />
          <SisActionBtn label="Enrol student" href="/admin/enrolments" />
        </div>
      </div>
      {live.toast ? (
        <p style={{ color: "#0f766e", fontSize: 13, marginBottom: 8 }}>{live.toast}</p>
      ) : null}

      <h2 className="mh-sis-dash__section-title">Campus scale</h2>
      <div className="mh-sis-dash__kpis mh-sis-dash__kpis--wrap">
        <KpiButton
          label="Students"
          value={loading ? "…" : stats.students}
          hint="Live roster"
          href="/admin/f/rg-01-student-360"
        />
        <KpiButton
          label="Teachers"
          value={loading ? "…" : stats.teachers}
          hint="Instructor accounts"
          href="/admin/f/ac-14-faculty-360"
        />
        <KpiButton
          label="Programs"
          value={loading ? "…" : stats.programs}
          hint="Catalogue"
          href="/admin/f/ac-03-programs"
        />
        <KpiButton
          label="Courses"
          value={loading ? "…" : stats.courses}
          hint="Catalogue"
          href="/admin/f/ac-06-course-catalogue"
        />
        <KpiButton
          label="Sections"
          value={loading ? "…" : stats.sections}
          hint="Current offerings"
          href="/admin/f/ac-09-sections"
        />
        <KpiButton
          label="Enrolments"
          value={loading ? "…" : stats.enrolments}
          hint="Student ↔ section"
          href="/admin/enrolments"
        />
      </div>

      <h2 className="mh-sis-dash__section-title">Fees & queues</h2>
      <div className="mh-sis-dash__kpis mh-sis-dash__kpis--wrap">
        <KpiButton
          label="Fees / AR open"
          value={loading ? "…" : money(stats.feesOpenCad)}
          hint={
            loading
              ? "Finance"
              : stats.feesPastDueCad > 0
                ? `${money(stats.feesPastDueCad)} past due`
                : `${money(stats.feesPostedCad)} posted`
          }
          href="/admin/f/fn-01-finance-dashboard"
          danger={!loading && stats.feesPastDueCad > 0}
        />
        <KpiButton
          label="Pending approvals"
          value={loading ? "…" : stats.pendingApprovals}
          hint="Action required"
          href="/admin/approvals"
          danger
        />
        <KpiButton
          label="Pending grades"
          value={loading ? "…" : stats.pendingGrades}
          hint={loading ? "Draft / publish" : `${stats.publishedGrades} published`}
          href="/admin/f/ac-13-pending-grades"
          danger={!loading && stats.pendingGrades > 0}
        />
        <KpiButton
          label="At-risk students"
          value={loading ? "…" : stats.atRisk}
          hint="Standing alerts"
          href="/admin/f/ss-02-alert-queue"
          danger={!loading && stats.atRisk > 0}
        />
        <KpiButton
          label="Pending evaluations"
          value={loading ? "…" : stats.pendingEvaluations}
          hint="Course evals"
          href="/admin/f/ac-15-course-evaluations"
        />
        <KpiButton
          label="Pending LOA"
          value={loading ? "…" : stats.pendingLoa}
          hint={loading ? "Leave requests" : `${stats.pendingTasks} open tasks`}
          href="/admin/f/ac-18-loa-requests"
          danger={!loading && stats.pendingLoa > 0}
        />
      </div>

      <div className="mh-sis-dash__split">
        <section className="mh-sis-dash__card mh-sis-dash__activity">
          <h2>Recent Administrative Activity</h2>
          <div className="mh-sis-dash__feed">
            {(stats?.activity || []).map((row, index) => (
              <div key={`${index}:${row.actor}${row.when}${row.detail}`} className="mh-sis-dash__feed-row">
                <div className="mh-sis-dash__feed-detail">
                  <span className="mh-sis-dash__dot" />
                  <div className="mh-sis-dash__actor-meta">
                    <div className="mh-sis-dash__actor">{row.actor}</div>
                    <div className="mh-sis-dash__detail">{row.detail}</div>
                  </div>
                </div>
                <div className="mh-sis-dash__when">{row.when}</div>
              </div>
            ))}
            {!stats?.activity?.length ? (
              <div className="mh-sis-dash__detail">No recent audit events yet.</div>
            ) : null}
          </div>
        </section>

        <section className="mh-sis-dash__card mh-sis-dash__health">
          <h2>System Health & Term Progress</h2>
          <div className="mh-sis-dash__health-metrics">
            {(stats?.health || []).map((row) => (
              <div key={row.label} className="mh-sis-dash__health-row">
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
            <div className="mh-sis-dash__divider" />
            <div className="mh-sis-dash__term">
              <div className="mh-sis-dash__progress-label">
                <strong>{stats?.termName || "Current term"}</strong>
                <span>{loading ? "…" : `${stats.termProgressPct}%`}</span>
              </div>
              <div className="mh-sis-dash__progress-track">
                <div
                  className="mh-sis-dash__progress-fill"
                  style={{ width: `${loading ? 50 : stats.termProgressPct}%` }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button type="button" className="mh-sis-dash__link-btn" onClick={() => router.push("/admin/finance/posting")}>
                AR posting
              </button>
              <button type="button" className="mh-sis-dash__link-btn" onClick={() => router.push("/admin/student-documents")}>
                Documents
              </button>
              <button type="button" className="mh-sis-dash__link-btn" onClick={() => router.push("/admin/tax-documents")}>
                Tax docs
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AdminHomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Admin User");
  const [stats, setStats] = useState<CampusOverview | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    if (!s.roles.includes("admin") && !s.roles.includes("registrar")) {
      if (s.roles.includes("instructor")) router.replace("/instructor");
      else if (s.roles.includes("student")) router.replace("/student");
      else if (s.roles.includes("applicant")) router.replace("/applicant");
      else if (s.roles.includes("employer")) router.replace("/employer");
      else router.replace("/login");
      return;
    }
    setUserName(`${s.givenName} ${s.familyName}`.trim() || "Admin User");
    setAllowed(true);

    api<CampusOverview>("/admin/campus-overview", {}, s.accessToken)
      .then(setStats)
      .catch(() => {
        setStats({
          institutionName: "Heritage College",
          termName: "Current term",
          termProgressPct: 0,
          students: 0,
          teachers: 0,
          programs: 0,
          courses: 0,
          sections: 0,
          enrolments: 0,
          accounts: 0,
          pendingApprovals: 0,
          pendingGrades: 0,
          publishedGrades: 0,
          atRisk: 0,
          pendingEvaluations: 0,
          pendingLoa: 0,
          pendingTasks: 0,
          feesPostedCad: 0,
          feesOpenCad: 0,
          feesPastDueCad: 0,
          activity: [],
          health: [{ label: "API", value: "Unavailable" }],
        });
      });
  }, [router]);

  if (!allowed) return null;

  return (
    <AdminSisShell activeHref="/admin" userName={userName} userRole="Registrar's Office">
      <SisLiveProvider path="/admin" onPayload={() => undefined}>
        <AdminHomeBody stats={stats} />
      </SisLiveProvider>
    </AdminSisShell>
  );
}

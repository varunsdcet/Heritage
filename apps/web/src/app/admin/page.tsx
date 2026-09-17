"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSisShell } from "@/components/AdminSisShell";
import { SisActionBtn } from "@/components/SisActionBtn";
import { SisLiveProvider, useSisLive } from "@/lib/useAdminSisLive";
import { api, loadSession } from "@/lib/api";

const MODULE_DIRECTORY = [
  { label: "Admissions", href: "/admin/f/ad-01-admissions-dashboard", hint: "11 screens" },
  { label: "CRM", href: "/admin/f/crm-01-dashboard", hint: "8 screens" },
  { label: "Registrar", href: "/admin/f/rg-00-registrar-dashboard", hint: "10 screens" },
  { label: "Student Success", href: "/admin/f/ss-01-success-dashboard", hint: "7 screens" },
  { label: "Academics", href: "/admin/f/ac-03-programs", hint: "20 screens" },
  { label: "Labs", href: "/admin/f/lb-01-lab-dashboard", hint: "12 + XX" },
  { label: "Practicum", href: "/admin/f/pr-01-practicum-dashboard", hint: "10 + XX" },
  { label: "Finance", href: "/admin/f/fn-01-finance-dashboard", hint: "8 screens" },
  { label: "AI Hub", href: "/admin/f/ai-01-ai-dashboard", hint: "12 screens" },
  { label: "Compliance", href: "/admin/f/cp-01-compliance-dashboard", hint: "10 + XX" },
  { label: "Platform", href: "/admin/f/pl-07-institution-settings", hint: "8 screens" },
  { label: "Forms", href: "/admin/f/fm-01-form-list", hint: "4 screens" },
  { label: "Rules", href: "/admin/f/rl-01-rule-sets", hint: "3 screens" },
  { label: "Workflows", href: "/admin/f/wf-01-workflow-list", hint: "4 screens" },
  { label: "Search", href: "/admin/search", hint: "Global" },
  { label: "Analytics", href: "/admin/analytics", hint: "Global" },
  { label: "Approvals", href: "/admin/approvals", hint: "Global" },
  { label: "Security", href: "/admin/security", hint: "Global" },
  { label: "Audit", href: "/admin/audit", hint: "Global" },
  { label: "Admin Login", href: "/admin/f/sh-01-login-admin", hint: "Auth" },
];

type HomeStats = {
  students: number;
  sections: number;
  users: number;
  approvals: number;
  activity: Array<{ actor: string; detail: string; when: string }>;
  health: Array<{ label: string; value: string }>;
  termName: string;
};

function AdminHomeBody({ stats }: { stats: HomeStats | null }) {
  const router = useRouter();
  const live = useSisLive();
  const students = stats?.students ?? "…";
  const approvals = stats?.approvals ?? "…";
  const users = stats?.users ?? "…";
  const sections = stats?.sections ?? "…";

  return (
    <div className="mh-sis-dash" data-figma-id="168:10">
      <div className="mh-sis-dash__welcome">
        <div className="mh-sis-dash__welcome-text">
          <h1>Welcome back, Administrator</h1>
          <p>
            {stats
              ? `Live campus data · ${approvals} pending approvals · ${users} directory accounts`
              : "Loading live campus data…"}
          </p>
        </div>
        <div className="mh-sis-dash__banner-actions">
          <SisActionBtn label="Backup System" tone="secondary" />
          <SisActionBtn label="New System Notice" href="/admin/notifications" />
        </div>
      </div>
      {live.toast ? (
        <p style={{ color: "#0f766e", fontSize: 13, marginBottom: 8 }}>{live.toast}</p>
      ) : null}

      <div className="mh-sis-dash__kpis">
        <button
          type="button"
          className="mh-sis-dash__kpi mh-sis-dash__kpi--link"
          onClick={() => router.push("/admin/f/rg-00-registrar-dashboard")}
        >
          <div className="mh-sis-dash__kpi-label">Enrolled Students</div>
          <div className="mh-sis-dash__kpi-value">{students}</div>
          <div className="mh-sis-dash__kpi-hint is-up">Live roster</div>
        </button>
        <button
          type="button"
          className="mh-sis-dash__kpi mh-sis-dash__kpi--link"
          onClick={() => router.push("/admin/f/ac-09-sections")}
        >
          <div className="mh-sis-dash__kpi-label">Active Sections</div>
          <div className="mh-sis-dash__kpi-value">{sections}</div>
          <div className="mh-sis-dash__kpi-hint">Current term</div>
        </button>
        <button
          type="button"
          className="mh-sis-dash__kpi mh-sis-dash__kpi--link"
          onClick={() => router.push("/admin/f/pl-01-users-and-roles")}
        >
          <div className="mh-sis-dash__kpi-label">Directory Accounts</div>
          <div className="mh-sis-dash__kpi-value">{users}</div>
          <div className="mh-sis-dash__kpi-hint">Users & roles</div>
        </button>
        <button
          type="button"
          className="mh-sis-dash__kpi mh-sis-dash__kpi--link"
          onClick={() => router.push("/admin/approvals")}
        >
          <div className="mh-sis-dash__kpi-label">Pending Approvals</div>
          <div className="mh-sis-dash__kpi-value">{approvals}</div>
          <div className="mh-sis-dash__kpi-hint is-danger">Action required</div>
        </button>
      </div>

      <div className="mh-sis-dash__split">
        <section className="mh-sis-dash__card mh-sis-dash__activity">
          <h2>Recent Administrative Activity</h2>
          <div className="mh-sis-dash__feed">
            {(stats?.activity || []).map((row) => (
              <div key={row.actor + row.when + row.detail} className="mh-sis-dash__feed-row">
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
                <span>Live</span>
              </div>
              <div className="mh-sis-dash__progress-track">
                <div className="mh-sis-dash__progress-fill" style={{ width: "50%" }} />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mh-sis-dash__card" style={{ marginTop: 20 }}>
        <h2>Module directory</h2>
        <p style={{ margin: "0 0 16px", color: "#5c635a", fontSize: 14 }}>
          Jump into every admin module. Open a sidebar group to reach every screen in that module.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {MODULE_DIRECTORY.map((mod) => (
            <button
              key={mod.href}
              type="button"
              className="mh-sis-dash__kpi mh-sis-dash__kpi--link"
              style={{ textAlign: "left", minHeight: 88 }}
              onClick={() => router.push(mod.href)}
            >
              <div className="mh-sis-dash__kpi-label">{mod.label}</div>
              <div className="mh-sis-dash__kpi-hint">{mod.hint}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AdminHomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Admin User");
  const [stats, setStats] = useState<HomeStats | null>(null);
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

    type OpsPayload = {
      operations?: { health?: Array<{ label: string; value: string }> };
      activity?: Array<{ action?: string; at?: string; by?: string }>;
      kpis?: Array<{ label: string; value: string }>;
    };
    type RegistrarPayload = {
      registrarDash?: { audits?: Array<{ text: string; when: string }> };
      kpis?: Array<{ label: string; value: string }>;
    };

    Promise.all([
      api<{ items: unknown[] }>("/admin/users", {}, s.accessToken),
      api<{ items: unknown[] }>("/admin/sections", {}, s.accessToken),
      api<{ items?: Array<{ status?: string }> }>("/approvals", {}, s.accessToken).catch(() => ({
        items: [] as Array<{ status?: string }>,
      })),
      api<{ payload: OpsPayload }>(
        `/admin/sis/screen?path=${encodeURIComponent("/admin/f/pl-06-operations")}`,
        {},
        s.accessToken,
      ).catch(() => ({ payload: {} as OpsPayload })),
      api<{ payload: RegistrarPayload }>(
        `/admin/sis/screen?path=${encodeURIComponent("/admin/f/rg-00-registrar-dashboard")}`,
        {},
        s.accessToken,
      ).catch(() => ({ payload: {} as RegistrarPayload })),
    ])
      .then(([users, sections, approvals, ops, registrar]) => {
        const approvalItems = (approvals.items ?? []).filter((a) => a.status === "pending");
        const studentKpi = registrar.payload.kpis?.find((k) => /student/i.test(k.label));
        const audits = registrar.payload.registrarDash?.audits ?? [];
        const activity =
          audits.length > 0
            ? audits.map((a) => ({ actor: "Registrar", detail: a.text, when: a.when }))
            : (ops.payload.activity || []).slice(0, 6).map((a) => ({
                actor: a.by?.slice(0, 8) || "Admin",
                detail: a.action || "SIS action",
                when: a.at ? a.at.slice(0, 16).replace("T", " ") : "Recently",
              }));
        setStats({
          students: studentKpi ? Number(studentKpi.value) || 0 : 0,
          sections: sections.items.length,
          users: users.items.length,
          approvals: approvalItems.length,
          activity,
          health: ops.payload.operations?.health?.length
            ? ops.payload.operations.health.map((h) => ({ label: h.label, value: h.value }))
            : [
                { label: "API", value: "Healthy" },
                { label: "SIS screens", value: "Live" },
                { label: "Directory", value: `${users.items.length} accounts` },
              ],
          termName: "Fall 2026",
        });
      })
      .catch(() => {
        setStats({
          students: 0,
          sections: 0,
          users: 0,
          approvals: 0,
          activity: [],
          health: [{ label: "API", value: "Unavailable" }],
          termName: "Current term",
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, StatusPill } from "@myheritage/ui";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import {
  AdminFilterChip,
  AdminKpiCard,
  AdminPageFrame,
  AdminPageHeader,
  AdminQueueRow,
  AdminQuickAction,
  AdminTableRow,
  AdminTableShell,
  adminCardStyle,
} from "@/components/AdminPortalChrome";
import { api, loadSession } from "@/lib/api";
import type { PortalView } from "@/components/LiveScreen";

export type AdminArchetype = "dashboard" | "queue" | "detail" | "builder";

type Props = {
  path: string;
  title: string;
  figmaId?: string;
  archetype: AdminArchetype;
};

function humanTitle(raw: string) {
  return raw
    .replace(/^[a-z]{1,3}-\d{1,3}-/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fixtureRows(title: string) {
  const base = humanTitle(title);
  return [
    { primary: `${base} · Record A`, secondary: "Assigned to Registrar Ops", meta: "In Review", href: undefined as string | undefined },
    { primary: `${base} · Record B`, secondary: "Needs verification", meta: "New" },
    { primary: `${base} · Record C`, secondary: "SLA 2 days remaining", meta: "Decision" },
    { primary: `${base} · Record D`, secondary: "Owner: Admin Sarah", meta: "Offer Sent" },
    { primary: `${base} · Record E`, secondary: "Priority queue", meta: "Interview" },
  ];
}

function stageTone(meta?: string): "success" | "ai" | "warning" | "neutral" | "danger" {
  const m = (meta ?? "").toLowerCase();
  if (/offer|interview|approved|active|compliant/.test(m)) return "success";
  if (/review|progress/.test(m)) return "ai";
  if (/new|pending|decision/.test(m)) return "warning";
  if (/passed|fail|urgent/.test(m)) return "danger";
  return "neutral";
}

export function AdminDomainScreen({ path, title, figmaId, archetype }: Props) {
  const router = useRouter();
  const [view, setView] = useState<PortalView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(0);

  const displayTitle = humanTitle(title);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    api<PortalView>(`/portal/view?path=${encodeURIComponent(path)}`, {}, s.accessToken)
      .then(setView)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [path, router]);

  const rows = useMemo(() => {
    const live = view?.sections.flatMap((section) =>
      section.rows.map((row) => ({ ...row, section: section.title })),
    );
    if (live?.length) return live;
    return fixtureRows(title).map((r) => ({ ...r, section: "Records" }));
  }, [view, title]);

  const filtered = rows.filter((row) => {
    if (filter !== "all" && (row.meta || "").toLowerCase() !== filter) return false;
    if (!q.trim()) return true;
    const hay = `${row.primary} ${row.secondary ?? ""} ${row.meta ?? ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  const metrics = view?.metrics?.length
    ? view.metrics
    : [
        { label: "Open", value: String(Math.max(rows.length, 12)), hint: "Active workflow items" },
        { label: "Urgent", value: "3", hint: "Require action today" },
        { label: "SLA risk", value: "2", hint: "Due within 48h" },
        { label: "Completed", value: "48", hint: "Last 7 days" },
      ];

  return (
    <ScreenScaffold
      role="admin"
      title={displayTitle}
      subtitle={view?.subtitle || `Figma ${figmaId || "admin"} · live portal + design system chrome`}
      breadcrumb={view?.breadcrumb || ["Administration", displayTitle]}
      active={view?.active || "Overview"}
      hideChromeHeader
    >
      <AdminPageFrame figmaId={figmaId} className={`mh-admin-archetype--${archetype}`}>
        <AdminPageHeader
          title={displayTitle}
          subtitle={view?.subtitle || "Operational workspace aligned to MyHeritage admin design system"}
          actions={
            <>
              {(view?.actions?.length ? view.actions : [{ label: "Export", href: path, variant: "secondary" as const }]).map((a) => (
                <Button
                  key={a.label}
                  type="button"
                  variant={a.variant ?? "secondary"}
                  style={{ padding: "10px 14px", fontSize: 13 }}
                  onClick={() => a.href && router.push(a.href)}
                >
                  {a.label}
                </Button>
              ))}
            </>
          }
        />

        {error ? <p style={{ margin: 0, color: "#BA1A1A", fontSize: 13 }}>{error}</p> : null}

        {archetype === "dashboard" ? (
          <>
            <div className="mh-admin-grid-4">
              {metrics.slice(0, 4).map((m, idx) => (
                <AdminKpiCard key={m.label} label={m.label} value={m.value} hint={m.hint} urgent={idx === 1 ? 2 : undefined} />
              ))}
            </div>
            <div className="mh-admin-grid-main-side">
              <section className="mh-admin-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Quick Actions</h2>
                <AdminQuickAction label={`Open ${displayTitle} queue`} href={path} tone="brand" iconSrc="/brand/icons/file-text.svg" />
                <AdminQuickAction label="Ask MyHeritage ops" href="/admin/ai" tone="ai" iconSrc="/brand/icons/sparkle.svg" />
                <AdminQuickAction label="Browse all admin screens" href="/admin/all" tone="olive" iconSrc="/brand/icons/bar-chart.svg" />
              </section>
              <section className="mh-admin-card" style={{ padding: 24 }}>
                <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Recent activity</h2>
                {filtered.slice(0, 6).map((row, i) => (
                  <div key={row.primary + i} style={{ padding: "10px 0", borderBottom: "1px solid #E1E3DC" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{row.primary}</div>
                    <div style={{ fontSize: 12, color: "#8D928A" }}>{row.secondary || row.meta || "Updated recently"}</div>
                  </div>
                ))}
              </section>
            </div>
          </>
        ) : null}

        {archetype === "queue" ? (
          <>
            <div className="mh-admin-grid-4">
              {metrics.slice(0, 4).map((m) => (
                <AdminKpiCard key={m.label} label={m.label} value={m.value} hint={m.hint} />
              ))}
            </div>
            <div className="mh-admin-toolbar">
              <input
                className="mh-admin-toolbar__search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${displayTitle.toLowerCase()}…`}
              />
              {["Program", "Intake", "Stage", "Assigned to"].map((f) => (
                <button key={f} type="button" className="mh-admin-toolbar__btn">
                  {f} ▾
                </button>
              ))}
              <button type="button" className="mh-admin-toolbar__clear" onClick={() => setQ("")}>
                Clear all
              </button>
            </div>
            <AdminTableShell
              countLabel={`${filtered.length} records`}
              columns={["Primary", "Detail", "Status", "Action"]}
              columnTemplate="minmax(0, 1.4fr) minmax(0, 1.4fr) minmax(100px, 0.8fr) minmax(80px, 0.6fr)"
            >
              {filtered.map((row, idx) => (
                <AdminTableRow
                  key={row.primary + idx}
                  onClick={row.href ? () => router.push(row.href!) : undefined}
                  cells={[
                    <span key="p" style={{ fontWeight: 700, fontSize: 14 }}>
                      {row.primary}
                    </span>,
                    <span key="s" style={{ color: "#5C5F5A" }}>
                      {row.secondary || "—"}
                    </span>,
                    row.meta ? <StatusPill key="m" tone={stageTone(row.meta)}>{row.meta}</StatusPill> : "—",
                    <span key="a" className="mh-admin-table__link">
                      Review
                    </span>,
                  ]}
                />
              ))}
            </AdminTableShell>
          </>
        ) : null}

        {archetype === "detail" ? (
          <div className="mh-admin-grid-detail">
            <aside className="mh-admin-stack mh-admin-stack--tight">
              <AdminFilterChip label="All sections" count={filtered.length} active={filter === "all"} onClick={() => setFilter("all")} />
              {["In Review", "New", "Decision", "Interview"].map((f) => (
                <AdminFilterChip
                  key={f}
                  label={f}
                  count={rows.filter((r) => (r.meta || "") === f).length || 1}
                  active={filter === f.toLowerCase()}
                  onClick={() => setFilter(f.toLowerCase())}
                />
              ))}
            </aside>
            <div className="mh-admin-stack mh-admin-stack--tight">
              {filtered.map((row, idx) => (
                <AdminQueueRow
                  key={row.primary + idx}
                  title={row.primary}
                  subtitle={row.secondary}
                  meta={row.meta}
                  selected={selected === idx}
                  onClick={() => setSelected(idx)}
                />
              ))}
            </div>
            <section className="mh-admin-card" style={{ padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1B7A3D", textTransform: "uppercase" }}>Active record</div>
              <h2 style={{ margin: "6px 0 16px", fontSize: 18 }}>{filtered[selected]?.primary || displayTitle}</h2>
              <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
                <div>
                  <div style={{ color: "#8D928A", fontSize: 12 }}>SUMMARY</div>
                  <div>{filtered[selected]?.secondary || "No secondary detail"}</div>
                </div>
                <div>
                  <div style={{ color: "#8D928A", fontSize: 12 }}>STATUS</div>
                  <div>{filtered[selected]?.meta || "Open"}</div>
                </div>
                <div>
                  <div style={{ color: "#8D928A", fontSize: 12 }}>FIGMA NODE</div>
                  <div style={{ fontFamily: "ui-monospace, monospace" }}>{figmaId || "—"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <Button type="button" style={{ flex: 1 }}>
                  Save
                </Button>
                <Button type="button" variant="secondary" style={{ flex: 1 }}>
                  Audit trail
                </Button>
              </div>
            </section>
          </div>
        ) : null}

        {archetype === "builder" ? (
          <div className="mh-admin-grid-builder">
            <aside className="mh-admin-card" style={{ padding: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Palette</h3>
              {["Section", "Field", "Rule", "Approval step", "AI action"].map((item) => (
                <div
                  key={item}
                  style={{
                    padding: "10px 12px",
                    border: "1px dashed #E1E3DC",
                    borderRadius: 6,
                    marginBottom: 8,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {item}
                </div>
              ))}
            </aside>
            <main className="mh-admin-card" style={{ padding: 24, background: "#F9FAF6" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>{displayTitle}</h2>
              <p style={{ margin: "0 0 20px", color: "#5C5F5A", fontSize: 13 }}>
                Designer canvas · Figma node {figmaId || "n/a"} · drag blocks from the palette to compose this workflow.
              </p>
              <div style={{ display: "grid", gap: 12 }}>
                {["Start trigger", "Validation rules", "Human approval", "Write to system of record"].map((step, i) => (
                  <div
                    key={step}
                    style={{ ...adminCardStyle, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                  >
                    <span style={{ fontWeight: 600, minWidth: 0 }}>
                      {i + 1}. {step}
                    </span>
                    <StatusPill tone={i === 2 ? "warning" : "success"}>{i === 2 ? "Required" : "Ready"}</StatusPill>
                  </div>
                ))}
              </div>
            </main>
            <aside className="mh-admin-card" style={{ padding: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Inspector</h3>
              <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#5C5F5A", marginBottom: 12 }}>
                Name
                <input defaultValue={displayTitle} style={{ padding: 10, borderRadius: 6, border: "1px solid #E1E3DC", fontFamily: "inherit" }} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#5C5F5A", marginBottom: 12 }}>
                Owner role
                <input defaultValue="admin" style={{ padding: 10, borderRadius: 6, border: "1px solid #E1E3DC", fontFamily: "inherit" }} />
              </label>
              <Button type="button" style={{ width: "100%" }}>
                Publish draft
              </Button>
            </aside>
          </div>
        ) : null}
      </AdminPageFrame>
    </ScreenScaffold>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, StatusPill } from "@myheritage/ui";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import {
  AdminKpiCard,
  AdminPageFrame,
  AdminPageHeader,
  AdminTableRow,
  AdminTableShell,
} from "@/components/AdminPortalChrome";
import { api, loadSession } from "@/lib/api";
import { ALL_SCREENS } from "@/lib/screens";
import type { PortalView } from "@/components/LiveScreen";

function stageTone(meta?: string): "success" | "ai" | "warning" | "neutral" {
  const m = (meta ?? "").toLowerCase();
  if (/offer|interview|approved|active/.test(m)) return "success";
  if (/review|progress/.test(m)) return "ai";
  if (/new|pending|decision/.test(m)) return "warning";
  return "neutral";
}

/** Figma-styled admin portal renderer used by every /admin LiveScreen route. */
export function AdminLiveScreen({ path }: { path: string }) {
  const router = useRouter();
  const [view, setView] = useState<PortalView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const screen = useMemo(() => ALL_SCREENS.find((s) => s.path === path), [path]);

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

  if (error) {
    return (
      <div style={{ color: "var(--mh-danger)", padding: "1rem 0" }}>
        {error}
        <div style={{ marginTop: 12 }}>
          <Button type="button" variant="secondary" onClick={() => router.push("/login")}>
            Sign in again
          </Button>
        </div>
      </div>
    );
  }

  if (!view) {
    return <p style={{ color: "var(--mh-text-muted)" }}>Loading live data…</p>;
  }

  const rows = view.sections.flatMap((section) =>
    section.rows.map((row) => ({ ...row, section: section.title })),
  );
  const filtered = rows.filter((row) => {
    if (!q.trim()) return true;
    const hay = `${row.primary} ${row.secondary ?? ""} ${row.meta ?? ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  const metricCols = Math.min(Math.max(view.metrics.length, 1), 4);

  return (
    <ScreenScaffold
      role="admin"
      title={view.title}
      subtitle={view.subtitle}
      breadcrumb={view.breadcrumb}
      active={view.active}
      hideChromeHeader
    >
      <AdminPageFrame figmaId={screen?.figmaId}>
        <AdminPageHeader
          title={view.title}
          subtitle={view.subtitle}
          actions={
            <>
              {view.actions.slice(0, 3).map((a) => (
                <Button
                  key={a.href + a.label}
                  type="button"
                  variant={a.variant ?? "secondary"}
                  onClick={() => router.push(a.href)}
                  style={{ padding: "10px 14px", fontSize: 13 }}
                >
                  {a.label}
                </Button>
              ))}
              <Button type="button" variant="secondary" style={{ padding: "10px 14px", fontSize: 13 }}>
                Export
              </Button>
            </>
          }
        />

        {view.metrics.length ? (
          <div
            className="mh-admin-grid-4"
            style={
              metricCols < 4
                ? { gridTemplateColumns: `repeat(${metricCols}, minmax(0, 1fr))` }
                : undefined
            }
          >
            {view.metrics.map((m) => (
              <AdminKpiCard key={m.label} label={m.label} value={m.value} hint={m.hint} />
            ))}
          </div>
        ) : null}

        <div className="mh-admin-toolbar">
          <input
            className="mh-admin-toolbar__search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search records…"
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
          countLabel={`${filtered.length} records${screen?.figmaId ? ` · Figma ${screen.figmaId}` : ""}`}
          columns={["Primary", "Detail", "Section", "Status", "Action"]}
          columnTemplate="minmax(0, 1.3fr) minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(100px, 0.7fr) minmax(80px, 0.5fr)"
        >
          {!filtered.length ? (
            <p style={{ margin: 0, padding: 20, color: "#5C5F5A", fontSize: 13 }}>No records yet for your account.</p>
          ) : (
            filtered.map((row) => (
              <AdminTableRow
                key={row.primary + (row.secondary ?? "") + (row.meta ?? "") + row.section}
                onClick={row.href ? () => router.push(row.href!) : undefined}
                cells={[
                  <span key="p" style={{ fontWeight: 700, fontSize: 14 }}>
                    {row.primary}
                  </span>,
                  <span key="s" style={{ color: "#5C5F5A" }}>
                    {row.secondary || "—"}
                  </span>,
                  <span key="sec" style={{ color: "#5C5F5A" }}>
                    {row.section}
                  </span>,
                  row.meta ? (
                    <StatusPill key="m" tone={stageTone(row.meta)}>
                      {row.meta}
                    </StatusPill>
                  ) : (
                    <span key="m" style={{ color: "#8D928A" }}>
                      —
                    </span>
                  ),
                  row.href ? (
                    <span key="a" className="mh-admin-table__link">
                      Review
                    </span>
                  ) : (
                    <span key="a" style={{ color: "#8D928A", fontSize: 13 }}>
                      View
                    </span>
                  ),
                ]}
              />
            ))
          )}
        </AdminTableShell>
      </AdminPageFrame>
    </ScreenScaffold>
  );
}

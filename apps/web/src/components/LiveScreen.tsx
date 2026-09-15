"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Metric, Panel } from "@myheritage/ui";
import { ScreenScaffold, ListPanel, MobileChrome } from "@/components/ScreenScaffold";
import { AdminLiveScreen } from "@/components/AdminLiveScreen";
import { AdminFigmaParityScreen } from "@/components/AdminFigmaParityScreen";
import { TeacherSisScreen } from "@/components/TeacherSisScreen";
import { TEACHER_SCREENS } from "@/lib/teacherCatalog";
import { api, loadSession } from "@/lib/api";
import type { ShellRole } from "@/lib/nav";

export type PortalView = {
  path: string;
  title: string;
  subtitle: string;
  role: ShellRole;
  active: string;
  breadcrumb: string[];
  metrics: Array<{ label: string; value: string; hint?: string }>;
  sections: Array<{
    title: string;
    rows: Array<{ primary: string; secondary?: string; meta?: string; href?: string }>;
  }>;
  actions: Array<{ label: string; href: string; variant?: "primary" | "secondary" | "ai" }>;
  live: true;
};

export function LiveScreen({
  path,
  mobile = false,
  mobileTitle = "Heritage",
  mobileActive = "Home",
}: {
  path: string;
  mobile?: boolean;
  mobileTitle?: string;
  mobileActive?: "Home" | "Courses" | "Schedule" | "Grades" | "More";
}) {
  // Desktop admin catalogue → Figma PNG parity (falls back to structured AdminLiveScreen).
  if (!mobile && path.startsWith("/admin")) {
    return <AdminFigmaParityScreen path={path} />;
  }
  // Desktop teacher / faculty catalogue → structured Figma parity screens.
  if (!mobile && path.startsWith("/instructor") && TEACHER_SCREENS[path]) {
    return <TeacherSisScreen path={path} />;
  }
  return (
    <GenericLiveScreen path={path} mobile={mobile} mobileTitle={mobileTitle} mobileActive={mobileActive} />
  );
}

function GenericLiveScreen({
  path,
  mobile = false,
  mobileTitle = "Heritage",
  mobileActive = "Home",
}: {
  path: string;
  mobile?: boolean;
  mobileTitle?: string;
  mobileActive?: "Home" | "Courses" | "Schedule" | "Grades" | "More";
}) {
  const router = useRouter();
  const [view, setView] = useState<PortalView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace(mobile ? "/m/login" : "/login");
      return;
    }
    api<PortalView>(`/portal/view?path=${encodeURIComponent(path)}`, {}, s.accessToken)
      .then(setView)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [path, router, mobile]);

  if (error) {
    const body = (
      <div style={{ color: "var(--mh-danger)", padding: "1rem 0" }}>
        {error}
        <div style={{ marginTop: 12 }}>
          <Button type="button" variant="secondary" onClick={() => router.push(mobile ? "/m/login" : "/login")}>
            Sign in again
          </Button>
        </div>
      </div>
    );
    return mobile ? <MobileChrome title={mobileTitle}>{body}</MobileChrome> : body;
  }

  if (!view) {
    const loading = <p style={{ color: "var(--mh-text-muted)" }}>Loading live data…</p>;
    return mobile ? <MobileChrome title={mobileTitle}>{loading}</MobileChrome> : loading;
  }

  const content = (
    <>
      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        {view.metrics.map((m) => (
          <Metric key={m.label} label={m.label} value={m.value} hint={m.hint} />
        ))}
      </div>

      {view.actions.length ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {view.actions.map((a) => (
            <Button
              key={a.href + a.label}
              type="button"
              variant={a.variant ?? "primary"}
              onClick={() => router.push(a.href)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      ) : null}

      {view.sections.map((section) => (
        <Panel key={section.title} title={section.title}>
          {!section.rows.length ? (
            <p style={{ margin: 0, color: "var(--mh-text-muted)" }}>No records yet for your account.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.65rem" }}>
              {section.rows.map((row) => (
                <li
                  key={row.primary + (row.secondary ?? "") + (row.meta ?? "")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                    paddingBottom: "0.65rem",
                    borderBottom: "1px solid var(--mh-border)",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{row.primary}</div>
                    {row.secondary ? (
                      <div style={{ color: "var(--mh-text-muted)", fontSize: "var(--mh-body-compact)" }}>{row.secondary}</div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {row.meta ? (
                      <span style={{ color: "var(--mh-text-muted)", fontSize: "var(--mh-body-compact)" }}>{row.meta}</span>
                    ) : null}
                    {row.href ? (
                      <Button
                        type="button"
                        variant="secondary"
                        style={{ padding: "6px 10px", fontSize: 13 }}
                        onClick={() => router.push(row.href!)}
                      >
                        Open
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ))}
    </>
  );

  if (mobile) {
    return (
      <MobileChrome title={mobileTitle} active={mobileActive}>
        <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>{view.title}</h1>
        <p style={{ margin: "0 0 16px", color: "var(--mh-text-muted)", fontSize: 13 }}>{view.subtitle}</p>
        {content}
      </MobileChrome>
    );
  }

  return (
    <ScreenScaffold
      role={view.role}
      title={view.title}
      subtitle={view.subtitle}
      breadcrumb={view.breadcrumb}
      active={view.active}
    >
      {content}
    </ScreenScaffold>
  );
}

/** Keep export for pages that still import ListPanel patterns during migration. */
export { ListPanel };

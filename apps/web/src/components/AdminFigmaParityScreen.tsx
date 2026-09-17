"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, AppShell } from "@myheritage/ui";
import { api, loadSession, type Session } from "@/lib/api";
import { resolveNav } from "@/lib/nav";
import { ALL_SCREENS } from "@/lib/screens";
import type { PortalView } from "@/components/LiveScreen";
import { AdminDomainScreen, type AdminArchetype } from "@/components/AdminDomainScreen";

function frameFile(figmaId: string) {
  return `/figma/admin/${figmaId.replace(/:/g, "-")}.png`;
}

function inferArchetype(title: string, path: string): AdminArchetype {
  const n = `${title} ${path}`.toLowerCase();
  if (/dashboard|home|overview|analytics|funnel|conversion|intelligence/.test(n)) return "dashboard";
  if (/builder|designer|setup|create|policy|matrix|simulator|templates/.test(n)) return "builder";
  if (/360|detail|case|session|workspace|account|notebook|incident/.test(n)) return "detail";
  return "queue";
}

const hotspot: CSSProperties = {
  flex: 1,
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

/**
 * Prefer cached Figma PNG when present; otherwise render structured domain UI
 * matching MyHeritage admin design patterns for every admin catalogue route.
 */
export function AdminFigmaParityScreen({ path }: { path: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [hasFrame, setHasFrame] = useState<boolean | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState<PortalView | null>(null);

  const screen = useMemo(() => ALL_SCREENS.find((s) => s.path === path), [path]);
  const figmaId = screen?.figmaId;
  const src = figmaId ? frameFile(figmaId) : null;
  const archetype = inferArchetype(screen?.title || path, path);

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
    setSession(s);
  }, [router]);

  useEffect(() => {
    if (!src) {
      setHasFrame(false);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setHasFrame(true);
    };
    img.onerror = () => {
      if (!cancelled) setHasFrame(false);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (!session || !drawerOpen) return;
    api<PortalView>(`/portal/view?path=${encodeURIComponent(path)}`, {}, session.accessToken)
      .then(setView)
      .catch(() => setView(null));
  }, [session, drawerOpen, path]);

  if (!session) return null;

  if (hasFrame === false || !src) {
    return <AdminDomainScreen path={path} title={screen?.title || path} figmaId={figmaId} archetype={archetype} />;
  }

  if (hasFrame === null) {
    return <p style={{ padding: 32, color: "#5C5F5A" }}>Loading Figma screen…</p>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F6F7F4", position: "relative" }}>
      <img src={src} alt={screen?.title || path} style={{ display: "block", width: "100%", height: "auto" }} data-figma-id={figmaId} />
      <nav
        aria-label="Admin shortcuts"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          display: "flex",
          alignItems: "stretch",
          padding: "0 clamp(1rem, 5vw, 80px)",
          gap: 8,
        }}
      >
        <button type="button" aria-label="Home" onClick={() => router.push("/admin")} style={hotspot} />
        <div style={{ width: 200 }} />
        {(
          [
            ["/admin", "Overview"],
            ["/admin/approvals", "Approvals"],
            ["/admin/analytics", "Analytics"],
          ] as const
        ).map(([href, label]) => (
          <button key={href} type="button" aria-label={label} onClick={() => router.push(href)} style={{ ...hotspot, flex: "0 0 110px" }} />
        ))}
        <div style={{ flex: 1 }} />
        <button type="button" aria-label="Search" onClick={() => router.push("/admin/search")} style={{ ...hotspot, flex: "0 0 240px" }} />
        <button type="button" aria-label="Ask MyHeritage" onClick={() => router.push("/admin/ai")} style={{ ...hotspot, flex: "0 0 140px" }} />
      </nav>

      <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 40, display: "flex", gap: 10 }}>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/all")} style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          All admin screens
        </Button>
        <Button type="button" onClick={() => setDrawerOpen((v) => !v)} style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          {drawerOpen ? "Hide live data" : "Live data"}
        </Button>
      </div>

      {drawerOpen ? (
        <aside
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "min(420px, 100vw)",
            height: "100vh",
            background: "#FFFFFF",
            borderLeft: "1px solid #E1E3DC",
            boxShadow: "-8px 0 24px rgba(0,0,0,0.08)",
            zIndex: 50,
            padding: 20,
            overflow: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
            <strong style={{ fontSize: 16 }}>Live portal data</strong>
            <button type="button" onClick={() => setDrawerOpen(false)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18 }}>
              ×
            </button>
          </div>
          <p style={{ margin: "0 0 12px", color: "#5C5F5A", fontSize: 13 }}>{path}</p>
          {!view ? (
            <p style={{ color: "#8D928A", fontSize: 13 }}>Loading…</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {view.metrics.map((m) => (
                <div key={m.label} style={{ border: "1px solid #E1E3DC", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#8D928A", textTransform: "uppercase", fontWeight: 700 }}>{m.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{m.value}</div>
                </div>
              ))}
            </div>
          )}
        </aside>
      ) : null}
    </div>
  );
}

export function AdminShellOnly({
  children,
  active,
  session,
}: {
  children: ReactNode;
  active?: string;
  session: Session;
}) {
  const router = useRouter();
  return (
    <AppShell
      role="admin"
      userName={`${session.givenName} ${session.familyName}`}
      active={active}
      onNavigate={(item) => {
        if (item === "Ask MyHeritage") {
          router.push("/admin/ai");
          return;
        }
        if (item === "Search") {
          router.push("/admin/search");
          return;
        }
        const href = resolveNav("admin", item);
        if (href) router.push(href);
      }}
    >
      {children}
    </AppShell>
  );
}

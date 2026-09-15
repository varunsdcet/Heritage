"use client";

import Link from "next/link";
import { Panel, StatusPill } from "@myheritage/ui";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { ALL_SCREENS, FIGMA_COUNTS, screensForGroup } from "@/lib/screens";

const GROUPS = ["Admin", "Teacher", "Student", "Applicant", "Shared", "Mobile", "Design System", "Documents"];

export default function Page() {
  return (
    <ScreenScaffold
      role="admin"
      title="All screens map"
      subtitle="Figma inventory synced · deduped by path · every Open is a live route"
      breadcrumb={["MyHeritage", "All screens"]}
      active="Overview"
      requireAuth={false}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <StatusPill tone="success">Catalog {FIGMA_COUNTS.catalogPaths}</StatusPill>
        <StatusPill>Figma admin {FIGMA_COUNTS.adminUnique}</StatusPill>
        <StatusPill>Figma teacher {FIGMA_COUNTS.teacherUnique}</StatusPill>
        <StatusPill>Figma student {FIGMA_COUNTS.studentUnique}</StatusPill>
        <StatusPill>Auth/mobile {FIGMA_COUNTS.authUnique}</StatusPill>
        <StatusPill>Components {FIGMA_COUNTS.componentsUnique}</StatusPill>
      </div>

      {GROUPS.map((group) => {
        const items = screensForGroup(group);
        if (!items.length) return null;
        return (
          <Panel key={group} title={`${group} (${items.length})`}>
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {items.map((s) => (
                <div
                  key={s.path}
                  style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}
                >
                  <div>
                    <strong>{s.title}</strong>
                    <div style={{ color: "var(--mh-text-muted)", fontSize: "var(--mh-body-compact)" }}>
                      {s.id} · {s.path}
                      {s.figmaId ? ` · figma ${s.figmaId}` : ""}
                    </div>
                  </div>
                  <Link href={s.path} style={{ color: "var(--mh-brand)", fontWeight: 600 }}>
                    Open →
                  </Link>
                </div>
              ))}
            </div>
          </Panel>
        );
      })}

      <Panel title={`Full catalogue (${ALL_SCREENS.length})`}>
        <p style={{ margin: 0, color: "var(--mh-text-muted)", fontSize: 13 }}>
          Paths are unique — Figma duplicates (same frame name twice) collapse to one route. Shared login frames map to
          `/login`. Component library lives under `/design-system`.
        </p>
      </Panel>
    </ScreenScaffold>
  );
}

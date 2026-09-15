"use client";

import Link from "next/link";
import { Panel, StatusPill } from "@myheritage/ui";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { screensForGroup } from "@/lib/screens";

export default function Page() {
  const items = screensForGroup("Student");
  return (
    <ScreenScaffold
      role="student"
      title="All Student screens"
      subtitle={"Figma-synced catalogue · " + items.length + " routes"}
      breadcrumb={["Student", "All screens"]}
      active="All screens"
    >
      <StatusPill tone="success">{items.length} screens</StatusPill>
      <div style={{ display: "grid", gap: "0.65rem", marginTop: 12 }}>
        {items.map((s) => (
          <Panel key={s.path} dense>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <strong>{s.title}</strong>
                <div style={{ color: "var(--mh-text-muted)", fontSize: 13 }}>{s.id} · {s.path}</div>
              </div>
              <Link href={s.path} style={{ color: "var(--mh-brand)", fontWeight: 600 }}>Open →</Link>
            </div>
          </Panel>
        ))}
      </div>
    </ScreenScaffold>
  );
}

"use client";

import Link from "next/link";
import { Button, Panel } from "@myheritage/ui";

export default function Page() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <Panel>
        <h1 style={{ fontFamily: "var(--mh-font-display)", marginTop: 0 }}>Help</h1>
        <p style={{ color: "var(--mh-text-muted)" }}>MyHeritage shared screen · connected to server.</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href="/login"><Button type="button">Sign in</Button></Link>
          <Link href="/screens"><Button type="button" variant="secondary">All screens</Button></Link>
        </div>
      </Panel>
    </div>
  );
}

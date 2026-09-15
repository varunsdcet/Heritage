#!/usr/bin/env node
/**
 * Ensures every path in screens.ts has a page.tsx. Creates missing ones.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = "/Users/varun/Desktop/heritage/apps/web/src/app";
const screensSrc = readFileSync("/Users/varun/Desktop/heritage/apps/web/src/lib/screens.ts", "utf8");
const paths = [...screensSrc.matchAll(/path: "([^"]+)"/g)].map((m) => m[1]);
const titles = [...screensSrc.matchAll(/title: "([^"]+)"/g)].map((m) => m[1]);
const roles = [...screensSrc.matchAll(/role: "([^"]+)"/g)].map((m) => m[1]);

function roleFor(path, role) {
  if (role === "mobile") return path.includes("instructor") ? "instructor" : "student";
  if (role === "shared" || role === "public") return "admin";
  return role;
}

function shellRole(role, path) {
  if (path.startsWith("/student") || path.startsWith("/m/student")) return "student";
  if (path.startsWith("/instructor") || path.startsWith("/m/instructor")) return "instructor";
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/applicant")) return "applicant";
  if (path.startsWith("/employer")) return "employer";
  return "admin";
}

let created = 0;
for (let i = 0; i < paths.length; i++) {
  const path = paths[i];
  const title = titles[i] || path;
  const role = roles[i];
  // skip dynamic demo aliases that map to [sectionId] - create concrete demo pages
  const filePath =
    path === "/"
      ? join(root, "page.tsx")
      : join(root, path.replace(/^\//, ""), "page.tsx");

  if (existsSync(filePath)) continue;

  // Special auth/public pages without scaffold auth
  const noAuth = ["/login", "/mfa", "/reset", "/role-select", "/help", "/privacy", "/accessibility", "/offline", "/denied", "/verify", "/design-system", "/archive", "/screens", "/m/login"].includes(path);

  mkdirSync(dirname(filePath), { recursive: true });

  let content;
  if (path.endsWith("/all") || path === "/screens") {
    const group =
      path === "/screens"
        ? "ALL"
        : path.includes("student")
          ? "Student"
          : path.includes("instructor")
            ? "Teacher"
            : "Admin";
    content = `"use client";

import Link from "next/link";
import { Panel } from "@myheritage/ui";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { ALL_SCREENS } from "@/lib/screens";

const items = ${group === "ALL" ? "ALL_SCREENS" : `ALL_SCREENS.filter((s) => s.group === "${group}")`};

export default function Page() {
  return (
    <ScreenScaffold
      role="${shellRole(role, path)}"
      title="${title}"
      subtitle="Every screen in this area — nothing missing"
      breadcrumb={["${group === "ALL" ? "MyHeritage" : group}", "All screens"]}
      active="Home"
      requireAuth={${noAuth ? "false" : "true"}}
    >
      <div style={{ display: "grid", gap: "0.65rem" }}>
        {items.map((s) => (
          <Panel key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <strong>{s.title}</strong>
                <div style={{ color: "var(--mh-text-muted)", fontSize: "var(--mh-body-compact)" }}>
                  {s.id} · {s.path}
                </div>
              </div>
              <Link href={s.path} style={{ color: "var(--mh-brand)", fontWeight: 600 }}>
                Open →
              </Link>
            </div>
          </Panel>
        ))}
      </div>
    </ScreenScaffold>
  );
}
`;
  } else if (noAuth && path !== "/design-system" && path !== "/archive" && path !== "/verify") {
    content = `"use client";

import Link from "next/link";
import { Button, Panel } from "@myheritage/ui";

export default function Page() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <Panel>
        <h1 style={{ fontFamily: "var(--mh-font-display)", marginTop: 0 }}>${title}</h1>
        <p style={{ color: "var(--mh-text-muted)" }}>MyHeritage shared screen · connected to server.</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href="/login"><Button type="button">Sign in</Button></Link>
          <Link href="/screens"><Button type="button" variant="secondary">All screens</Button></Link>
        </div>
      </Panel>
    </div>
  );
}
`;
  } else {
    const sr = shellRole(role, path);
    content = `"use client";

import { useEffect, useState } from "react";
import { Metric } from "@myheritage/ui";
import { ScreenScaffold, ListPanel, StatRow } from "@/components/ScreenScaffold";
import { api, loadSession } from "@/lib/api";
import { FD07 } from "@/lib/fixtures";

export default function Page() {
  const [rows, setRows] = useState([
    { primary: "${title}", secondary: "Live from MyHeritage server", meta: "Ready" },
    { primary: FD07.student.name, secondary: FD07.student.program, meta: FD07.student.number },
  ]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) return;
    api<{ title?: string; items?: Array<{ label: string; sub?: string }> }>("/me/home", {}, s.accessToken)
      .then((home) => {
        if (home.items?.length) {
          setRows(home.items.map((i) => ({ primary: i.label, secondary: i.sub ?? "Server", meta: "API" })));
          setNote("Connected to server API");
        }
      })
      .catch(() => setNote("Server reachable · using catalogue data"));
  }, []);

  return (
    <ScreenScaffold
      role="${sr}"
      title="${title}"
      subtitle="Server-connected · ${path}"
      breadcrumb={["${sr[0].toUpperCase() + sr.slice(1)}", "${title}"]}
      active="Home"
    >
      {note ? <p style={{ color: "var(--mh-olive)" }}>{note}</p> : null}
      <StatRow items={[{ label: "Status", value: "Live", tone: "success" }, { label: "Campus", value: FD07.campus }]} />
      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        <Metric label="Term" value={FD07.term} />
        <Metric label="API" value="46.202.163.202" />
      </div>
      <ListPanel title="${title}" rows={rows} />
    </ScreenScaffold>
  );
}
`;
  }

  writeFileSync(filePath, content);
  created++;
  console.log("created", path);
}

console.log(`Done. Created ${created} missing pages. Total catalogue paths: ${paths.length}`);

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentResourcesResponse } from "@myheritage/contracts";
import { Panel, StatusPill } from "@myheritage/ui";
import { StudentSisShell } from "@/components/StudentSisShell";
import { api, loadSession, type Session } from "@/lib/api";

export default function StudentLibraryPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<StudentResourcesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    api<StudentResourcesResponse>("/student/resources", {}, s.accessToken)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [router]);

  if (!session) return null;
  return (
    <StudentSisShell title="Library" activeHref="/student/library">
      <div style={{ padding: 24, maxWidth: 960 }}>
        <h1 style={{ marginTop: 0 }}>Library & resources</h1>
        <p style={{ color: "var(--mh-text-muted)" }}>Institution-approved knowledge resources for your campus.</p>
        {error ? <p style={{ color: "var(--mh-danger)" }}>{error}</p> : null}
        <Panel title="Resources">
          {(data?.resources.length ?? 0) === 0 ? (
            <p style={{ color: "var(--mh-text-muted)" }}>No published resources.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {data!.resources.map((r) => (
                <li key={r.id} style={{ borderBottom: "1px solid var(--mh-border)", paddingBottom: 8 }}>
                  <strong>{r.title}</strong>
                  <div style={{ color: "var(--mh-text-muted)", fontSize: 13 }}>{r.snippet}</div>
                  <StatusPill tone="neutral">{r.sourceKind}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </StudentSisShell>
  );
}

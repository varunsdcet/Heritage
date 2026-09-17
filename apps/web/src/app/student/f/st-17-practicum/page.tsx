"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentPracticumResponse } from "@myheritage/contracts";
import { Button, Panel, StatusPill } from "@myheritage/ui";
import { StudentSisShell } from "@/components/StudentSisShell";
import { api, loadSession, type Session } from "@/lib/api";

export default function StudentPracticumPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<StudentPracticumResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekLabel, setWeekLabel] = useState("Week current");
  const [hours, setHours] = useState("8");

  async function refresh(s: Session) {
    setData(await api<StudentPracticumResponse>("/student/practicum", {}, s.accessToken));
  }

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    refresh(s).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [router]);

  async function logHours(e: FormEvent, placementId: string) {
    e.preventDefault();
    if (!session) return;
    try {
      await api(
        "/student/practicum/hours",
        {
          method: "POST",
          body: JSON.stringify({ placementId, weekLabel, hours: Number(hours) }),
        },
        session.accessToken,
      );
      await refresh(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Log failed");
    }
  }

  if (!session) return null;

  return (
    <StudentSisShell title="Practicum" activeHref="/student/f/st-17-practicum">
      <div style={{ padding: 24, maxWidth: 960 }}>
        <h1 style={{ marginTop: 0 }}>Practicum</h1>
        <p style={{ color: "var(--mh-text-muted)" }}>Placement, hours, and requirements. Logged hours stay pending until supervisor verification.</p>
        {error ? <p style={{ color: "var(--mh-danger)" }}>{error}</p> : null}
        {(data?.placements.length ?? 0) === 0 ? (
          <Panel title="Placement"><p style={{ color: "var(--mh-text-muted)" }}>No practicum placement on file.</p></Panel>
        ) : (
          data!.placements.map((p) => (
            <Panel key={p.id} title={p.programName}>
              <div style={{ marginBottom: 10 }}>
                <StatusPill tone="neutral">{p.status}</StatusPill> {p.siteName}
                <div style={{ color: "var(--mh-text-muted)", fontSize: 13 }}>
                  {p.startsOn ?? "—"} → {p.endsOn ?? "—"}
                </div>
              </div>
              <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
                {p.hours.map((h) => (
                  <li key={h.id} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{h.weekLabel} · {h.hours}h</span>
                    <StatusPill tone={h.status === "approved" ? "success" : "warning"}>{h.status}</StatusPill>
                  </li>
                ))}
              </ul>
              <form onSubmit={(e) => void logHours(e, p.id)} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <input value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} placeholder="Week label" />
                <input type="number" min={0.5} max={80} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
                <Button type="submit">Log hours (pending)</Button>
              </form>
            </Panel>
          ))
        )}
      </div>
    </StudentSisShell>
  );
}

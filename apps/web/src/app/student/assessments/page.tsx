"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentAssessmentsResponse } from "@myheritage/contracts";
import { Button, Panel, StatusPill } from "@myheritage/ui";
import { StudentSisShell } from "@/components/StudentSisShell";
import { api, loadSession, type Session } from "@/lib/api";

export default function StudentAssessmentsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<StudentAssessmentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh(s: Session) {
    const res = await api<StudentAssessmentsResponse>("/student/assessments", {}, s.accessToken);
    setData(res);
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

  if (!session) return null;

  return (
    <StudentSisShell title="Assessments" activeHref="/student/assessments">
      <div style={{ padding: 24, maxWidth: 960 }}>
        <h1 style={{ marginTop: 0 }}>Assessments</h1>
        <p style={{ color: "var(--mh-text-muted)" }}>
          Assigned assessments for your enrolled courses. AI Study Coach is blocked while an attempt is open.
        </p>
        {error ? <p style={{ color: "var(--mh-danger)" }}>{error}</p> : null}
        {data?.assessmentAttemptOpen ? <StatusPill tone="warning">Attempt in progress — AI assistance paused</StatusPill> : null}
        <Panel title="Assigned">
          {(data?.assessments.length ?? 0) === 0 ? (
            <p style={{ color: "var(--mh-text-muted)" }}>No published assessments yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
              {data!.assessments.map((a) => (
                <li
                  key={a.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    borderBottom: "1px solid var(--mh-border)",
                    paddingBottom: 10,
                  }}
                >
                  <div>
                    <strong>{a.title}</strong>
                    <div style={{ color: "var(--mh-text-muted)", fontSize: 13 }}>
                      {a.courseCode} · {a.durationMinutes} min · closes {a.closesAt.slice(0, 10)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <StatusPill tone={a.state === "in_progress" ? "warning" : a.state === "submitted" ? "success" : "neutral"}>
                      {a.state}
                    </StatusPill>
                    {a.state === "open" || a.state === "upcoming" ? (
                      <Button
                        type="button"
                        disabled={a.state !== "open" || busy === a.id}
                        onClick={() => {
                          setBusy(a.id);
                          api<{ attemptId: string }>(
                            `/student/assessments/${a.id}/start`,
                            { method: "POST", body: "{}" },
                            session.accessToken,
                          )
                            .then(() => refresh(session))
                            .catch((err) => setError(err instanceof Error ? err.message : "Start failed"))
                            .finally(() => setBusy(null));
                        }}
                      >
                        Start attempt
                      </Button>
                    ) : null}
                    {a.openAttemptId ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy === a.openAttemptId}
                        onClick={() => {
                          setBusy(a.openAttemptId);
                          api(
                            `/student/assessments/attempts/${a.openAttemptId}/submit`,
                            { method: "POST", body: "{}" },
                            session.accessToken,
                          )
                            .then(() => refresh(session))
                            .catch((err) => setError(err instanceof Error ? err.message : "Submit failed"))
                            .finally(() => setBusy(null));
                        }}
                      >
                        Submit attempt
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </StudentSisShell>
  );
}

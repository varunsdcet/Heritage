"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentLabNotebook, StudentLecturesResponse } from "@myheritage/contracts";
import { Button, Panel, StatusPill } from "@myheritage/ui";
import { StudentSisShell } from "@/components/StudentSisShell";
import { api, loadSession, type Session } from "@/lib/api";

export default function StudentLabsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<StudentLecturesResponse | null>(null);
  const [notebook, setNotebook] = useState<StudentLabNotebook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    api<StudentLecturesResponse>("/student/labs", {}, s.accessToken)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [router]);

  async function openNotebook(sessionId: string) {
    if (!session) return;
    const nb = await api<StudentLabNotebook>(`/student/labs/${sessionId}/notebook`, {}, session.accessToken);
    setNotebook(nb);
    setTitle(nb.title);
    setBody(nb.body);
  }

  async function saveNotebook(e: FormEvent) {
    e.preventDefault();
    if (!session || !notebook) return;
    try {
      const nb = await api<StudentLabNotebook>(
        `/student/labs/${notebook.classSessionId}/notebook`,
        {
          method: "PUT",
          body: JSON.stringify({ title, body, rowVersion: notebook.rowVersion }),
        },
        session.accessToken,
      );
      setNotebook(nb);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (!session) return null;

  return (
    <StudentSisShell title="Labs" activeHref="/student/labs">
      <div style={{ padding: 24, maxWidth: 960 }}>
        <h1 style={{ marginTop: 0 }}>Labs</h1>
        <p style={{ color: "var(--mh-text-muted)" }}>Scheduled labs and your lab notebook entries.</p>
        {error ? <p style={{ color: "var(--mh-danger)" }}>{error}</p> : null}
        <Panel title="Lab sessions">
          {(data?.lectures.length ?? 0) === 0 ? (
            <p style={{ color: "var(--mh-text-muted)" }}>No labs scheduled.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {data!.lectures.map((l) => (
                <li key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{l.title}</strong>
                    <div style={{ color: "var(--mh-text-muted)", fontSize: 13 }}>
                      {l.courseCode} · {l.location ?? "Lab"} · {l.startsAt.slice(0, 16).replace("T", " ")}
                    </div>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => void openNotebook(l.id)}>
                    Notebook
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {notebook ? (
          <Panel title="Lab notebook">
            <form onSubmit={saveNotebook} style={{ display: "grid", gap: 10 }}>
              <StatusPill tone={notebook.lockedAt ? "warning" : "success"}>
                v{notebook.version}{notebook.lockedAt ? " · locked" : ""}
              </StatusPill>
              <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={Boolean(notebook.lockedAt)} />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                disabled={Boolean(notebook.lockedAt)}
              />
              {!notebook.lockedAt ? (
                <Button type="submit">Save notebook</Button>
              ) : null}
            </form>
          </Panel>
        ) : null}
      </div>
    </StudentSisShell>
  );
}

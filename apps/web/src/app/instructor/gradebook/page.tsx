"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GradebookResponse } from "@myheritage/contracts";
import {
  AppShell,
  Breadcrumb,
  Button,
  RecordHeader,
  StatusPill,
} from "@myheritage/ui";
import { api, clearSession, loadSession, type Session } from "@/lib/api";
import { resolveNav } from "@/lib/nav";

const NIL = "00000000-0000-4000-8000-000000000000";

export default function InstructorGradebookPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [sections, setSections] = useState<Array<{ sectionId: string; code: string; title: string }>>([]);
  const [book, setBook] = useState<GradebookResponse | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function refresh(s: Session, sid: string) {
    const data = await api<GradebookResponse>(`/gradebooks/${sid}`, {}, s.accessToken);
    setBook(data);
    const next: Record<string, string> = {};
    for (const row of data.rows) {
      for (const cell of row.cells) {
        const key = `${row.studentId}:${cell.assignmentId}`;
        next[key] = cell.score != null ? String(cell.score) : "";
      }
    }
    setDrafts(next);
  }

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    api<{ items: Array<{ sectionId: string; code: string; title: string }> }>("/courses/me", {}, s.accessToken)
      .then(async (res) => {
        setSections(res.items ?? []);
        const first = res.items?.[0]?.sectionId;
        if (!first) {
          setError("No sections assigned to this instructor.");
          return;
        }
        setSectionId(first);
        await refresh(s, first);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load gradebook"));
  }, [router]);

  async function saveCell(studentId: string, assignmentId: string, gradeItemId: string, rowVersion: number, maxScore: number) {
    if (!session || !sectionId) return;
    const key = `${studentId}:${assignmentId}`;
    const raw = drafts[key]?.trim() ?? "";
    if (raw === "") {
      setError("Enter a score before saving.");
      return;
    }
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || score > maxScore) {
      setError(`Score must be between 0 and ${maxScore}.`);
      return;
    }
    setSaving(key);
    setError(null);
    try {
      if (!gradeItemId || gradeItemId === NIL) {
        await api(
          "/grade-items",
          { method: "POST", body: JSON.stringify({ assignmentId, studentId, score }) },
          session.accessToken,
        );
      } else {
        await api(
          `/grade-items/${gradeItemId}`,
          { method: "PATCH", body: JSON.stringify({ score, rowVersion }) },
          session.accessToken,
        );
      }
      setStatus(`Saved score ${score} for assignment.`);
      await refresh(session, sectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  async function publishDrafts() {
    if (!session || !book || !sectionId) return;
    const ids = book.rows
      .flatMap((r) => r.cells)
      .filter((c) => c.status === "draft" && c.score != null && c.gradeItemId !== NIL)
      .map((c) => c.gradeItemId);
    if (!ids.length) {
      setStatus("No draft grades to publish.");
      return;
    }
    try {
      const res = await api<{ approvalRequestId: string }>(
        `/gradebooks/${sectionId}/publish`,
        {
          method: "POST",
          body: JSON.stringify({ gradeItemIds: ids }),
          headers: { "idempotency-key": `web-${Date.now()}` },
        },
        session.accessToken,
      );
      setStatus(`Publish requested · approval ${res.approvalRequestId}`);
      await refresh(session, sectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    }
  }

  if (!session) return null;

  return (
    <AppShell
      role="instructor"
      userName={`${session.givenName} ${session.familyName}`}
      active="Gradebook"
      onNavigate={(item) => {
        const href = resolveNav("instructor", item);
        if (href) router.push(href);
      }}
    >
      <Breadcrumb items={["Instructor", "Gradebook"]} />
      <RecordHeader
        title="Gradebook"
        subtitle={sectionId ? `Live section ${sections.find((s) => s.sectionId === sectionId)?.code ?? ""}` : "Select a section"}
        meta={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {sections.map((s) => (
              <Button
                key={s.sectionId}
                type="button"
                variant={s.sectionId === sectionId ? "primary" : "secondary"}
                style={{ padding: "6px 10px", fontSize: 13 }}
                onClick={() => {
                  setSectionId(s.sectionId);
                  refresh(session, s.sectionId).catch((err) =>
                    setError(err instanceof Error ? err.message : "Failed to load"),
                  );
                }}
              >
                {s.code}
              </Button>
            ))}
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                clearSession();
                router.push("/login");
              }}
            >
              Sign out
            </Button>
          </div>
        }
      />
      {error ? <p style={{ color: "var(--mh-danger)" }}>{error}</p> : null}
      {status ? (
        <div style={{ marginBottom: 12 }}>
          <StatusPill tone="ai">{status}</StatusPill>
        </div>
      ) : null}
      {book ? (
        <>
          <div style={{ margin: "1rem 0" }}>
            <Button type="button" onClick={publishDrafts}>
              Submit drafts for approval
            </Button>
          </div>
          <div style={{ overflowX: "auto", background: "var(--mh-surface)", border: "1px solid var(--mh-border)", borderRadius: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  {book.assignments.map((a) => (
                    <th key={a.id}>{a.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {book.rows.map((row) => (
                  <tr key={row.studentId}>
                    <td>{row.name}</td>
                    {row.cells.map((cell) => {
                      const key = `${row.studentId}:${cell.assignmentId}`;
                      const editable = cell.status === "draft" || cell.status === "pending_publish" || cell.gradeItemId === NIL;
                      return (
                        <td key={`${row.studentId}-${cell.assignmentId}`}>
                          {editable && cell.status !== "published" ? (
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <input
                                type="number"
                                min={0}
                                max={cell.maxScore}
                                step="0.5"
                                value={drafts[key] ?? ""}
                                disabled={cell.status === "pending_publish"}
                                onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                                style={{ width: 72, padding: "4px 6px" }}
                                aria-label={`Score for ${row.name}`}
                              />
                              <span style={{ color: "var(--mh-text-muted)", fontSize: 12 }}>/ {cell.maxScore}</span>
                              {cell.status !== "pending_publish" ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  style={{ padding: "4px 8px", fontSize: 12 }}
                                  disabled={saving === key}
                                  onClick={() =>
                                    void saveCell(
                                      row.studentId,
                                      cell.assignmentId,
                                      cell.gradeItemId,
                                      cell.rowVersion,
                                      cell.maxScore,
                                    )
                                  }
                                >
                                  {saving === key ? "…" : "Save"}
                                </Button>
                              ) : null}
                              <StatusPill tone={cell.status === "pending_publish" ? "ai" : "warning"}>
                                {cell.status === "pending_publish" ? "pending_publish" : "draft"}
                              </StatusPill>
                            </div>
                          ) : (
                            <>
                              {cell.score != null ? `${cell.score}/${cell.maxScore}` : "—"}{" "}
                              <StatusPill tone="success">{cell.status}</StatusPill>
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p style={{ color: "var(--mh-text-muted)" }}>Loading live gradebook…</p>
      )}
    </AppShell>
  );
}

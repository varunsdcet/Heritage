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

export default function InstructorGradebookPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [sections, setSections] = useState<Array<{ sectionId: string; code: string; title: string }>>([]);
  const [book, setBook] = useState<GradebookResponse | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(s: Session, sid: string) {
    const data = await api<GradebookResponse>(`/gradebooks/${sid}`, {}, s.accessToken);
    setBook(data);
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

  async function publishDrafts() {
    if (!session || !book || !sectionId) return;
    const ids = book.rows
      .flatMap((r) => r.cells)
      .filter((c) => c.status === "draft" && c.score != null)
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
                    {row.cells.map((cell) => (
                      <td key={cell.gradeItemId}>
                        {cell.score != null ? `${cell.score}/${cell.maxScore}` : "—"}{" "}
                        <StatusPill tone={cell.status === "published" ? "success" : cell.status === "draft" ? "warning" : "neutral"}>
                          {cell.status}
                        </StatusPill>
                      </td>
                    ))}
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

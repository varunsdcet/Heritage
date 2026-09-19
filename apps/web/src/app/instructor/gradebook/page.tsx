"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { GradebookResponse } from "@myheritage/contracts";
import { TeacherSisShell } from "@/components/TeacherSisShell";
import { api, loadSession, type Session } from "@/lib/api";

const NIL = "00000000-0000-4000-8000-000000000000";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

type HistoryRow = {
  id: string;
  student: string;
  assignment: string;
  score: string;
  status: string;
};

type SectionItem = {
  sectionId: string;
  code: string;
  title: string;
  enrolmentCount?: number;
};

function letterFor(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct >= 90) return "A";
  if (pct >= 85) return "A-";
  if (pct >= 80) return "B+";
  if (pct >= 75) return "B";
  if (pct >= 70) return "B-";
  if (pct >= 65) return "C+";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

export default function InstructorGradebookPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading gradebook…</div>}>
      <InstructorGradebookInner />
    </Suspense>
  );
}

function InstructorGradebookInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [book, setBook] = useState<GradebookResponse | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  async function refresh(s: Session, sid: string) {
    if (!isUuid(sid)) {
      throw new Error("Invalid section id — pick a section from the tabs above");
    }
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
    setDirty({});
  }

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    setLoading(true);
    const wanted = searchParams.get("sectionId");
    api<{ items: SectionItem[] }>("/courses/me", {}, s.accessToken)
      .then(async (res) => {
        const items = [...(res.items ?? [])].sort((a, b) => (b.enrolmentCount ?? 0) - (a.enrolmentCount ?? 0));
        setSections(items);
        const fromQuery = isUuid(wanted) ? items.find((i) => i.sectionId === wanted)?.sectionId : null;
        const first = fromQuery || items.find((i) => isUuid(i.sectionId))?.sectionId;
        if (!first) {
          setError("No sections assigned to this instructor.");
          setLoading(false);
          return;
        }
        setSectionId(first);
        await refresh(s, first);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load gradebook"))
      .finally(() => setLoading(false));
  }, [router, searchParams]);

  const counts = useMemo(() => {
    if (!book) return { draft: 0, pending: 0, published: 0, missing: 0 };
    let draft = 0;
    let pending = 0;
    let published = 0;
    let missing = 0;
    for (const row of book.rows) {
      for (const cell of row.cells) {
        if (cell.status === "published") published += 1;
        else if (cell.status === "pending_publish") pending += 1;
        else if (cell.score == null) missing += 1;
        else draft += 1;
      }
    }
    return { draft, pending, published, missing };
  }, [book]);

  const history = useMemo<HistoryRow[]>(() => {
    if (!book) return [];
    const assignmentTitle = new Map(book.assignments.map((a) => [a.id, a.title]));
    const rows: HistoryRow[] = [];
    for (const row of book.rows) {
      for (const cell of row.cells) {
        if (cell.score == null && cell.gradeItemId === NIL) continue;
        rows.push({
          id: `${row.studentId}:${cell.assignmentId}:${cell.gradeItemId}`,
          student: row.name,
          assignment: assignmentTitle.get(cell.assignmentId) || "Assessment",
          score: cell.score != null ? `${cell.score}/${cell.maxScore}` : "—",
          status: cell.status,
        });
      }
    }
    return rows.slice(0, 40);
  }, [book]);

  function setDraftValue(key: string, value: string) {
    setDrafts((prev) => ({ ...prev, [key]: value }));
    setDirty((prev) => ({ ...prev, [key]: true }));
  }

  async function saveCell(
    studentId: string,
    assignmentId: string,
    gradeItemId: string,
    rowVersion: number,
    maxScore: number,
  ) {
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
      setStatus(`Saved ${score}/${maxScore} · ${letterFor(score, maxScore)}`);
      await refresh(session, sectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  async function saveAllDirty() {
    if (!session || !book || !sectionId) return;
    const targets: Array<{
      studentId: string;
      assignmentId: string;
      gradeItemId: string;
      rowVersion: number;
      maxScore: number;
      key: string;
    }> = [];
    for (const row of book.rows) {
      for (const cell of row.cells) {
        if (cell.status === "published") continue;
        const key = `${row.studentId}:${cell.assignmentId}`;
        if (!dirty[key]) continue;
        targets.push({
          studentId: row.studentId,
          assignmentId: cell.assignmentId,
          gradeItemId: cell.gradeItemId,
          rowVersion: cell.rowVersion,
          maxScore: cell.maxScore,
          key,
        });
      }
    }
    if (!targets.length) {
      setStatus("No unsaved changes.");
      return;
    }
    setError(null);
    let saved = 0;
    for (const t of targets) {
      setSaving(t.key);
      try {
        const raw = drafts[t.key]?.trim() ?? "";
        if (raw === "") continue;
        const score = Number(raw);
        if (!Number.isFinite(score) || score < 0 || score > t.maxScore) {
          setError(`Invalid score for one or more cells (0–${t.maxScore}).`);
          continue;
        }
        if (!t.gradeItemId || t.gradeItemId === NIL) {
          await api(
            "/grade-items",
            { method: "POST", body: JSON.stringify({ assignmentId: t.assignmentId, studentId: t.studentId, score }) },
            session.accessToken,
          );
        } else {
          await api(
            `/grade-items/${t.gradeItemId}`,
            { method: "PATCH", body: JSON.stringify({ score, rowVersion: t.rowVersion }) },
            session.accessToken,
          );
        }
        saved += 1;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
        break;
      }
    }
    setSaving(null);
    await refresh(session, sectionId);
    if (saved) setStatus(`Saved ${saved} score(s).`);
  }

  async function publishDrafts() {
    if (!session || !book || !sectionId) return;
    const ids = book.rows
      .flatMap((r) => r.cells)
      .filter((c) => c.status === "draft" && c.score != null && c.gradeItemId !== NIL)
      .map((c) => c.gradeItemId);
    if (!ids.length) {
      setStatus("No draft grades with scores to submit. Save scores first.");
      return;
    }
    setPublishing(true);
    setError(null);
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
      setStatus(`Submitted ${ids.length} grade(s) for approval · ${res.approvalRequestId.slice(0, 8)}…`);
      await refresh(session, sectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  async function switchSection(sid: string) {
    if (!session) return;
    setSectionId(sid);
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      await refresh(session, sid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setBook(null);
    } finally {
      setLoading(false);
    }
  }

  if (!session) return null;

  const userName = `${session.givenName} ${session.familyName}`.trim() || "Instructor";
  const activeSection = sections.find((s) => s.sectionId === sectionId);
  const dirtyCount = Object.values(dirty).filter(Boolean).length;

  return (
    <TeacherSisShell
      title="Gradebook"
      subtitle={activeSection ? `${activeSection.code} · ${activeSection.title}` : "Live section gradebook"}
      activeHref="/instructor/gradebook"
      userName={userName}
      userRole="INSTRUCTOR"
    >
      <div className="mh-teacher-stack">
        <div className="mh-teacher-page-head">
          <div>
            <h2>Live gradebook</h2>
            <p>Enter draft scores, save them, then submit for registrar approval.</p>
          </div>
          <div className="mh-teacher-actions">
            <button
              type="button"
              className="mh-teacher-btn mh-teacher-btn--secondary"
              disabled={!dirtyCount || Boolean(saving)}
              onClick={() => void saveAllDirty()}
            >
              {saving ? "Saving…" : `Save changes${dirtyCount ? ` (${dirtyCount})` : ""}`}
            </button>
            <button
              type="button"
              className="mh-teacher-btn"
              disabled={publishing || counts.draft === 0}
              onClick={() => void publishDrafts()}
            >
              {publishing ? "Submitting…" : `Submit drafts (${counts.draft})`}
            </button>
          </div>
        </div>

        <div className="mh-teacher-tabs" role="tablist" aria-label="Sections">
          {sections.map((s) => (
            <button
              key={s.sectionId}
              type="button"
              className={`mh-teacher-tabs__item${s.sectionId === sectionId ? " is-active" : ""}`}
              onClick={() => void switchSection(s.sectionId)}
            >
              {s.code}
              {typeof s.enrolmentCount === "number" ? (
                <span className="mh-teacher-tabs__count">{s.enrolmentCount}</span>
              ) : null}
            </button>
          ))}
        </div>

        {book ? (
          <div className="mh-teacher-gradebook-stats">
            <span>
              <strong>{book.rows.length}</strong> students
            </span>
            <span>
              <strong>{counts.draft}</strong> draft
            </span>
            <span>
              <strong>{counts.pending}</strong> pending approval
            </span>
            <span>
              <strong>{counts.published}</strong> published
            </span>
            <span>
              <strong>{counts.missing}</strong> missing
            </span>
          </div>
        ) : null}

        {error ? <p className="mh-teacher-warn">{error}</p> : null}
        {status ? <p className="mh-teacher-gradebook-status">{status}</p> : null}

        {loading && !book ? (
          <p className="mh-teacher-muted">Loading live gradebook…</p>
        ) : book ? (
          <section className="mh-teacher-card">
            {book.assignments.length === 0 ? (
              <p className="mh-teacher-muted">
                No assessments in this section yet. Create one from Create Assessment, then scores will appear here.
              </p>
            ) : book.rows.length === 0 ? (
              <p className="mh-teacher-muted">No enrolled students in this section.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="mh-teacher-gradebook-live">
                  <thead>
                    <tr>
                      <th>Student</th>
                      {book.assignments.map((a) => (
                        <th key={a.id}>
                          <div className="mh-teacher-gradebook-live__asg">
                            <strong>{a.title}</strong>
                            <span>
                              /{a.maxScore} · {a.weightPercent}%
                            </span>
                          </div>
                        </th>
                      ))}
                      <th>Weighted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {book.rows.map((row) => {
                      let wSum = 0;
                      let wPts = 0;
                      for (const cell of row.cells) {
                        const key = `${row.studentId}:${cell.assignmentId}`;
                        const raw = drafts[key];
                        const score = raw === "" || raw == null ? cell.score : Number(raw);
                        const asg = book.assignments.find((a) => a.id === cell.assignmentId);
                        if (score == null || !Number.isFinite(score) || !asg) continue;
                        wSum += asg.weightPercent;
                        wPts += (score / cell.maxScore) * asg.weightPercent;
                      }
                      const weighted = wSum ? Math.round((wPts / wSum) * 1000) / 10 : null;

                      return (
                        <tr key={row.studentId}>
                          <td>
                            <div className="mh-teacher-gradebook-live__student">
                              <strong>{row.name}</strong>
                              <span>{row.studentNumber}</span>
                            </div>
                          </td>
                          {row.cells.map((cell) => {
                            const key = `${row.studentId}:${cell.assignmentId}`;
                            const isPublished = cell.status === "published";
                            const isPending = cell.status === "pending_publish";
                            return (
                              <td key={`${row.studentId}-${cell.assignmentId}`}>
                                {isPublished ? (
                                  <div className="mh-teacher-gradebook-live__cell">
                                    <strong>
                                      {cell.score}/{cell.maxScore}
                                    </strong>
                                    <span className="mh-teacher-badge is-success">published</span>
                                  </div>
                                ) : (
                                  <div className="mh-teacher-gradebook-live__cell">
                                    <div className="mh-teacher-gradebook-live__edit">
                                      <input
                                        type="number"
                                        min={0}
                                        max={cell.maxScore}
                                        step="0.5"
                                        value={drafts[key] ?? ""}
                                        onChange={(e) => setDraftValue(key, e.target.value)}
                                        aria-label={`Score for ${row.name}`}
                                      />
                                      <span>/ {cell.maxScore}</span>
                                      <button
                                        type="button"
                                        className="mh-teacher-btn mh-teacher-btn--secondary mh-teacher-gradebook-live__save"
                                        disabled={saving === key || !dirty[key]}
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
                                      </button>
                                    </div>
                                    <span
                                      className={`mh-teacher-badge ${
                                        isPending ? "is-info" : cell.score == null ? "is-muted" : "is-warning"
                                      }`}
                                    >
                                      {isPending ? "pending approval" : cell.score == null ? "missing" : "draft"}
                                    </span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td>
                            {weighted == null ? (
                              <span className="mh-teacher-muted">—</span>
                            ) : (
                              <strong>
                                {weighted}% · {letterFor(weighted, 100)}
                              </strong>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <p className="mh-teacher-muted">{error ? "Could not load gradebook." : "No gradebook data."}</p>
        )}

        <section className="mh-teacher-card">
          <h2>Grade history</h2>
          {history.length === 0 ? (
            <p className="mh-teacher-muted">No saved grade history for this section yet.</p>
          ) : (
            <div className="mh-teacher-list">
              {history.map((h) => (
                <div key={h.id} className="mh-teacher-list__item">
                  <div>
                    <strong>{h.student}</strong>
                    <span>
                      {h.assignment} · {h.score}
                    </span>
                  </div>
                  <span
                    className={`mh-teacher-badge ${
                      h.status === "published" ? "is-success" : h.status === "pending_publish" ? "is-info" : "is-warning"
                    }`}
                  >
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </TeacherSisShell>
  );
}

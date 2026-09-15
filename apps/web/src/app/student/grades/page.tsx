"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentGradesResponse } from "@myheritage/contracts";
import {
  AppShell,
  Breadcrumb,
  Button,
  EmptyState,
  RecordHeader,
  StatusPill,
} from "@myheritage/ui";
import { api, clearSession, loadSession, type Session } from "@/lib/api";
import { resolveNav } from "@/lib/nav";

export default function StudentGradesPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<StudentGradesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [askingId, setAskingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    api<StudentGradesResponse>("/grades/me", {}, s.accessToken)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load grades"));
  }, [router]);

  async function askAboutGrade(gradeItemId: string) {
    if (!session) return;
    setAskingId(gradeItemId);
    setMessage(null);
    try {
      await api(
        "/messages/ask-grade",
        {
          method: "POST",
          body: JSON.stringify({
            relatedGradeItemId: gradeItemId,
            body: "Can you explain how this grade was calculated?",
            subject: "Ask about this grade",
          }),
        },
        session.accessToken,
      );
      setMessage("Message sent to your instructor.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setAskingId(null);
    }
  }

  if (!session) return null;

  return (
    <AppShell
      role="student"
      userName={`${session.givenName} ${session.familyName}`}
      active="Grades"
      onNavigate={(item) => {
        if (item === "Ask MyHeritage") {
          router.push("/student/ask");
          return;
        }
        const href = resolveNav("student", item);
        if (href) router.push(href);
      }}
    >
      <Breadcrumb items={["Student", "Grades"]} />
      <RecordHeader
        title="Grades"
        subtitle="Published results only · Fall 2026"
        meta={
          data ? (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <StatusPill tone="success">GPA {data.cumulativeGpa.toFixed(2)}</StatusPill>
              <StatusPill tone={data.standing === "alert" ? "danger" : "neutral"}>{data.standing}</StatusPill>
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
          ) : null
        }
      />
      {error ? <p style={{ color: "var(--mh-danger)" }}>{error}</p> : null}
      {message ? <p style={{ color: "var(--mh-olive)" }}>{message}</p> : null}
      {!data ? <p>Loading…</p> : null}
      {data && data.courses.every((c) => c.items.length === 0) ? (
        <EmptyState title="No published grades" body="Draft grades are hidden until they are approved and published." />
      ) : null}
      {data?.courses.map((course) => (
        <section
          key={course.sectionId}
          style={{
            marginBottom: "1.5rem",
            background: "var(--mh-surface)",
            border: "1px solid var(--mh-border)",
            borderRadius: "var(--mh-radius-lg)",
            padding: "1rem 1.1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--mh-h3)", fontFamily: "var(--mh-font-display)" }}>
                {course.code} · {course.title}
              </h2>
              <p style={{ margin: "0.25rem 0 0", color: "var(--mh-text-muted)" }}>
                {course.instructorName} · {course.credits} credits
              </p>
            </div>
            <StatusPill tone="neutral">
              {course.currentPercent == null ? "—" : `${course.currentPercent}% ${course.letter ?? ""}`}
            </StatusPill>
          </div>
          <table style={{ marginTop: "0.85rem" }}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Weight</th>
                <th>Score</th>
                <th>Letter</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {course.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.weightPercent}%</td>
                  <td>
                    {item.score}/{item.maxScore}
                  </td>
                  <td>{item.letter}</td>
                  <td>
                    <Button
                      variant="ai"
                      type="button"
                      disabled={askingId === item.id}
                      onClick={() => askAboutGrade(item.id)}
                    >
                      Ask about this grade
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </AppShell>
  );
}

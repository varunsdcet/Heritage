"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentGradesResponse } from "@myheritage/contracts";
import {
  AppShell,
  Banner,
  Breadcrumb,
  Button,
  EmptyState,
  Panel,
  RecordHeader,
  StatusPill,
} from "@myheritage/ui";
import { ApiError, api, clearSession, loadSession, type Session } from "@/lib/api";
import { resolveNav } from "@/lib/nav";

type GradeViewState = "loading" | "ready" | "permission-denied" | "offline" | "archived" | "error";

export default function StudentGradesPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<StudentGradesResponse | null>(null);
  const [viewState, setViewState] = useState<GradeViewState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [askingId, setAskingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadGrades = useCallback(
    async (activeSession: Session) => {
      setViewState("loading");
      setLoadError(null);
      try {
        const response = await api<StudentGradesResponse>("/grades/me", {}, activeSession.accessToken);
        setData(response);
        setViewState("ready");
      } catch (err) {
        setData(null);
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          setViewState("permission-denied");
          return;
        }
        if (err instanceof ApiError && err.status === 410) {
          setViewState("archived");
          return;
        }
        if ((typeof navigator !== "undefined" && !navigator.onLine) || err instanceof TypeError) {
          setViewState("offline");
          return;
        }
        setLoadError(err instanceof Error ? err.message : "Failed to load grades");
        setViewState("error");
      }
    },
    [router],
  );

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    if (!s.roles.includes("student")) {
      setViewState("permission-denied");
      return;
    }
    void loadGrades(s);
  }, [loadGrades, router]);

  async function askAboutGrade(gradeItemId: string) {
    if (!session) return;
    setAskingId(gradeItemId);
    setMessage(null);
    setActionError(null);
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
      setActionError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setAskingId(null);
    }
  }

  if (!session) return null;

  const visibleCourses = data?.courses.filter((course) => course.items.length > 0) ?? [];

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
      {actionError ? <Banner tone="danger">{actionError}</Banner> : null}
      {message ? <Banner tone="success">{message}</Banner> : null}
      {viewState === "loading" ? (
        <Panel>
          <EmptyState title="Loading grades" body="Checking for your latest published results." />
        </Panel>
      ) : null}
      {viewState === "permission-denied" ? (
        <Panel>
          <EmptyState title="Permission denied" body="This grade record is available only to the enrolled student." />
        </Panel>
      ) : null}
      {viewState === "offline" ? (
        <Panel>
          <EmptyState title="You're offline" body="Reconnect to load your published grades." />
          <Button type="button" onClick={() => void loadGrades(session)}>
            Try again
          </Button>
        </Panel>
      ) : null}
      {viewState === "archived" ? (
        <Panel>
          <EmptyState title="Grades archived" body="This grade record has been archived. Contact the registrar if you need access." />
        </Panel>
      ) : null}
      {viewState === "error" ? (
        <Panel>
          <EmptyState title="Grades unavailable" body={loadError ?? "The grade record could not be loaded."} />
          <Button type="button" onClick={() => void loadGrades(session)}>
            Try again
          </Button>
        </Panel>
      ) : null}
      {viewState === "ready" && visibleCourses.length === 0 ? (
        <EmptyState title="No published grades" body="Draft grades are hidden until they are approved and published." />
      ) : null}
      {viewState === "ready" && visibleCourses.map((course) => (
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

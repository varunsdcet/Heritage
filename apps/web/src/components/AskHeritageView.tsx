"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, EmptyState, Panel } from "@myheritage/ui";
import { api, loadSession } from "@/lib/api";
import { ScreenScaffold } from "@/components/ScreenScaffold";

export function AskHeritageView({
  role,
  contextPath,
}: {
  role: "admin" | "student" | "instructor" | "applicant" | "employer";
  contextPath: string;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAsk(e: FormEvent) {
    e.preventDefault();
    const session = loadSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!question.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ answer: string; model: string; source: string }>(
        "/ai/ask",
        {
          method: "POST",
          body: JSON.stringify({ question: question.trim(), contextPath }),
        },
        session.accessToken,
      );
      setAnswer(res.answer);
      setMeta(`${res.source} · ${res.model}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask Heritage failed");
    } finally {
      setBusy(false);
    }
  }

  const crumb =
    role === "admin"
      ? ["Admin", "Ask Heritage"]
      : role === "instructor"
        ? ["Instructor", "Ask Heritage"]
        : role === "applicant"
          ? ["Applicant", "Ask Heritage"]
          : role === "employer"
            ? ["Employer", "Ask Heritage"]
            : ["Student", "Ask Heritage"];

  return (
    <ScreenScaffold
      role={role}
      title="Ask Heritage"
      subtitle="Campus AI assistant for admissions, courses, grades, fees, practicum, and policies"
      active={role === "student" || role === "applicant" || role === "employer" ? "Ask" : "Home"}
      breadcrumb={crumb}
    >
      <Panel>
        <form onSubmit={onAsk} style={{ display: "grid", gap: 10 }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            placeholder="Ask about applications, offers, placements, hours, schedules, grades, fees…"
            style={{
              width: "100%",
              border: "1px solid var(--mh-border)",
              borderRadius: 8,
              padding: 12,
              resize: "vertical",
            }}
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Thinking…" : "Ask Heritage"}
          </Button>
        </form>
        {error ? <Banner>{error}</Banner> : null}
        {answer ? (
          <div style={{ marginTop: 16, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
            {answer}
            {meta ? <div style={{ marginTop: 8, color: "var(--mh-text-muted)", fontSize: 12 }}>{meta}</div> : null}
          </div>
        ) : (
          <EmptyState title="Ready when you are" body="Ask a campus question to get guidance from Ask Heritage." />
        )}
      </Panel>
    </ScreenScaffold>
  );
}

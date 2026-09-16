"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CoachAnswer, CoachHistoryResponse } from "@myheritage/contracts";
import { Banner, Button, Panel, StatusPill } from "@myheritage/ui";
import { api, loadSession } from "@/lib/api";
import type { ShellRole } from "@/lib/nav";
import { ScreenScaffold } from "@/components/ScreenScaffold";

const suggestions: Record<ShellRole, string[]> = {
  student: [
    "What should I focus on today?",
    "What assignments and classes are coming up?",
    "Explain my published grades.",
  ],
  instructor: [
    "Summarize my teaching load.",
    "What gradebook work needs attention?",
    "Which sections should I review today?",
  ],
  admin: [
    "What campus operations need attention?",
    "How many approvals are pending?",
    "Summarize current academic operations.",
  ],
  applicant: [
    "What are my next application steps?",
    "What application records are available to me?",
    "Where should I go next?",
  ],
  employer: [
    "What placement work needs attention?",
    "Are any hours waiting for review?",
    "What employer records are available to me?",
  ],
};

export function CampusCoach({ role, contextPath }: { role: ShellRole; contextPath: string }) {
  const router = useRouter();
  const [question, setQuestion] = useState(suggestions[role][0] ?? "");
  const [answer, setAnswer] = useState<CoachAnswer | null>(null);
  const [history, setHistory] = useState<CoachHistoryResponse["items"]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      setHistoryLoading(false);
      return;
    }
    api<CoachHistoryResponse>("/ai/history", {}, session.accessToken)
      .then((payload) => setHistory(payload.items))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load Coach history"))
      .finally(() => setHistoryLoading(false));
  }, []);

  const latestSources = useMemo(() => answer?.sources ?? [], [answer]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const session = loadSession();
    if (!session || question.trim().length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api<CoachAnswer>(
        "/ai/ask",
        {
          method: "POST",
          headers: { "idempotency-key": crypto.randomUUID() },
          body: JSON.stringify({ question: question.trim(), contextPath }),
        },
        session.accessToken,
      );
      setAnswer(response);
      setHistory((current) => [{ ...response, question: question.trim() }, ...current].slice(0, 20));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Coach could not answer this question");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenScaffold
      role={role}
      active="Ask MyHeritage"
      title="Ask MyHeritage"
      subtitle="Grounded Campus Coach - answers use only records available to your account"
      breadcrumb={[role[0]!.toUpperCase() + role.slice(1), "Ask MyHeritage"]}
      meta={<StatusPill tone="ai">Read-only Coach</StatusPill>}
    >
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <div className="mh-campus-coach-grid" style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <Panel title="Ask a campus question">
            <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>
                Your question
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  minLength={3}
                  maxLength={2000}
                  rows={5}
                  required
                  placeholder="Ask about your current campus records..."
                  style={{ width: "100%", resize: "vertical" }}
                />
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {suggestions[role].map((suggestion) => (
                  <Button key={suggestion} type="button" variant="secondary" onClick={() => setQuestion(suggestion)}>
                    {suggestion}
                  </Button>
                ))}
              </div>
              <div>
                <Button type="submit" variant="ai" disabled={loading || question.trim().length < 3}>
                  {loading ? "Checking your campus records..." : "Ask Coach"}
                </Button>
              </div>
            </form>
          </Panel>

          {answer ? (
            <Panel title="Coach response">
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{answer.answer}</div>
              <div style={{ marginTop: 18 }}>
                <strong>Sources</strong>
                <ul style={{ marginBottom: 0, display: "grid", gap: 6 }}>
                  {latestSources.map((source) => (
                    <li key={source.id}>
                      <button
                        type="button"
                        onClick={() => router.push(source.uri)}
                        style={{
                          border: 0,
                          background: "transparent",
                          color: "var(--mh-brand)",
                          padding: 0,
                          cursor: "pointer",
                          display: "block",
                          textAlign: "left",
                          lineHeight: 1.4,
                        }}
                      >
                        {source.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {answer.suggestedActions.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
                  {answer.suggestedActions.map((action) => (
                    <Button key={action.href + action.label} type="button" onClick={() => router.push(action.href)}>
                      {action.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </Panel>
          ) : (
            <Banner>Coach answers are read-only in this phase. It will never change a grade, application, enrolment, payment, or placement.</Banner>
          )}
        </div>

        <Panel title="Recent questions">
          {historyLoading ? (
            <p style={{ margin: 0, color: "var(--mh-text-muted)" }}>Loading history...</p>
          ) : history.length === 0 ? (
            <p style={{ margin: 0, color: "var(--mh-text-muted)" }}>Your Coach history will appear here.</p>
          ) : (
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14 }}>
              {history.map((item) => (
                <li key={item.interactionId} style={{ borderBottom: "1px solid var(--mh-border)", paddingBottom: 12 }}>
                  <strong>{item.question}</strong>
                  <div style={{ color: "var(--mh-text-muted)", fontSize: 13, marginTop: 5 }}>
                    {item.sources.length} source{item.sources.length === 1 ? "" : "s"} - {new Date(item.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </ScreenScaffold>
  );
}

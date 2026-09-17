"use client";

import {
  Suspense,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  CoachAnswer,
  CoachHistoryResponse,
  CoachSource,
  CoachSuggestedAction,
  DegreePlanAnalysis,
} from "@myheritage/contracts";
import { Banner, Button, LogoMark, StatusPill } from "@myheritage/ui";
import { api, loadSession } from "@/lib/api";
import type { ShellRole } from "@/lib/nav";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { StudentSisShell } from "@/components/StudentSisShell";

const suggestions: Record<ShellRole, string[]> = {
  student: [
    "Can I graduate next summer?",
    "What happens if I drop MATH 210?",
    "I don't understand normalization — explain it.",
    "Am I at risk academically?",
    "How do I request a transcript?",
  ],
  instructor: [
    "Which students have not submitted Assignment work?",
    "Which students may need help?",
    "Summarize my teaching load.",
  ],
  admin: [
    "How many students are currently enrolled?",
    "Show enrollment by program.",
    "Which courses have less than 40% seat utilization?",
  ],
  applicant: [
    "What documents are missing?",
    "What is my application status?",
    "What do I need to apply?",
  ],
  employer: [
    "What placement work needs attention?",
    "Are any hours waiting for review?",
    "What employer records are available to me?",
  ],
};

function capabilityForPath(role: ShellRole, contextPath: string): string | undefined {
  if (contextPath.startsWith("/student/study")) return "study_coach";
  if (contextPath.startsWith("/student/degree")) return "student_advisor";
  if (contextPath.startsWith("/student/success")) return "student_success";
  if (contextPath.startsWith("/student/career")) return "career_assistant";
  if (contextPath.startsWith("/admin/ai")) return "admin_ask_data";
  if (contextPath.startsWith("/instructor/ask") && role === "instructor") return "faculty_assistant";
  if (contextPath.startsWith("/applicant")) return "admissions_assistant";
  return undefined;
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
  sources?: CoachSource[];
  suggestedActions?: CoachSuggestedAction[];
  analysis?: DegreePlanAnalysis;
  capability?: CoachAnswer["capability"];
};

function messagesFromHistory(items: CoachHistoryResponse["items"]): ChatMessage[] {
  return [...items].reverse().flatMap((item) => [
    {
      id: `${item.interactionId}-q`,
      role: "user" as const,
      text: item.question,
      createdAt: item.createdAt,
    },
    {
      id: item.interactionId,
      role: "assistant" as const,
      text: item.answer,
      createdAt: item.createdAt,
      sources: item.sources,
      suggestedActions: item.suggestedActions,
    },
  ]);
}

function CampusCoachBody({ role, contextPath }: { role: ShellRole; contextPath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bootstrappedQuery = useRef(false);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      setHistoryLoading(false);
      return;
    }
    api<CoachHistoryResponse>("/ai/history", {}, session.accessToken)
      .then((payload) => setMessages(messagesFromHistory(payload.items)))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load Ask Heritage history"))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    if (historyLoading || bootstrappedQuery.current) return;
    const q = searchParams.get("q")?.trim();
    if (q) {
      bootstrappedQuery.current = true;
      void send(q);
    }
  }, [historyLoading, searchParams]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, loading, historyLoading]);

  const canSend = useMemo(() => draft.trim().length > 0 && !loading, [draft, loading]);

  function resizeDraft() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function send(question: string) {
    const session = loadSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError("You appear to be offline. Reconnect to ask Ask Heritage.");
      return;
    }

    const pendingId = `local-${crypto.randomUUID()}`;
    setDraft("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setError(null);
    setLoading(true);
    setMessages((current) => [...current, { id: pendingId, role: "user", text: trimmed }]);

    try {
      const response = await api<CoachAnswer>(
        "/ai/ask",
        {
          method: "POST",
          headers: { "idempotency-key": crypto.randomUUID() },
          body: JSON.stringify({
            question: trimmed,
            contextPath,
            capability: capabilityForPath(role, contextPath),
          }),
        },
        session.accessToken,
      );
      setMessages((current) => [
        ...current,
        {
          id: response.interactionId,
          role: "assistant",
          text: response.answer,
          createdAt: response.createdAt,
          sources: response.sources,
          suggestedActions: response.suggestedActions,
          analysis: response.analysis,
          capability: response.capability,
        },
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ask Heritage could not answer this question");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function onDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(draft);
    }
  }

  const empty = !historyLoading && messages.length === 0 && !loading;

  const chat = (
      <div className="mh-ask-chat-page">
      <section className="mh-ask-chat" aria-label="Ask Heritage chatbot">
        <header className="mh-ask-chat__head">
          <LogoMark size={32} />
          <div className="mh-ask-chat__head-copy">
            <h1>{contextPath.includes("/study") ? "Study with AI" : "Ask Heritage"}</h1>
            <span>
              {contextPath.includes("/study")
                ? "Course-grounded tutoring with academic-integrity gates"
                : "Grounded answers from your campus records"}
            </span>
          </div>
          <StatusPill tone="ai">Read-only</StatusPill>
        </header>

        <div ref={threadRef} className="mh-ask-chat__thread" role="log" aria-live="polite" aria-busy={loading || historyLoading}>
          {historyLoading ? (
            <p className="mh-ask-chat__status">Loading conversation…</p>
          ) : null}

          {empty ? (
            <div className="mh-ask-chat__welcome">
              <LogoMark size={44} />
              <h2>Ask Heritage</h2>
              <p>Ask about admissions, courses, grades, fees, practicum, and policies. Replies stay in this chat.</p>
              <div className="mh-ask-chat__chips">
                {suggestions[role].map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="secondary"
                    onClick={() => void send(suggestion)}
                    style={{ padding: "0.45rem 0.75rem", fontSize: 13 }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <article
              key={message.id}
              className={`mh-ask-chat__row is-${message.role}`}
              aria-label={message.role === "user" ? "You" : "Ask Heritage"}
            >
              <div className="mh-ask-chat__bubble">
                <div style={{ whiteSpace: "pre-wrap" }}>{message.text}</div>
                {message.role === "assistant" && message.analysis ? (
                  <div className="mh-ask-chat__meta">
                    <strong className="mh-ask-chat__meta-label">Degree snapshot</strong>
                    <p style={{ margin: "0.35rem 0 0", fontSize: 13, color: "var(--mh-text-muted)" }}>
                      {message.analysis.programName} · {message.analysis.completedCredits}/
                      {message.analysis.requiredCredits} credits · projected{" "}
                      {message.analysis.projectedCompletionTerm ?? "not determined"}
                    </p>
                  </div>
                ) : null}
                {message.role === "assistant" && message.sources?.length ? (
                  <div className="mh-ask-chat__meta">
                    <strong className="mh-ask-chat__meta-label">Sources</strong>
                    <div className="mh-ask-chat__chips">
                      {message.sources.map((source) => (
                        <Button
                          key={source.id}
                          type="button"
                          variant="secondary"
                          onClick={() => router.push(source.uri)}
                          style={{ padding: "0.35rem 0.65rem", fontSize: 12 }}
                        >
                          {source.title}
                        </Button>
                      ))}
                    </div>
                    {message.suggestedActions?.length ? (
                      <div className="mh-ask-chat__chips">
                        {message.suggestedActions.map((action) => (
                          <Button
                            key={action.href + action.label}
                            type="button"
                            onClick={() => router.push(action.href)}
                            style={{ padding: "0.4rem 0.75rem", fontSize: 13 }}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}

          {loading ? (
            <article className="mh-ask-chat__row is-assistant" aria-label="Ask Heritage is typing">
              <div className="mh-ask-chat__bubble mh-ask-chat__typing">
                <span className="mh-ask-chat__dot" />
                <span className="mh-ask-chat__dot" />
                <span className="mh-ask-chat__dot" />
              </div>
            </article>
          ) : null}
        </div>

        <form className="mh-ask-chat__composer" onSubmit={onSubmit}>
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <div className="mh-ask-chat__composer-row">
            <label className="mh-ask-chat__composer-field">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  resizeDraft();
                }}
                onKeyDown={onDraftKeyDown}
                minLength={1}
                maxLength={2000}
                rows={1}
                placeholder="Message Ask Heritage…"
                aria-label="Message Ask Heritage"
                disabled={loading}
                className="mh-ask-chat__input"
              />
            </label>
            <Button type="button" variant="ai" disabled={!canSend} onClick={() => void send(draft)}>
              {loading ? "Sending…" : "Send"}
            </Button>
          </div>
          <p className="mh-ask-chat__hint">
            Enter to send, Shift+Enter for a new line. Ask Heritage answers questions but will not change a grade,
            application, enrolment, payment, or placement.
          </p>
        </form>
      </section>
      </div>
  );

  if (role === "student") {
    return (
      <StudentSisShell title="Ask Heritage" subtitle="Grounded campus assistant" activeHref="/student/ask">
        {chat}
      </StudentSisShell>
    );
  }

  return (
    <ScreenScaffold
      role={role}
      active="Ask MyHeritage"
      title="Ask Heritage"
      subtitle="Campus AI assistant. Answers use only records available to your account."
      breadcrumb={[role[0]!.toUpperCase() + role.slice(1), "Ask Heritage"]}
      hideChromeHeader
    >
      {chat}
    </ScreenScaffold>
  );
}

export function CampusCoach(props: { role: ShellRole; contextPath: string }) {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Loading Ask Heritage…</p>}>
      <CampusCoachBody {...props} />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentRiskAnalysis } from "@myheritage/contracts";
import { Banner, Button, StatusPill } from "@myheritage/ui";
import { api, loadSession } from "@/lib/api";
import { StudentSisShell } from "@/components/StudentSisShell";

export default function StudentSuccessPage() {
  const router = useRouter();
  const [risk, setRisk] = useState<StudentRiskAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("Student");

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!session.roles.includes("student")) {
      router.replace("/");
      return;
    }
    setUserName(`${session.givenName} ${session.familyName}`.trim() || "Student");
    api<{ answer: string; riskAnalysis?: StudentRiskAnalysis }>(
      "/ai/ask",
      {
        method: "POST",
        headers: { "Idempotency-Key": `success-${session.accountId}-${Date.now()}` },
        body: JSON.stringify({
          question: "Am I at risk academically?",
          contextPath: "/student/success",
          capability: "student_success",
        }),
      },
      session.accessToken,
    )
      .then((payload) => {
        if (payload.riskAnalysis) setRisk(payload.riskAnalysis);
        else setError(payload.answer);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load success signals"));
  }, [router]);

  return (
    <StudentSisShell
      title="Student success"
      subtitle="Explainable academic signals — not speculative labels"
      activeHref="/student/success"
      userName={userName}
    >
      <div className="mh-student-stack">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {!risk && !error ? <p>Loading success signals…</p> : null}
        {risk ? (
          <>
            <section className="mh-sis-dash__welcome">
              <div className="mh-sis-dash__welcome-text">
                <h1>Academic attention level</h1>
                <p>{risk.explanation}</p>
              </div>
              <StatusPill tone={risk.level === "elevated" ? "danger" : risk.level === "watch" ? "warning" : "success"}>
                {risk.level}
              </StatusPill>
            </section>
            <section className="mh-sis-dash__card">
              <h2>Contributing signals</h2>
              {risk.signals.length ? (
                <ul>
                  {risk.signals.map((signal) => (
                    <li key={signal.id}>
                      <strong>{signal.label}</strong>
                      <div style={{ color: "var(--mh-text-muted)" }}>{signal.detail}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No elevated signals from current assignment and grade records.</p>
              )}
            </section>
            <section className="mh-sis-dash__card" style={{ marginTop: 20 }}>
              <h2>Recommended actions</h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {risk.recommendedActions.map((action) => (
                  <Button key={action.href} variant="secondary" onClick={() => router.push(action.href)}>
                    {action.label}
                  </Button>
                ))}
                <Button
                  variant="ai"
                  onClick={() =>
                    router.push("/student/ask?q=" + encodeURIComponent("Explain this risk alert"))
                  }
                >
                  Explain this alert
                </Button>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </StudentSisShell>
  );
}

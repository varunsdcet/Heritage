"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalRequest } from "@myheritage/contracts";
import { AppShell, Breadcrumb, Button, RecordHeader, StatusPill } from "@myheritage/ui";
import { api, loadSession, type Session } from "@/lib/api";
import { resolveNav } from "@/lib/nav";

type ProfileMeta = {
  studentNumber?: string;
  studentName?: string;
  currentValues?: Record<string, string | null | undefined>;
};

const PROFILE_FIELDS = [
  "givenName",
  "familyName",
  "middleName",
  "preferredName",
  "primaryEmail",
  "personalEmail",
  "phone",
  "dateOfBirth",
  "emergencyContactName",
  "emergencyContactPhone",
  "sinMasked",
] as const;

function FieldDiff({ diff }: { diff: Record<string, unknown> }) {
  const meta = (diff._meta as ProfileMeta | undefined) ?? {};
  const current = meta.currentValues ?? {};
  const rows = PROFILE_FIELDS.filter((key) => diff[key] !== undefined).map((key) => ({
    key,
    oldValue: current[key] ?? "—",
    newValue: String(diff[key]),
  }));
  if (!rows.length && !meta.studentName) {
    return (
      <pre style={{ margin: "10px 0 0", fontSize: 12, whiteSpace: "pre-wrap", color: "var(--mh-text-muted)" }}>
        {JSON.stringify(diff, null, 2)}
      </pre>
    );
  }
  return (
    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
      {meta.studentName ? (
        <div style={{ fontSize: 13 }}>
          <strong>{meta.studentName}</strong>
          {meta.studentNumber ? <span style={{ color: "var(--mh-text-muted)" }}> · {meta.studentNumber}</span> : null}
        </div>
      ) : null}
      {typeof diff.reason === "string" ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--mh-text-muted)" }}>Reason: {diff.reason}</p>
      ) : null}
      {rows.length ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--mh-text-muted)" }}>
              <th style={{ padding: "4px 6px" }}>Field</th>
              <th style={{ padding: "4px 6px" }}>Current</th>
              <th style={{ padding: "4px 6px" }}>Proposed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} style={{ borderTop: "1px solid var(--mh-border)" }}>
                <td style={{ padding: "6px" }}>{row.key}</td>
                <td style={{ padding: "6px" }}>{row.oldValue || "—"}</td>
                <td style={{ padding: "6px", fontWeight: 600 }}>{row.newValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export default function AdminApprovalsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  async function refresh(s: Session) {
    const data = await api<{ items: ApprovalRequest[] }>("/approvals", {}, s.accessToken);
    setItems(data.items);
  }

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    refresh(s).catch((err) => setError(err instanceof Error ? err.message : "Failed to load approvals"));
  }, [router]);

  async function decide(id: string, decision: "approve" | "reject") {
    if (!session) return;
    setBusy(`${id}:${decision}`);
    setError(null);
    try {
      await api(
        `/approvals/${id}/decide`,
        {
          method: "POST",
          body: JSON.stringify({
            decision,
            comment:
              decision === "approve"
                ? "Approved in inbox"
                : rejectNote[id]?.trim() || "Rejected in inbox",
          }),
        },
        session.accessToken,
      );
      setToast(`Request ${decision}d`);
      await refresh(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setBusy(null);
    }
  }

  async function apply(id: string) {
    if (!session) return;
    setBusy(`${id}:apply`);
    setError(null);
    try {
      await api(`/approvals/${id}/apply`, { method: "POST", body: "{}" }, session.accessToken);
      setToast("Approved change applied to student record");
      await refresh(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setBusy(null);
    }
  }

  if (!session) return null;
  const pending = items.filter((i) => i.status === "pending").length;

  return (
    <AppShell
      role="admin"
      userName={`${session.givenName} ${session.familyName}`}
      active="Approvals"
      onNavigate={(item) => {
        const href = resolveNav("admin", item);
        if (href) router.push(href);
      }}
    >
      <Breadcrumb items={["Admin", "Approvals"]} />
      <RecordHeader
        title="Approval Inbox"
        subtitle="GAP-ADM-01 — field-by-field personal-details review, approve, apply."
        meta={<StatusPill tone={pending ? "warning" : "success"}>{pending} pending</StatusPill>}
      />
      {error ? <p style={{ color: "var(--mh-danger)" }}>{error}</p> : null}
      {toast ? <p style={{ color: "var(--mh-success, #0f766e)" }}>{toast}</p> : null}
      <div style={{ display: "grid", gap: 12 }}>
        {items.length === 0 ? (
          <p style={{ color: "var(--mh-text-muted)" }}>No approval requests in the queue.</p>
        ) : (
          items.map((item) => {
            const diff = (item.proposedDiff ?? {}) as Record<string, unknown>;
            return (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--mh-border)",
                  borderRadius: 10,
                  padding: 14,
                  background: "var(--mh-surface)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>{item.type}</strong>
                    <div style={{ color: "var(--mh-text-muted)", fontSize: 13 }}>{item.subjectRef}</div>
                    <div style={{ color: "var(--mh-text-muted)", fontSize: 12 }}>
                      Created {item.createdAt.slice(0, 19).replace("T", " ")}
                    </div>
                  </div>
                  <StatusPill tone={item.status === "pending" ? "warning" : item.status === "approved" ? "ai" : "success"}>
                    {item.status}
                  </StatusPill>
                </div>
                {item.type === "student_profile_change" ? <FieldDiff diff={diff} /> : (
                  <pre style={{ margin: "10px 0 0", fontSize: 12, whiteSpace: "pre-wrap", color: "var(--mh-text-muted)" }}>
                    {JSON.stringify(diff, null, 2)}
                  </pre>
                )}
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {item.status === "pending" ? (
                    <>
                      <input
                        placeholder="Reject reason / note"
                        value={rejectNote[item.id] ?? ""}
                        onChange={(e) => setRejectNote((m) => ({ ...m, [item.id]: e.target.value }))}
                        style={{
                          flex: "1 1 180px",
                          border: "1px solid var(--mh-border)",
                          borderRadius: 8,
                          padding: "8px 10px",
                        }}
                      />
                      <Button
                        type="button"
                        disabled={busy === `${item.id}:approve`}
                        onClick={(e: FormEvent) => {
                          e.preventDefault();
                          void decide(item.id, "approve");
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy === `${item.id}:reject`}
                        onClick={() => void decide(item.id, "reject")}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {item.status === "approved" ? (
                    <Button type="button" disabled={busy === `${item.id}:apply`} onClick={() => void apply(item.id)}>
                      Apply to record
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}

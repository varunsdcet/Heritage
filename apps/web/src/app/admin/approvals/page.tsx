"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalRequest } from "@myheritage/contracts";
import { AppShell, Breadcrumb, Button, RecordHeader, StatusPill } from "@myheritage/ui";
import { api, loadSession, type Session } from "@/lib/api";
import { resolveNav } from "@/lib/nav";

export default function AdminApprovalsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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
      await api(`/approvals/${id}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision, comment: decision === "approve" ? "Approved in inbox" : "Rejected in inbox" }),
      }, session.accessToken);
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
      setToast("Approved change applied");
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
        subtitle="Live pending and approved requests across campus workflows."
        meta={<StatusPill tone={pending ? "warning" : "success"}>{pending} pending</StatusPill>}
      />
      {error ? <p style={{ color: "var(--mh-danger)" }}>{error}</p> : null}
      {toast ? <p style={{ color: "var(--mh-success, #0f766e)" }}>{toast}</p> : null}
      <div style={{ display: "grid", gap: 12 }}>
        {items.length === 0 ? (
          <p style={{ color: "var(--mh-text-muted)" }}>No approval requests in the queue.</p>
        ) : (
          items.map((item) => (
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
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {item.status === "pending" ? (
                  <>
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
                    Apply
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}

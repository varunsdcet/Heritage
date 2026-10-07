"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Panel, StatusPill } from "@myheritage/ui";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { api, loadSession } from "@/lib/api";

type SectionRow = {
  sectionId: string;
  code: string;
  courseCode: string;
  courseTitle: string;
  termName?: string;
  enrolmentCount?: number;
  waitlistCount?: number;
  capacity?: number | null;
  waitlistEnabled?: boolean;
};
type UserRow = { email: string; roles: string[]; givenName: string; familyName: string };
type Quote = {
  label: string;
  termName: string;
  amount: number;
  included: boolean;
  source: "session" | "course" | "none";
  rateCategory: string | null;
  seats: { capacity: number | null; waitlist: boolean; waitlistSize: number | null; enrolled: number; waitlisted: number };
};
type EnrolOut = { courseCode: string; status: "enrolled" | "waitlisted"; fee: { number: number; amount: number } | null; feeNote: string | null };

const money = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

function seatText(s: SectionRow) {
  if (s.capacity === undefined) return "";
  const enrolled = s.enrolmentCount ?? 0;
  if (s.capacity === null) return ` · ${enrolled} enrolled`;
  if (enrolled < s.capacity) return ` · ${enrolled}/${s.capacity} seats`;
  return s.waitlistEnabled ? ` · full, waitlist${s.waitlistCount ? ` (${s.waitlistCount})` : ""}` : " · full";
}

function feeText(q: Quote) {
  if (q.included) return "tuition is included in the program cost, so no course fee will be posted";
  if (q.amount <= 0) return "this course has no cost set, so no course fee will be posted";
  return `${money(q.amount)}${q.rateCategory ? ` (${q.rateCategory})` : ""}, charged to ${q.termName}`;
}

export default function EnrolmentsPage() {
  const router = useRouter();
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [students, setStudents] = useState<UserRow[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [postFee, setPostFee] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const loadSections = (token: string) =>
    api<{ items: SectionRow[] }>("/admin/sections", {}, token).then((sec) => {
      setSections(sec.items);
      setSectionId((cur) => cur || sec.items[0]?.sectionId || "");
    });

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    Promise.all([loadSections(s.accessToken), api<{ items: UserRow[] }>("/admin/users", {}, s.accessToken)])
      .then(([, users]) => setStudents(users.items.filter((u) => u.roles.includes("student"))))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [router]);

  useEffect(() => {
    const s = loadSession();
    if (!s || !sectionId) return;
    const email = studentEmail.trim();
    const known = students.some((u) => u.email.toLowerCase() === email.toLowerCase());
    const params = new URLSearchParams({ sectionId, ...(known ? { studentEmail: email } : {}) });
    let live = true;
    const t = setTimeout(() => {
      api<Quote>(`/admin/enrolments/quote?${params.toString()}`, {}, s.accessToken)
        .then((q) => live && setQuote(q))
        .catch(() => live && setQuote(null));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [sectionId, studentEmail, students]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const s = loadSession();
    if (!s || busy) return;
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      const res = await api<EnrolOut>("/admin/enrolments", { method: "POST", body: JSON.stringify({ studentEmail: studentEmail.trim(), sectionId, postFee }) }, s.accessToken);
      const parts = [res.status === "waitlisted" ? `${studentEmail} is waitlisted for ${res.courseCode} (the section is full)` : `Enrolled ${studentEmail} into ${res.courseCode}`];
      if (res.fee) parts.push(`course fee ${money(res.fee.amount)} posted as receivable #${res.fee.number}`);
      else if (res.feeNote) parts.push(res.feeNote);
      setNote(parts.join(" · "));
      await loadSections(s.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrol failed");
    } finally {
      setBusy(false);
    }
  }

  const full = quote && quote.seats.capacity !== null && quote.seats.enrolled >= quote.seats.capacity;

  return (
    <ScreenScaffold role="admin" title="Enrolments" subtitle="Put a student into a live section · end-to-end" breadcrumb={["Administration", "Enrolments"]} active="Users">
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/users/create")}>
          Create user
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/sections/create")}>
          Create section
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/approvals")}>
          Approvals
        </Button>
      </div>
      {error ? (
        <p role="alert" style={{ color: "var(--mh-danger)" }}>
          {error}
        </p>
      ) : null}
      {note ? <StatusPill tone="success">{note}</StatusPill> : null}

      <Panel title="Enrol student">
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Student email</span>
            <Input list="student-emails" value={studentEmail} placeholder="student@example.edu" onChange={(e) => setStudentEmail(e.target.value)} required />
            <datalist id="student-emails">
              {students.map((s) => (
                <option key={s.email} value={s.email}>
                  {s.givenName} {s.familyName}
                </option>
              ))}
            </datalist>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Section</span>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              required
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid var(--mh-border)",
                background: "var(--mh-surface-muted)",
              }}
            >
              {sections.map((s) => (
                <option key={s.sectionId} value={s.sectionId}>
                  {s.code} · {s.courseCode} {s.courseTitle}
                  {s.termName ? ` · ${s.termName}` : ""}
                  {seatText(s)}
                </option>
              ))}
            </select>
          </label>
          {full ? (
            <p style={{ margin: 0, fontSize: 13, color: quote.seats.waitlist ? "var(--mh-text-muted)" : "var(--mh-danger)" }}>
              {quote.seats.waitlist
                ? `This section is full (${quote.seats.enrolled}/${quote.seats.capacity}); the student will be added to the waitlist.`
                : `This section is full (${quote.seats.enrolled}/${quote.seats.capacity}) and its waitlist is disabled.`}
            </p>
          ) : null}
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14 }}>
            <input type="checkbox" checked={postFee} onChange={(e) => setPostFee(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              <strong>Post course fee</strong>
              {quote ? <span style={{ display: "block", color: "var(--mh-text-muted)" }}>{feeText(quote)}</span> : null}
            </span>
          </label>
          <Button type="submit" disabled={busy || !sectionId}>
            {busy ? "Enrolling…" : "Enrol"}
          </Button>
        </form>
      </Panel>
    </ScreenScaffold>
  );
}

"use client";

import "./enrolments.css";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SaCard, SaField, SaNotice, SuperFrame } from "@/components/superadmin/shared";
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

function feeText(q: Quote) {
  if (q.included) return "Tuition is included in the program cost, so no course fee will be posted.";
  if (q.amount <= 0) return "This course has no cost set, so no course fee will be posted.";
  return `${money(q.amount)}${q.rateCategory ? ` (${q.rateCategory})` : ""}, charged to ${q.termName}.`;
}

function Seats({ enrolled, capacity, waitlisted, waitlistEnabled }: { enrolled: number; capacity: number | null | undefined; waitlisted?: number; waitlistEnabled?: boolean }) {
  if (capacity === undefined) return <span className="en-seats__text">—</span>;
  if (capacity === null) return <span className="en-seats__text">{enrolled} enrolled · no limit</span>;
  const ratio = capacity > 0 ? Math.min(1, enrolled / capacity) : 1;
  const tone = ratio >= 1 ? " is-full" : ratio >= 0.8 ? " is-warn" : "";
  return (
    <div className="en-seats">
      <div className="en-seats__bar" aria-hidden>
        <div className={`en-seats__fill${tone}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
      <span className="en-seats__text">
        {enrolled}/{capacity} seats
        {ratio >= 1 ? (waitlistEnabled ? ` · waitlist${waitlisted ? ` (${waitlisted})` : ""}` : " · full") : ""}
      </span>
    </div>
  );
}

export function EnrolmentsView() {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [students, setStudents] = useState<UserRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sectionId, setSectionId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [postFee, setPostFee] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [filter, setFilter] = useState("");
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
    if (!s) return;
    Promise.all([loadSections(s.accessToken), api<{ items: UserRow[] }>("/admin/users", {}, s.accessToken)])
      .then(([, users]) => setStudents(users.items.filter((u) => u.roles.includes("student"))))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sections and students"))
      .finally(() => setLoaded(true));
  }, []);

  const email = studentEmail.trim();
  const student = students.find((u) => u.email.toLowerCase() === email.toLowerCase());

  useEffect(() => {
    const s = loadSession();
    if (!s || !sectionId) return;
    const params = new URLSearchParams({ sectionId, ...(student ? { studentEmail: student.email } : {}) });
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
  }, [sectionId, student]);

  const picked = sections.find((s) => s.sectionId === sectionId);
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s) => `${s.code} ${s.courseCode} ${s.courseTitle} ${s.termName ?? ""}`.toLowerCase().includes(q));
  }, [sections, filter]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const s = loadSession();
    if (!s || busy) return;
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      const res = await api<EnrolOut>("/admin/enrolments", { method: "POST", body: JSON.stringify({ studentEmail: email, sectionId, postFee }) }, s.accessToken);
      const who = student ? `${student.givenName} ${student.familyName}` : email;
      const parts = [res.status === "waitlisted" ? `${who} is waitlisted for ${res.courseCode} (the section is full)` : `Enrolled ${who} into ${res.courseCode}`];
      if (res.fee) parts.push(`course fee ${money(res.fee.amount)} posted as receivable #${res.fee.number}`);
      else if (res.feeNote) parts.push(res.feeNote);
      setNote(parts.join(" · "));
      setStudentEmail("");
      await loadSections(s.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrol failed");
    } finally {
      setBusy(false);
    }
  }

  const full = quote && quote.seats.capacity !== null && quote.seats.enrolled >= quote.seats.capacity;
  const blocked = Boolean(full && !quote?.seats.waitlist);

  return (
    <SuperFrame
      title="Enrolments"
      breadcrumbs={["Registrar", "Enrolments"]}
      breadcrumbHrefs={["/admin/ops/registrar"]}
      activeHref="/admin/enrolments"
      actions={
        <>
          <Link href="/admin/users/create" className="mh-sa__btn">
            Create user
          </Link>
          <Link href="/admin/sections/create" className="mh-sa__btn">
            Create section
          </Link>
          <Link href="/admin/approvals" className="mh-sa__btn">
            Approvals
          </Link>
        </>
      }
    >
      <p className="mh-sa__muted" style={{ margin: "-6px 0 16px" }}>
        Put a student into a live section. Seats, waitlist and the course fee are checked before the enrolment is saved.
      </p>
      {error ? (
        <SaNotice tone="error" onClose={() => setError(null)}>
          {error}
        </SaNotice>
      ) : null}
      {note ? (
        <SaNotice tone="success" onClose={() => setNote(null)}>
          {note}
        </SaNotice>
      ) : null}

      <div className="en-layout">
        <SaCard title="Enrol a student">
          <form onSubmit={onSubmit} className="mh-sa__form">
            <SaField label="Student">
              <input
                className="mh-sa__input"
                list="en-student-emails"
                value={studentEmail}
                placeholder="Type a name or email"
                onChange={(e) => setStudentEmail(e.target.value)}
                required
              />
              <datalist id="en-student-emails">
                {students.map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.givenName} {u.familyName}
                  </option>
                ))}
              </datalist>
              {email ? (
                <span className={`en-who${student ? "" : " is-unknown"}`}>
                  {student ? `${student.givenName} ${student.familyName}` : "No student account with this email yet."}
                </span>
              ) : null}
            </SaField>

            <SaField label="Section">
              <select className="mh-sa__input" value={sectionId} onChange={(e) => setSectionId(e.target.value)} required>
                {sections.map((s) => (
                  <option key={s.sectionId} value={s.sectionId}>
                    {s.code} · {s.courseCode} {s.courseTitle}
                  </option>
                ))}
              </select>
            </SaField>

            {picked ? (
              <div className="en-picked">
                <span className="en-picked__title">
                  {picked.courseCode} — {picked.courseTitle}
                </span>
                <div className="en-picked__row">
                  <span>Section</span>
                  <strong>{picked.code}</strong>
                </div>
                <div className="en-picked__row">
                  <span>Term</span>
                  <strong>{picked.termName || "—"}</strong>
                </div>
                <div className="en-picked__row">
                  <span>Seats</span>
                  <Seats enrolled={picked.enrolmentCount ?? 0} capacity={picked.capacity} waitlisted={picked.waitlistCount} waitlistEnabled={picked.waitlistEnabled} />
                </div>
                {full ? (
                  <span className={quote?.seats.waitlist ? "mh-sa__pill mh-sa__pill--warn" : "mh-sa__pill"} style={quote?.seats.waitlist ? undefined : { color: "var(--mh-danger)" }}>
                    {quote?.seats.waitlist ? "Section full — the student will be waitlisted" : "Section full and waitlist is disabled"}
                  </span>
                ) : null}
              </div>
            ) : null}

            <label className="mh-sa__check" style={{ alignItems: "flex-start" }}>
              <input type="checkbox" checked={postFee} onChange={(e) => setPostFee(e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                <strong>Post course fee</strong>
                {quote ? <span className="mh-sa__sub" style={{ display: "block" }}>{feeText(quote)}</span> : null}
              </span>
            </label>

            <div className="mh-sa__actions">
              <button type="submit" className="mh-sa__btn mh-sa__btn--primary" disabled={busy || !sectionId || blocked}>
                {busy ? "Enrolling…" : full && quote?.seats.waitlist ? "Add to waitlist" : "Enrol student"}
              </button>
            </div>
          </form>
        </SaCard>

        <SaCard title={`Sections (${sections.length})`}>
          <div className="en-toolbar">
            <input className="mh-sa__input" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search section, course or term" aria-label="Search sections" />
          </div>
          <div className="mh-sa__table-wrap">
            <table className="mh-sa__table en-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Course</th>
                  <th>Term</th>
                  <th>Seats</th>
                  <th className="mh-sa__col-action" />
                </tr>
              </thead>
              <tbody>
                {shown.length ? (
                  shown.map((s) => (
                    <tr key={s.sectionId} className={s.sectionId === sectionId ? "is-picked" : undefined}>
                      <td>
                        <strong>{s.code}</strong>
                      </td>
                      <td>
                        {s.courseCode}
                        <div className="mh-sa__sub">{s.courseTitle}</div>
                      </td>
                      <td>{s.termName || "—"}</td>
                      <td>
                        <Seats enrolled={s.enrolmentCount ?? 0} capacity={s.capacity} waitlisted={s.waitlistCount} waitlistEnabled={s.waitlistEnabled} />
                      </td>
                      <td className="mh-sa__col-action">
                        {s.sectionId === sectionId ? (
                          <span className="mh-sa__pill mh-sa__pill--ok">Selected</span>
                        ) : (
                          <button type="button" className="mh-sa__btn mh-sa__btn--sm" onClick={() => setSectionId(s.sectionId)}>
                            Select
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="mh-sa__empty-cell">
                      <p className="mh-sa__empty">{loaded ? (filter ? "No sections match your search." : "No sections yet.") : "Loading sections…"}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SaCard>
      </div>
    </SuperFrame>
  );
}

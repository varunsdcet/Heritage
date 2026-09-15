"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Panel, StatusPill } from "@myheritage/ui";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { api, loadSession } from "@/lib/api";

type SectionRow = { sectionId: string; code: string; courseCode: string; courseTitle: string };
type UserRow = { email: string; roles: string[]; givenName: string; familyName: string };

export default function EnrolmentsPage() {
  const router = useRouter();
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [students, setStudents] = useState<UserRow[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [studentEmail, setStudentEmail] = useState("marcus.vance@heritage.edu");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    Promise.all([
      api<{ items: SectionRow[] }>("/admin/sections", {}, s.accessToken),
      api<{ items: UserRow[] }>("/admin/users", {}, s.accessToken),
    ])
      .then(([sec, users]) => {
        setSections(sec.items);
        setSectionId(sec.items[0]?.sectionId ?? "");
        setStudents(users.items.filter((u) => u.roles.includes("student")));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const s = loadSession();
    if (!s) return;
    setError(null);
    setNote(null);
    try {
      const res = await api<{ courseCode: string }>(
        "/admin/enrolments",
        { method: "POST", body: JSON.stringify({ studentEmail, sectionId }) },
        s.accessToken,
      );
      setNote(`Enrolled ${studentEmail} into ${res.courseCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrol failed");
    }
  }

  return (
    <ScreenScaffold
      role="admin"
      title="Enrolments"
      subtitle="Put a student into a live section · end-to-end"
      breadcrumb={["Administration", "Enrolments"]}
      active="Users"
    >
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
      {error ? <p style={{ color: "var(--mh-danger)" }}>{error}</p> : null}
      {note ? <StatusPill tone="success">{note}</StatusPill> : null}

      <Panel title="Enrol student">
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Student email</span>
            <Input list="student-emails" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} required />
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
                </option>
              ))}
            </select>
          </label>
          <Button type="submit">Enrol</Button>
        </form>
      </Panel>
    </ScreenScaffold>
  );
}

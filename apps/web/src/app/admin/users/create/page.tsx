"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Panel, StatusPill } from "@myheritage/ui";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { api, loadSession } from "@/lib/api";

type UserRow = {
  accountId: string;
  email: string;
  givenName: string;
  familyName: string;
  roles: string[];
  studentNumber: string | null;
  programName: string | null;
};

export default function CreateUserPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    givenName: "",
    familyName: "",
    role: "instructor",
    password: "Heritage!2026",
    studentNumber: "",
    programName: "Computer Science",
  });

  async function refresh(token: string) {
    const res = await api<{ items: UserRow[] }>("/admin/users", {}, token);
    setUsers(res.items);
  }

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    refresh(s.accessToken).catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const s = loadSession();
    if (!s) return;
    setError(null);
    setNote(null);
    try {
      const created = await api<{ email: string; role: string; temporaryPassword: string }>(
        "/admin/users",
        {
          method: "POST",
          body: JSON.stringify({
            email: form.email,
            givenName: form.givenName,
            familyName: form.familyName,
            role: form.role,
            password: form.password,
            studentNumber: form.studentNumber || undefined,
            programName: form.programName || undefined,
          }),
        },
        s.accessToken,
      );
      setNote(`Created ${created.role} ${created.email} · password ${created.temporaryPassword}`);
      setForm((f) => ({ ...f, email: "", givenName: "", familyName: "", studentNumber: "" }));
      await refresh(s.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <ScreenScaffold
      role="admin"
      title="Create user"
      subtitle="Provision teachers, students, and admins · live API"
      breadcrumb={["Administration", "Users", "Create"]}
      active="Users"
    >
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/sections/create")}>
          Create section
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/enrolments")}>
          Enrol student
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/users")}>
          Directory
        </Button>
      </div>

      {error ? <p style={{ color: "var(--mh-danger)" }}>{error}</p> : null}
      {note ? <StatusPill tone="success">{note}</StatusPill> : null}

      <Panel title="New account">
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Role</span>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid var(--mh-border)",
                background: "var(--mh-surface-muted)",
              }}
            >
              <option value="instructor">Teacher / Instructor</option>
              <option value="student">Student</option>
              <option value="applicant">Applicant</option>
              <option value="employer">Employer</option>
              <option value="admin">Admin</option>
              <option value="registrar">Registrar</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Given name</span>
            <Input value={form.givenName} onChange={(e) => setForm({ ...form, givenName: e.target.value })} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Family name</span>
            <Input value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Campus email</span>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@heritage.edu"
              required
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Temporary password</span>
            <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          {form.role === "student" ? (
            <>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Student number (optional)</span>
                <Input value={form.studentNumber} onChange={(e) => setForm({ ...form, studentNumber: e.target.value })} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Program</span>
                <Input value={form.programName} onChange={(e) => setForm({ ...form, programName: e.target.value })} />
              </label>
            </>
          ) : null}
          {form.role === "applicant" ? (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Program interest</span>
              <Input value={form.programName} onChange={(e) => setForm({ ...form, programName: e.target.value })} />
            </label>
          ) : null}
          {form.role === "employer" ? (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Organization name</span>
              <Input
                value={form.programName}
                onChange={(e) => setForm({ ...form, programName: e.target.value })}
                placeholder="Partner organization"
              />
            </label>
          ) : null}
          <Button type="submit">Create account</Button>
        </form>
      </Panel>

      <Panel title="Live directory">
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {users.map((u) => (
            <li
              key={u.accountId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                borderBottom: "1px solid var(--mh-border)",
                paddingBottom: 8,
              }}
            >
              <div>
                <strong>
                  {u.givenName} {u.familyName}
                </strong>
                <div style={{ color: "var(--mh-text-muted)", fontSize: 13 }}>
                  {u.email}
                  {u.studentNumber ? ` · ${u.studentNumber}` : ""}
                  {u.programName ? ` · ${u.programName}` : ""}
                </div>
              </div>
              <StatusPill>{u.roles.join(", ")}</StatusPill>
            </li>
          ))}
        </ul>
      </Panel>
    </ScreenScaffold>
  );
}

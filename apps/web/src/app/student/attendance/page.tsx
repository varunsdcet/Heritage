"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentAttendanceResponse } from "@myheritage/contracts";
import { Panel, StatusPill } from "@myheritage/ui";
import { StudentSisShell } from "@/components/StudentSisShell";
import { api, loadSession, type Session } from "@/lib/api";

export default function StudentAttendancePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<StudentAttendanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    api<StudentAttendanceResponse>("/student/attendance", {}, s.accessToken)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [router]);

  if (!session) return null;

  return (
    <StudentSisShell title="Attendance" activeHref="/student/attendance">
      <div style={{ padding: 24, maxWidth: 960 }}>
        <h1 style={{ marginTop: 0 }}>Attendance</h1>
        <p style={{ color: "var(--mh-text-muted)" }}>Your recorded attendance only. Corrections go through instructor or student services.</p>
        {error ? <p style={{ color: "var(--mh-danger)" }}>{error}</p> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <StatusPill tone="success">Present {data?.presentCount ?? 0}</StatusPill>
          <StatusPill tone="danger">Absent {data?.absentCount ?? 0}</StatusPill>
          <StatusPill tone="warning">Late {data?.lateCount ?? 0}</StatusPill>
        </div>
        <Panel title="Records">
          {(data?.records.length ?? 0) === 0 ? (
            <p style={{ color: "var(--mh-text-muted)" }}>No attendance posted yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {data!.records.map((r) => (
                <li key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{r.meetingLabel}</strong>
                    <div style={{ color: "var(--mh-text-muted)", fontSize: 13 }}>
                      {r.courseCode} · {r.recordedAt.slice(0, 10)}
                    </div>
                  </div>
                  <StatusPill tone={r.status === "present" ? "success" : r.status === "absent" ? "danger" : "warning"}>
                    {r.status}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </StudentSisShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentSisShell } from "@/components/StudentSisShell";
import { api, loadSession } from "@/lib/api";
import { formatHccDateRange } from "@/lib/hccCourseFormat";

type FinalCourse = {
  enrolmentId: string;
  courseCode: string;
  title: string;
  credits: number;
  termCode: string;
  termName: string;
  programName: string;
  startsOn?: string | null;
  endsOn?: string | null;
  status: string;
  letter: string;
  averagePercent: number | null;
  gradePoints: number | null;
  countsTowardCgpa?: boolean;
};

type FinalMarksPayload = {
  programName: string | null;
  programs: Array<{ id: string; name: string }>;
  terms: Array<{ code: string; name: string }>;
  earnedCredits: number;
  averagePercent: number | null;
  cgpa: number | null;
  courses: FinalCourse[];
};

function fmtCredits(n: number) {
  return n.toFixed(2);
}

function fmtPct(n: number | null) {
  if (n == null) return "";
  return `${n.toFixed(2)}%`;
}

function fmtGp(n: number | null) {
  if (n == null) return "";
  return n.toFixed(2);
}

export default function StudentGradesPage() {
  const router = useRouter();
  const [name, setName] = useState("Student");
  const [data, setData] = useState<FinalMarksPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [programFilter, setProgramFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setName(`${session.givenName} ${session.familyName}`.trim() || "Student");
    api<FinalMarksPayload>("/student/transcript-summary", {}, session.accessToken)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load final marks"));
  }, [router]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.courses.filter((c) => {
      if (programFilter !== "all" && c.programName !== data.programName) return false;
      if (termFilter !== "all" && c.termCode !== termFilter) return false;
      return true;
    });
  }, [data, programFilter, termFilter]);

  const summary = useMemo(() => {
    if (!data) return { credits: 0, average: null as number | null, cgpa: null as number | null };
    const completed = filtered.filter((c) => c.status === "completed" && c.countsTowardCgpa !== false);
    const credits = completed.reduce((n, c) => n + c.credits, 0);
    const withPct = completed.filter((c) => c.averagePercent != null);
    const average =
      withPct.length > 0
        ? Number((withPct.reduce((n, c) => n + (c.averagePercent ?? 0), 0) / withPct.length).toFixed(2))
        : data.averagePercent;
    const withGp = completed.filter((c) => c.gradePoints != null);
    const cgpa =
      withGp.length > 0
        ? Number((withGp.reduce((n, c) => n + (c.gradePoints ?? 0), 0) / withGp.length).toFixed(2))
        : data.cgpa;
    return { credits, average, cgpa };
  }, [data, filtered]);

  const programTitle = data?.programName || "Programme";

  return (
    <StudentSisShell title="" activeHref="/student/grades" userName={name}>
      <div className="mh-hcc-page mh-hcc-page--campus" data-stu="STU-16">
        <p className="mh-hcc-profile__crumb">
          Home <span>›</span> Final Marks / Grades
        </p>
        <h1>FINAL MARKS / GRADES</h1>

        <div className="mh-hcc-filters mh-hcc-filters--campus">
          <label>
            <span>FILTER PROGRAM:</span>
            <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
              {(data?.programs ?? [{ id: "all", name: "All" }]).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>FILTER TERM:</span>
            <select value={termFilter} onChange={(e) => setTermFilter(e.target.value)}>
              {(data?.terms ?? [{ code: "all", name: "All Terms" }]).map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="mh-teacher-muted" style={{ color: "#b42318" }}>{error}</p> : null}
        {!data && !error ? <p className="mh-teacher-muted">Loading final marks…</p> : null}

        {data ? (
          <>
            <div className="mh-hcc-marks-head">
              <h2>{programTitle}</h2>
              <p>
                Credits: {fmtCredits(summary.credits)}
                {" | "}
                Average: {summary.average != null ? fmtPct(summary.average) : "—"}
                {" | "}
                CGPA: {summary.cgpa != null ? summary.cgpa.toFixed(2) : "—"}
              </p>
            </div>

            <table className="mh-hcc-table mh-hcc-table--campus">
              <thead>
                <tr>
                  <th>COURSE</th>
                  <th>DATES</th>
                  <th>CREDITS</th>
                  <th>GRADE POINTS</th>
                  <th>PERCENT</th>
                  <th>GRADE</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No final marks match these filters.</td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.enrolmentId}>
                      <td>
                        <strong className="mh-hcc-course-link">{row.courseCode}</strong>
                        <div className="mh-hcc-course-title">{row.title}</div>
                      </td>
                      <td>{formatHccDateRange(row.startsOn, row.endsOn) || "—"}</td>
                      <td>{fmtCredits(row.credits)}</td>
                      <td>{fmtGp(row.gradePoints)}</td>
                      <td>{fmtPct(row.averagePercent)}</td>
                      <td>{row.letter}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        ) : null}
      </div>
    </StudentSisShell>
  );
}

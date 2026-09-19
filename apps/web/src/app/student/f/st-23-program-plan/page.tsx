"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentSisShell } from "@/components/StudentSisShell";
import { api, loadSession } from "@/lib/api";
import { formatHccDate } from "@/lib/hccCourseFormat";

type PlanItem = {
  id: string;
  courseCode: string;
  title: string;
  credits: number;
  category: string;
  status: string;
  startsOn?: string | null;
  endsOn?: string | null;
  scheduleText?: string | null;
  sectionId?: string | null;
  sortOrder?: number;
};

type PlanPayload = {
  planId: string | null;
  status: string;
  cohort: { code: string; label: string; intakeYear: number; intakeMonth: number; sectionLabel: string } | null;
  summary: {
    totalCredits: number;
    earnedCredits: number;
    averagePercent: number | null;
    cgpa: number | null;
    completed: number;
    inProgress: number;
    notStarted: number;
    dropped: number;
  };
  main: PlanItem[];
  practicum: PlanItem[];
  makeup: PlanItem[];
};

function statusLabel(status: string) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In Progress";
  if (status === "dropped") return "Dropped Course";
  return "Not Started";
}

function statusClass(status: string) {
  if (status === "completed") return "mh-hcc-status mh-hcc-status--done";
  if (status === "in_progress") return "mh-hcc-status mh-hcc-status--progress";
  if (status === "dropped") return "mh-hcc-status mh-hcc-status--dropped";
  return "mh-hcc-status mh-hcc-status--muted";
}

function formatPlanDates(item: PlanItem) {
  const start = formatHccDate(item.startsOn);
  const end = formatHccDate(item.endsOn);
  if (start && end) return `${start} - ${end}`;
  return start || end || "—";
}

function formatScheduleLines(text: string | null | undefined) {
  if (!text) return ["—"];
  return text
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ProgramPlanPage() {
  const router = useRouter();
  const [data, setData] = useState<PlanPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Student");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("");

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setName(`${session.givenName} ${session.familyName}`.trim() || "Student");
    api<PlanPayload>("/student/program-plan", {}, session.accessToken)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load program plan"));
  }, [router]);

  const allItems = useMemo(() => {
    if (!data) return [];
    return [...data.main, ...data.practicum, ...data.makeup].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
  }, [data]);

  const filtered = useMemo(() => {
    const q = courseFilter.trim().toLowerCase();
    return allItems.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.courseCode.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q)
      );
    });
  }, [allItems, statusFilter, courseFilter]);

  return (
    <StudentSisShell title="" activeHref="/student/f/st-23-program-plan" userName={name}>
      <div className="mh-hcc-page mh-hcc-page--campus" data-stu="STU-19" data-figma-id="st-23">
        <p className="mh-hcc-profile__crumb">
          Home <span>›</span> Program Plan
        </p>
        <h1>PROGRAM PLAN</h1>

        <div className="mh-hcc-filters mh-hcc-filters--campus mh-hcc-filters--wrap">
          <label>
            <span>FILTER STATUS:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="dropped">Dropped Course</option>
              <option value="not_started">Not Started</option>
            </select>
          </label>
          <label>
            <span>FILTER COURSE:</span>
            <input
              type="search"
              placeholder="Code or title"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            />
          </label>
        </div>

        {error ? <p className="mh-teacher-muted" style={{ color: "#b42318" }}>{error}</p> : null}
        {!data && !error ? <p className="mh-teacher-muted">Loading program plan…</p> : null}

        {data ? (
          <>
            {!data.planId ? (
              <p className="mh-teacher-muted">No program plan on file yet. Contact the registrar.</p>
            ) : (
              <table className="mh-hcc-table mh-hcc-table--campus">
                <thead>
                  <tr>
                    <th>DATES</th>
                    <th>COURSE</th>
                    <th>SCHEDULE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No courses match these filters.</td>
                    </tr>
                  ) : (
                    filtered.map((item) => {
                      const planIndex = allItems.findIndex((x) => x.id === item.id);
                      const num = String((planIndex >= 0 ? planIndex : 0) + 1).padStart(2, "0");
                      return (
                      <tr key={item.id}>
                        <td>{formatPlanDates(item)}</td>
                        <td>
                          <strong>
                            ({num}) {item.courseCode} {item.title}
                          </strong>
                        </td>
                        <td>
                          {formatScheduleLines(item.scheduleText).map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                        </td>
                        <td>
                          <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            )}
          </>
        ) : null}
      </div>
    </StudentSisShell>
  );
}

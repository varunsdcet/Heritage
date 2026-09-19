"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TeacherScreenConfig } from "@/lib/teacherCatalog";
import { useOptionalTeacherLive } from "@/lib/useTeacherSisLive";

function Crumb({ items }: { items: string[] }) {
  return (
    <p className="mh-hcc-profile__crumb">
      {items.map((c, i) => (
        <span key={c}>
          {i > 0 ? <span> › </span> : null}
          {c}
        </span>
      ))}
    </p>
  );
}

export function HccMyCoursesView({ config }: { config: TeacherScreenConfig }) {
  const router = useRouter();
  const search = useSearchParams();
  const d = config.hccMyCourses;
  const rows = d?.courses ?? [];
  const term = search.get("term") || d?.termFilter || "All Terms";
  const status = search.get("status") || d?.statusFilter || "Active & Upcoming Courses";
  const termOptions = d?.termOptions?.length
    ? d.termOptions
    : ["All Terms", "Fall 2026", "Fall 2025"];
  const statusOptions = d?.statusOptions?.length
    ? d.statusOptions
    : ["Active & Upcoming Courses", "All Courses", "Ended Courses"];

  function applyFilter(next: { term?: string; status?: string }) {
    const params = new URLSearchParams();
    const nextTerm = next.term ?? term;
    const nextStatus = next.status ?? status;
    if (nextTerm && nextTerm !== "All Terms") params.set("term", nextTerm);
    if (nextStatus && nextStatus !== "Active & Upcoming Courses") params.set("status", nextStatus);
    const qs = params.toString();
    router.push(qs ? `/instructor/sections?${qs}` : "/instructor/sections");
  }

  return (
    <div className="mh-hcc-page" data-figma-id={config.figmaId}>
      <Crumb items={["Home", "My Courses"]} />
      <h1>MY COURSES</h1>
      <div className="mh-hcc-filters">
        <label>
          <span>FILTER TERM</span>
          <select value={term} onChange={(e) => applyFilter({ term: e.target.value })}>
            {termOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>FILTER STATUS</span>
          <select value={status} onChange={(e) => applyFilter({ status: e.target.value })}>
            {statusOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>
      <table className="mh-hcc-table">
        <thead>
          <tr>
            <th>COURSE</th>
            <th>DELIVERY METHOD</th>
            <th>STUDENTS</th>
            <th>STATUS</th>
            <th>LOCATION</th>
            <th>SCHEDULE</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>No courses found.</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="is-click" onClick={() => router.push(r.href)}>
                <td>
                  <strong>
                    {r.code} ({r.section})
                  </strong>
                  <div>{r.title}</div>
                  <em>Instructor</em>
                </td>
                <td>{r.delivery}</td>
                <td>{r.students}</td>
                <td>
                  <span className="mh-hcc-pill">{r.status}</span>
                </td>
                <td>{r.location}</td>
                <td className="mh-hcc-pre">{r.schedule}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function HccEvaluationsView({ config }: { config: TeacherScreenConfig }) {
  const rows = config.hccEvaluations?.rows ?? [];
  return (
    <div className="mh-hcc-page">
      <Crumb items={["Home", "Course Evaluations"]} />
      <h1>COURSE EVALUATION RESULTS</h1>
      <table className="mh-hcc-table">
        <thead>
          <tr>
            <th>COURSE</th>
            <th>EVALUATION</th>
            <th>DATES</th>
            <th>SCHEDULE</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4}>No evaluations found.</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={`${r.course}-${r.offering}`}>
                <td>
                  <strong>
                    {r.course} ({r.offering})
                  </strong>
                  <div>{r.title}</div>
                </td>
                <td>{r.evaluation}</td>
                <td>{r.dates}</td>
                <td className="mh-hcc-pre">{r.schedule}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function HccCourseHistoryView({ config }: { config: TeacherScreenConfig }) {
  const rows = config.hccCourseHistory?.rows ?? [];
  return (
    <div className="mh-hcc-page">
      <Crumb items={["Home", "Course History"]} />
      <h1>COURSE HISTORY</h1>
      <table className="mh-hcc-table">
        <thead>
          <tr>
            <th>COURSE</th>
            <th>ROOM</th>
            <th>DATES</th>
            <th>SCHEDULE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.course}-${r.offering}`}>
              <td>
                <strong>
                  {r.course} ({r.offering})
                </strong>
                <div>{r.title}</div>
              </td>
              <td>{r.room}</td>
              <td>{r.dates}</td>
              <td>{r.schedule}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HccGradesSubmissionView({ config }: { config: TeacherScreenConfig }) {
  const router = useRouter();
  const search = useSearchParams();
  const d = config.hccGradesSubmission;
  const rows = d?.rows ?? [];
  const course = search.get("course") || d?.courseFilter || "All Courses";
  const status = search.get("status") || d?.statusFilter || "Submission Required";
  const courseOptions = d?.courseOptions?.length ? d.courseOptions : ["All Courses"];
  const statusOptions = d?.statusOptions?.length
    ? d.statusOptions
    : ["Submission Required", "Submitted", "All Statuses"];

  function applyFilters(next: { course?: string; status?: string }) {
    const params = new URLSearchParams();
    params.set("mode", "submission");
    const nextCourse = next.course ?? course;
    const nextStatus = next.status ?? status;
    if (nextCourse && nextCourse !== "All Courses") params.set("course", nextCourse);
    if (nextStatus && nextStatus !== "Submission Required") params.set("status", nextStatus);
    router.push(`/instructor/f/t62-pending-grade-submissions?${params.toString()}`);
  }

  return (
    <div className="mh-hcc-page">
      <Crumb items={["Home", "Grades Submission"]} />
      <h1>GRADES SUBMISSION</h1>
      <div className="mh-hcc-filters">
        <label>
          <span>COURSE</span>
          <select value={course} onChange={(e) => applyFilters({ course: e.target.value })}>
            {courseOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>SUBMISSION STATUS</span>
          <select value={status} onChange={(e) => applyFilters({ status: e.target.value })}>
            {statusOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="mh-hcc-btn" onClick={() => applyFilters({})}>
          Search Courses
        </button>
      </div>
      <table className="mh-hcc-table">
        <thead>
          <tr>
            <th>COURSE</th>
            <th>STATUS</th>
            <th>GRADING TYPE</th>
            <th>COURSE DATES</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5}>No courses match the selected filters.</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>
                    {r.course} ({r.offering})
                  </strong>
                  <div>{r.title}</div>
                </td>
                <td>{r.status}</td>
                <td>{r.gradingType}</td>
                <td>{r.dates}</td>
                <td>
                  <button type="button" className="mh-hcc-link" onClick={() => router.push(r.href)}>
                    SUBMIT GRADES
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function HccPendingGradesView({ config }: { config: TeacherScreenConfig }) {
  const router = useRouter();
  const search = useSearchParams();
  const d = config.hccPendingGrades;
  const rows = d?.rows ?? [];
  const campus = search.get("campus") || d?.campusFilter || "All Campuses";
  const course = search.get("course") || d?.courseFilter || "All Courses";
  const faculty = search.get("faculty") || d?.facultyFilter || "All Faculty / Instructors";
  const campusOptions = d?.campusOptions?.length ? d.campusOptions : ["All Campuses"];
  const courseOptions = d?.courseOptions?.length ? d.courseOptions : ["All Courses"];
  const facultyOptions = d?.facultyOptions?.length
    ? d.facultyOptions
    : ["All Faculty / Instructors"];

  function applyFilters(next: { campus?: string; course?: string; faculty?: string } = {}) {
    const params = new URLSearchParams();
    const nextCampus = next.campus ?? campus;
    const nextCourse = next.course ?? course;
    const nextFaculty = next.faculty ?? faculty;
    if (nextCampus && nextCampus !== "All Campuses") params.set("campus", nextCampus);
    if (nextCourse && nextCourse !== "All Courses") params.set("course", nextCourse);
    if (nextFaculty && nextFaculty !== "All Faculty / Instructors") params.set("faculty", nextFaculty);
    const qs = params.toString();
    router.push(
      qs
        ? `/instructor/f/t62-pending-grade-submissions?${qs}`
        : "/instructor/f/t62-pending-grade-submissions",
    );
  }

  return (
    <div className="mh-hcc-page">
      <Crumb items={["Home", "Pending Grade Submissions"]} />
      <h1>PENDING GRADE SUBMISSIONS</h1>
      <div className="mh-hcc-filters">
        <label>
          <span>FILTER CAMPUS</span>
          <select value={campus} onChange={(e) => applyFilters({ campus: e.target.value })}>
            {campusOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>FILTER COURSE</span>
          <select value={course} onChange={(e) => applyFilters({ course: e.target.value })}>
            {courseOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>FACULTY / INSTRUCTOR</span>
          <select value={faculty} onChange={(e) => applyFilters({ faculty: e.target.value })}>
            {facultyOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="mh-hcc-btn" onClick={() => applyFilters()}>
          Search Submissions
        </button>
      </div>
      <p className="mh-hcc-results">Results: {rows.length}</p>
      <table className="mh-hcc-table">
        <thead>
          <tr>
            <th>COURSE</th>
            <th>INSTRUCTOR(S)</th>
            <th>DATES</th>
            <th>SUBMITTED BY</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5}>No submissions match the selected filters.</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={`${r.course}-${r.offering}`}>
                <td>
                  <strong>
                    {r.course} ({r.offering})
                  </strong>
                  <div>{r.title}</div>
                </td>
                <td>{r.instructor}</td>
                <td>{r.dates}</td>
                <td>
                  {r.submittedBy}
                  <div>{r.submittedAt}</div>
                </td>
                <td>
                  <button type="button" className="mh-hcc-link" onClick={() => router.push(r.href)}>
                    REVIEW
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function HccAttendanceView({ config }: { config: TeacherScreenConfig }) {
  const d = config.hccAttendance;
  const groups = d?.groups ?? [];
  return (
    <div className="mh-hcc-page">
      <Crumb items={["Home", "Course Attendance"]} />
      <h1>COURSE ATTENDANCE</h1>
      <div className="mh-hcc-actions">
        <button type="button" className="mh-hcc-btn">
          Week View
        </button>
        <button type="button" className="mh-hcc-btn ghost">
          Print Roster
        </button>
      </div>
      <div className="mh-hcc-filters">
        <label>
          <span>DATE FILTER</span>
          <input type="date" defaultValue={d?.dateFilter || "2026-09-18"} />
        </label>
        <label>
          <span>STUDENT FILTER</span>
          <input placeholder="Student # or last name" />
        </label>
        <label>
          <span>COURSE FILTER</span>
          <select defaultValue={d?.courseFilter || "All Courses"}>
            <option>All Courses</option>
          </select>
        </label>
        <button type="button" className="mh-hcc-btn">
          Load Attendance
        </button>
      </div>
      <div className="mh-hcc-date-nav">
        <button type="button">{d?.prevLabel || "Sep. 17, 2026"}</button>
        <strong>{d?.centerLabel}</strong>
        <button type="button">{d?.nextLabel || "Sep. 19, 2026"}</button>
      </div>
      {groups.every((g) => g.students.length === 0) ? (
        <p className="mh-teacher-muted">No students were found. Please change the filters above to see other possibilities.</p>
      ) : (
        groups.map((g) =>
          g.students.length === 0 ? null : (
            <section key={g.offering} className="mh-hcc-att-group">
              <h2>
                {g.course} ({g.offering}) — {g.title}
              </h2>
              <p className="mh-teacher-muted">{g.meta}</p>
              <table className="mh-hcc-table">
                <thead>
                  <tr>
                    <th>STUDENT</th>
                    <th>ATTENDANCE</th>
                    <th>NOTE</th>
                  </tr>
                </thead>
                <tbody>
                  {g.students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="mh-hcc-student-cell">
                          <span className="mh-hcc-avatar" />
                          <span>
                            <strong>{s.name}</strong>
                            <div>{s.studentNumber}</div>
                          </span>
                        </div>
                      </td>
                      <td>
                        <label>
                          <input type="radio" name={`att-${s.id}`} defaultChecked={s.status === "Present"} /> Present
                        </label>{" "}
                        <label>
                          <input type="radio" name={`att-${s.id}`} defaultChecked={s.status === "Absent"} /> Absent
                        </label>
                      </td>
                      <td>
                        <input className="mh-teacher-field" defaultValue={s.note} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ),
        )
      )}
    </div>
  );
}

export function HccStudentsView({ config }: { config: TeacherScreenConfig }) {
  const router = useRouter();
  const search = useSearchParams();
  const live = useOptionalTeacherLive();
  const d = config.hccStudents;
  const rows = d?.rows ?? [];
  const statusFromUrl = search.get("status") || d?.filters.status || "All Statuses";
  const loading = Boolean(live?.loading);

  const FILTER_META: Array<{ key: string; label: string; kind?: "select" | "date" }> = [
    { key: "campus", label: "CAMPUS FILTER" },
    { key: "program", label: "PROGRAM FILTER" },
    { key: "pathway", label: "PATHWAY FILTER" },
    { key: "schedule", label: "SCHEDULE FILTER" },
    { key: "programTerm", label: "PROGRAM TERM FILTER" },
    { key: "admissionTerm", label: "ADMISSION TERM FILTER" },
    { key: "nationality", label: "NATIONALITY FILTER" },
    { key: "status", label: "STATUS FILTER" },
    { key: "agent", label: "AGENT FILTER" },
    { key: "advisor", label: "ADVISOR FILTER" },
    { key: "startDate", label: "START DATE FILTER", kind: "date" },
    { key: "endDate", label: "END DATE FILTER", kind: "date" },
  ];

  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = { ...(d?.filters || {}) };
    if (!base.status) base.status = statusFromUrl;
    return base;
  });

  useEffect(() => {
    const next: Record<string, string> = { ...(d?.filters || {}) };
    if (!next.status) next.status = statusFromUrl;
    setDraft(next);
  }, [d?.filters, statusFromUrl]);

  function applyFilters(
    overrides: Record<string, string> = {},
    letter?: string,
    paging?: { page?: number; perPage?: number },
  ) {
    const values = { ...draft, ...overrides };
    const params = new URLSearchParams();
    const defaults: Record<string, string> = {
      campus: "All Campuses",
      program: "All Programs",
      pathway: "All Pathways",
      schedule: "All Schedules",
      programTerm: "All Program Terms",
      admissionTerm: "All Admission Terms",
      nationality: "All Nationalities",
      status: "All Statuses",
      agent: "All Agents",
      advisor: "All Advisors",
    };
    for (const [k, v] of Object.entries(values)) {
      const val = (v || "").trim();
      if (!val) continue;
      if (val.startsWith("— ")) continue; // disabled section headings
      if (defaults[k] && val.toLowerCase() === defaults[k].toLowerCase()) continue;
      if (k === "status" && (val.toLowerCase() === "all statuses" || val.toLowerCase() === "all")) continue;
      if ((k === "program" || k === "schedule") && val.toLowerCase() === "all") continue;
      params.set(k, val);
    }
    const letterValue = letter !== undefined ? letter : (d?.letter || search.get("letter") || "ALL");
    if (letterValue && letterValue !== "ALL") params.set("letter", letterValue);
    const perPage = paging?.perPage ?? d?.perPage ?? 50;
    const filterChanged = Object.keys(overrides).length > 0 || letter !== undefined || Boolean(paging?.perPage);
    const page = paging?.page ?? (filterChanged ? 1 : d?.page ?? 1);
    if (perPage && perPage !== 50) params.set("perPage", String(perPage));
    if (page && page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.push(qs ? `/instructor/f/t12-students-view?${qs}` : "/instructor/f/t12-students-view");
  }

  function onFilterChange(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    // Apply immediately via API (URL → live refetch). Preserve current alphabet filter.
    applyFilters({ [key]: value }, undefined, { page: 1 });
  }

  function renderSelectOptions(key: string, value: string) {
    const menu = d?.filterMenus?.[key];
    if (menu) {
      const nodes: ReactNode[] = [];
      nodes.push(
        <option key={`${key}-all`} value={menu.all}>
          {menu.all}
        </option>,
      );
      for (const lead of menu.leading || []) {
        nodes.push(
          <option key={`${key}-lead-${lead}`} value={lead}>
            {lead}
          </option>,
        );
      }
      for (const opt of menu.flat || []) {
        nodes.push(
          <option key={`${key}-flat-${opt}`} value={opt}>
            {opt}
          </option>,
        );
      }
      for (const g of menu.groups || []) {
        const kids: ReactNode[] = [];
        for (const opt of g.options) {
          kids.push(
            <option key={`${key}-${g.label}-${opt}`} value={opt}>
              {opt}
            </option>,
          );
        }
        for (const sec of g.sections || []) {
          kids.push(
            <option key={`${key}-${g.label}-h-${sec.heading}`} disabled>
              — {sec.heading} —
            </option>,
          );
          for (const opt of sec.options) {
            kids.push(
              <option key={`${key}-${g.label}-${sec.heading}-${opt}`} value={opt}>
                {opt}
              </option>,
            );
          }
        }
        nodes.push(
          <optgroup key={`${key}-g-${g.label}`} label={g.label}>
            {kids}
          </optgroup>,
        );
      }
      return nodes;
    }
    const options = d?.filterOptions?.[key];
    return (options && options.length ? options : [value || "All"]).map((opt) => (
      <option key={opt} value={opt}>
        {opt}
      </option>
    ));
  }

  const activeLetter = (d?.letter || search.get("letter") || "ALL").toUpperCase();
  const perPageOpts = d?.perPageOptions || ["10", "25", "50", "100"];
  const totalPages = d?.totalPages || 1;

  return (
    <div className="mh-hcc-students" data-figma-id={config.figmaId}>
      <aside className="mh-hcc-students__side">
        <h3>STUDENTS BY STATUS</h3>
        <ul>
          {(d?.sidebar || []).map((s) => (
            <li key={s.label}>
              <button
                type="button"
                className={s.active || s.label === statusFromUrl ? "is-active" : ""}
                onClick={() => router.push(s.href)}
              >
                <span>{s.label}</span>
                <em>({s.count})</em>
              </button>
            </li>
          ))}
        </ul>
        <h3>STUDENT MANAGEMENT</h3>
        <ul>
          {(d?.management || []).map((m) => (
            <li key={m.label}>
              <button type="button" onClick={() => router.push(m.href)}>
                <span>{m.label}</span>
                {m.count != null ? <em>({m.count})</em> : null}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="mh-hcc-students__main">
        <h1>{config.title || "STUDENTS"}</h1>
        <div className="mh-hcc-filters mh-hcc-filters--wrap">
          {FILTER_META.map((m) => {
            const value = draft[m.key] ?? "";
            if (m.kind === "date") {
              return (
                <label key={m.key}>
                  <span>{m.label}:</span>
                  <input
                    type="date"
                    value={value}
                    onChange={(e) => onFilterChange(m.key, e.target.value)}
                  />
                </label>
              );
            }
            return (
              <label key={m.key}>
                <span>{m.label}</span>
                <select
                  value={value || d?.filterMenus?.[m.key]?.all || d?.filterOptions?.[m.key]?.[0] || ""}
                  onChange={(e) => onFilterChange(m.key, e.target.value)}
                >
                  {renderSelectOptions(m.key, value)}
                </select>
              </label>
            );
          })}
          <button type="button" className="mh-hcc-btn" onClick={() => applyFilters()}>
            Search Students
          </button>
        </div>
        <div className="mh-hcc-alpha">
          {["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((ch) => (
            <button
              key={ch}
              type="button"
              className={activeLetter === ch ? "is-active" : ""}
              onClick={() => applyFilters({}, ch)}
            >
              {ch}
            </button>
          ))}
        </div>
        <div className="mh-hcc-results-bar">
          <span>
            Results: {loading ? "…" : (d?.results ?? rows.length).toLocaleString()}
            {loading ? " · Loading…" : ""}
          </span>
          <label>
            Results per page
            <select
              value={String(d?.perPage ?? 50)}
              onChange={(e) => applyFilters({}, undefined, { perPage: Number(e.target.value), page: 1 })}
            >
              {perPageOpts.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Page
            <select
              value={String(d?.page ?? 1)}
              onChange={(e) => applyFilters({}, undefined, { page: Number(e.target.value) })}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        {d?.empty && rows.length === 0 ? (
          <p className="mh-teacher-muted">{d.empty}</p>
        ) : (
          <table className="mh-hcc-table">
            <thead>
              <tr>
                <th />
                <th>
                  NAME <span className="mh-hcc-sort">↕</span>
                </th>
                <th>STATUS</th>
                <th>ADVISORS</th>
                <th>PROGRAM</th>
                <th>PROGRAM TERM</th>
                <th>ADMISSION TERM</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="mh-hcc-avatar" />
                  </td>
                  <td>
                    <strong>{r.name}</strong>
                    <div>{r.studentNumber}</div>
                  </td>
                  <td>
                    <span className="mh-hcc-pill">{r.status}</span>
                  </td>
                  <td>{r.advisors}</td>
                  <td>{r.program}</td>
                  <td>{r.programTerm}</td>
                  <td>{r.admissionTerm}</td>
                  <td>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function HccFlagsView({ config }: { config: TeacherScreenConfig }) {
  const d = config.hccFlags;
  const rows = d?.rows ?? [];
  return (
    <div className="mh-hcc-page">
      <Crumb items={["Home", "Student Flags"]} />
      <h1>STUDENT FLAGS</h1>
      <div className="mh-hcc-filters">
        <label>
          <span>CAMPUS FILTER</span>
          <select defaultValue={d?.campus || "ALL CAMPUSES"}>
            <option>ALL CAMPUSES</option>
          </select>
        </label>
        <label>
          <span>STUDENT FILTER</span>
          <input placeholder="Enter student # or last name" />
        </label>
        <label>
          <span>STATUS</span>
          <select defaultValue={d?.status || "Active"}>
            <option>Active</option>
          </select>
        </label>
        <label>
          <span>RESOLVED</span>
          <select defaultValue={d?.resolved || "No"}>
            <option>No</option>
            <option>Yes</option>
          </select>
        </label>
        <label>
          <span>FLAG TEMPLATES</span>
          <select defaultValue={d?.template || "All Flags"}>
            <option>All Flags</option>
          </select>
        </label>
        <button type="button" className="mh-hcc-btn">
          Search Flags
        </button>
      </div>
      <p className="mh-hcc-results">Results: {d?.results ?? rows.length}</p>
      <table className="mh-hcc-table">
        <thead>
          <tr>
            <th />
            <th>STUDENT</th>
            <th>DESCRIPTION</th>
            <th>STATUS</th>
            <th>APPLIES HOLD</th>
            <th>DATE</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <span className="mh-hcc-avatar" />
              </td>
              <td>{r.student}</td>
              <td>{r.description}</td>
              <td>{r.status}</td>
              <td>{r.appliesHold}</td>
              <td>{r.date}</td>
              <td>
                <button type="button" className="mh-hcc-link">
                  DISMISS
                </button>{" "}
                <button type="button" className="mh-hcc-link">
                  DELETE
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HccEmptyView({ config }: { config: TeacherScreenConfig }) {
  return (
    <div className="mh-hcc-page">
      <Crumb items={config.breadcrumbs || ["Home"]} />
      <h1>{config.title}</h1>
      <p className="mh-teacher-muted">{config.hccEmpty?.empty || "No records were found."}</p>
    </div>
  );
}

export function HccRepositoryView({ config }: { config: TeacherScreenConfig }) {
  const d = config.hccRepository;
  return (
    <div className="mh-hcc-page">
      <Crumb items={["Home", "Content Repository"]} />
      <h1>COURSE CONTENT REPOSITORY</h1>
      <div className="mh-hcc-filters">
        <label>
          <span>COURSE FILTER</span>
          <input placeholder={d?.placeholder || "Enter Course Name / Number Here"} />
        </label>
        <button type="button" className="mh-hcc-btn">
          Search Repository
        </button>
      </div>
      <table className="mh-hcc-table">
        <thead>
          <tr>
            <th>COURSE NAME / NUMBER</th>
            <th>LMS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={2}>{d?.empty || "No courses were found in the repository."}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function HccPendingSchedulesView({ config }: { config: TeacherScreenConfig }) {
  const d = config.hccPendingSchedules;
  return (
    <div className="mh-hcc-page">
      <Crumb items={["Home", "Pending Course Schedules"]} />
      <h1>PENDING COURSE SCHEDULES</h1>
      <div className="mh-hcc-filters">
        <label>
          <span>CHANGE TYPE</span>
          <select defaultValue={d?.changeType || "All Types"}>
            <option>All Types</option>
          </select>
        </label>
        <button type="button" className="mh-hcc-btn">
          Show Courses
        </button>
      </div>
      <p className="mh-teacher-muted">{d?.empty || "No pending course schedules were found."}</p>
    </div>
  );
}

export function HccTranscriptPendingView({ config }: { config: TeacherScreenConfig }) {
  return (
    <div className="mh-hcc-page">
      <Crumb items={["Home", "Pending Transcript Changes"]} />
      <h1>PENDING TRANSCRIPT CHANGES</h1>
      <div className="mh-hcc-banner-alert">{config.hccTranscriptPending?.banner}</div>
    </div>
  );
}

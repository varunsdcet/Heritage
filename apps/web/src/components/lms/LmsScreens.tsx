"use client";

import { useMemo, useState } from "react";
import type { CourseLmsState } from "@/lib/teacherCatalog";
import { useOptionalTeacherLive } from "@/lib/useTeacherSisLive";

export function AttendancePanel({ lms }: { lms: CourseLmsState }) {
  const dates = lms.attendanceDates?.length
    ? lms.attendanceDates
    : ["Apr 27, 2026 (Mon)", "Apr 28, 2026 (Tue)", "Apr 29, 2026 (Wed)", "Apr 30, 2026 (Thu)"];
  const [date, setDate] = useState(dates[0]);
  return (
    <section className="mh-teacher-card">
      <div className="mh-lms-toolbar">
        <label>
          <span className="mh-teacher-sr-only">Attendance date</span>
          <select className="mh-teacher-field" value={date} onChange={(e) => setDate(e.target.value)}>
            {dates.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary">
          PRINT ROSTER
        </button>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary">
          EXPORT ATTENDANCE
        </button>
      </div>
      <h2>Attendance</h2>
      <p className="mh-teacher-muted">No attendance/students were found</p>
    </section>
  );
}

export function ClassListPanel({
  roster,
}: {
  roster: Array<{ name: string; studentNumber: string; program: string; standing: string; email: string }>;
}) {
  return (
    <section className="mh-teacher-card">
      <div className="mh-lms-toolbar">
        <h2>Class List</h2>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary">
          Print Class List
        </button>
      </div>
      {roster.length === 0 ? (
        <p className="mh-teacher-muted">No students are currently registered in this course offering</p>
      ) : (
        <div className="mh-teacher-list">
          {roster.map((s) => (
            <div key={s.studentNumber || s.email || s.name} className="mh-teacher-list__item">
              <div>
                <strong>{s.name}</strong>
                <span>
                  {s.studentNumber}
                  {s.program ? ` · ${s.program}` : ""}
                </span>
              </div>
              <span className="mh-teacher-muted">{s.email}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function GradesBoard({
  lms,
  onAddItem,
  onPostMarks,
}: {
  lms: CourseLmsState;
  onAddItem: () => void;
  onPostMarks: () => void;
}) {
  const live = useOptionalTeacherLive();
  return (
    <section className="mh-teacher-card mh-lms-grades">
      <div className="mh-lms-toolbar">
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" disabled={live?.busy} onClick={onAddItem}>
          Add Item
        </button>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" disabled={live?.busy} onClick={onPostMarks}>
          Post Class Marks
        </button>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" disabled={live?.busy} onClick={() => void live?.runAction?.("Export Grades")}>
          Export Grades
        </button>
        <button type="button" className="mh-teacher-link" aria-label="Expand / full-screen view">
          Expand
        </button>
      </div>
      <div className="mh-lms-grade-wrap">
        <table className="mh-lms-grade-table">
          <thead>
            <tr>
              {lms.gradeColumns.map((col) => (
                <th key={col} scope="col">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lms.gradeWeights ? (
              <tr className="mh-lms-grade-table__row--muted">
                {lms.gradeWeights.map((w, i) => (
                  <td key={`${lms.gradeColumns[i] ?? i}-w`}>{w || "—"}</td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mh-teacher-muted mh-lms-grade-empty">{lms.gradeEmpty || "No students registered"}</p>
    </section>
  );
}

export function AddGradeItemPanel({ onCancel }: { onCancel: () => void }) {
  const live = useOptionalTeacherLive();
  const [name, setName] = useState("");
  const [outOf, setOutOf] = useState("100");
  const [weight, setWeight] = useState("5");
  const [method, setMethod] = useState("Manual Grading");
  return (
    <section className="mh-teacher-card">
      <h2>Add Grading Item</h2>
      <h3>Grading Item Details</h3>
      <div className="mh-teacher-fields">
        <label>
          <span>Item name / title</span>
          <input className="mh-teacher-field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <span>Out of / Highest Mark</span>
          <input className="mh-teacher-field" value={outOf} onChange={(e) => setOutOf(e.target.value)} />
        </label>
        <label>
          <span>Grading weight (%)</span>
          <input className="mh-teacher-field" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
        <label>
          <span>Due / Release date</span>
          <input className="mh-teacher-field" type="datetime-local" />
        </label>
        <label>
          <span>Grading Method</span>
          <select className="mh-teacher-field" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Manual Grading</option>
            <option>Grade Guide</option>
            <option>Rubric</option>
          </select>
        </label>
      </div>
      <div className="mh-lms-toolbar">
        <button
          type="button"
          className="mh-teacher-btn"
          disabled={live?.busy || !name.trim()}
          onClick={() => void live?.runAction?.("Create Grading Item", JSON.stringify({ Name: name, OutOf: outOf, Weight: weight, Method: method }))}
        >
          Create Grading Item
        </button>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

export function PostMarksModal({ onClose }: { onClose: () => void }) {
  const live = useOptionalTeacherLive();
  return (
    <div className="mh-lms-chooser-overlay" role="presentation" onClick={onClose}>
      <div className="mh-lms-confirm" role="dialog" aria-modal="true" aria-labelledby="post-marks-title" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2 id="post-marks-title">Post Class Marks</h2>
          <button type="button" className="mh-lms-chooser-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <p>Are you sure you want to post your class marks?</p>
        <p className="mh-teacher-muted">Students will only be able to see their own personal marks.</p>
        <div className="mh-lms-toolbar">
          <button
            type="button"
            className="mh-teacher-btn"
            disabled={live?.busy}
            onClick={() => {
              void live?.runAction?.("Confirm Post");
              onClose();
            }}
          >
            Confirm Post
          </button>
          <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function LogsPanel({
  lms,
  title,
}: {
  lms: CourseLmsState;
  title?: string;
}) {
  const activities = useMemo(() => {
    const rows = ["All activities"];
    for (const topic of lms.topics) {
      rows.push(topic.title);
      for (const act of topic.activities) rows.push(act.name);
    }
    return rows;
  }, [lms.topics]);
  const dates = useMemo(() => {
    const items = ["All days", "Today"];
    const start = new Date("2026-09-18T12:00:00");
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      items.push(
        d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      );
    }
    return items;
  }, []);
  const [filters, setFilters] = useState({
    course: "Social Service Work Fundamentals",
    participants: "All participants",
    date: "All days",
    activities: "All activities",
    actions: "All actions",
    sources: "All sources",
    events: "All events",
    logType: "Standard log",
  });
  const [loaded, setLoaded] = useState(false);
  const set = (key: keyof typeof filters, value: string) => setFilters((p) => ({ ...p, [key]: value }));
  return (
    <section className="mh-teacher-card">
      <h2>{title || "Logs"}</h2>
      <div className="mh-lms-logs">
        <label>
          <span>Course/context</span>
          <select className="mh-teacher-field" value={filters.course} onChange={(e) => set("course", e.target.value)}>
            <option>Social Service Work Fundamentals</option>
          </select>
        </label>
        <label>
          <span>Participants</span>
          <select className="mh-teacher-field" value={filters.participants} onChange={(e) => set("participants", e.target.value)}>
            {(lms.logParticipants || ["All participants", "Monica Dahiya", "Guest user"]).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Date</span>
          <select className="mh-teacher-field" value={filters.date} onChange={(e) => set("date", e.target.value)}>
            {dates.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Activities</span>
          <select className="mh-teacher-field" value={filters.activities} onChange={(e) => set("activities", e.target.value)}>
            {activities.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Actions</span>
          <select className="mh-teacher-field" value={filters.actions} onChange={(e) => set("actions", e.target.value)}>
            {["All actions", "Create", "View", "Update", "Delete", "All changes"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Sources</span>
          <select className="mh-teacher-field" value={filters.sources} onChange={(e) => set("sources", e.target.value)}>
            {["All sources", "CLI", "Restore", "Web", "Web service", "Other"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Events</span>
          <select className="mh-teacher-field" value={filters.events} onChange={(e) => set("events", e.target.value)}>
            {["All events", "Teaching", "Participating", "Other"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Log type</span>
          <select className="mh-teacher-field" value={filters.logType} onChange={(e) => set("logType", e.target.value)}>
            <option>Standard log</option>
            <option>Legacy log</option>
          </select>
        </label>
      </div>
      <button type="button" className="mh-teacher-btn" onClick={() => setLoaded(true)}>
        Get these logs
      </button>
      {loaded ? <p className="mh-teacher-muted">No logs match the selected filters.</p> : null}
    </section>
  );
}

export function ReportNav({
  current,
  onSelect,
}: {
  current: string;
  onSelect: (id: string) => void;
}) {
  const items = [
    { id: "competency-breakdown", label: "Competency breakdown" },
    { id: "logs", label: "Logs" },
    { id: "live-logs", label: "Live logs" },
    { id: "activity-report", label: "Activity report" },
    { id: "course-participation", label: "Course participation" },
  ];
  return (
    <aside className="mh-lms-report-nav">
      {items.map((item) => (
        <button key={item.id} type="button" className={current === item.id ? "is-active" : ""} onClick={() => onSelect(item.id)}>
          {item.label}
        </button>
      ))}
    </aside>
  );
}

export function CompetencyBreakdownPanel({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="mh-teacher-card">
      <div className="mh-lms-toolbar">
        <h2>Competency breakdown</h2>
        <button type="button" className="mh-teacher-btn" onClick={onAdd}>
          Add competencies
        </button>
      </div>
      <p className="mh-teacher-muted">No competencies found</p>
    </section>
  );
}

export function FiltersPanel() {
  return (
    <section className="mh-teacher-card">
      <h2>Filter settings</h2>
      <p className="mh-teacher-muted">Course context: Social Service Work Fundamentals</p>
      <div className="mh-teacher-fields">
        {["MathJax", "Multimedia plugins", "Display H5P", "Glossary auto-linking"].map((name) => (
          <label key={name}>
            <span>{name}</span>
            <select className="mh-teacher-field" defaultValue="Default (On)">
              <option>Default (On)</option>
              <option>Off</option>
              <option>On</option>
            </select>
          </label>
        ))}
      </div>
      <div className="mh-lms-toolbar">
        <button type="button" className="mh-teacher-btn">
          Save changes
        </button>
      </div>
    </section>
  );
}

export function SettingsPanel({ courseCode, title }: { courseCode: string; title: string }) {
  const live = useOptionalTeacherLive();
  return (
    <section className="mh-teacher-card mh-lms-addform">
      <h2>Edit course settings</h2>
      <details open className="mh-lms-addform__sec">
        <summary>General</summary>
        <div className="mh-lms-addform__fields">
          <label>
            <span>Course full name</span>
            <input className="mh-teacher-field" defaultValue={title} />
          </label>
          <label>
            <span>Course short name</span>
            <input className="mh-teacher-field" defaultValue={courseCode} />
          </label>
          <label>
            <span>Course visibility</span>
            <select className="mh-teacher-field" defaultValue="Show">
              <option>Hide</option>
              <option>Show</option>
            </select>
          </label>
          <label>
            <span>Course start date</span>
            <input className="mh-teacher-field" type="datetime-local" defaultValue="2026-04-27T09:00" />
          </label>
          <label>
            <span>Course end date</span>
            <div className="mh-lms-dt">
              <input className="mh-teacher-field" type="datetime-local" defaultValue="2026-05-01T17:00" />
              <label className="mh-lms-check">
                <input type="checkbox" defaultChecked />
                Enable
              </label>
            </div>
          </label>
          <label>
            <span>Course ID number</span>
            <input className="mh-teacher-field" defaultValue="ACSWAPR26-01" />
          </label>
        </div>
      </details>
      <details open className="mh-lms-addform__sec">
        <summary>Description</summary>
        <div className="mh-lms-addform__fields">
          <label className="mh-lms-addform__wide">
            <span>Course summary</span>
            <textarea className="mh-teacher-field" rows={5} defaultValue="Social Service Work Fundamentals" />
          </label>
          <label>
            <span>Course summary format</span>
            <select className="mh-teacher-field">
              <option>HTML format</option>
              <option>Moodle auto-format</option>
              <option>Plain text format</option>
              <option>Markdown format</option>
            </select>
          </label>
          <label className="mh-lms-addform__wide">
            <span>Course image</span>
            <div className="mh-teacher-dropzone">
              <input type="file" accept="image/*" />
              <p className="mh-teacher-muted">Maximum 200MB · Maximum 1 file · Accepted image formats</p>
            </div>
          </label>
        </div>
      </details>
      <details className="mh-lms-addform__sec">
        <summary>Course format</summary>
        <div className="mh-lms-addform__fields">
          <label>
            <span>Format</span>
            <select className="mh-teacher-field" defaultValue="Topics format">
              <option>Single activity format</option>
              <option>Social format</option>
              <option>Topics format</option>
              <option>Weekly format</option>
            </select>
          </label>
          <label>
            <span>Hidden sections</span>
            <select className="mh-teacher-field">
              <option>Hidden sections are shown as not available</option>
              <option>Hidden sections are completely invisible</option>
            </select>
          </label>
          <label>
            <span>Course layout</span>
            <select className="mh-teacher-field">
              <option>Show all sections on one page</option>
              <option>Show one section per page</option>
            </select>
          </label>
        </div>
      </details>
      <details className="mh-lms-addform__sec">
        <summary>Appearance</summary>
        <div className="mh-lms-addform__fields">
          <label>
            <span>Force language</span>
            <select className="mh-teacher-field">
              <option>Do not force</option>
              <option>English (en)</option>
            </select>
          </label>
          <label>
            <span>Number of announcements</span>
            <input className="mh-teacher-field" defaultValue="5" />
          </label>
          <label className="mh-lms-check">
            <input type="checkbox" defaultChecked />
            Show gradebook to students
          </label>
          <label className="mh-lms-check">
            <input type="checkbox" />
            Show activity reports
          </label>
          <label className="mh-lms-check">
            <input type="checkbox" defaultChecked />
            Show activity dates
          </label>
        </div>
      </details>
      <details className="mh-lms-addform__sec">
        <summary>Files and uploads</summary>
        <div className="mh-lms-addform__fields">
          <label>
            <span>Maximum upload size</span>
            <select className="mh-teacher-field">
              {["Site upload limit (200 MB)", "200 MB", "100 MB", "50 MB", "20 MB", "10 MB", "5 MB", "2 MB", "1 MB", "500 KB", "100 KB", "50 KB", "10 KB"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </details>
      <details className="mh-lms-addform__sec">
        <summary>Completion tracking</summary>
        <label className="mh-lms-check">
          <input type="checkbox" defaultChecked />
          Enable completion tracking
        </label>
      </details>
      <details className="mh-lms-addform__sec">
        <summary>Groups</summary>
        <div className="mh-lms-addform__fields">
          <label>
            <span>Group mode</span>
            <select className="mh-teacher-field">
              <option>No groups</option>
              <option>Separate groups</option>
              <option>Visible groups</option>
            </select>
          </label>
          <label className="mh-lms-check">
            <input type="checkbox" />
            Force group mode
          </label>
          <label>
            <span>Default grouping</span>
            <select className="mh-teacher-field">
              <option>None</option>
            </select>
          </label>
        </div>
      </details>
      <details className="mh-lms-addform__sec">
        <summary>Role renaming</summary>
        <div className="mh-lms-addform__fields">
          {["Manager", "Course creator", "Teacher", "Non-editing teacher", "Student"].map((role) => (
            <label key={role}>
              <span>Your word for ‘{role}’</span>
              <input className="mh-teacher-field" />
            </label>
          ))}
        </div>
      </details>
      <div className="mh-lms-toolbar">
        <button type="button" className="mh-teacher-btn" disabled={live?.busy} onClick={() => void live?.runAction?.("Save course settings")}>
          Save and display
        </button>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary">
          Cancel
        </button>
      </div>
    </section>
  );
}

export function EditSectionPanel({
  title,
  onSave,
  onCancel,
}: {
  title: string;
  onSave: (name: string, summary: string) => void;
  onCancel: () => void;
}) {
  const [custom, setCustom] = useState(true);
  const [name, setName] = useState(title);
  const [summary, setSummary] = useState("");
  return (
    <section className="mh-teacher-card">
      <h2>Edit section</h2>
      <div className="mh-teacher-fields">
        <label className="mh-lms-check mh-lms-addform__wide">
          <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
          Custom
        </label>
        <label className="mh-lms-addform__wide">
          <span>Section name</span>
          <input className="mh-teacher-field" value={name} disabled={!custom} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="mh-lms-addform__wide">
          <span>Summary</span>
          <textarea className="mh-teacher-field" rows={6} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </label>
      </div>
      <details className="mh-lms-addform__sec">
        <summary>Restrict access</summary>
        <p className="mh-teacher-muted">None</p>
      </details>
      <div className="mh-lms-toolbar">
        <button type="button" className="mh-teacher-btn" onClick={() => onSave(name, summary)}>
          Save changes
        </button>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

type Activity = {
  id?: string;
  type: string;
  name: string;
  note?: string;
  body?: string;
  fileName?: string;
  modified?: string;
  joinUrl?: string | null;
};

export function ResourceView({
  activity,
  evaluationRows,
  onEdit,
  onMore,
}: {
  activity: Activity;
  evaluationRows?: Array<{ component: string; weight: string }>;
  onEdit: () => void;
  onMore: (which: "filters" | "permissions") => void;
}) {
  const type = activity.type.toUpperCase();
  function openJoin() {
    const url = activity.joinUrl;
    if (url?.startsWith("http")) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    window.alert("Jitsi Meet room is not linked yet for this section.");
  }
  return (
    <section className="mh-teacher-card mh-lms-resource">
      <p className="mh-lms-crumb">Course / {activity.name}</p>
      <header className="mh-lms-resource__head">
        <h2>{activity.name}</h2>
        <nav className="mh-lms-resource__tabs">
          <span className="is-active">
            {type === "BIGBLUEBUTTON"
              ? "Jitsi Meet"
              : type === "FILE" || type === "FOLDER"
                ? "Resource"
                : "Page"}
          </span>
          <button type="button" onClick={onEdit}>
            Settings
          </button>
          <details className="mh-lms-inline-more">
            <summary>More</summary>
            <button type="button" onClick={() => onMore("filters")}>
              Filters
            </button>
            <button type="button" onClick={() => onMore("permissions")}>
              Permissions
            </button>
            <button type="button">Backup</button>
            <button type="button">Restore</button>
          </details>
        </nav>
      </header>
      {type === "BIGBLUEBUTTON" ? (
        <div className="mh-lms-bbb">
          <p className="mh-student-bbb__brand">JITSI MEET Online Class Link</p>
          <h3>Online Class Link</h3>
          <p>{activity.note || "This room is ready. You can join the session now."}</p>
          {activity.joinUrl ? (
            <p className="mh-teacher-muted" style={{ wordBreak: "break-all" }}>
              {activity.joinUrl}
            </p>
          ) : null}
          <button type="button" className="mh-teacher-btn" onClick={openJoin}>
            Join session
          </button>
        </div>
      ) : type === "FILE" && /evaluation/i.test(activity.name) ? (
        <EvaluationTable rows={evaluationRows || []} />
      ) : type === "FOLDER" ? (
        <div>
          <p className="mh-teacher-muted">{activity.fileName || "Folder contents"}</p>
          <ul className="mh-lms-files">
            <li>
              <a href="#">{activity.fileName || `${activity.name}.pdf`}</a>
            </li>
          </ul>
          <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary">
            Download folder
          </button>
        </div>
      ) : (
        <div className="mh-lms-pagebody">
          <p>{activity.body || `${activity.name} content for Social Service Work Fundamentals.`}</p>
          {activity.modified ? <p className="mh-teacher-muted">Last modified: {activity.modified}</p> : <p className="mh-teacher-muted">Last modified: Monday, 2 March 2026, 2:13 PM</p>}
        </div>
      )}
      <button type="button" className="mh-teacher-link" onClick={onEdit}>
        Edit
      </button>
    </section>
  );
}

export function EvaluationTable({ rows }: { rows: Array<{ component: string; weight: string }> }) {
  const data = rows.length
    ? rows
    : [
        { component: "Chapter quizzes", weight: "65%" },
        { component: "Final Exam", weight: "25%" },
        { component: "Class Participation", weight: "10%" },
        { component: "Total", weight: "100%" },
      ];
  return (
    <table className="mh-lms-eval">
      <thead>
        <tr>
          <th>Component</th>
          <th>Weight</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.component} className={row.component === "Total" ? "is-total" : ""}>
            <td>{row.component}</td>
            <td>{row.weight}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PermissionsPanel({ onBack }: { onBack: () => void }) {
  const [role, setRole] = useState("");
  const roles = ["Manager", "Course creator", "Teacher", "Non-editing teacher", "Student", "Guest", "Authenticated user"];
  return (
    <section className="mh-teacher-card">
      <h2>Permissions in Page</h2>
      <div className="mh-lms-toolbar">
        <select className="mh-teacher-field" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Advanced role override">
          <option value="">Choose...</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r} (0)
            </option>
          ))}
        </select>
        <input className="mh-teacher-field" placeholder="Filter" />
        <button type="button" className="mh-teacher-link">
          Clear
        </button>
      </div>
      <table className="mh-lms-perm">
        <thead>
          <tr>
            <th>Capability</th>
            <th>Risks</th>
            <th>Roles with permission</th>
            <th>Prohibited</th>
          </tr>
        </thead>
        <tbody>
          {[
            "Add embedded H5P",
            "RecordRTC audio/video",
            "View page content",
            "Insert H5P",
          ].map((cap) => (
            <tr key={cap}>
              <td>{cap}</td>
              <td>—</td>
              <td>
                <span className="mh-lms-chip">Teacher</span>
                <span className="mh-lms-chip">Manager</span>
              </td>
              <td>—</td>
            </tr>
          ))}
        </tbody>
      </table>
      {role ? (
        <div className="mh-lms-confirm mh-lms-confirm--inline">
          <h3>Allow role · Add embedded H5P</h3>
          <div className="mh-lms-toolbar">
            {roles.map((r) => (
              <label key={r} className="mh-lms-check">
                <input type="checkbox" defaultChecked={r === role} />
                {r}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={onBack}>
        Back to page
      </button>
    </section>
  );
}

export function PageEditPanel({
  activity,
  onSave,
  onCancel,
}: {
  activity: Activity;
  onSave: () => void;
  onCancel: () => void;
}) {
  const live = useOptionalTeacherLive();
  return (
    <section className="mh-teacher-card mh-lms-addform">
      <h2>Updating Page: {activity.name}</h2>
      <details open className="mh-lms-addform__sec">
        <summary>General</summary>
        <div className="mh-lms-addform__fields">
          <label>
            <span>Name</span>
            <input className="mh-teacher-field" defaultValue={activity.name} />
          </label>
          <label className="mh-lms-addform__wide">
            <span>Description</span>
            <textarea className="mh-teacher-field" rows={3} />
          </label>
          <label className="mh-lms-check">
            <input type="checkbox" />
            Display description on course page
          </label>
        </div>
      </details>
      <details open className="mh-lms-addform__sec">
        <summary>Content</summary>
        <label className="mh-lms-addform__wide">
          <span>Page content</span>
          <textarea className="mh-teacher-field mh-teacher-field--tall" rows={8} defaultValue={activity.body || ""} />
        </label>
      </details>
      <details className="mh-lms-addform__sec">
        <summary>Appearance</summary>
        <label className="mh-lms-check">
          <input type="checkbox" />
          Display page description
        </label>
        <label className="mh-lms-check">
          <input type="checkbox" defaultChecked />
          Display last modified date
        </label>
      </details>
      <details className="mh-lms-addform__sec">
        <summary>Common module settings</summary>
        <label>
          <span>Availability</span>
          <select className="mh-teacher-field">
            <option>Show on course page</option>
            <option>Hide from students</option>
          </select>
        </label>
        <label>
          <span>ID number</span>
          <input className="mh-teacher-field" />
        </label>
      </details>
      <details className="mh-lms-addform__sec">
        <summary>Restrict access</summary>
        <p className="mh-teacher-muted">None</p>
      </details>
      <div className="mh-lms-toolbar">
        <button type="button" className="mh-teacher-btn" disabled={live?.busy} onClick={onSave}>
          Save and return to course
        </button>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

export function CreateGroupForm({ onCancel }: { onCancel: () => void }) {
  const live = useOptionalTeacherLive();
  const [name, setName] = useState("");
  return (
    <section className="mh-teacher-card mh-lms-addform">
      <h2>Create group</h2>
      <div className="mh-lms-addform__fields">
        <label>
          <span>
            Group name <em className="mh-lms-required">!</em>
          </span>
          <input className="mh-teacher-field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <span>Group ID number</span>
          <input className="mh-teacher-field" />
        </label>
        <label className="mh-lms-addform__wide">
          <span>Group description</span>
          <textarea className="mh-teacher-field" rows={4} />
        </label>
        <label>
          <span>Enrolment key</span>
          <input className="mh-teacher-field" placeholder="Click to enter text" />
        </label>
        <label>
          <span>Group messaging</span>
          <select className="mh-teacher-field" defaultValue="No">
            <option>No</option>
            <option>Yes</option>
          </select>
        </label>
        <label className="mh-lms-addform__wide">
          <span>New picture</span>
          <div className="mh-teacher-dropzone">
            <input type="file" accept="image/*" />
            <p className="mh-teacher-muted">Choose a file · Maximum 200MB</p>
          </div>
        </label>
      </div>
      <div className="mh-lms-toolbar">
        <button
          type="button"
          className="mh-teacher-btn"
          disabled={!name.trim() || live?.busy}
          onClick={() => {
            void live?.runAction?.("Create group", JSON.stringify({ Name: name }));
            onCancel();
          }}
        >
          Save changes
        </button>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

export function ActionMenu({
  items,
  label = "Actions",
}: {
  items: Array<{ label: string; onClick: () => void; danger?: boolean }>;
  label?: string;
}) {
  return (
    <details className="mh-lms-actmenu">
      <summary aria-label={label}>⋮</summary>
      <div className="mh-lms-actmenu__list" role="menu">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            className={item.danger ? "is-danger" : ""}
            onClick={(e) => {
              const root = (e.currentTarget.closest("details") as HTMLDetailsElement | null);
              if (root) root.open = false;
              item.onClick();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </details>
  );
}

export function QuestionPreview({
  question,
  onClose,
}: {
  question: {
    name: string;
    text: string;
    answers?: string[];
    correct?: number;
    mark?: string;
  };
  onClose: () => void;
}) {
  const answers = question.answers?.length
    ? question.answers
    : ["settlement houses", "friendly visiting", "charity organization societies", "casework"];
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  return (
    <section className="mh-teacher-card mh-lms-preview">
      <div className="mh-lms-toolbar">
        <h2>Preview question</h2>
        <button type="button" className="mh-teacher-link" onClick={onClose}>
          Close preview
        </button>
      </div>
      <p>
        <strong>{question.name}</strong>
      </p>
      <p>{question.text}</p>
      <div className="mh-lms-preview__answers" role="radiogroup">
        {answers.map((answer, idx) => (
          <label key={answer} className={done && idx === (question.correct ?? 0) ? "is-right" : ""}>
            <input type="radio" name="preview-answer" checked={picked === idx} onChange={() => setPicked(idx)} />
            {String.fromCharCode(97 + idx)}. {answer}
          </label>
        ))}
      </div>
      <div className="mh-lms-toolbar">
        <button
          type="button"
          className="mh-teacher-btn mh-teacher-btn--secondary"
          onClick={() => {
            setPicked(null);
            setDone(false);
          }}
        >
          Start again
        </button>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary">
          Save
        </button>
        <button
          type="button"
          className="mh-teacher-btn mh-teacher-btn--secondary"
          onClick={() => {
            setPicked(question.correct ?? 0);
            setDone(true);
          }}
        >
          Fill in correct responses
        </button>
        <button type="button" className="mh-teacher-btn" onClick={() => setDone(true)}>
          Submit and finish
        </button>
      </div>
      <details>
        <summary>Comments</summary>
        <p className="mh-teacher-muted">No comments yet.</p>
      </details>
      <div className="mh-lms-preview__opts">
        <h3>Preview options</h3>
        <p>Question version · How questions behave: Deferred feedback · Marked out of {question.mark || "1"}</p>
        <button type="button" className="mh-teacher-link">
          Start again with these options
        </button>
        <h3>Display options</h3>
        <ul>
          <li>Whether correct: Shown</li>
          <li>Marks: Show mark and max</li>
          <li>Decimal places in grades: 2</li>
          <li>Specific feedback: Shown</li>
          <li>General feedback: Shown</li>
          <li>Right answer: Shown</li>
          <li>Response history: Not shown</li>
        </ul>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary">
          Update display options
        </button>
      </div>
    </section>
  );
}

export function QuestionHistory({
  question,
  onClose,
}: {
  question: { name: string; status: string; version: string; createdByFirst: string; createdByLast: string; date: string };
  onClose: () => void;
}) {
  return (
    <section className="mh-teacher-card">
      <div className="mh-lms-toolbar">
        <h2>Question history</h2>
        <button type="button" className="mh-teacher-link" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="mh-teacher-muted">No tag filters applied</p>
      <input className="mh-teacher-field" placeholder="Filter by tags" />
      <label className="mh-lms-check">
        <input type="checkbox" defaultChecked />
        Show question text in question list
      </label>
      <label className="mh-lms-check">
        <input type="checkbox" />
        Also show old questions
      </label>
      <table className="mh-lms-eval">
        <thead>
          <tr>
            <th>Question</th>
            <th>Status</th>
            <th>Version</th>
            <th>Created by</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{question.name}</td>
            <td>{question.status}</td>
            <td>{question.version}</td>
            <td>
              {question.createdByFirst} {question.createdByLast}
            </td>
            <td>{question.date}</td>
          </tr>
        </tbody>
      </table>
      <p className="mh-teacher-muted">With selected</p>
    </section>
  );
}

export function QuestionTagsModal({
  question,
  courseTitle,
  onClose,
}: {
  question: { name: string };
  courseTitle: string;
  onClose: () => void;
}) {
  return (
    <div className="mh-lms-chooser-overlay" role="presentation" onClick={onClose}>
      <div className="mh-lms-confirm" role="dialog" aria-modal="true" aria-labelledby="q-tags-title" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2 id="q-tags-title">Question tags</h2>
          <button type="button" className="mh-lms-chooser-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <p>
          Question name: <strong>{question.name}</strong>
        </p>
        <p className="mh-teacher-muted">Current category: Quiz 5 · Course: {courseTitle}</p>
        <label>
          <span>Tags</span>
          <input className="mh-teacher-field" placeholder="Search selector / Any tags" />
        </label>
        <p className="mh-teacher-muted">No suggestions</p>
        <div className="mh-lms-toolbar">
          <button type="button" className="mh-teacher-btn" onClick={onClose}>
            Save changes
          </button>
          <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function GroupsExtras({ onAuto, onImport }: { onAuto: () => void; onImport: () => void }) {
  return (
    <div className="mh-lms-toolbar">
      <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={onAuto}>
        Auto-create groups
      </button>
      <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={onImport}>
        Import groups
      </button>
    </div>
  );
}

export function ActivityCompetenciesPanel({ name, onBack }: { name: string; onBack: () => void }) {
  const live = useOptionalTeacherLive();
  return (
    <section className="mh-teacher-card">
      <h2>{name}</h2>
      <button type="button" className="mh-teacher-link">
        Edit Course Description
      </button>
      <label>
        <span>Competency rating</span>
        <select className="mh-teacher-field">
          <option>Not rated</option>
        </select>
      </label>
      <p className="mh-teacher-muted">No competencies have been linked to this activity or resource</p>
      <button type="button" className="mh-teacher-link" onClick={() => void live?.runAction?.("Manage competencies and frameworks")}>
        Manage competencies and frameworks
      </button>
      <div className="mh-lms-toolbar">
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";

export const LMS_ACCESS_RESTRICTIONS_KEY = "Access restrictions";

type Rule =
  | { type: "date"; operator: "from" | "until"; value: string }
  | { type: "student"; studentIds: string[] }
  | { type: "group"; groupIds: string[] };

type Restrictions = { match: "all" | "any"; rules: Rule[] };

type Student = { studentId?: string; name: string; studentNumber: string; email?: string };
type Group = { id: string; name: string; members: Array<{ id: string; name: string }> };

function parse(value: string): Restrictions {
  if (!value.trim()) return { match: "all", rules: [] };
  try {
    const parsed = JSON.parse(value) as Restrictions;
    if ((parsed.match === "all" || parsed.match === "any") && Array.isArray(parsed.rules)) return parsed;
  } catch {
    // The server will fail closed for malformed legacy data; the editor lets staff replace it.
  }
  return { match: "all", rules: [] };
}

function localDate(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emit(next: Restrictions, onChange: (value: string) => void) {
  onChange(next.rules.length ? JSON.stringify(next) : "");
}

export function LmsAccessRestrictionsEditor({
  value,
  roster = [],
  groups = [],
  onChange,
}: {
  value: string;
  roster?: Student[];
  groups?: Group[];
  onChange: (value: string) => void;
}) {
  const restrictions = useMemo(() => parse(value), [value]);
  const [kind, setKind] = useState<Rule["type"]>("date");
  const students = roster.filter((s): s is Student & { studentId: string } => Boolean(s.studentId));

  function update(index: number, rule: Rule) {
    const rules = restrictions.rules.map((item, i) => (i === index ? rule : item));
    emit({ ...restrictions, rules }, onChange);
  }

  function add() {
    const rule: Rule =
      kind === "student"
        ? { type: "student", studentIds: students[0]?.studentId ? [students[0].studentId] : [] }
        : kind === "group"
          ? { type: "group", groupIds: groups[0]?.id ? [groups[0].id] : [] }
          : { type: "date", operator: "from", value: new Date().toISOString() };
    emit({ ...restrictions, rules: [...restrictions.rules, rule] }, onChange);
  }

  return (
    <div className="mh-teacher-fields mh-lms-access">
      {restrictions.rules.length === 0 ? <p className="mh-teacher-muted">No access restrictions. Every enrolled student can open this content.</p> : null}
      {restrictions.rules.length > 1 ? (
        <label>
          <span>Student must match</span>
          <select
            className="mh-teacher-field"
            value={restrictions.match}
            onChange={(e) => emit({ ...restrictions, match: e.target.value === "any" ? "any" : "all" }, onChange)}
          >
            <option value="all">All restrictions</option>
            <option value="any">Any restriction</option>
          </select>
        </label>
      ) : null}
      {restrictions.rules.map((rule, index) => (
        <div key={`${rule.type}-${index}`} className="mh-teacher-card">
          <div className="mh-lms-toolbar">
            <strong>{rule.type === "date" ? "Date restriction" : rule.type === "student" ? "Selected students" : "Course groups"}</strong>
            <button
              type="button"
              className="mh-teacher-link"
              onClick={() => emit({ ...restrictions, rules: restrictions.rules.filter((_, i) => i !== index) }, onChange)}
            >
              Remove
            </button>
          </div>
          {rule.type === "date" ? (
            <div className="mh-teacher-fields">
              <label>
                <span>Allow access</span>
                <select className="mh-teacher-field" value={rule.operator} onChange={(e) => update(index, { ...rule, operator: e.target.value === "until" ? "until" : "from" })}>
                  <option value="from">From date/time</option>
                  <option value="until">Until date/time</option>
                </select>
              </label>
              <label>
                <span>Date and time</span>
                <input
                  type="datetime-local"
                  className="mh-teacher-field"
                  value={localDate(rule.value)}
                  onChange={(e) => update(index, { ...rule, value: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                />
              </label>
            </div>
          ) : rule.type === "student" ? (
            students.length ? (
              students.map((student) => (
                <label key={student.studentId} className="mh-lms-check">
                  <input
                    type="checkbox"
                    checked={rule.studentIds.includes(student.studentId)}
                    onChange={(e) =>
                      update(index, {
                        ...rule,
                        studentIds: e.target.checked
                          ? [...new Set([...rule.studentIds, student.studentId])]
                          : rule.studentIds.filter((id) => id !== student.studentId),
                      })
                    }
                  />
                  {student.name} <span className="mh-teacher-muted">· {student.studentNumber || student.email}</span>
                </label>
              ))
            ) : (
              <p className="mh-lms-qform__error">No enrolled students are available.</p>
            )
          ) : groups.length ? (
            groups.map((group) => (
              <label key={group.id} className="mh-lms-check">
                <input
                  type="checkbox"
                  checked={rule.groupIds.includes(group.id)}
                  onChange={(e) =>
                    update(index, {
                      ...rule,
                      groupIds: e.target.checked ? [...new Set([...rule.groupIds, group.id])] : rule.groupIds.filter((id) => id !== group.id),
                    })
                  }
                />
                {group.name} <span className="mh-teacher-muted">· {group.members.length} member(s)</span>
              </label>
            ))
          ) : (
            <p className="mh-lms-qform__error">Create a course group first, then add this restriction.</p>
          )}
        </div>
      ))}
      <div className="mh-lms-toolbar">
        <label>
          <span className="mh-teacher-sr-only">Restriction type</span>
          <select className="mh-teacher-field" value={kind} onChange={(e) => setKind(e.target.value as Rule["type"])}>
            <option value="date">Date</option>
            <option value="student" disabled={students.length === 0}>Selected students</option>
            <option value="group" disabled={groups.length === 0}>Course group</option>
          </select>
        </label>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={add}>
          Add restriction
        </button>
      </div>
      <p className="mh-teacher-muted">Restrictions are checked by the server whenever a student opens this course.</p>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentSisShell } from "@/components/StudentSisShell";
import { api, loadSession } from "@/lib/api";

type HomePayload = {
  standing?: string;
  programName?: string;
  enrolledCourses?: number;
  gpa?: number;
  attendanceRate?: number;
  nextDeadline?: { title: string; dueAt: string; courseCode: string };
  announcements?: Array<{ id: string; title: string; body: string }>;
};

type CourseItem = {
  sectionId: string;
  code: string;
  title: string;
  instructorName?: string;
  credits?: number;
  status?: string;
  progressPct?: number;
  progressPercent?: number | null;
  nextItem?: string;
};

type CalItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  courseCode?: string | null;
  location?: string;
  type: string;
  joinUrl?: string;
};

type GradeItem = {
  id: string;
  title: string;
  courseCode: string;
  score: number;
  maxScore: number;
  gradedAt?: string;
};

type GradesPayload = {
  courses?: Array<{
    code: string;
    items: Array<{
      id: string;
      title: string;
      score: number | null;
      maxScore: number;
      publishedAt?: string | null;
    }>;
  }>;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / 86400000;
  if (diff < 1.5 && diff >= 0) return `Due tomorrow at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return `Due ${d.toLocaleDateString(undefined, { weekday: "long" })}`;
}

export default function StudentHomePage() {
  const router = useRouter();
  const [name, setName] = useState("Student");
  const [home, setHome] = useState<HomePayload | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [calendar, setCalendar] = useState<CalItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    if (!s.roles.includes("student")) {
      if (s.roles.includes("instructor")) router.replace("/instructor");
      else if (s.roles.includes("admin") || s.roles.includes("registrar")) router.replace("/admin");
      else if (s.roles.includes("applicant")) router.replace("/applicant");
      else if (s.roles.includes("employer")) router.replace("/employer");
      else router.replace("/login");
      return;
    }
    setName(s.givenName || "Student");
    Promise.all([
      api<HomePayload>("/me/home", {}, s.accessToken),
      api<{ items: CourseItem[] }>("/courses/me", {}, s.accessToken),
      api<{ items: CalItem[] }>("/calendar/me", {}, s.accessToken),
      api<GradesPayload>("/grades/me", {}, s.accessToken).catch(() => ({ courses: [] as GradesPayload["courses"] })),
    ])
      .then(([h, c, cal, g]) => {
        setHome(h);
        setCourses(
          (c.items ?? []).map((course) => ({
            ...course,
            progressPct: course.progressPct ?? course.progressPercent ?? undefined,
          })),
        );
        setCalendar(cal.items ?? []);
        const flat: GradeItem[] = [];
        for (const course of g.courses ?? []) {
          for (const item of course.items ?? []) {
            if (item.score == null) continue;
            flat.push({
              id: item.id,
              title: item.title,
              courseCode: course.code,
              score: item.score,
              maxScore: item.maxScore,
              gradedAt: item.publishedAt ?? undefined,
            });
          }
        }
        setGrades(flat);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [router]);

  const nextClass = useMemo(() => {
    const upcoming = [...calendar]
      .filter((e) => new Date(e.startsAt).getTime() >= Date.now() - 3600000)
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    return upcoming[0] ?? calendar[0];
  }, [calendar]);

  const dueThisWeek = useMemo(() => {
    const week = Date.now() + 7 * 86400000;
    return calendar.filter((e) => {
      const t = +new Date(e.startsAt);
      return t >= Date.now() && t <= week && (e.type === "deadline" || e.type === "assignment" || e.type === "quiz");
    });
  }, [calendar]);

  const todos = useMemo(() => {
    return calendar
      .filter((e) => e.type === "deadline" || e.type === "assignment" || e.type === "quiz" || !e.type)
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        title: e.title,
        dueLabel: fmtDue(e.startsAt),
        urgent: +new Date(e.startsAt) - Date.now() < 2 * 86400000,
      }));
  }, [calendar]);

  const todaySessions = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return calendar
      .filter((e) => {
        const t = +new Date(e.startsAt);
        return t >= +start && t <= +end;
      })
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  }, [calendar]);

  return (
    <StudentSisShell
      title="Dashboard"
      subtitle="Student portal"
      activeHref="/student"
      userName={name}
    >
      <div className="mh-teacher-dash" data-node-id="17:60">
        <section className="mh-teacher-dash__hero">
          <div className="mh-teacher-dash__hero-left">
            <div className="mh-teacher-dash__hero-avatar" aria-hidden>
              {name.slice(0, 1)}
            </div>
            <div>
              <h1 className="mh-teacher-dash__greeting">
                {greeting()}, {name}
              </h1>
              <p className="mh-teacher-dash__role">
                {home?.programName || "Heritage Community College"} · {home?.standing || "Student"}
              </p>
            </div>
          </div>
          <span className="mh-teacher-dash__status">In session</span>
        </section>

        {error ? <p style={{ color: "var(--mh-danger)", margin: 0 }}>{error}</p> : null}

        <div className="mh-teacher-dash__quick">
          <button type="button" className="mh-teacher-dash__quick-btn" onClick={() => router.push("/student/courses")}>
            My courses
          </button>
          <button type="button" className="mh-teacher-dash__quick-btn" onClick={() => router.push("/student/assignments")}>
            Assignments
          </button>
          <button type="button" className="mh-teacher-dash__quick-btn" onClick={() => router.push("/student/grades")}>
            Grades
          </button>
          <button type="button" className="mh-teacher-dash__quick-btn is-ai" onClick={() => router.push("/student/ask")}>
            Ask Heritage
          </button>
        </div>

        <div className="mh-teacher-dash__kpis">
          <button type="button" className="mh-teacher-dash__kpi" onClick={() => router.push("/student/calendar")}>
            <div className="mh-teacher-dash__kpi-label">Next class</div>
            <div className="mh-teacher-dash__kpi-value">{fmtTime(nextClass?.startsAt)}</div>
            <div className="mh-teacher-dash__kpi-hint">
              {[nextClass?.courseCode, nextClass?.location || nextClass?.title].filter(Boolean).join(" · ") || "No upcoming class"}
            </div>
          </button>
          <button type="button" className="mh-teacher-dash__kpi" onClick={() => router.push("/student/assignments")}>
            <div className="mh-teacher-dash__kpi-label">Due this week</div>
            <div className="mh-teacher-dash__kpi-value">
              {dueThisWeek.length || home?.nextDeadline ? `${Math.max(dueThisWeek.length, home?.nextDeadline ? 1 : 0)}` : "0"}
            </div>
            <div className="mh-teacher-dash__kpi-hint">Assignments and quizzes</div>
          </button>
          <button type="button" className="mh-teacher-dash__kpi" onClick={() => router.push("/student/attendance")}>
            <div className="mh-teacher-dash__kpi-label">Attendance</div>
            <div className="mh-teacher-dash__kpi-value">
              {home?.attendanceRate != null ? `${home.attendanceRate}%` : home?.standing ? String(home.standing) : "—"}
            </div>
            <div className="mh-teacher-dash__kpi-hint">{home?.standing ? String(home.standing) : "Satisfactory record"}</div>
          </button>
        </div>

        <div className="mh-teacher-dash__grid">
          <div className="mh-teacher-dash__col-main">
            <section className="mh-teacher-card">
              <div className="mh-teacher-card__head">
                <h2>Today&apos;s Sessions</h2>
                <button type="button" className="mh-teacher-link" onClick={() => router.push("/student/calendar")}>
                  Open calendar
                </button>
              </div>
              <div className="mh-teacher-timetable">
                {(todaySessions.length ? todaySessions : calendar.slice(0, 3)).map((ev) => {
                  const online = /online|zoom|teams/i.test(`${ev.location ?? ""} ${ev.type ?? ""}`);
                  return (
                    <div key={ev.id} className="mh-teacher-timetable__row">
                      <div className="mh-teacher-timetable__time">
                        <strong>{fmtTime(ev.startsAt)}</strong>
                        <span>{fmtTime(ev.endsAt)}</span>
                      </div>
                      <div className="mh-teacher-timetable__body">
                        <strong>{ev.title}</strong>
                        <span>{ev.location || (online ? "Online Session" : ev.courseCode) || "Scheduled"}</span>
                      </div>
                      {online || ev.joinUrl ? (
                        <button
                          type="button"
                          className="mh-teacher-timetable__launch"
                          onClick={() => {
                            if (ev.joinUrl?.startsWith("https://")) {
                              window.open(ev.joinUrl, "_blank", "noopener,noreferrer");
                              return;
                            }
                            router.push(`/student/courses/${courses[0]?.sectionId ?? ""}`);
                          }}
                        >
                          Join class
                        </button>
                      ) : (
                        <span className="mh-teacher-badge is-muted">In person</span>
                      )}
                    </div>
                  );
                })}
                {!calendar.length ? <p className="mh-teacher-muted">No sessions loaded yet.</p> : null}
              </div>
            </section>

            <section className="mh-teacher-card">
              <div className="mh-teacher-card__head">
                <h2>My Courses</h2>
                <button type="button" className="mh-teacher-link" onClick={() => router.push("/student/courses")}>
                  View all
                </button>
              </div>
              <div className="mh-student-course-grid">
                {courses.map((c) => {
                  const pct = c.progressPct ?? 50;
                  return (
                    <button
                      key={c.sectionId}
                      type="button"
                      className="mh-student-course-card"
                      onClick={() => router.push(`/student/courses/${c.sectionId}`)}
                    >
                      <div className="mh-student-course-card__code">{c.code}</div>
                      <strong>{c.title}</strong>
                      <span>{c.instructorName || "Instructor"}</span>
                      <div className="mh-student-course-card__progress">
                        <div>
                          <span>Progress</span>
                          <b>{pct}%</b>
                        </div>
                        <div className="mh-student-course-card__track">
                          <div style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <em>{c.nextItem || home?.nextDeadline?.title || "Open course workspace"}</em>
                    </button>
                  );
                })}
                {!courses.length ? <p className="mh-teacher-muted">No enrolments yet.</p> : null}
              </div>
            </section>
          </div>

          <div className="mh-teacher-dash__col-side">
            <section className="mh-teacher-card">
              <div className="mh-teacher-card__head">
                <h2>To-Do List</h2>
                {todos.some((t) => t.urgent) ? (
                  <span className="mh-teacher-badge is-warning">{todos.filter((t) => t.urgent).length} urgent</span>
                ) : null}
              </div>
              <div className="mh-teacher-list">
                {(todos.length
                  ? todos
                  : home?.nextDeadline
                    ? [{ id: "ndl", title: home.nextDeadline.title, dueLabel: fmtDue(home.nextDeadline.dueAt), urgent: true }]
                    : []
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="mh-teacher-list__item"
                    onClick={() => router.push("/student/assignments")}
                  >
                    <div>
                      <strong>{t.title}</strong>
                      <span className={t.urgent ? "is-danger" : ""}>{t.dueLabel}</span>
                    </div>
                  </button>
                ))}
                {!todos.length && !home?.nextDeadline ? <p className="mh-teacher-muted">Nothing due right now.</p> : null}
              </div>
            </section>

            <section className="mh-teacher-card">
              <div className="mh-teacher-card__head">
                <h2>Recent Grades</h2>
                <button type="button" className="mh-teacher-link" onClick={() => router.push("/student/grades")}>
                  Open grades
                </button>
              </div>
              <div className="mh-teacher-list">
                {grades.slice(0, 5).map((g) => (
                  <button key={g.id} type="button" className="mh-teacher-list__item" onClick={() => router.push("/student/grades")}>
                    <div>
                      <strong>
                        {g.courseCode} · {g.title}
                      </strong>
                      <span>{g.gradedAt ? `Graded ${new Date(g.gradedAt).toLocaleDateString()}` : "Published"}</span>
                    </div>
                    <b>
                      {g.score}/{g.maxScore}
                    </b>
                  </button>
                ))}
                {!grades.length ? <p className="mh-teacher-muted">No published grades yet.</p> : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </StudentSisShell>
  );
}

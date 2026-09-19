"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentSisShell } from "@/components/StudentSisShell";
import { api, loadSession } from "@/lib/api";

type HomePayload = {
  standing?: string;
  programName?: string;
  studentNumber?: string;
  enrolledCourses?: number;
  gpa?: number;
  attendanceRate?: number;
  nextDeadline?: { title: string; dueAt: string; courseCode: string };
  announcements?: Array<{ id: string; title: string; body: string }>;
  pendingEvaluations?: Array<{
    id: string;
    courseCode: string;
    courseTitle: string;
    offeringCode?: string | null;
    dueAt: string | null;
    href: string;
  }>;
};

type CourseItem = {
  sectionId: string;
  code: string;
  title: string;
  sectionCode?: string;
  instructorName?: string;
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
};

function fmtTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (d.getTime() - Date.now()) / 86400000;
  if (diff < 1.5 && diff >= 0) return `Due tomorrow`;
  return `Due ${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;
}

export default function StudentHomePage() {
  const router = useRouter();
  const [name, setName] = useState("Student");
  const [studentNumber, setStudentNumber] = useState("");
  const [home, setHome] = useState<HomePayload | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [calendar, setCalendar] = useState<CalItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    setName(`${s.givenName} ${s.familyName}`.trim() || s.givenName || "Student");
    setLoading(true);
    Promise.all([
      api<HomePayload>("/me/home", {}, s.accessToken),
      api<{ items: CourseItem[] }>("/courses/me", {}, s.accessToken),
      api<{ items: CalItem[] }>("/calendar/me", {}, s.accessToken),
      api<{ studentNumber?: string }>("/me/profile", {}, s.accessToken).catch(
        (): { studentNumber?: string } => ({}),
      ),
    ])
      .then(([h, c, cal, profile]) => {
        setHome(h);
        setStudentNumber(h.studentNumber || profile.studentNumber || "");
        setCourses(
          (c.items ?? [])
            .map((course) => ({
              ...course,
              progressPct: course.progressPct ?? course.progressPercent ?? undefined,
            }))
            .sort((a, b) => {
              const rank = (code: string) => (/^ACSW\s*500$/i.test(code) ? 0 : 1);
              const diff = rank(a.code) - rank(b.code);
              if (diff !== 0) return diff;
              return a.code.localeCompare(b.code);
            }),
        );
        setCalendar(cal.items ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  const reminders = useMemo(() => {
    const fromCal = calendar
      .filter((e) => e.type === "deadline" || e.type === "assignment" || e.type === "quiz")
      .slice(0, 4)
      .map((e) => ({
        id: e.id,
        title: e.title,
        body: fmtDue(e.startsAt),
        href: "/student/assignments",
      }));
    if (fromCal.length) return fromCal;
    if (home?.nextDeadline) {
      return [
        {
          id: "ndl",
          title: home.nextDeadline.title,
          body: `${home.nextDeadline.courseCode} · ${fmtDue(home.nextDeadline.dueAt)}`,
          href: "/student/assignments",
        },
      ];
    }
    return [];
  }, [calendar, home?.nextDeadline]);

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

  const evaluations = home?.pendingEvaluations ?? [];

  return (
    <StudentSisShell title="" activeHref="/student" userName={name} studentNumber={studentNumber}>
      <div className="mh-hcc-home" data-stu="STU-03">
        <section className="mh-hcc-hero" aria-label="Campus home">
          <div className="mh-hcc-hero__media" aria-hidden>
            <img src="/brand/campus/hero.png" alt="" className="mh-hcc-hero__img" />
          </div>
          <div className="mh-hcc-hero__veil" aria-hidden />
          <div className="mh-hcc-hero__content">
            <p className="mh-hcc-hero__brand">Heritage Community College</p>
            <h1 className="mh-hcc-hero__title">Welcome to campus</h1>
            <p className="mh-hcc-hero__lead">
              Every day is an opportunity to learn, grow, and take another step toward your goals.
            </p>
            <div className="mh-hcc-hero__cta">
              <button type="button" className="mh-hcc-hero__btn" onClick={() => router.push("/student/courses")}>
                Open my courses
              </button>
              <button
                type="button"
                className="mh-hcc-hero__btn mh-hcc-hero__btn--ghost"
                onClick={() => router.push("/student/messages")}
              >
                Message Center
              </button>
            </div>
          </div>
        </section>

        {evaluations.length ? (
          <section className="mh-hcc-banner" role="status">
            <div className="mh-hcc-banner__copy">
              <strong>Course evaluation available. Please complete evaluations for finished courses.</strong>
              <p>
                {evaluations.map((e, i) => (
                  <span key={e.id}>
                    {i > 0 ? " · " : null}
                    <button
                      type="button"
                      className="mh-hcc-banner__link"
                      onClick={() => router.push(e.href)}
                    >
                      {e.courseCode}
                      {e.offeringCode ? ` / ${e.offeringCode}` : ""}
                    </button>
                  </span>
                ))}
              </p>
            </div>
            <button
              type="button"
              className="mh-hcc-banner__action"
              onClick={() => router.push(evaluations[0]!.href)}
            >
              Start evaluation
            </button>
          </section>
        ) : null}

        <section className="mh-hcc-story">
          <div className="mh-hcc-story__visual">
            <img src="/brand/campus/learn.png" alt="Learning spaces at Heritage Community College" />
          </div>
          <div className="mh-hcc-story__copy">
            <h2>Grow beyond the classroom</h2>
            <p>
              Explore, connect, and make the most of your time at Heritage. Check Moodle daily, review deadlines early,
              and use campus email for important announcements.
            </p>
            <ul>
              <li>Course names, dates, and class timings live in Program Plan</li>
              <li>Review your schedule 5–7 days before a course begins</li>
              <li>Seek support early if you need assistance</li>
            </ul>
          </div>
        </section>

        <section className="mh-hcc-instructor">
          <header className="mh-hcc-instructor__head">
            <div>
              <h2>
                Student · {name}
              </h2>
              <p className="mh-teacher-muted">
                {[studentNumber, home?.programName, home?.standing].filter(Boolean).join(" · ") ||
                  (loading ? "Loading…" : "Student portal")}
              </p>
            </div>
            {home?.standing ? <span className="mh-teacher-dash__status">{home.standing}</span> : null}
          </header>

          {error ? <p className="mh-teacher-error">{error}</p> : null}

          {courses.length ? (
            <div className="mh-hcc-section-strip" aria-label="Enrolled courses">
              {courses.slice(0, 8).map((c) => (
                <button
                  key={c.sectionId}
                  type="button"
                  className="mh-hcc-section-chip"
                  onClick={() => router.push(`/student/courses/${c.sectionId}`)}
                >
                  <span className="mh-hcc-section-chip__code">{c.code}</span>
                  <span className="mh-hcc-section-chip__meta">{c.sectionCode || c.instructorName || "Enrolled"}</span>
                  <strong>{c.title}</strong>
                </button>
              ))}
            </div>
          ) : null}

          <div className="mh-hcc-quick">
            <button type="button" className="mh-hcc-quick__btn is-primary" onClick={() => router.push("/student/courses")}>
              My Courses
            </button>
            <button type="button" className="mh-hcc-quick__btn" onClick={() => router.push("/student/f/st-23-program-plan")}>
              Program Plan
            </button>
            <button type="button" className="mh-hcc-quick__btn" onClick={() => router.push("/student/grades")}>
              Final Marks
            </button>
            <button type="button" className="mh-hcc-quick__btn is-ai" onClick={() => router.push("/student/ask")}>
              Ask MyHeritage
            </button>
          </div>

          <div className="mh-hcc-workgrid">
            <div className="mh-hcc-workgrid__main">
              <section className="mh-hcc-panel">
                <div className="mh-hcc-panel__head">
                  <h2>Student Reminders</h2>
                  <button type="button" className="mh-teacher-link" onClick={() => router.push("/student/assignments")}>
                    View tasks
                  </button>
                </div>
                <div className="mh-hcc-list">
                  {reminders.length === 0 ? (
                    <p className="mh-teacher-muted">No reminders right now. Check Program Plan for upcoming schedule updates.</p>
                  ) : (
                    reminders.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="mh-hcc-list__row mh-hcc-list__row--stack"
                        onClick={() => router.push(r.href)}
                      >
                        <span className="mh-hcc-list__body">
                          <strong>{r.title}</strong>
                          <span className="mh-hcc-list__note">{r.body}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="mh-hcc-panel">
                <div className="mh-hcc-panel__head">
                  <h2>My Courses</h2>
                  <button type="button" className="mh-teacher-link" onClick={() => router.push("/student/courses")}>
                    All courses
                  </button>
                </div>
                <div className="mh-hcc-list">
                  {loading ? <p className="mh-teacher-muted">Loading courses…</p> : null}
                  {!loading && courses.length === 0 ? (
                    <p className="mh-teacher-muted">No enrolments yet.</p>
                  ) : (
                    courses.map((c) => (
                      <button
                        key={c.sectionId}
                        type="button"
                        className="mh-hcc-list__row"
                        onClick={() => router.push(`/student/courses/${c.sectionId}`)}
                      >
                        <span className="mh-hcc-list__time">{c.code}</span>
                        <span className="mh-hcc-list__body">
                          <strong>{c.title}</strong>
                          <em>{c.instructorName || "Instructor TBA"}</em>
                        </span>
                        <span className="mh-teacher-badge is-success">
                          {c.progressPct != null ? `${c.progressPct}%` : "Active"}
                        </span>
                        <span className="mh-hcc-list__go">Open</span>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="mh-hcc-panel">
                <div className="mh-hcc-panel__head">
                  <h2>Important Student Information</h2>
                </div>
                <div className="mh-hcc-list">
                  <button
                    type="button"
                    className="mh-hcc-list__row mh-hcc-list__row--stack"
                    onClick={() => router.push("/student/f/st-23-program-plan")}
                  >
                    <span className="mh-hcc-list__body">
                      <strong>Programme Plan guidance</strong>
                      <span className="mh-hcc-list__note">
                        Schedule updates are pull-based — check Program Plan for course names, dates, and class timings.
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="mh-hcc-list__row mh-hcc-list__row--stack"
                    onClick={() => router.push("/student/f/st-24-course-evaluation")}
                  >
                    <span className="mh-hcc-list__body">
                      <strong>Course evaluations</strong>
                      <span className="mh-hcc-list__note">
                        Evaluations become available after a course ends. Complete them from the home banner when prompted.
                      </span>
                    </span>
                  </button>
                  {(home?.announcements ?? []).slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="mh-hcc-list__row mh-hcc-list__row--stack"
                      onClick={() => router.push(`/student/announcements?id=${encodeURIComponent(a.id)}`)}
                    >
                      <span className="mh-hcc-list__body">
                        <strong>{a.title}</strong>
                        <span className="mh-hcc-list__note">{a.body}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="mh-hcc-workgrid__side">
              <section className="mh-hcc-panel">
                <div className="mh-hcc-panel__head">
                  <h2>Today&apos;s schedule</h2>
                  <button type="button" className="mh-teacher-link" onClick={() => router.push("/student/calendar")}>
                    Calendar
                  </button>
                </div>
                <div className="mh-hcc-list">
                  {(todaySessions.length ? todaySessions : calendar.slice(0, 3)).map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      className="mh-hcc-list__row"
                      onClick={() => router.push("/student/calendar")}
                    >
                      <span className="mh-hcc-list__time">{fmtTime(ev.startsAt)}</span>
                      <span className="mh-hcc-list__body">
                        <strong>{ev.title}</strong>
                        <em>{ev.location || ev.courseCode || "Scheduled"}</em>
                      </span>
                    </button>
                  ))}
                  {!calendar.length ? (
                    <p className="mh-teacher-muted">No sessions loaded. Check Program Plan for upcoming dates.</p>
                  ) : null}
                </div>
              </section>

              <section className="mh-hcc-panel mh-hcc-panel--action">
                <div className="mh-hcc-panel__head">
                  <h2>Message Center</h2>
                </div>
                <p className="mh-hcc-panel__lead">Campus mail for instructors, classmates, and staff stays in Communication.</p>
                <div className="mh-hcc-panel__actions">
                  <button type="button" className="mh-hcc-hero__btn" onClick={() => router.push("/student/messages")}>
                    Open inbox
                  </button>
                  <button
                    type="button"
                    className="mh-hcc-hero__btn mh-hcc-hero__btn--ghost mh-hcc-hero__btn--dark"
                    onClick={() => router.push("/student/ask")}
                  >
                    Ask MyHeritage
                  </button>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </StudentSisShell>
  );
}

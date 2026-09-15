"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ScreenScaffold } from "@/components/ScreenScaffold";
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
            progressPct: course.progressPct ?? undefined,
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

  const card: CSSProperties = {
    background: "#FFFFFF",
    border: "1px solid #E1E3DC",
    borderRadius: 8,
    padding: 20,
  };

  return (
    <ScreenScaffold role="student" title={`${greeting()}, ${name}`} breadcrumb={["Student", "Home"]} active="Home" hideChromeHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }} data-node-id="17:60">
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#1A1C19" }}>
          {greeting()}, {name}
        </h1>

        {error ? <p style={{ color: "var(--mh-danger)", margin: 0 }}>{error}</p> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20 }}>
          <div style={{ ...card, display: "flex", gap: 16, alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: "rgba(132,159,56,0.08)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <img src="/brand/icons/school.svg" alt="" width={20} height={20} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#8D928A", textTransform: "uppercase" }}>Next class</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1C19" }}>{fmtTime(nextClass?.startsAt)}</div>
              <div style={{ fontSize: 13, color: "#5C5F5A" }}>
                {[nextClass?.courseCode, nextClass?.location || nextClass?.title].filter(Boolean).join(" · ") || "No upcoming class"}
              </div>
            </div>
          </div>

          <div style={{ ...card, display: "flex", gap: 16, alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: "rgba(132,159,56,0.08)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <img src="/brand/icons/file-text.svg" alt="" width={20} height={20} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#8D928A", textTransform: "uppercase" }}>Due this week</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1C19" }}>
                {dueThisWeek.length || home?.nextDeadline ? `${Math.max(dueThisWeek.length, home?.nextDeadline ? 1 : 0)} Assignments` : "0 Assignments"}
              </div>
              <div style={{ fontSize: 13, color: "#5C5F5A" }}>
                {dueThisWeek.filter((e) => e.type === "quiz").length || 2} upcoming quizzes
              </div>
            </div>
          </div>

          <div style={{ ...card, display: "flex", gap: 16, alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: "rgba(132,159,56,0.08)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <img src="/brand/icons/user-check.svg" alt="" width={20} height={20} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#8D928A", textTransform: "uppercase" }}>Attendance</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1C19" }}>
                {home?.attendanceRate != null ? `${home.attendanceRate}%` : home?.standing ? String(home.standing) : "—"}
              </div>
              <div style={{ fontSize: 13, color: "#5C5F5A" }}>
                {home?.standing ? String(home.standing) : "Satisfactory record"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 392px", gap: 24, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ ...card, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Today&apos;s Sessions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(todaySessions.length ? todaySessions : calendar.slice(0, 3)).map((ev, idx) => {
                  const online = /online|zoom|teams/i.test(`${ev.location ?? ""} ${ev.type ?? ""}`);
                  return (
                    <div
                      key={ev.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        padding: 12,
                        borderRadius: 6,
                        background: idx === 0 ? "#F9FAF6" : "#FFFFFF",
                        border: idx === 0 ? "none" : "1px solid #E1E3DC",
                      }}
                    >
                      <div style={{ display: "flex", gap: 16, alignItems: "center", minWidth: 0 }}>
                        <div style={{ width: 80, flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: idx === 0 ? "#017F3F" : "#5C5F5A" }}>
                            {fmtTime(ev.startsAt)}
                          </div>
                          <div style={{ fontSize: 11, color: "#8D928A" }}>{fmtTime(ev.endsAt)}</div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1C19" }}>{ev.title}</div>
                          <div style={{ fontSize: 13, color: "#5C5F5A" }}>
                            {ev.location || (online ? "Online Session" : ev.courseCode) || "Scheduled"}
                          </div>
                        </div>
                      </div>
                      {online || idx === 0 ? (
                        <button
                          type="button"
                          onClick={() => router.push(ev.joinUrl || `/student/courses/${courses[0]?.sectionId ?? ""}`)}
                          style={{
                            border: "none",
                            borderRadius: 6,
                            background: "#017F3F",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: 15,
                            padding: "12px 16px",
                            width: 110,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            flexShrink: 0,
                          }}
                        >
                          Join class
                        </button>
                      ) : (
                        <span
                          style={{
                            background: "rgba(132,159,56,0.08)",
                            color: "#849F38",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "6px 12px",
                            borderRadius: 4,
                            flexShrink: 0,
                          }}
                        >
                          In Person
                        </span>
                      )}
                    </div>
                  );
                })}
                {!calendar.length ? <p style={{ margin: 0, color: "#5C5F5A" }}>No sessions loaded yet.</p> : null}
              </div>
            </div>

            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>My Courses</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {courses.map((c) => {
                  const pct = c.progressPct ?? 50;
                  return (
                    <button
                      key={c.sectionId}
                      type="button"
                      onClick={() => router.push(`/student/courses/${c.sectionId}`)}
                      style={{
                        ...card,
                        width: 384,
                        maxWidth: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        fontFamily: "inherit",
                      }}
                    >
                      <div>
                        <div style={{ color: "#017F3F", fontSize: 12, fontWeight: 700 }}>{c.code}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1C19", marginTop: 4 }}>{c.title}</div>
                        <div style={{ fontSize: 13, color: "#5C5F5A", marginTop: 4 }}>{c.instructorName || "Instructor"}</div>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                          <span style={{ color: "#8D928A", fontWeight: 600 }}>Course Progress</span>
                          <span style={{ fontWeight: 700 }}>{pct}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: "#F9FAF6", overflow: "hidden" }}>
                          <div style={{ height: 6, width: `${pct}%`, background: "#017F3F" }} />
                        </div>
                      </div>
                      <div style={{ borderTop: "1px solid #E1E3DC", paddingTop: 12, fontSize: 13, color: "#5C5F5A" }}>
                        {c.nextItem || home?.nextDeadline?.title || "Open course workspace"}
                      </div>
                    </button>
                  );
                })}
                {!courses.length ? <p style={{ margin: 0, color: "#5C5F5A" }}>No enrolments yet.</p> : null}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ ...card, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>To-Do List</h2>
                {todos.some((t) => t.urgent) ? (
                  <span style={{ background: "#F59E0B", color: "#1A1C19", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>
                    {todos.filter((t) => t.urgent).length} URGENT
                  </span>
                ) : null}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(todos.length
                  ? todos
                  : home?.nextDeadline
                    ? [{ id: "ndl", title: home.nextDeadline.title, dueLabel: fmtDue(home.nextDeadline.dueAt), urgent: true }]
                    : []
                ).map((t) => (
                  <label key={t.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: "2px solid #E1E3DC",
                        background: "#fff",
                        flexShrink: 0,
                        marginTop: 1,
                        boxSizing: "border-box",
                      }}
                    />
                    <span>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1A1C19" }}>{t.title}</span>
                      <span style={{ display: "block", fontSize: 12, color: t.urgent ? "#BA1A1A" : "#8D928A" }}>{t.dueLabel}</span>
                    </span>
                  </label>
                ))}
                {!todos.length && !home?.nextDeadline ? (
                  <p style={{ margin: 0, color: "#5C5F5A", fontSize: 13 }}>Nothing due right now.</p>
                ) : null}
              </div>
            </div>

            <div style={{ ...card, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Grades</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {grades.slice(0, 5).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => router.push("/student/grades")}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                    }}
                  >
                    <span>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1A1C19" }}>
                        {g.courseCode} · {g.title}
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: "#8D928A" }}>
                        {g.gradedAt ? `Graded ${new Date(g.gradedAt).toLocaleDateString()}` : "Published"}
                      </span>
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#017F3F", whiteSpace: "nowrap" }}>
                      {g.score} / {g.maxScore}
                    </span>
                  </button>
                ))}
                {!grades.length ? (
                  <button
                    type="button"
                    onClick={() => router.push("/student/grades")}
                    style={{
                      border: "1px solid #E1E3DC",
                      borderRadius: 6,
                      background: "#fff",
                      padding: "10px 12px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: 600,
                      color: "#017F3F",
                    }}
                  >
                    Open grades
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 1100px) {
          [data-node-id="17:60"] > div:nth-child(3) { grid-template-columns: 1fr !important; }
          [data-node-id="17:60"] > div:nth-child(2) { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </ScreenScaffold>
  );
}

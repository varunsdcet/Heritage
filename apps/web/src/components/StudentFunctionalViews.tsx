"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banner, Button, EmptyState, Panel, StatusPill } from "@myheritage/ui";
import { ApiError, api, loadSession, type Session } from "@/lib/api";
import { StudentFrame } from "@/components/StudentSisShell";

type LoadState = "loading" | "ready" | "offline" | "forbidden" | "error";

function useStudentResource<T>(path: string) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (activeSession: Session) => {
    setState("loading");
    setError(null);
    try {
      setData(await api<T>(path, {}, activeSession.accessToken));
      setState("ready");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        router.replace("/login");
        return;
      }
      if (caught instanceof ApiError && caught.status === 403) {
        setState("forbidden");
        return;
      }
      if ((typeof navigator !== "undefined" && !navigator.onLine) || caught instanceof TypeError) {
        setState("offline");
        return;
      }
      setError(caught instanceof Error ? caught.message : "The page could not be loaded.");
      setState("error");
    }
  }, [path, router]);

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    setSession(activeSession);
    if (!activeSession.roles.includes("student")) {
      setState("forbidden");
      return;
    }
    void load(activeSession);
  }, [load, router]);

  return { session, data, state, error, refresh: () => session && load(session) };
}

function ResourceBoundary({
  state,
  error,
  onRetry,
  children,
}: {
  state: LoadState;
  error: string | null;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (state === "ready") return <>{children}</>;
  const copy = {
    loading: ["Loading", "Fetching your latest student record."],
    offline: ["You're offline", "Reconnect and try again."],
    forbidden: ["Permission denied", "This page is available only to the signed-in student."],
    error: ["Something went wrong", error ?? "The page could not be loaded."],
  }[state];
  return (
    <div className="mh-teacher-card">
      <EmptyState title={copy[0]} body={copy[1]} />
      {state === "offline" || state === "error" ? (
        <Button type="button" onClick={onRetry}>Try again</Button>
      ) : null}
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No date set";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const listStyle: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 };
const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
  padding: 14,
  border: "1px solid var(--mh-border)",
  borderRadius: "var(--mh-radius-md)",
};

type Course = {
  sectionId: string;
  courseCode: string;
  courseTitle: string;
  sectionCode: string;
  termName: string;
  instructorName: string;
  credits: number;
  enrolmentStatus: "enrolled" | "completed";
  progressPercent: number | null;
};

type SubmissionFile = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  createdAt: string;
};

type Assignment = {
  id: string;
  sectionId: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  dueAt: string | null;
  maxScore: number;
  weightPercent: number;
  state: "upcoming" | "due" | "overdue" | "draft" | "submitted" | "graded";
  submission: null | {
    id: string;
    status: "draft" | "submitted" | "returned";
    submittedAt: string | null;
    files: SubmissionFile[];
  };
};

type CalendarEvent = {
  id: string;
  kind: "class" | "assignment_deadline" | "assessment" | "advising";
  sectionId: string | null;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  joinUrl: string | null;
};

export function StudentCoursesView() {
  const router = useRouter();
  const resource = useStudentResource<{ courses: Course[] }>("/courses/me");
  const courses = resource.data?.courses ?? [];
  return (
    <StudentFrame role="student" title="My courses" subtitle="Your active and completed enrolments" breadcrumb={["Student", "Courses"]} active="Courses">
      <ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>
        {courses.length === 0 ? <EmptyState title="No courses" body="Your assigned courses will appear here." /> : (
          <ul style={listStyle}>
            {courses.map((course) => (
              <li key={course.sectionId} style={rowStyle}>
                <div>
                  <strong>{course.courseCode} · {course.courseTitle}</strong>
                  <div style={{ color: "var(--mh-text-muted)", marginTop: 4 }}>
                    {course.sectionCode} · {course.termName} · {course.instructorName}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <StatusPill tone="neutral">{course.progressPercent == null ? "No published work" : `${course.progressPercent}%`}</StatusPill>
                  <Button type="button" onClick={() => router.push(`/student/courses/${course.sectionId}`)}>Open course</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ResourceBoundary>
    </StudentFrame>
  );
}

export function StudentCourseDetailView({ sectionId }: { sectionId: string }) {
  const router = useRouter();
  const courses = useStudentResource<{ courses: Course[] }>("/courses/me");
  const assignments = useStudentResource<{ assignments: Assignment[] }>("/student/assignments");
  const calendar = useStudentResource<{ events: CalendarEvent[] }>("/calendar/me");
  const content = useStudentResource<{
    progressPct: number;
    completedCount: number;
    totalCount: number;
    items: Array<{ id: string; kind: string; title: string; detail: string; href?: string | null; completed: boolean }>;
  }>(`/student/courses/${sectionId}/content`);
  const [busyId, setBusyId] = useState<string | null>(null);
  const course = courses.data?.courses.find((item) => item.sectionId === sectionId);
  const courseAssignments = assignments.data?.assignments.filter((item) => item.sectionId === sectionId) ?? [];
  const sessions = calendar.data?.events.filter((item) => item.sectionId === sectionId && item.kind === "class") ?? [];
  const state = [courses.state, assignments.state, calendar.state, content.state].includes("forbidden")
    ? "forbidden"
    : [courses.state, assignments.state, calendar.state, content.state].includes("error")
      ? "error"
      : [courses.state, assignments.state, calendar.state, content.state].includes("offline")
        ? "offline"
        : [courses.state, assignments.state, calendar.state, content.state].every((value) => value === "ready")
          ? "ready"
          : "loading";

  async function markComplete(itemId: string) {
    const session = loadSession();
    if (!session) return;
    setBusyId(itemId);
    try {
      await api(
        `/student/courses/${sectionId}/content/${encodeURIComponent(itemId)}/complete`,
        { method: "POST", body: "{}" },
        session.accessToken,
      );
      await content.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <StudentFrame role="student" title={course ? `${course.courseCode} · ${course.courseTitle}` : "Course detail"} subtitle={course ? `${course.sectionCode} · ${course.instructorName}` : "Enrolment-scoped course information"} breadcrumb={["Student", "Courses", course?.courseCode ?? "Detail"]} active="Courses">
      <ResourceBoundary state={state} error={courses.error ?? assignments.error ?? calendar.error ?? content.error} onRetry={() => { courses.refresh(); assignments.refresh(); calendar.refresh(); content.refresh(); }}>
        {!course ? <EmptyState title="Course unavailable" body="This course is not part of your enrolment." /> : (
          <div style={{ display: "grid", gap: 18 }}>
            <Panel title="Course overview">
              <p style={{ marginTop: 0 }}>{course.credits} credits · {course.termName}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <StatusPill tone="success">{course.enrolmentStatus}</StatusPill>
                <StatusPill tone="neutral">
                  Content {content.data?.completedCount ?? 0}/{content.data?.totalCount ?? 0} · {content.data?.progressPct ?? 0}%
                </StatusPill>
              </div>
            </Panel>
            <Panel title="Upcoming classes">
              {sessions.length === 0 ? <EmptyState title="No scheduled classes" body="New sessions will appear when they are scheduled." /> : (
                <ul style={listStyle}>{sessions.map((event) => <li key={event.id} style={rowStyle}><div><strong>{event.title}</strong><div style={{ color: "var(--mh-text-muted)" }}>{formatDate(event.startsAt)} · {event.location ?? "Location TBA"}</div></div>{event.joinUrl ? <Button type="button" onClick={() => window.open(event.joinUrl!, "_blank", "noopener,noreferrer")}>Join class</Button> : <StatusPill tone="neutral">In person</StatusPill>}</li>)}</ul>
              )}
            </Panel>
            <Panel title="Course materials & consumption">
              {(content.data?.items?.length ?? 0) === 0 && sessions.length === 0 && courseAssignments.length === 0 ? (
                <EmptyState title="No materials yet" body="Lectures, resources, and assigned work will appear here when published." />
              ) : (
                <ul style={listStyle}>
                  {(content.data?.items ?? []).map((item) => (
                    <li key={item.id} style={rowStyle}>
                      <div>
                        <strong>{item.title}</strong>
                        <div style={{ color: "var(--mh-text-muted)" }}>
                          {item.kind === "lecture" ? "Lecture / class" : "Resource / assignment"} · {item.detail}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {item.completed ? <StatusPill tone="success">Completed</StatusPill> : null}
                        {item.href ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              if (item.href!.startsWith("http")) window.open(item.href!, "_blank", "noopener,noreferrer");
                              else router.push(item.href!);
                            }}
                          >
                            {item.kind === "lecture" ? "Open session" : "Open"}
                          </Button>
                        ) : null}
                        {!item.completed ? (
                          <Button type="button" disabled={busyId === item.id} onClick={() => void markComplete(item.id)}>
                            {busyId === item.id ? "Saving…" : "Mark complete"}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Assignments">
              {courseAssignments.length === 0 ? (
                <EmptyState title="No assignments" body="There is no assigned work for this course yet." />
              ) : (
                <ul style={listStyle}>
                  {courseAssignments.map((assignment) => (
                    <li key={assignment.id} style={rowStyle}>
                      <div>
                        <strong>{assignment.title}</strong>
                        <div style={{ color: "var(--mh-text-muted)" }}>Due {formatDate(assignment.dueAt)}</div>
                      </div>
                      <Button type="button" variant="secondary" onClick={() => router.push(`/student/assignments/${assignment.id}`)}>
                        View
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}
      </ResourceBoundary>
    </StudentFrame>
  );
}

export function StudentAssignmentsView() {
  const router = useRouter();
  const resource = useStudentResource<{ assignments: Assignment[] }>("/student/assignments");
  const [query, setQuery] = useState("");
  const assignments = useMemo(() => (resource.data?.assignments ?? []).filter((assignment) => `${assignment.title} ${assignment.courseCode}`.toLowerCase().includes(query.toLowerCase())), [query, resource.data]);
  return (
    <StudentFrame role="student" title="Assignments" subtitle="Upload and track work for your enrolled courses" breadcrumb={["Student", "Assignments"]} active="Courses">
      <ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>
        <label style={{ display: "grid", gap: 6, maxWidth: 420, marginBottom: 18 }}><span style={{ fontWeight: 600 }}>Search assignments</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Course or assignment" /></label>
        {assignments.length === 0 ? <EmptyState title="No matching assignments" body="Try another search or check back later." /> : (
          <ul style={listStyle}>{assignments.map((assignment) => <li key={assignment.id} style={rowStyle}><div><strong>{assignment.title}</strong><div style={{ color: "var(--mh-text-muted)" }}>{assignment.courseCode} · Due {formatDate(assignment.dueAt)}</div></div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><StatusPill tone={assignment.state === "overdue" ? "danger" : assignment.state === "submitted" || assignment.state === "graded" ? "success" : "neutral"}>{assignment.state}</StatusPill><Button type="button" onClick={() => router.push(`/student/assignments/${assignment.id}`)}>Open</Button></div></li>)}</ul>
        )}
      </ResourceBoundary>
    </StudentFrame>
  );
}

function mimeForFile(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ({ pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", zip: "application/zip" } as Record<string, string>)[extension ?? ""] ?? "";
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function assignmentStatusTone(state: Assignment["state"]): "neutral" | "success" | "warning" | "danger" {
  if (state === "overdue") return "danger";
  if (state === "graded" || state === "submitted") return "success";
  if (state === "due") return "warning";
  return "neutral";
}

export function StudentAssignmentDetailView({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const resource = useStudentResource<{ assignment: Assignment }>(`/student/assignments/${assignmentId}`);
  const assignment = resource.data?.assignment;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file || !resource.session) return;
    setBusy(true);
    setNotice(null);
    setActionError(null);
    try {
      const mimeType = mimeForFile(file);
      await api(
        `/student/assignments/${assignmentId}/files`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            mimeType,
            sizeBytes: file.size,
            contentBase64: toBase64(new Uint8Array(await file.arrayBuffer())),
          }),
        },
        resource.session.accessToken,
      );
      setNotice("File uploaded as a new version.");
      await resource.refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function archive(fileId: string) {
    if (!resource.session) return;
    setBusy(true);
    setNotice(null);
    setActionError(null);
    try {
      await api(`/student/submission-files/${fileId}`, { method: "DELETE" }, resource.session.accessToken);
      setNotice("File removed from the active submission. It remains recoverable for audit.");
      await resource.refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not remove file");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!resource.session) return;
    setBusy(true);
    setNotice(null);
    setActionError(null);
    try {
      await api(`/student/assignments/${assignmentId}/submit`, { method: "POST", body: "{}" }, resource.session.accessToken);
      setNotice("Assignment submitted successfully.");
      await resource.refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not submit assignment");
    } finally {
      setBusy(false);
    }
  }

  const files = assignment?.submission?.files ?? [];
  const canUpload = assignment?.submission?.status !== "submitted" && assignment?.state !== "graded";
  const canRemove = assignment?.submission?.status === "draft";
  const submittedLocked = !canUpload;

  return (
    <StudentFrame
      role="student"
      title={assignment?.title ?? "Assignment detail"}
      subtitle={assignment ? `${assignment.courseCode} · Due ${formatDate(assignment.dueAt)}` : "Submission workflow"}
      breadcrumb={["Student", "Assignments", assignment?.title ?? "Detail"]}
      activeHref="/student/assignments"
    >
      {actionError ? <Banner tone="danger">{actionError}</Banner> : null}
      {notice ? <Banner tone="success">{notice}</Banner> : null}
      <ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>
        {!assignment ? (
          <section className="mh-teacher-card">
            <EmptyState title="Assignment unavailable" body="This assignment is not part of your enrolment." />
            <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={() => router.push("/student/assignments")}>
              Back to assignments
            </button>
          </section>
        ) : (
          <div className="mh-student-assign">
            <div className="mh-student-assign__toolbar">
              <button type="button" className="mh-teacher-link" onClick={() => router.push("/student/assignments")}>
                ← All assignments
              </button>
              <button
                type="button"
                className="mh-teacher-btn mh-teacher-btn--secondary"
                onClick={() => router.push(`/student/courses/${assignment.sectionId}`)}
              >
                Open course
              </button>
            </div>

            <div className="mh-teacher-dash__kpis">
              <div className="mh-teacher-dash__kpi">
                <div className="mh-teacher-dash__kpi-label">Status</div>
                <div className="mh-teacher-dash__kpi-value" style={{ fontSize: 22, textTransform: "capitalize" }}>
                  {assignment.state}
                </div>
                <div className="mh-teacher-dash__kpi-hint">{assignment.courseCode}</div>
              </div>
              <div className="mh-teacher-dash__kpi">
                <div className="mh-teacher-dash__kpi-label">Points</div>
                <div className="mh-teacher-dash__kpi-value">{assignment.maxScore}</div>
                <div className="mh-teacher-dash__kpi-hint">Maximum score</div>
              </div>
              <div className="mh-teacher-dash__kpi">
                <div className="mh-teacher-dash__kpi-label">Weight</div>
                <div className="mh-teacher-dash__kpi-value">{assignment.weightPercent}%</div>
                <div className="mh-teacher-dash__kpi-hint">Course grade</div>
              </div>
              <div className="mh-teacher-dash__kpi">
                <div className="mh-teacher-dash__kpi-label">Due</div>
                <div className="mh-teacher-dash__kpi-value" style={{ fontSize: 18 }}>
                  {formatDate(assignment.dueAt)}
                </div>
                <div className="mh-teacher-dash__kpi-hint">{assignment.courseTitle}</div>
              </div>
            </div>

            <div className="mh-teacher-detail__grid">
              <section className="mh-teacher-card">
                <div className="mh-teacher-card__head">
                  <h2>Assignment</h2>
                  <StatusPill tone={assignmentStatusTone(assignment.state)}>{assignment.state}</StatusPill>
                </div>
                <div className="mh-teacher-section">
                  <div className="mh-teacher-section__label">OVERVIEW</div>
                  <div className="mh-teacher-fields">
                    <label>
                      <span>Course</span>
                      <div className="mh-teacher-field">
                        {assignment.courseCode} · {assignment.courseTitle}
                      </div>
                    </label>
                    <label>
                      <span>Title</span>
                      <div className="mh-teacher-field">{assignment.title}</div>
                    </label>
                    <label>
                      <span>Due date</span>
                      <div className="mh-teacher-field">{formatDate(assignment.dueAt)}</div>
                    </label>
                    <label>
                      <span>Grading</span>
                      <div className="mh-teacher-field">
                        {assignment.maxScore} points · {assignment.weightPercent}% weight
                      </div>
                    </label>
                  </div>
                </div>
                {submittedLocked && assignment.submission?.submittedAt ? (
                  <div className="mh-teacher-banner" style={{ background: "#e8f5ee", borderColor: "rgba(1,127,63,0.22)", color: "#017f3f" }}>
                    Submitted {formatDate(assignment.submission.submittedAt)}
                    {assignment.state === "graded" ? " · Graded and published" : ""}
                  </div>
                ) : null}
              </section>

              <section className="mh-teacher-card mh-student-assign__submit">
                <div className="mh-teacher-card__head">
                  <h2>Your submission</h2>
                  <StatusPill tone={files.length ? "success" : "neutral"}>
                    {files.length ? `${files.length} file${files.length === 1 ? "" : "s"}` : "No files"}
                  </StatusPill>
                </div>

                {files.length ? (
                  <div className="mh-teacher-list">
                    {files.map((file) => (
                      <div key={file.id} className="mh-teacher-list__item">
                        <div>
                          <strong>{file.filename}</strong>
                          <span>
                            Version {file.version} · {(file.sizeBytes / 1024).toFixed(1)} KB · {formatDate(file.createdAt)}
                          </span>
                        </div>
                        {canRemove ? (
                          <button
                            type="button"
                            className="mh-teacher-btn mh-teacher-btn--secondary"
                            disabled={busy}
                            onClick={() => void archive(file.id)}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mh-teacher-muted" style={{ margin: 0 }}>
                    No files uploaded yet.
                  </p>
                )}

                {canUpload ? (
                  <>
                    <label className="mh-teacher-dropzone mh-student-assign__drop">
                      <input
                        aria-label="Choose submission file"
                        type="file"
                        disabled={busy}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip"
                        onChange={(event) => {
                          void upload(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M12 16V8M12 8l-3 3M12 8l3 3" stroke="#017f3f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path
                          d="M20 16.5a3.5 3.5 0 0 0-2.1-6.4A5.5 5.5 0 0 0 7.1 8.4 3.5 3.5 0 0 0 4 11.8"
                          stroke="#017f3f"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                        <path d="M8 19h8" stroke="#017f3f" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      <strong>{busy ? "Uploading…" : "Choose a file to upload"}</strong>
                      <span>PDF, Office, images, or ZIP · up to 10 MiB</span>
                    </label>
                    <div className="mh-teacher-actions">
                      <button
                        type="button"
                        className="mh-teacher-btn mh-teacher-btn--primary"
                        disabled={busy || !files.length}
                        onClick={() => void submit()}
                      >
                        {busy ? "Working…" : "Submit assignment"}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mh-teacher-muted" style={{ margin: 0 }}>
                    {assignment.state === "graded"
                      ? "This assignment has been graded. Resubmission is closed."
                      : "This submission is locked. Contact your instructor if you need a resubmission window."}
                  </p>
                )}
              </section>
            </div>
          </div>
        )}
      </ResourceBoundary>
    </StudentFrame>
  );
}

export function StudentCalendarView() {
  const resource = useStudentResource<{ events: CalendarEvent[] }>("/calendar/me");
  const events = resource.data?.events ?? [];
  return <StudentFrame role="student" title="Schedule" subtitle="Classes and assignment deadlines" breadcrumb={["Student", "Schedule"]} active="Schedule"><ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>{events.length === 0 ? <EmptyState title="No scheduled items" body="Your enrolled class schedule will appear here." /> : <ul style={listStyle}>{events.map((event) => <li key={event.id} style={rowStyle}><div><strong>{event.title}</strong><div style={{ color: "var(--mh-text-muted)" }}>{formatDate(event.startsAt)} · {event.location ?? "Online"}</div></div><div style={{ display: "flex", gap: 10, alignItems: "center" }}><StatusPill tone="neutral">{event.kind.replace("_", " ")}</StatusPill>{event.joinUrl ? <Button type="button" onClick={() => window.open(event.joinUrl!, "_blank", "noopener,noreferrer")}>Join class</Button> : null}</div></li>)}</ul>}</ResourceBoundary></StudentFrame>;
}

type NotificationItem = { id: string; channel: string; title: string; body: string; readAt: string | null; createdAt: string };

export function StudentNotificationsView() {
  const resource = useStudentResource<{ items: NotificationItem[]; unreadCount: number }>("/notifications/me");
  const [actionError, setActionError] = useState<string | null>(null);
  async function markRead(id: string) {
    if (!resource.session) return;
    setActionError(null);
    try { await api(`/notifications/me/${id}/read`, { method: "PATCH", body: "{}" }, resource.session.accessToken); await resource.refresh(); }
    catch (caught) { setActionError(caught instanceof Error ? caught.message : "Could not update notification"); }
  }
  const items = resource.data?.items ?? [];
  return <StudentFrame role="student" title="Notifications" subtitle={`${resource.data?.unreadCount ?? 0} unread`} breadcrumb={["Student", "Notifications"]}>{actionError ? <Banner tone="danger">{actionError}</Banner> : null}<ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>{items.length === 0 ? <EmptyState title="You're all caught up" body="New campus notices will appear here." /> : <ul style={listStyle}>{items.map((item) => <li key={item.id} style={{ ...rowStyle, opacity: item.readAt ? 0.72 : 1 }}><div><strong>{item.title}</strong><div style={{ marginTop: 4 }}>{item.body}</div><div style={{ color: "var(--mh-text-muted)", marginTop: 4 }}>{formatDate(item.createdAt)}</div></div>{item.readAt ? <StatusPill tone="neutral">Read</StatusPill> : <Button type="button" onClick={() => void markRead(item.id)}>Mark read</Button>}</li>)}</ul>}</ResourceBoundary></StudentFrame>;
}

type Profile = { studentId: string; studentNumber: string; givenName: string; familyName: string; primaryEmail: string; dateOfBirth: string | null; programName: string; standing: string; timezone: string };

export function StudentProfileView() {
  const router = useRouter();
  const resource = useStudentResource<Profile>("/me/profile");
  const [timezone, setTimezone] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingTz, setSavingTz] = useState(false);
  const [sendingChange, setSendingChange] = useState(false);

  useEffect(() => {
    if (resource.data) {
      setTimezone(resource.data.timezone);
      setFamilyName(resource.data.familyName);
    }
  }, [resource.data]);

  async function saveTimezone(event: FormEvent) {
    event.preventDefault();
    if (!resource.session) return;
    setNotice(null);
    setActionError(null);
    setSavingTz(true);
    try {
      await api("/me/preferences", { method: "PATCH", body: JSON.stringify({ timezone }) }, resource.session.accessToken);
      setNotice("Timezone updated.");
      await resource.refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not update timezone");
    } finally {
      setSavingTz(false);
    }
  }

  async function requestChange(event: FormEvent) {
    event.preventDefault();
    if (!resource.session) return;
    setNotice(null);
    setActionError(null);
    setSendingChange(true);
    try {
      await api(
        "/me/profile-change-requests",
        { method: "POST", body: JSON.stringify({ familyName, reason }) },
        resource.session.accessToken,
      );
      setNotice("Profile change sent to the registrar for approval.");
      setReason("");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not request profile change");
    } finally {
      setSendingChange(false);
    }
  }

  const profile = resource.data;
  const fullName = profile ? `${profile.givenName} ${profile.familyName}`.trim() : "Student";
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "ST";
  const dob = profile?.dateOfBirth
    ? new Date(profile.dateOfBirth).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
    : "Not on file";

  return (
    <StudentFrame
      role="student"
      title="Profile"
      subtitle="Your student record"
      breadcrumb={["Student", "Profile"]}
      activeHref="/student/profile"
    >
      {actionError ? <Banner tone="danger">{actionError}</Banner> : null}
      {notice ? <Banner tone="success">{notice}</Banner> : null}
      <ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>
        {profile ? (
          <div className="mh-teacher-profile">
            <aside className="mh-teacher-profile__card">
              <div className="mh-student-profile__avatar" aria-hidden>
                {initials}
              </div>
              <h2>{fullName}</h2>
              <p>
                {profile.programName}
                {profile.standing ? ` · ${profile.standing}` : ""}
              </p>
              <p className="mh-teacher-mono">ID {profile.studentNumber}</p>
              <div className="mh-student-profile__chips">
                <StatusPill tone={/good|excellent|satisfactory/i.test(profile.standing) ? "success" : "neutral"}>
                  {profile.standing}
                </StatusPill>
                <span className="mh-teacher-tag">{profile.programName}</span>
              </div>
            </aside>

            <section className="mh-teacher-card mh-teacher-profile__main">
              <div className="mh-teacher-tabs">
                <button type="button" className="mh-teacher-tabs__item is-active">
                  My profile
                </button>
                <button
                  type="button"
                  className="mh-teacher-tabs__item"
                  onClick={() => router.push("/student/notifications")}
                >
                  Notifications
                </button>
              </div>

              <div className="mh-teacher-section">
                <div className="mh-teacher-section__label">PERSONAL INFO</div>
                <div className="mh-teacher-fields">
                  <label>
                    <span>Given name</span>
                    <div className="mh-teacher-field">{profile.givenName}</div>
                  </label>
                  <label>
                    <span>Family name</span>
                    <div className="mh-teacher-field">{profile.familyName}</div>
                  </label>
                  <label>
                    <span>Primary email</span>
                    <div className="mh-teacher-field">{profile.primaryEmail}</div>
                  </label>
                  <label>
                    <span>Date of birth</span>
                    <div className="mh-teacher-field">{dob}</div>
                  </label>
                  <label>
                    <span>Student number</span>
                    <div className="mh-teacher-field">{profile.studentNumber}</div>
                  </label>
                  <label>
                    <span>Academic standing</span>
                    <div className="mh-teacher-field">{profile.standing}</div>
                  </label>
                </div>
              </div>

              <div className="mh-teacher-section">
                <div className="mh-teacher-section__label">PREFERENCES</div>
                <form className="mh-teacher-form" onSubmit={saveTimezone}>
                  <label>
                    <span>Timezone</span>
                    <input
                      className="mh-teacher-field"
                      value={timezone}
                      onChange={(event) => setTimezone(event.target.value)}
                      placeholder="e.g. America/Toronto"
                      required
                    />
                  </label>
                  <div className="mh-teacher-actions">
                    <button type="submit" className="mh-teacher-btn mh-teacher-btn--primary" disabled={savingTz}>
                      {savingTz ? "Saving…" : "Save preference"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="mh-teacher-section">
                <div className="mh-teacher-section__label">OFFICIAL CORRECTION</div>
                <p className="mh-teacher-muted" style={{ margin: 0 }}>
                  Name corrections go to the registrar for approval. Include a clear reason.
                </p>
                <form className="mh-teacher-form" onSubmit={requestChange}>
                  <div className="mh-teacher-fields">
                    <label>
                      <span>Family name</span>
                      <input
                        className="mh-teacher-field"
                        value={familyName}
                        onChange={(event) => setFamilyName(event.target.value)}
                        required
                      />
                    </label>
                    <label style={{ gridColumn: "1 / -1" }}>
                      <span>Reason</span>
                      <textarea
                        className="mh-teacher-field"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        minLength={10}
                        required
                        rows={4}
                        placeholder="Describe the correction needed…"
                      />
                    </label>
                  </div>
                  <div className="mh-teacher-actions">
                    <button type="submit" className="mh-teacher-btn mh-teacher-btn--primary" disabled={sendingChange}>
                      {sendingChange ? "Sending…" : "Send for approval"}
                    </button>
                    <button
                      type="button"
                      className="mh-teacher-btn mh-teacher-btn--secondary"
                      onClick={() => router.push("/student/messages")}
                    >
                      Message registrar
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        ) : null}
      </ResourceBoundary>
    </StudentFrame>
  );
}

type SearchGroup = { type: string; items: Array<{ id: string; label: string; sub?: string | null; href?: string | null }> };

export function StudentSearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeQuery = (searchParams.get("q") ?? "").trim();
  useEffect(() => {
    const active = loadSession();
    if (!active) router.replace("/login");
    else setSession(active);
  }, [router]);
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
    if (!q.trim() || !session) {
      setGroups([]);
      return;
    }
    setBusy(true);
    setError(null);
    api<{ groups: SearchGroup[] }>(`/search?q=${encodeURIComponent(q.trim())}`, {}, session.accessToken)
      .then((result) => setGroups(result.groups))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Search failed"))
      .finally(() => setBusy(false));
  }, [searchParams, session]);
  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    router.push(`/student/search?q=${encodeURIComponent(query.trim())}`);
  }
  return (
    <StudentFrame
      role="student"
      title="Search"
      subtitle="Search your courses, assignments, library, and student services."
      breadcrumb={["Student", "Search"]}
    >
      <form onSubmit={search} style={{ display: "flex", gap: 10, marginBottom: 18, maxWidth: 680 }}>
        <input
          aria-label="Search student portal"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your portal"
          style={{ flex: 1 }}
        />
        <Button type="submit" disabled={busy || !query.trim()}>
          {busy ? "Searching…" : "Search"}
        </Button>
      </form>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {!busy && groups.length === 0 ? (
        <EmptyState
          title={activeQuery ? `No results for “${activeQuery}”` : "Search your portal"}
          body={
            activeQuery
              ? "Try a course code, assignment, lab, service, credential, or library keyword."
              : "Results are limited to records and services available to your student account."
          }
        />
      ) : (
        groups.map((group) => (
          <Panel key={group.type} title={group.type[0]?.toUpperCase() + group.type.slice(1)}>
            <ul style={listStyle}>
              {group.items.map((item) => (
                <li key={item.id} style={rowStyle}>
                  <div>
                    <strong>{item.label}</strong>
                    {item.sub ? <div style={{ color: "var(--mh-text-muted)" }}>{item.sub}</div> : null}
                  </div>
                  {item.href ? (
                    <Button type="button" variant="secondary" onClick={() => router.push(item.href!)}>
                      Open
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}
    </StudentFrame>
  );
}

type PortalHubView = {
  title: string;
  subtitle: string;
  metrics: Array<{ label: string; value: string; hint?: string }>;
  sections: Array<{ title: string; rows: Array<{ primary: string; secondary?: string; meta?: string; href?: string }> }>;
  actions: Array<{ label: string; href?: string; variant?: string }>;
};

const SERVICE_LINKS: Array<{ title: string; body: string; href: string }> = [
  { title: "Active courses", body: "Open enrolled sections, lectures, and resources.", href: "/student/courses" },
  { title: "Grades & final marks", body: "Published scores and letter grades.", href: "/student/grades" },
  { title: "Assignments", body: "Due work, uploads, and submission status.", href: "/student/assignments" },
  { title: "Calendar & Join Class", body: "Upcoming classes and meeting links.", href: "/student/calendar" },
  { title: "Campus services", body: "Workshops, advising, and campus request forms.", href: "/student/f/st-16-services" },
  { title: "Program plan", body: "Program standing and progress overview.", href: "/student/profile" },
  { title: "My documents", body: "ID card and uploaded student documents.", href: "/student/documents" },
  { title: "Fees & statements", body: "Balances, tuition, and financial records.", href: "/student/fees" },
  { title: "Messages", body: "Inbox threads with instructors and campus.", href: "/student/messages" },
  { title: "Leave of absence", body: "Start a request form for registrar review.", href: "/student/holds" },
  { title: "Ask Heritage", body: "Grounded answers from your campus records.", href: "/student/ask" },
  { title: "Profile & settings", body: "Timezone, security, and correction requests.", href: "/student/profile" },
];

export function StudentServicesView() {
  const router = useRouter();
  const resource = useStudentResource<PortalHubView>("/portal/view?path=%2Fstudent%2Fadvising");
  const advisingRows = resource.data?.sections.flatMap((section) => section.rows) ?? [];

  return (
    <StudentFrame
      role="student"
      active="Services"
      title="Student services"
      subtitle="Advising, records, workshops, fees, and request forms for your student account."
      breadcrumb={["Student", "Services"]}
    >
      <ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>
        <div style={{ display: "grid", gap: 18 }}>
          <Panel title="Advising appointments">
            {advisingRows.length ? (
              <ul style={listStyle}>
                {advisingRows.map((row) => (
                  <li key={`${row.primary}-${row.meta ?? ""}`} style={rowStyle}>
                    <div>
                      <strong>{row.primary}</strong>
                      {row.secondary ? <div style={{ color: "var(--mh-text-muted)" }}>{row.secondary}</div> : null}
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {row.meta ? <StatusPill tone="warning">{row.meta}</StatusPill> : null}
                      <Button type="button" variant="secondary" onClick={() => router.push("/student/messages")}>
                        Message advisor
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No advising bookings yet" body="When an advisor books a check-in, it will appear here." />
            )}
          </Panel>

          <Panel title="My campus hub">
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              {SERVICE_LINKS.map((link) => (
                <button
                  key={link.href + link.title}
                  type="button"
                  onClick={() => router.push(link.href)}
                  style={{
                    textAlign: "left",
                    padding: 14,
                    border: "1px solid var(--mh-border)",
                    borderRadius: "var(--mh-radius-md)",
                    background: "var(--mh-surface)",
                    cursor: "pointer",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <strong>{link.title}</strong>
                  <span style={{ color: "var(--mh-text-muted)", fontSize: 13 }}>{link.body}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </ResourceBoundary>
    </StudentFrame>
  );
}

export function StudentFeesView() {
  const router = useRouter();
  const resource = useStudentResource<{
    summary: { balance: { amountCents: number }; pastDue: { amountCents: number }; nextDueAt: string | null; paymentExecutionEnabled: false };
    entries: Array<{ id: string; label: string; amountCad: number; kind: string; status: string; dueAt: string | null }>;
  }>("/student/finance");
  const entries = resource.data?.entries ?? [];
  const summary = resource.data?.summary;
  return (
    <StudentFrame role="student" active="Fees" title="Fees & financial statements" subtitle="Tuition balances and financial records for your account. Online payment is not enabled." breadcrumb={["Student", "Fees"]}>
      <ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>
        <Panel title="Balances">
          {summary ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <StatusPill tone="warning">Balance CAD {(summary.balance.amountCents / 100).toFixed(2)}</StatusPill>
              <StatusPill tone={summary.pastDue.amountCents > 0 ? "danger" : "success"}>
                Past due CAD {(summary.pastDue.amountCents / 100).toFixed(2)}
              </StatusPill>
              <StatusPill tone="neutral">Payment execution off</StatusPill>
            </div>
          ) : null}
          {entries.length ? (
            <ul style={listStyle}>
              {entries.map((row) => (
                <li key={row.id} style={rowStyle}>
                  <div>
                    <strong>{row.label}</strong>
                    <div style={{ color: "var(--mh-text-muted)" }}>{row.kind} · {row.status}{row.dueAt ? ` · due ${row.dueAt.slice(0, 10)}` : ""}</div>
                  </div>
                  <StatusPill tone="warning">CAD {row.amountCad.toFixed(2)}</StatusPill>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No fee rows" body="Financial statements will appear when posted by finance." />
          )}
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button type="button" variant="secondary" onClick={() => router.push("/student/documents")}>Tax documents</Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/student/advising")}>Back to services</Button>
          </div>
        </Panel>
      </ResourceBoundary>
    </StudentFrame>
  );
}

export function StudentDocumentsView() {
  const router = useRouter();
  const resource = useStudentResource<PortalHubView>("/portal/view?path=%2Fstudent%2Fdocuments");
  const rows = resource.data?.sections.flatMap((section) => section.rows) ?? [];
  return (
    <StudentFrame role="student" title="My documents" subtitle="Student ID and campus document records." breadcrumb={["Student", "Documents"]}>
      <ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>
        <Panel title="Documents">
          {rows.length ? (
            <ul style={listStyle}>
              {rows.map((row) => (
                <li key={`${row.primary}-${row.meta ?? ""}`} style={rowStyle}>
                  <div>
                    <strong>{row.primary}</strong>
                    {row.secondary ? <div style={{ color: "var(--mh-text-muted)" }}>{row.secondary}</div> : null}
                  </div>
                  {row.meta ? <StatusPill tone="success">{row.meta}</StatusPill> : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No documents yet" body="Uploaded and issued student documents will list here." />
          )}
          <div style={{ marginTop: 14 }}>
            <Button type="button" variant="secondary" onClick={() => router.push("/student/advising")}>Student services</Button>
          </div>
        </Panel>
      </ResourceBoundary>
    </StudentFrame>
  );
}

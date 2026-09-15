"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, EmptyState, Panel, StatusPill } from "@myheritage/ui";
import { ApiError, api, loadSession, type Session } from "@/lib/api";
import { ScreenScaffold } from "@/components/ScreenScaffold";

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
    <Panel>
      <EmptyState title={copy[0]} body={copy[1]} />
      {state === "offline" || state === "error" ? (
        <Button type="button" onClick={onRetry}>Try again</Button>
      ) : null}
    </Panel>
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
    <ScreenScaffold role="student" title="My courses" subtitle="Your active and completed enrolments" breadcrumb={["Student", "Courses"]} active="Courses">
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
    </ScreenScaffold>
  );
}

export function StudentCourseDetailView({ sectionId }: { sectionId: string }) {
  const router = useRouter();
  const courses = useStudentResource<{ courses: Course[] }>("/courses/me");
  const assignments = useStudentResource<{ assignments: Assignment[] }>("/student/assignments");
  const calendar = useStudentResource<{ events: CalendarEvent[] }>("/calendar/me");
  const course = courses.data?.courses.find((item) => item.sectionId === sectionId);
  const courseAssignments = assignments.data?.assignments.filter((item) => item.sectionId === sectionId) ?? [];
  const sessions = calendar.data?.events.filter((item) => item.sectionId === sectionId && item.kind === "class") ?? [];
  const state = [courses.state, assignments.state, calendar.state].includes("forbidden")
    ? "forbidden"
    : [courses.state, assignments.state, calendar.state].includes("error")
      ? "error"
      : [courses.state, assignments.state, calendar.state].includes("offline")
        ? "offline"
        : [courses.state, assignments.state, calendar.state].every((value) => value === "ready")
          ? "ready"
          : "loading";
  return (
    <ScreenScaffold role="student" title={course ? `${course.courseCode} · ${course.courseTitle}` : "Course detail"} subtitle={course ? `${course.sectionCode} · ${course.instructorName}` : "Enrolment-scoped course information"} breadcrumb={["Student", "Courses", course?.courseCode ?? "Detail"]} active="Courses">
      <ResourceBoundary state={state} error={courses.error ?? assignments.error ?? calendar.error} onRetry={() => { courses.refresh(); assignments.refresh(); calendar.refresh(); }}>
        {!course ? <EmptyState title="Course unavailable" body="This course is not part of your enrolment." /> : (
          <div style={{ display: "grid", gap: 18 }}>
            <Panel title="Course overview">
              <p style={{ marginTop: 0 }}>{course.credits} credits · {course.termName}</p>
              <StatusPill tone="success">{course.enrolmentStatus}</StatusPill>
            </Panel>
            <Panel title="Upcoming classes">
              {sessions.length === 0 ? <EmptyState title="No scheduled classes" body="New sessions will appear when they are scheduled." /> : (
                <ul style={listStyle}>{sessions.map((event) => <li key={event.id} style={rowStyle}><div><strong>{event.title}</strong><div style={{ color: "var(--mh-text-muted)" }}>{formatDate(event.startsAt)} · {event.location ?? "Location TBA"}</div></div>{event.joinUrl ? <Button type="button" onClick={() => window.open(event.joinUrl!, "_blank", "noopener,noreferrer")}>Join class</Button> : <StatusPill tone="neutral">In person</StatusPill>}</li>)}</ul>
              )}
            </Panel>
            <Panel title="Assignments">
              {courseAssignments.length === 0 ? <EmptyState title="No assignments" body="There is no assigned work for this course yet." /> : (
                <ul style={listStyle}>{courseAssignments.map((assignment) => <li key={assignment.id} style={rowStyle}><div><strong>{assignment.title}</strong><div style={{ color: "var(--mh-text-muted)" }}>Due {formatDate(assignment.dueAt)}</div></div><Button type="button" variant="secondary" onClick={() => router.push(`/student/assignments/${assignment.id}`)}>View</Button></li>)}</ul>
              )}
            </Panel>
          </div>
        )}
      </ResourceBoundary>
    </ScreenScaffold>
  );
}

export function StudentAssignmentsView() {
  const router = useRouter();
  const resource = useStudentResource<{ assignments: Assignment[] }>("/student/assignments");
  const [query, setQuery] = useState("");
  const assignments = useMemo(() => (resource.data?.assignments ?? []).filter((assignment) => `${assignment.title} ${assignment.courseCode}`.toLowerCase().includes(query.toLowerCase())), [query, resource.data]);
  return (
    <ScreenScaffold role="student" title="Assignments" subtitle="Upload and track work for your enrolled courses" breadcrumb={["Student", "Assignments"]} active="Courses">
      <ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>
        <label style={{ display: "grid", gap: 6, maxWidth: 420, marginBottom: 18 }}><span style={{ fontWeight: 600 }}>Search assignments</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Course or assignment" /></label>
        {assignments.length === 0 ? <EmptyState title="No matching assignments" body="Try another search or check back later." /> : (
          <ul style={listStyle}>{assignments.map((assignment) => <li key={assignment.id} style={rowStyle}><div><strong>{assignment.title}</strong><div style={{ color: "var(--mh-text-muted)" }}>{assignment.courseCode} · Due {formatDate(assignment.dueAt)}</div></div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><StatusPill tone={assignment.state === "overdue" ? "danger" : assignment.state === "submitted" || assignment.state === "graded" ? "success" : "neutral"}>{assignment.state}</StatusPill><Button type="button" onClick={() => router.push(`/student/assignments/${assignment.id}`)}>Open</Button></div></li>)}</ul>
        )}
      </ResourceBoundary>
    </ScreenScaffold>
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

export function StudentAssignmentDetailView({ assignmentId }: { assignmentId: string }) {
  const resource = useStudentResource<{ assignment: Assignment }>(`/student/assignments/${assignmentId}`);
  const assignment = resource.data?.assignment;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file || !resource.session) return;
    setBusy(true); setNotice(null); setActionError(null);
    try {
      const mimeType = mimeForFile(file);
      await api(`/student/assignments/${assignmentId}/files`, { method: "POST", body: JSON.stringify({ filename: file.name, mimeType, sizeBytes: file.size, contentBase64: toBase64(new Uint8Array(await file.arrayBuffer())) }) }, resource.session.accessToken);
      setNotice("File uploaded as a new version.");
      await resource.refresh();
    } catch (caught) { setActionError(caught instanceof Error ? caught.message : "Upload failed"); } finally { setBusy(false); }
  }

  async function archive(fileId: string) {
    if (!resource.session) return;
    setBusy(true); setNotice(null); setActionError(null);
    try {
      await api(`/student/submission-files/${fileId}`, { method: "DELETE" }, resource.session.accessToken);
      setNotice("File removed from the active submission. It remains recoverable for audit.");
      await resource.refresh();
    } catch (caught) { setActionError(caught instanceof Error ? caught.message : "Could not remove file"); } finally { setBusy(false); }
  }

  async function submit() {
    if (!resource.session) return;
    setBusy(true); setNotice(null); setActionError(null);
    try {
      await api(`/student/assignments/${assignmentId}/submit`, { method: "POST", body: "{}" }, resource.session.accessToken);
      setNotice("Assignment submitted successfully.");
      await resource.refresh();
    } catch (caught) { setActionError(caught instanceof Error ? caught.message : "Could not submit assignment"); } finally { setBusy(false); }
  }

  return (
    <ScreenScaffold role="student" title={assignment?.title ?? "Assignment detail"} subtitle={assignment ? `${assignment.courseCode} · Due ${formatDate(assignment.dueAt)}` : "Submission workflow"} breadcrumb={["Student", "Assignments", assignment?.title ?? "Detail"]} active="Courses">
      {actionError ? <Banner tone="danger">{actionError}</Banner> : null}{notice ? <Banner tone="success">{notice}</Banner> : null}
      <ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>
        {!assignment ? <EmptyState title="Assignment unavailable" body="This assignment is not part of your enrolment." /> : (
          <div style={{ display: "grid", gap: 18 }}>
            <Panel title="Assignment"><div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><StatusPill tone="neutral">{assignment.state}</StatusPill><StatusPill tone="neutral">{assignment.maxScore} points</StatusPill><StatusPill tone="neutral">{assignment.weightPercent}% weight</StatusPill></div></Panel>
            <Panel title="Your files">
              {assignment.submission?.files.length ? <ul style={listStyle}>{assignment.submission.files.map((file) => <li key={file.id} style={rowStyle}><div><strong>{file.filename}</strong><div style={{ color: "var(--mh-text-muted)" }}>Version {file.version} · {(file.sizeBytes / 1024).toFixed(1)} KB</div></div>{assignment.submission?.status === "draft" ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void archive(file.id)}>Delete</Button> : null}</li>)}</ul> : <EmptyState title="No files uploaded" body="Choose an accepted file up to 10 MiB." />}
              {assignment.submission?.status !== "submitted" ? <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}><label style={{ display: "inline-flex" }}><span className="sr-only">Choose submission file</span><input aria-label="Choose submission file" type="file" disabled={busy} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip" onChange={(event) => void upload(event.target.files?.[0])} /></label><Button type="button" disabled={busy || !assignment.submission?.files.length} onClick={() => void submit()}>{busy ? "Working…" : "Submit assignment"}</Button></div> : <Banner tone="success">Submitted {formatDate(assignment.submission.submittedAt)}</Banner>}
            </Panel>
          </div>
        )}
      </ResourceBoundary>
    </ScreenScaffold>
  );
}

export function StudentCalendarView() {
  const resource = useStudentResource<{ events: CalendarEvent[] }>("/calendar/me");
  const events = resource.data?.events ?? [];
  return <ScreenScaffold role="student" title="Schedule" subtitle="Classes and assignment deadlines" breadcrumb={["Student", "Schedule"]} active="Schedule"><ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>{events.length === 0 ? <EmptyState title="No scheduled items" body="Your enrolled class schedule will appear here." /> : <ul style={listStyle}>{events.map((event) => <li key={event.id} style={rowStyle}><div><strong>{event.title}</strong><div style={{ color: "var(--mh-text-muted)" }}>{formatDate(event.startsAt)} · {event.location ?? "Online"}</div></div><div style={{ display: "flex", gap: 10, alignItems: "center" }}><StatusPill tone="neutral">{event.kind.replace("_", " ")}</StatusPill>{event.joinUrl ? <Button type="button" onClick={() => window.open(event.joinUrl!, "_blank", "noopener,noreferrer")}>Join class</Button> : null}</div></li>)}</ul>}</ResourceBoundary></ScreenScaffold>;
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
  return <ScreenScaffold role="student" title="Notifications" subtitle={`${resource.data?.unreadCount ?? 0} unread`} breadcrumb={["Student", "Notifications"]}>{actionError ? <Banner tone="danger">{actionError}</Banner> : null}<ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>{items.length === 0 ? <EmptyState title="You're all caught up" body="New campus notices will appear here." /> : <ul style={listStyle}>{items.map((item) => <li key={item.id} style={{ ...rowStyle, opacity: item.readAt ? 0.72 : 1 }}><div><strong>{item.title}</strong><div style={{ marginTop: 4 }}>{item.body}</div><div style={{ color: "var(--mh-text-muted)", marginTop: 4 }}>{formatDate(item.createdAt)}</div></div>{item.readAt ? <StatusPill tone="neutral">Read</StatusPill> : <Button type="button" onClick={() => void markRead(item.id)}>Mark read</Button>}</li>)}</ul>}</ResourceBoundary></ScreenScaffold>;
}

type Profile = { studentId: string; studentNumber: string; givenName: string; familyName: string; primaryEmail: string; dateOfBirth: string | null; programName: string; standing: string; timezone: string };

export function StudentProfileView() {
  const resource = useStudentResource<Profile>("/me/profile");
  const [timezone, setTimezone] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => { if (resource.data) { setTimezone(resource.data.timezone); setFamilyName(resource.data.familyName); } }, [resource.data]);
  async function saveTimezone(event: FormEvent) { event.preventDefault(); if (!resource.session) return; setNotice(null); setActionError(null); try { await api("/me/preferences", { method: "PATCH", body: JSON.stringify({ timezone }) }, resource.session.accessToken); setNotice("Timezone updated."); await resource.refresh(); } catch (caught) { setActionError(caught instanceof Error ? caught.message : "Could not update timezone"); } }
  async function requestChange(event: FormEvent) { event.preventDefault(); if (!resource.session) return; setNotice(null); setActionError(null); try { await api("/me/profile-change-requests", { method: "POST", body: JSON.stringify({ familyName, reason }) }, resource.session.accessToken); setNotice("Profile change sent to the registrar for approval."); setReason(""); } catch (caught) { setActionError(caught instanceof Error ? caught.message : "Could not request profile change"); } }
  const profile = resource.data;
  return <ScreenScaffold role="student" title="Profile" subtitle="Personal information and preferences" breadcrumb={["Student", "Profile"]}>{actionError ? <Banner tone="danger">{actionError}</Banner> : null}{notice ? <Banner tone="success">{notice}</Banner> : null}<ResourceBoundary state={resource.state} error={resource.error} onRetry={resource.refresh}>{profile ? <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}><Panel title="Student record"><dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, margin: 0 }}><dt>Student number</dt><dd>{profile.studentNumber}</dd><dt>Name</dt><dd>{profile.givenName} {profile.familyName}</dd><dt>Email</dt><dd>{profile.primaryEmail}</dd><dt>Program</dt><dd>{profile.programName}</dd><dt>Standing</dt><dd>{profile.standing}</dd></dl></Panel><Panel title="Timezone"><form onSubmit={saveTimezone} style={{ display: "grid", gap: 12 }}><label>Timezone<input value={timezone} onChange={(event) => setTimezone(event.target.value)} required /></label><Button type="submit">Save preference</Button></form></Panel><Panel title="Request an official correction"><form onSubmit={requestChange} style={{ display: "grid", gap: 12 }}><label>Family name<input value={familyName} onChange={(event) => setFamilyName(event.target.value)} required /></label><label>Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} required rows={4} /></label><Button type="submit">Send for approval</Button></form></Panel></div> : null}</ResourceBoundary></ScreenScaffold>;
}

type SearchGroup = { type: string; items: Array<{ id: string; label: string; sub?: string | null; href?: string | null }> };

export function StudentSearchView() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const active = loadSession(); if (!active) router.replace("/login"); else setSession(active); }, [router]);
  async function search(event: FormEvent) { event.preventDefault(); if (!session || !query.trim()) return; setBusy(true); setError(null); try { const result = await api<{ groups: SearchGroup[] }>(`/search?q=${encodeURIComponent(query.trim())}`, {}, session.accessToken); setGroups(result.groups); } catch (caught) { setError(caught instanceof Error ? caught.message : "Search failed"); } finally { setBusy(false); } }
  return <ScreenScaffold role="student" title="Search" subtitle="Your courses, assignments, and approved resources" breadcrumb={["Student", "Search"]}><form onSubmit={search} style={{ display: "flex", gap: 10, marginBottom: 18, maxWidth: 680 }}><input aria-label="Search student portal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your portal" style={{ flex: 1 }} /><Button type="submit" disabled={busy || !query.trim()}>{busy ? "Searching…" : "Search"}</Button></form>{error ? <Banner tone="danger">{error}</Banner> : null}{groups.length === 0 ? <EmptyState title="Search your portal" body="People outside your enrolled courses are not included in student search." /> : groups.map((group) => <Panel key={group.type} title={group.type[0]?.toUpperCase() + group.type.slice(1)}><ul style={listStyle}>{group.items.map((item) => <li key={item.id} style={rowStyle}><div><strong>{item.label}</strong>{item.sub ? <div style={{ color: "var(--mh-text-muted)" }}>{item.sub}</div> : null}</div>{item.href ? <Button type="button" variant="secondary" onClick={() => router.push(item.href!)}>Open</Button> : null}</li>)}</ul></Panel>)}</ScreenScaffold>;
}

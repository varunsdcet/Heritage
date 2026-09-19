import { randomUUID } from "node:crypto";
import { prisma } from "@myheritage/db";

type InstructorLivePayload = Record<string, unknown>;

export type WorkshopEnrolmentStatus = "pending" | "approved" | "declined" | "dropped";
export type WorkshopListKind = "mine" | "available" | "completed";

const ENROLMENT_STATUSES: WorkshopEnrolmentStatus[] = ["pending", "approved", "declined", "dropped"];
const SEAT_STATUSES = new Set(["pending", "approved", "registered", "completed"]);
const MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
const WEEKDAYS = ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."];

type WorkshopWithRegs = Awaited<ReturnType<typeof loadWorkshops>>[number];

function pathQuery(path: string) {
  try {
    return new URL(path, "http://local").searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export function normalizeEnrolmentStatus(status: string): WorkshopEnrolmentStatus {
  const s = status.trim().toLowerCase();
  if (s === "pending") return "pending";
  if (s === "declined" || s === "rejected") return "declined";
  if (s === "dropped" || s === "cancelled") return "dropped";
  return "approved";
}

export function parseEnrolmentStatusFilter(path: string): WorkshopEnrolmentStatus | "all" {
  const raw = (pathQuery(path).get("status") || "pending").trim().toLowerCase();
  if (raw === "all" || raw === "all statuses") return "all";
  if (ENROLMENT_STATUSES.includes(raw as WorkshopEnrolmentStatus)) return raw as WorkshopEnrolmentStatus;
  return "pending";
}

export function parseWorkshopListKind(path: string): WorkshopListKind {
  const raw = (pathQuery(path).get("list") || "mine").trim().toLowerCase();
  if (raw === "available" || raw === "completed") return raw;
  return "mine";
}

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(value: string | null | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return ymd(new Date());
}

function shiftYmd(value: string, days: number) {
  const d = new Date(`${value}T12:00:00`);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

function formatShortDate(value: string) {
  const d = new Date(`${value}T12:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatAttendanceHeading(value: string) {
  const d = new Date(`${value}T12:00:00`);
  return `ATTENDANCE FOR: ${MONTHS[d.getMonth()].toUpperCase()} ${d.getDate()}, ${d.getFullYear()} (${WEEKDAYS[d.getDay()].toUpperCase()})`;
}

function statusLabel(status: WorkshopEnrolmentStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusTone(status: WorkshopEnrolmentStatus): "warning" | "success" | "danger" | "muted" {
  if (status === "pending") return "warning";
  if (status === "approved") return "success";
  if (status === "declined") return "danger";
  return "muted";
}

async function loadWorkshops(institutionId: string) {
  return prisma.workshop.findMany({
    where: { institutionId },
    include: {
      registrations: {
        include: {
          student: { include: { person: true } },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function workshopNavCounts(institutionId: string) {
  const [registrations, workshops] = await Promise.all([
    prisma.workshopRegistration.findMany({
      where: { institutionId },
      select: { status: true },
    }),
    prisma.workshop.findMany({
      where: { institutionId },
      select: { status: true },
    }),
  ]);
  const pending = registrations.filter((r) => normalizeEnrolmentStatus(r.status) === "pending").length;
  const approved = registrations.filter((r) => normalizeEnrolmentStatus(r.status) === "approved").length;
  const declined = registrations.filter((r) => normalizeEnrolmentStatus(r.status) === "declined").length;
  const available = workshops.filter((w) => w.status === "upcoming" || w.status === "active").length;
  const completed = workshops.filter((w) => w.status === "completed").length;
  return { pending, approved, declined, available, completed };
}

function workshopOptions(workshops: Array<{ id: string; title: string; code: string }>) {
  return [
    { label: "All Workshops", value: "" },
    ...workshops.map((w) => ({ label: `${w.code} — ${w.title}`, value: w.id })),
  ];
}

function seatsTaken(workshop: WorkshopWithRegs) {
  return workshop.registrations.filter((r) => SEAT_STATUSES.has(r.status)).length;
}

export async function buildWorkshopList(institutionId: string, path: string): Promise<InstructorLivePayload> {
  const list = parseWorkshopListKind(path);
  const workshops = await loadWorkshops(institutionId);
  const available = workshops.filter((w) => w.status === "upcoming" || w.status === "active");
  const completed = workshops.filter((w) => w.status === "completed");
  const mine = workshops;
  const rows = list === "available" ? available : list === "completed" ? completed : mine;
  const title =
    list === "available" ? "Available Workshops" : list === "completed" ? "Completed Workshops" : "My Workshops";
  const cards = rows.map((w) => {
    const taken = seatsTaken(w);
    return {
      tag: w.status.toUpperCase(),
      org: "Heritage Community College",
      seats: `${Math.max(0, w.capacity - taken)} seats`,
      title: w.title,
      description: w.description || w.code,
      when: w.startsAt.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }),
      where: w.location || "TBA",
      href: `/instructor/f/t24-workshop-detail?workshopId=${encodeURIComponent(w.id)}`,
    };
  });
  return {
    title,
    subtitle: `${rows.length} workshop(s)`,
    breadcrumbs: ["Home", title],
    workshops: {
      tabs: [
        `My Workshops (${mine.length})`,
        `Available Workshops (${available.length})`,
        `Completed Workshops (${completed.length})`,
      ],
      activeTab:
        list === "available"
          ? `Available Workshops (${available.length})`
          : list === "completed"
            ? `Completed Workshops (${completed.length})`
            : `My Workshops (${mine.length})`,
      credits: "",
      cards,
      registrations: mine.slice(0, 8).map((w) => ({
        title: w.title,
        when: w.startsAt.toLocaleDateString("en-CA"),
      })),
    },
  };
}

export async function buildWorkshopDetail(institutionId: string, path: string): Promise<InstructorLivePayload> {
  const workshopId = pathQuery(path).get("workshopId");
  const workshops = await loadWorkshops(institutionId);
  const workshop = workshops.find((w) => w.id === workshopId) || workshops[0];
  if (!workshop) {
    return {
      title: "Workshop Detail",
      subtitle: "No workshop selected",
      workshopDetail: {
        title: "Workshop",
        status: "Unavailable",
        when: "—",
        where: "—",
        seats: "—",
        description: "No workshops are available yet.",
        agenda: [],
        materials: [],
      },
    };
  }
  const taken = seatsTaken(workshop);
  return {
    title: workshop.title,
    subtitle: workshop.code,
    breadcrumbs: ["Home", "Workshops", workshop.title],
    workshopDetail: {
      title: workshop.title,
      status: workshop.status === "completed" ? "Completed" : "Open for Enrollment",
      when: workshop.startsAt.toLocaleString("en-CA", { dateStyle: "long", timeStyle: "short" }),
      where: workshop.location || "TBA",
      seats: `${Math.max(0, workshop.capacity - taken)} of ${workshop.capacity} seats remaining`,
      description: workshop.description || workshop.title,
      agenda: ["Welcome and outcomes", "Facilitated session", "Practice activity", "Close and next steps"],
      materials: [{ label: `${workshop.code} outline`, meta: "PDF" }],
    },
  };
}

export async function buildWorkshopEnrolments(institutionId: string, path: string): Promise<InstructorLivePayload> {
  const q = pathQuery(path);
  const statusFilter = parseEnrolmentStatusFilter(path);
  const studentQ = (q.get("student") || "").trim().toLowerCase();
  const workshopId = q.get("workshop") || "";
  const letter = (q.get("letter") || "ALL").trim().toUpperCase();
  const workshops = await loadWorkshops(institutionId);
  const rows = workshops.flatMap((w) =>
    w.registrations.map((r) => {
      const status = normalizeEnrolmentStatus(r.status);
      const family = r.student.person.familyName;
      const given = r.student.person.givenName;
      const name = `${family}, ${given}`;
      const login = r.student.person.email.split("@")[0] || "";
      return {
        id: r.id,
        studentId: r.student.id,
        studentNumber: r.student.studentNumber,
        login,
        name,
        familyName: family,
        givenName: given,
        workshopId: w.id,
        workshopTitle: w.title,
        workshopCode: w.code,
        status,
        statusLabel: statusLabel(status),
        enrolledOn: r.createdAt.toISOString().slice(0, 10),
        note: r.note || "",
      };
    }),
  );
  const filtered = rows.filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (workshopId && row.workshopId !== workshopId) return false;
    if (letter && letter !== "ALL" && !row.familyName.toUpperCase().startsWith(letter)) return false;
    if (studentQ) {
      const hay = `${row.studentNumber} ${row.login} ${row.familyName} ${row.givenName} ${row.name}`.toLowerCase();
      if (!hay.includes(studentQ)) return false;
    }
    return true;
  });
  filtered.sort((a, b) => a.familyName.localeCompare(b.familyName) || a.givenName.localeCompare(b.givenName));
  return {
    title: "WORKSHOP ENROLMENTS",
    subtitle: statusFilter === "all" ? "All statuses" : statusLabel(statusFilter),
    breadcrumbs: ["Home", "Workshop Enrolments"],
    workshopEnrolments: {
      studentPlaceholder: "Student #, login or last name",
      studentValue: q.get("student") || "",
      workshopValue: workshopId,
      workshopOptions: workshopOptions(workshops),
      statusValue: statusFilter === "all" ? "all" : statusFilter,
      statusOptions: [
        { label: "All Statuses", value: "all" },
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Declined", value: "declined" },
        { label: "Dropped", value: "dropped" },
      ],
      letter,
      searchLabel: "Search Workshops",
      emptyMessage: "No workshop enrolments were found.",
      rows: filtered.map((row) => ({
        id: row.id,
        studentName: row.name,
        studentNumber: row.studentNumber,
        workshop: `${row.workshopCode} — ${row.workshopTitle}`,
        status: row.statusLabel,
        statusTone: statusTone(row.status),
        enrolledOn: row.enrolledOn,
        note: row.note,
      })),
    },
  };
}

export async function buildWorkshopAttendance(institutionId: string, path: string): Promise<InstructorLivePayload> {
  const q = pathQuery(path);
  const date = parseYmd(q.get("date"));
  const studentQ = (q.get("student") || "").trim().toLowerCase();
  const workshopId = q.get("workshop") || "";
  const workshops = await loadWorkshops(institutionId);
  const matchingWorkshops = workshops.filter((w) => {
    if (workshopId && w.id !== workshopId) return false;
    return ymd(w.startsAt) === date || Boolean(workshopId);
  });
  const saved = matchingWorkshops.length
    ? await prisma.workshopAttendance.findMany({
        where: {
          institutionId,
          attendedOn: date,
          workshopId: { in: matchingWorkshops.map((w) => w.id) },
        },
      })
    : [];
  const savedByKey = new Map(saved.map((s) => [`${s.workshopId}:${s.studentId}`, s]));
  const students = matchingWorkshops.flatMap((w) =>
    w.registrations
      .filter((r) => normalizeEnrolmentStatus(r.status) === "approved")
      .map((r) => {
        const mark = savedByKey.get(`${w.id}:${r.student.id}`);
        const family = r.student.person.familyName;
        const given = r.student.person.givenName;
        return {
          id: `${w.id}:${r.student.id}`,
          studentId: r.student.id,
          workshopId: w.id,
          workshopTitle: w.title,
          name: `${given} ${family}`,
          studentNumber: r.student.studentNumber,
          familyName: family,
          status: (mark?.status === "absent" ? "Absent" : "Present") as "Present" | "Absent",
          note: mark?.note || "",
          avatar: "",
        };
      }),
  );
  const filtered = students.filter((s) => {
    if (!studentQ) return true;
    const hay = `${s.studentNumber} ${s.familyName} ${s.name}`.toLowerCase();
    return hay.includes(studentQ);
  });
  const prev = shiftYmd(date, -1);
  const next = shiftYmd(date, 1);
  return {
    title: "WORKSHOP ATTENDANCE",
    subtitle: formatAttendanceHeading(date),
    breadcrumbs: ["Home", "Workshop Attendance"],
    workshopAttendance: {
      date,
      studentPlaceholder: "Student # or last name",
      studentValue: q.get("student") || "",
      workshopValue: workshopId,
      workshopOptions: workshopOptions(workshops),
      loadLabel: "Load Attendance",
      heading: formatAttendanceHeading(date),
      previousLabel: `« ${formatShortDate(prev)}`,
      previousDate: prev,
      nextLabel: `${formatShortDate(next)} »`,
      nextDate: next,
      emptyMessage: "No students were found. Please change the filters above to see other possibilities.",
      totalLabel: `Total Students: ${filtered.length}`,
      saveLabel: "Save Attendance",
      weekDates: Array.from({ length: 7 }, (_, i) => {
        const start = new Date(`${date}T12:00:00`);
        const sunday = new Date(start);
        sunday.setDate(start.getDate() - start.getDay());
        const day = new Date(sunday);
        day.setDate(sunday.getDate() + i);
        const value = ymd(day);
        return {
          value,
          label: `${WEEKDAYS[i]} ${MONTHS[day.getMonth()]} ${day.getDate()}`,
          active: value === date,
        };
      }),
      students: filtered,
    },
  };
}

export async function buildNewWorkshopEnrolmentForm(institutionId: string): Promise<InstructorLivePayload> {
  const workshops = await prisma.workshop.findMany({
    where: { institutionId, status: { in: ["upcoming", "active"] } },
    orderBy: { startsAt: "asc" },
  });
  return {
    title: "NEW WORKSHOP ENROLMENT",
    subtitle: "Register a student into a workshop offering",
    breadcrumbs: ["Home", "Workshop Enrolments", "New Workshop Enrolment"],
    form: {
      submitLabel: "Save Enrolment",
      groups: [
        {
          title: "Student",
          fields: [
            {
              label: "Student",
              value: "",
              type: "text",
              hint: "Student #, login or last name",
            },
          ],
        },
        {
          title: "Workshop",
          fields: [
            {
              label: "Workshop",
              value: workshops[0]?.id || "",
              type: "select",
              options: workshops.length
                ? workshops.map((w) => ({ label: `${w.code} — ${w.title}`, value: w.id }))
                : [{ label: "No open workshops", value: "" }],
            },
            {
              label: "Status",
              value: "pending",
              type: "select",
              options: [
                { label: "Pending", value: "pending" },
                { label: "Approved", value: "approved" },
                { label: "Declined", value: "declined" },
                { label: "Dropped", value: "dropped" },
              ],
            },
            {
              label: "Note",
              value: "",
              type: "textarea",
              optional: true,
            },
          ],
        },
      ],
    },
  };
}

async function findStudentForEnrolment(institutionId: string, raw: string) {
  const q = raw.trim();
  if (!q) return null;
  const byNumber = await prisma.student.findFirst({
    where: { institutionId, studentNumber: { equals: q, mode: "insensitive" } },
    include: { person: true },
  });
  if (byNumber) return byNumber;
  const lowered = q.toLowerCase();
  const candidates = await prisma.student.findMany({
    where: { institutionId },
    include: { person: true },
    take: 200,
  });
  return (
    candidates.find((s) => s.person.email.toLowerCase() === lowered) ||
    candidates.find((s) => s.person.email.split("@")[0]?.toLowerCase() === lowered) ||
    candidates.find((s) => s.person.familyName.toLowerCase() === lowered) ||
    candidates.find((s) => `${s.person.givenName} ${s.person.familyName}`.toLowerCase() === lowered) ||
    candidates.find((s) => s.person.familyName.toLowerCase().startsWith(lowered)) ||
    null
  );
}

export async function saveWorkshopEnrolment(
  institutionId: string,
  fields: Record<string, string>,
): Promise<{ ok: boolean; message: string }> {
  const studentRaw = (fields.Student || fields["Student #, login or last name"] || "").trim();
  const workshopId = (fields.Workshop || "").trim();
  const status = normalizeEnrolmentStatus(fields.Status || "pending");
  const note = (fields.Note || "").trim();
  if (!studentRaw) return { ok: false, message: "Enter a student #, login or last name." };
  if (!workshopId) return { ok: false, message: "Select a workshop." };
  const workshop = await prisma.workshop.findFirst({ where: { id: workshopId, institutionId } });
  if (!workshop) return { ok: false, message: "Workshop not found." };
  const student = await findStudentForEnrolment(institutionId, studentRaw);
  if (!student) return { ok: false, message: `No student matched “${studentRaw}”.` };
  await prisma.workshopRegistration.upsert({
    where: { workshopId_studentId: { workshopId, studentId: student.id } },
    create: {
      id: randomUUID(),
      institutionId,
      workshopId,
      studentId: student.id,
      status,
      note,
    },
    update: { status, note },
  });
  return {
    ok: true,
    message: `Enrolment ${status} · ${student.person.familyName}, ${student.person.givenName} · ${workshop.title}`,
  };
}

export async function updateWorkshopEnrolmentStatus(
  institutionId: string,
  registrationId: string,
  status: WorkshopEnrolmentStatus,
) {
  const row = await prisma.workshopRegistration.findFirst({
    where: { id: registrationId, institutionId },
    include: { student: { include: { person: true } }, workshop: true },
  });
  if (!row) return { ok: false, message: "Enrolment not found." };
  await prisma.workshopRegistration.update({ where: { id: row.id }, data: { status } });
  return {
    ok: true,
    message: `${statusLabel(status)} · ${row.student.person.familyName}, ${row.student.person.givenName}`,
  };
}

export async function saveWorkshopAttendance(
  institutionId: string,
  date: string,
  roster: Array<{ studentId: string; workshopId: string; status: string; note?: string }>,
) {
  const attendedOn = parseYmd(date);
  for (const row of roster) {
    if (!row.studentId || !row.workshopId) continue;
    const status = /absent/i.test(row.status) ? "absent" : "present";
    await prisma.workshopAttendance.upsert({
      where: {
        workshopId_studentId_attendedOn: {
          workshopId: row.workshopId,
          studentId: row.studentId,
          attendedOn,
        },
      },
      create: {
        id: randomUUID(),
        institutionId,
        workshopId: row.workshopId,
        studentId: row.studentId,
        attendedOn,
        status,
        note: row.note || "",
      },
      update: { status, note: row.note || "" },
    });
  }
  return { ok: true, message: `Attendance saved for ${attendedOn} · ${roster.length} student(s)` };
}

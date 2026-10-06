import type { AdminNavChild, AdminNavItem } from "./adminNav";
import type { ModuleGate } from "./access";

/** Screens built earlier as dedicated pages; sidebar links go straight to them. */
export const HERITAGE_DEDICATED: Record<string, string> = {
  G04: "/admin/student-search",
  P01: "/admin/faculty-profile/biography",
  P04: "/admin/faculty-profile/topics",
  P05: "/admin/faculty-profile/availability",
  P08: "/admin/faculty-profile/compensation",
  P09: "/admin/faculty-profile/schedule",
  P10: "/admin/account/accomplishments",
  P11: "/admin/account/security",
  P12: "/admin/account/timezone",
  U01: "/admin/user-management/new",
  U02: "/admin/user-management",
  U03: "/admin/access-levels",
  RP01: "/admin/reporting/run",
  RP02: "/admin/reporting/templates",
  RP03: "/admin/reporting/templates/categories/new",
  RP04: "/admin/reporting/scheduled",
  L01: "/admin/location/brands",
  L08: "/admin/location/regions",
  L09: "/admin/location/provinces",
  L10: "/admin/location/campuses",
  L14: "/admin/location/ministries",
  L15: "/admin/location/institutions",
  C17: "/admin/workshops/manage",
  C23: "/admin/workshop-roles",
  SC01: "/admin/sysconfig/workflows",
  SC02: "/admin/sysconfig/assessments",
  SC03: "/admin/sysconfig/assessment-categories",
  SC04: "/admin/sysconfig/advisor-linking",
  SC05: "/admin/sysconfig/document-types",
  SC06: "/admin/sysconfig/flag-templates",
  SC07: "/admin/sysconfig/user-agreements",
  SC08: "/admin/sysconfig/agent-statuses",
  SC09: "/admin/sysconfig/student-statuses",
  SC10: "/admin/sysconfig/document-templates",
  SC13: "/admin/sysconfig/correspondence",
  SC14: "/admin/sysconfig/forms",
  SC15: "/admin/sysconfig/sections",
  SC17: "/admin/sysconfig/global-settings",
  SC18: "/admin/sysconfig/plugins",
  SC19: "/admin/sysconfig/reason-codes",
  SC20: "/admin/sysconfig/holidays",
  SC21: "/admin/sysconfig/email",
  SC24: "/admin/sysconfig/security",
  SC31: "/admin/sysconfig/localization",
  SC36: "/admin/sysconfig/notification-templates",
};

export function heritageHref(screen: string, query?: Record<string, string>) {
  const qs = query ? new URLSearchParams(query).toString() : "";
  return `/admin/heritage/${screen.toLowerCase()}${qs ? `?${qs}` : ""}`;
}

export function requestsHref(type: string) {
  return `/admin/requests?${new URLSearchParams({ "f.type": type }).toString()}`;
}

export function workshopEnrolmentsHref(status: string) {
  return `/admin/workshops/enrolments?${new URLSearchParams({ "f.status": status }).toString()}`;
}

type Entry = {
  label: string;
  screen: string;
  section?: string;
  indent?: boolean;
  query?: Record<string, string>;
  dedicated?: boolean;
  href?: string;
  count?: string;
};

const req = (label: string, type: string): Entry => ({ label, screen: "R01", href: requestsHref(type), count: `requests:${type}` });

const st = (label: string, indent = false): Entry => ({
  label,
  screen: "S01",
  section: "STUDENTS BY STATUS",
  indent,
  query: { "f.status": label },
});

const ROOTS: Array<{ label: string; icon: string; gate?: ModuleGate; count?: string; entries: Entry[] }> = [
  {
    label: "My Profile / Settings",
    icon: "user",
    entries: [
      { label: "Manage My Profile", screen: "P01", dedicated: true },
      { label: "Accomplishments", screen: "P10", dedicated: true },
      { label: "Security Settings", screen: "P11", dedicated: true },
      { label: "Change Time Zone", screen: "P12", dedicated: true },
    ],
  },
  {
    label: "My Courses",
    icon: "book",
    gate: { modules: ["courseManagement"] },
    entries: [
      { label: "All My Courses / Schedule", screen: "MC01" },
      { label: "Course Attendance", screen: "MC02" },
      { label: "Course Repository", screen: "MC03" },
      { label: "Pending Course Schedules", screen: "MC04" },
      { label: "Grades Submission", screen: "MC05" },
      { label: "Course History", screen: "MC06" },
    ],
  },
  {
    label: "Workshops",
    icon: "briefcase",
    gate: { modules: ["courseManagement"] },
    entries: [
      { label: "Pending", screen: "W01", section: "ENROLMENTS", href: workshopEnrolmentsHref("Pending"), count: "workshops:pending" },
      { label: "Approved", screen: "W01", section: "ENROLMENTS", href: workshopEnrolmentsHref("Approved"), count: "workshops:approved" },
      { label: "Declined", screen: "W01", section: "ENROLMENTS", href: workshopEnrolmentsHref("Declined"), count: "workshops:declined" },
      { label: "My Workshops", screen: "W02", section: "MISCELLANEOUS", href: "/admin/workshops/mine" },
      { label: "Available Workshops", screen: "W02", section: "MISCELLANEOUS", href: "/admin/workshops/available", count: "workshops:available" },
      { label: "Completed Workshops", screen: "W02", section: "MISCELLANEOUS", href: "/admin/workshops/completed", count: "workshops:completed" },
      { label: "Workshop Attendance", screen: "W03", section: "MISCELLANEOUS", href: "/admin/workshops/attendance" },
      { label: "New Workshop Enrolment", screen: "W04", section: "MISCELLANEOUS", href: "/admin/workshops/enrol" },
    ],
  },
  {
    label: "Students",
    icon: "school",
    gate: { modules: ["studentRecords"] },
    entries: [
      st("New Inquiry"),
      st("Approved Application"),
      st("Pre-enrolment Application"),
      st("CLOA", true),
      st("LOA", true),
      st("Cancelled / Did not proceed", true),
      st("Follow Up", true),
      st("In-active Leads", true),
      st("Duplicate profiles", true),
      st("Declined Application"),
      st("Registered Student"),
      st("Active Student"),
      st("On-Hold", true),
      st("Leave of Absence", true),
      st("Graduated"),
      st("Incomplete"),
      st("Withdrawn Students"),
      st("Dismissed"),
      st("Refused Visa"),
      st("File not Logged (Offshore student)"),
      st("Prospective Student (Marketing team)"),
      { label: "Browse All Students", screen: "S01", section: "STUDENT MANAGEMENT" },
      { label: "Create Student Profile", screen: "S02", section: "STUDENT MANAGEMENT" },
      { label: "Academic Alerts", screen: "S23", section: "STUDENT MANAGEMENT" },
      { label: "Student Flags", screen: "S24", section: "STUDENT MANAGEMENT" },
      { label: "Student Assessments", screen: "S25", section: "STUDENT MANAGEMENT" },
      { label: "Student Requirements", screen: "S26", section: "STUDENT MANAGEMENT" },
      { label: "Leave of Absence", screen: "S27", section: "STUDENT MANAGEMENT" },
      { label: "Course Withdraw Requests", screen: "S28", section: "STUDENT MANAGEMENT" },
      { label: "Pending Grade Submissions", screen: "S29", section: "STUDENT MANAGEMENT" },
      { label: "Pending Transcript Changes", screen: "S30", section: "STUDENT MANAGEMENT" },
      { label: "Pending Entry / Progress Marks", screen: "S31", section: "STUDENT MANAGEMENT" },
      { label: "Badges / Accomplishments", screen: "S32", section: "STUDENT MANAGEMENT" },
      { label: "Documents / Exports", screen: "S33", section: "STUDENT MANAGEMENT" },
      { label: "Bulk / Group Actions", screen: "S34", section: "STUDENT MANAGEMENT" },
    ],
  },
  {
    label: "Requests",
    icon: "bell",
    gate: { modules: ["userRequests"] },
    count: "requests",
    entries: [
      req("Student Requests", "Student Requests"),
      req("Incidents / Disputes", "Incidents / Disputes"),
      req("General Requests", "General Requests"),
      req("Profile Change Requests", "Profile Changes"),
      req("E-mail Change Requests", "E-mail Changes"),
    ],
  },
  {
    label: "Financial Management",
    icon: "pie",
    gate: { modules: ["financialManagement"] },
    entries: [
      ...(
        [
          ["Transactions", "F01"],
          ["Tuition & Fees", "F02"],
          ["Manage Invoices", "F03"],
          ["Credits & Disbursements", "F04"],
          ["Promotions & Awards", "F05"],
          ["Adjustments", "F06"],
          ["Agent Commissions & Bonuses", "F07"],
          ["Payment Plans", "F08"],
          ["Documents / Tax Forms", "F09"],
          ["Unallocated Funds", "F10"],
          ["Financial Alerts", "F11"],
        ] as const
      ).map(([label, screen]) => ({ label, screen, section: "RECORDS MANAGEMENT" })),
      ...(
        [
          ["Period Lock-Out", "F12"],
          ["Tuition / Ledger Types", "F13"],
          ["Payment Methods", "F14"],
          ["Rate Categories", "F15"],
          ["Payment Plan Templates", "F16"],
          ["Manage Tax Rates", "F17"],
          ["Disbursement Types", "F18"],
          ["Manage Promotions", "F19"],
          ["Funding Sources", "F20"],
          ["Collection Agencies", "F21"],
        ] as const
      ).map(([label, screen]) => ({ label, screen, section: "CONFIGURATIONS" })),
    ],
  },
  {
    label: "Program Management",
    icon: "award",
    gate: { modules: ["programManagement"] },
    entries: [
      { label: "Faculties & Programs", screen: "PR01", href: "/admin/program-management/faculties" },
      { label: "Program Types", screen: "PR13", href: "/admin/program-management/program-types" },
      { label: "Manage Terms", screen: "PR14", href: "/admin/program-management/terms" },
      { label: "Academic Calendars", screen: "PR16", href: "/admin/program-management/calendars" },
      { label: "Master Scheduling", screen: "PR17", href: "/admin/program-management/scheduling" },
    ],
  },
  {
    label: "Course Management",
    icon: "list",
    gate: { modules: ["courseManagement"] },
    entries: [
      ...(
        [
          ["Courses & Sessions", "C01"],
          ["Pending Sessions", "C09"],
          ["Active Courses", "C10"],
          ["Course Repository", "C11"],
          ["Course Backups", "C14"],
          ["Course Textbooks", "C15"],
          ["Entry & Progress Tests", "C16"],
          ["Workshops", "C17"],
        ] as const
      ).map(([label, screen]) => ({ label, screen, section: "COURSE MANAGEMENT", dedicated: screen === "C17" })),
      ...(
        [
          ["Course Categories", "C19"],
          ["Course Groups", "C20"],
          ["Course Types", "C21"],
          ["Course Resources", "C22"],
          ["Workshop Roles", "C23"],
          ["Badges & Accomplishments", "C24"],
          ["Competencies", "C25"],
          ["Grading Schemes", "C26"],
        ] as const
      ).map(([label, screen]) => ({ label, screen, section: "COURSE CONFIGURATIONS", dedicated: screen === "C23" })),
      ...(
        [
          ["Manage Evaluations", "C27"],
          ["Question Bank", "C28"],
          ["Assigned / Results", "C30"],
        ] as const
      ).map(([label, screen]) => ({ label, screen, section: "COURSE EVALUATIONS" })),
    ],
  },
  {
    label: "Reporting",
    icon: "bar-chart",
    gate: { modules: ["reporting"] },
    entries: [
      { label: "Run Reports", screen: "RP01", dedicated: true },
      { label: "Scheduled Reports", screen: "RP04", dedicated: true },
      { label: "Report Templates", screen: "RP02", dedicated: true },
    ],
  },
  {
    label: "Location Management",
    icon: "calendar",
    gate: { modules: ["locationManagement"] },
    entries: [
      { label: "Brands", screen: "L01", dedicated: true },
      { label: "Regions", screen: "L08", dedicated: true },
      { label: "Provinces & States", screen: "L09", dedicated: true },
      { label: "Campuses & Classrooms", screen: "L10", dedicated: true },
      { label: "Ministries", screen: "L14", dedicated: true },
      { label: "External & Transfer Institutions", screen: "L15", dedicated: true },
    ],
  },
  {
    label: "User Management",
    icon: "users",
    gate: { modules: ["userManagement"] },
    entries: [
      { label: "Create New User", screen: "U01", dedicated: true },
      { label: "User Directory & Profiles", screen: "U02", dedicated: true },
      { label: "Access Levels", screen: "U03", dedicated: true },
    ],
  },
  {
    label: "System Configuration",
    icon: "settings",
    gate: { modules: ["systemConfiguration"] },
    entries: [
      ...(
        [
          ["Requirements & Workflows", "SC01"],
          ["Assessments Management", "SC02"],
          ["Assessment Categories", "SC03"],
          ["Advisor Linking", "SC04"],
          ["Workflow Document Types", "SC05"],
          ["Flag & Hold Templates", "SC06"],
          ["User Agreements", "SC07"],
          ["Agent Statuses", "SC08"],
          ["Student Statuses", "SC09"],
        ] as const
      ).map(([label, screen]) => ({ label, screen, section: "WORKFLOWS & STATUSES", dedicated: true })),
      ...(
        [
          ["Document Templates", "SC10"],
          ["Notification Templates", "SC36"],
          ["Correspondence Types", "SC13"],
          ["Form Management", "SC14"],
          ["Manage Sections / Intranets", "SC15"],
        ] as const
      ).map(([label, screen]) => ({ label, screen, section: "COMMUNICATION & CONTENT", dedicated: true })),
      ...(
        [
          ["Global Settings", "SC17"],
          ["Manage Plug-ins", "SC18"],
          ["Reason Codes", "SC19"],
          ["Holidays & Closures", "SC20"],
          ["E-mail System Management", "SC21"],
          ["Security Management", "SC24"],
          ["Localization Configuration", "SC31"],
        ] as const
      ).map(([label, screen]) => ({ label, screen, section: "GLOBAL CONFIGURATIONS", dedicated: true })),
    ],
  },
];

export const HERITAGE_SIDEBAR: AdminNavItem[] = ROOTS.map((root) => {
  const children: AdminNavChild[] = root.entries.map((e) => ({
    label: e.label,
    href: e.href ?? (e.dedicated && HERITAGE_DEDICATED[e.screen] ? HERITAGE_DEDICATED[e.screen] : heritageHref(e.screen, e.query)),
    ...(e.section ? { section: e.section } : {}),
    ...(e.indent ? { indent: true } : {}),
    ...(e.count ? { count: e.count } : {}),
  }));
  return {
    label: root.label,
    href: children[0]?.href ?? "/admin/heritage",
    icon: root.icon,
    children,
    ...(root.gate ? { gate: root.gate } : {}),
    ...(root.count ? { count: root.count } : {}),
  };
});

/* ------------------------------------------------------------------ */
/* Flow groups → related-screen tabs on every Heritage screen.          */
/* ------------------------------------------------------------------ */

export type FlowGroup = { title: string; context?: string; sections: Array<{ title: string; screens: string[] }> };

const range = (prefix: string, from: number, to: number, pad = 2) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${String(from + i).padStart(pad, "0")}`);

export const FLOW_GROUPS: FlowGroup[] = [
  { title: "Dashboard", sections: [{ title: "Global", screens: range("G", 1, 4) }] },
  {
    title: "My Profile / Settings",
    sections: [
      { title: "Manage My Profile", screens: range("P", 1, 9) },
      { title: "Account", screens: ["P10", "P11", "P12"] },
    ],
  },
  { title: "My Courses", sections: [{ title: "My Courses", screens: range("MC", 1, 6) }] },
  { title: "Workshops", sections: [{ title: "Workshops", screens: range("W", 1, 4) }] },
  {
    title: "Student Management",
    sections: [
      { title: "Directories", screens: ["S01", "S02"] },
      { title: "Work queues", screens: range("S", 23, 33) },
      { title: "Bulk", screens: ["S34"] },
    ],
  },
  {
    title: "Student Profile",
    context: "student",
    sections: [
      { title: "Status & Profile", screens: ["S03", "S04", "S05", "S06", "S07", "S08", "S09"] },
      { title: "Communication & Workflows", screens: range("S", 10, 18) },
      { title: "Grades & Transcript", screens: ["S19", "S20"] },
      { title: "Program Plan", screens: ["S21", "S22"] },
      { title: "Finance", screens: range("SF", 1, 10) },
    ],
  },
  { title: "Requests", sections: [{ title: "Requests", screens: range("R", 1, 4) }] },
  {
    title: "Financial Management",
    sections: [
      { title: "Records Management", screens: range("F", 1, 11) },
      { title: "Configurations", screens: range("F", 12, 21) },
    ],
  },
  {
    title: "Program Management",
    sections: [
      { title: "Faculties & Programs", screens: ["PR01", "PR02", "PR13"] },
      { title: "Program configuration", screens: range("PR", 3, 12) },
      { title: "Terms", screens: ["PR14", "PR15"] },
      { title: "Academic Calendar", screens: ["PR16"] },
      { title: "Master Scheduling", screens: range("PR", 17, 20) },
    ],
  },
  {
    title: "Course Management",
    sections: [
      { title: "Courses & Sessions", screens: range("C", 1, 8) },
      { title: "Course Management", screens: range("C", 9, 18) },
      { title: "Course Configurations", screens: range("C", 19, 26) },
      { title: "Course Evaluations", screens: range("C", 27, 30) },
    ],
  },
  {
    title: "Course Delivery (LMS)",
    context: "course",
    sections: [
      { title: "Course delivery", screens: range("LM", 1, 18) },
      { title: "Activities & Resources", screens: range("A", 1, 27) },
    ],
  },
  { title: "Reporting", sections: [{ title: "Reporting", screens: range("RP", 1, 4) }] },
  {
    title: "Location Management",
    sections: [
      { title: "Brands", screens: range("L", 1, 7) },
      { title: "Regions & Provinces", screens: ["L08", "L09"] },
      { title: "Campuses & Classrooms", screens: range("L", 10, 13) },
      { title: "Ministries", screens: ["L14"] },
      { title: "External & Transfer Institutions", screens: range("L", 15, 19) },
    ],
  },
  { title: "User Management", sections: [{ title: "User Management", screens: range("U", 1, 3) }] },
  {
    title: "System Configuration",
    sections: [
      { title: "Workflows & Statuses", screens: range("SC", 1, 9) },
      { title: "Communication & Content", screens: [...range("SC", 10, 16), "SC36"] },
      { title: "Global Configurations", screens: range("SC", 17, 20) },
      { title: "E-mail System Management", screens: range("SC", 21, 23) },
      { title: "Security Management", screens: [...range("SC", 24, 30), "SC35"] },
      { title: "Localization Configuration", screens: range("SC", 31, 34) },
    ],
  },
];

export function flowGroupFor(screenId: string) {
  return FLOW_GROUPS.find((g) => g.sections.some((s) => s.screens.includes(screenId)));
}

/* ------------------------------------------------------------------ */
/* Buttons that open the next screen in the captured flow.              */
/* ------------------------------------------------------------------ */

const ACTION_LINKS: Array<[RegExp, string, string[]?]> = [
  [/^add fee$/i, "SF02"],
  [/^issue refund$/i, "SF04", ["SF03", "F02"]],
  [/receipt/i, "SF05", ["SF03", "F01"]],
  [/^create invoice$/i, "SF06"],
  [/^create disbursement$/i, "SF07"],
  [/^add (promotion|award|promotion \/ award)$/i, "SF08", ["SF01", "F05"]],
  [/^create payment plan$/i, "SF09"],
  [/send notification/i, "S11", ["S10"]],
  [/generate document/i, "S12", ["S10"]],
  [/generate transcript/i, "S20", ["S19"]],
  [/^add record$/i, "S13"],
  [/^add requirement$/i, "S17"],
  [/change status/i, "S08", ["S03", "S04", "S06", "S07"]],
  [/new program profile/i, "S07", ["S03"]],
  [/^add flag/i, "S05"],
  [/^add entry|progress test/i, "S22", ["S21"]],
  [/^add program$/i, "PR02"],
  [/^add designation$/i, "PR03"],
  [/program pathway tab/i, "PR04"],
  [/fees & tuition price list tab/i, "PR07"],
  [/deadlines & penalties tab/i, "PR08"],
  [/commission rates tab/i, "PR09"],
  [/audit changes tab/i, "PR10"],
  [/^new pathway$/i, "PR06"],
  [/^create tier$/i, "PR11"],
  [/^create elective group$/i, "PR12"],
  [/^add (enrolment condition|deadline)$/i, "PR15", ["PR14"]],
  [/^create term schedule$/i, "PR18"],
  [/^add course$/i, "C02"],
  [/^create session|offering$/i, "C04"],
  [/^new template$/i, "C05"],
  [/^bulk actions$/i, "C08"],
  [/^view course$/i, "LM01"],
  [/^(grades|attendance)$/i, "LM08", ["C10"]],
  [/^create content course$/i, "C12"],
  [/^push/i, "C13", ["C11"]],
  [/^create workshop$/i, "C18"],
  [/^assign( evaluation)?$/i, "C29", ["C27"]],
  [/add an activity or resource/i, "LM17"],
  [/^(add item|create grading item)$/i, "LM09", ["LM08"]],
  [/^create group$/i, "LM14"],
  [/^(import|auto-create)/i, "LM15", ["LM14"]],
  [/^backup$/i, "LM05"],
  [/^restore$/i, "LM06", ["LM02", "LM05"]],
  [/^export$/i, "LM07", ["LM02"]],
  [/^permissions$/i, "LM04"],
  [/^create campus$/i, "L11"],
  [/^create classroom$/i, "L12"],
  [/^classroom types$/i, "L13"],
  [/^add transfer course$/i, "L19"],
  [/^create user$/i, "U01"],
  [/^create (\/ edit )?category$/i, "RP03", ["RP02"]],
  [/^continue$/i, "LM17", ["A26", "A27"]],
  [/audit history/i, "SC12", ["SC10"]],
  [/^(modules|inputs|fonts|naming elements)$/i, "SC11", ["SC10"]],
];

export function actionTarget(fromScreen: string, label: string): string | null {
  for (const [re, target, only] of ACTION_LINKS) {
    if (target === fromScreen) continue;
    if (only && !only.includes(fromScreen)) continue;
    if (re.test(label.trim())) return target;
  }
  return null;
}

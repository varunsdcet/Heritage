export type ShellRole = "applicant" | "student" | "instructor" | "admin" | "employer";

const STUDENT: Record<string, string> = {
  Home: "/student",
  Courses: "/student/courses",
  Assignments: "/student/assignments",
  Schedule: "/student/calendar",
  Calendar: "/student/calendar",
  Grades: "/student/grades",
  Services: "/student/advising",
  Fees: "/student/fees",
  Messages: "/student/messages",
  Search: "/student/search",
  Ask: "/student/ask",
  More: "/student/all",
  "All screens": "/student/all",
};

const INSTRUCTOR: Record<string, string> = {
  Home: "/instructor",
  Sections: "/instructor/sections",
  Gradebook: "/instructor/gradebook",
  Attendance: "/instructor/attendance",
  Messages: "/instructor/messages",
  Search: "/instructor/search",
  Ask: "/instructor/ask",
  Workshops: "/instructor/all",
  "All screens": "/instructor/all",
};

const ADMIN: Record<string, string> = {
  Home: "/admin",
  Overview: "/admin",
  Approvals: "/admin/approvals",
  "Approvals Inbox": "/admin/approvals",
  Analytics: "/admin/analytics",
  Users: "/admin/users/create",
  Search: "/admin/search",
  "Ask Heritage": "/admin/ai/ask",
  Integrations: "/admin/integrations",
  Settings: "/admin/settings",
  Recruit: "/admin/admissions",
  Academics: "/admin/courses",
  Students: "/admin/students",
  Compliance: "/admin/compliance",
  Platform: "/admin/platform",
  "All screens": "/admin/all",
};

const APPLICANT: Record<string, string> = {
  Home: "/applicant",
  Application: "/applicant/application",
  Documents: "/applicant/documents",
  Messages: "/applicant/messages",
  Offers: "/applicant/offers",
  Search: "/applicant/search",
  Ask: "/applicant/ask",
  "All screens": "/applicant/all",
};

const EMPLOYER: Record<string, string> = {
  Home: "/employer",
  Placements: "/employer/placements",
  Hours: "/employer/hours",
  Evaluations: "/employer/evaluations",
  Agreements: "/employer/agreements",
  Profile: "/employer/profile",
  Messages: "/employer/profile",
  Search: "/employer/search",
  Ask: "/employer/ask",
  "All screens": "/employer/all",
};

export const ROLE_NAV: Record<ShellRole, Record<string, string>> = {
  student: STUDENT,
  instructor: INSTRUCTOR,
  admin: ADMIN,
  applicant: APPLICANT,
  employer: EMPLOYER,
};

export function resolveNav(role: ShellRole, item: string): string | undefined {
  return ROLE_NAV[role][item];
}

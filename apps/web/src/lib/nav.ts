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
  More: "/student/all",
  "All screens": "/student/all",
};

const INSTRUCTOR: Record<string, string> = {
  Home: "/instructor",
  Sections: "/instructor/sections",
  Gradebook: "/instructor/gradebook",
  Attendance: "/instructor/attendance",
  Messages: "/instructor/messages",
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
  Application: "/applicant/application",
  Documents: "/applicant/documents",
  Messages: "/applicant/messages",
  Offers: "/applicant/offers",
};

const EMPLOYER: Record<string, string> = {
  Placements: "/employer/placements",
  Hours: "/employer/hours",
  Evaluations: "/employer/evaluations",
  Agreements: "/employer/agreements",
  Profile: "/employer/profile",
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

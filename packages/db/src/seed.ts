import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const INST = "11111111-1111-4111-8111-111111111111";
const ids = {
  marcusPerson: "22222222-2222-4222-8222-222222222201",
  priyaPerson: "22222222-2222-4222-8222-222222222202",
  danielPerson: "22222222-2222-4222-8222-222222222203",
  vancePerson: "22222222-2222-4222-8222-222222222204",
  pendeltonPerson: "22222222-2222-4222-8222-222222222205",
  adminPerson: "22222222-2222-4222-8222-222222222206",
  marcusAccount: "33333333-3333-4333-8333-333333333301",
  priyaAccount: "33333333-3333-4333-8333-333333333302",
  danielAccount: "33333333-3333-4333-8333-333333333303",
  vanceAccount: "33333333-3333-4333-8333-333333333304",
  pendeltonAccount: "33333333-3333-4333-8333-333333333305",
  adminAccount: "33333333-3333-4333-8333-333333333306",
  marcusStudent: "44444444-4444-4444-8444-444444444401",
  priyaStudent: "44444444-4444-4444-8444-444444444402",
  danielStudent: "44444444-4444-4444-8444-444444444403",
  term: "55555555-5555-4555-8555-555555555501",
  cs301: "66666666-6666-4666-8666-666666666601",
  acc201: "66666666-6666-4666-8666-666666666602",
  sectionCs: "77777777-7777-4777-8777-777777777701",
  sectionAcc: "77777777-7777-4777-8777-777777777702",
  enrolMarcusCs: "88888888-8888-4888-8888-888888888801",
  enrolMarcusAcc: "88888888-8888-4888-8888-888888888802",
  enrolPriya: "88888888-8888-4888-8888-888888888803",
  enrolDaniel: "88888888-8888-4888-8888-888888888804",
  asgMidterm: "99999999-9999-4999-8999-999999999901",
  asgProject: "99999999-9999-4999-8999-999999999902",
  asgAccHw: "99999999-9999-4999-8999-999999999903",
  gradeMarcusMid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01",
  gradeMarcusProj: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02",
  gradePriyaMid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03",
  gradeDanielMid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04",
  gradeMarcusAcc: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa05",
  thread1: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01",
  msg1: "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
  approval1: "dddddddd-dddd-4ddd-8ddd-dddddddddd01",
  // Expanded campus roster (real domain entities — no Figma fixtures)
  jordanPerson: "22222222-2222-4222-8222-222222222208",
  meiPerson: "22222222-2222-4222-8222-222222222209",
  lucasPerson: "22222222-2222-4222-8222-222222222210",
  fatimaPerson: "22222222-2222-4222-8222-222222222211",
  jordanAccount: "33333333-3333-4333-8333-333333333307",
  meiAccount: "33333333-3333-4333-8333-333333333308",
  lucasAccount: "33333333-3333-4333-8333-333333333309",
  fatimaAccount: "33333333-3333-4333-8333-333333333310",
  noraPerson: "22222222-2222-4222-8222-222222222212",
  samPerson: "22222222-2222-4222-8222-222222222213",
  noraAccount: "33333333-3333-4333-8333-333333333311",
  samAccount: "33333333-3333-4333-8333-333333333312",
  jordanStudent: "44444444-4444-4444-8444-444444444404",
  meiStudent: "44444444-4444-4444-8444-444444444405",
  lucasStudent: "44444444-4444-4444-8444-444444444406",
  fatimaStudent: "44444444-4444-4444-8444-444444444407",
  nurs400: "66666666-6666-4666-8666-666666666603",
  eng110: "66666666-6666-4666-8666-666666666604",
  sectionNurs: "77777777-7777-4777-8777-777777777703",
  sectionEng: "77777777-7777-4777-8777-777777777704",
  enrolMeiNurs: "88888888-8888-4888-8888-888888888805",
  enrolJordanCs: "88888888-8888-4888-8888-888888888806",
  enrolLucasAcc: "88888888-8888-4888-8888-888888888807",
  enrolFatimaNurs: "88888888-8888-4888-8888-888888888808",
  enrolPriyaNurs: "88888888-8888-4888-8888-888888888809",
  asgNursClinic: "99999999-9999-4999-8999-999999999904",
  asgEngEssay: "99999999-9999-4999-8999-999999999905",
  gradeMeiClinic: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa06",
  gradeJordanMid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa07",
  gradeLucasHw: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa08",
  gradeFatimaClinic: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa09",
  approval2: "dddddddd-dddd-4ddd-8ddd-dddddddddd02",
  submissionMarcusProject: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01",
  sessionCsOnline: "ffffffff-ffff-4fff-8fff-fffffffff001",
  sessionAccRoom: "ffffffff-ffff-4fff-8fff-fffffffff002",
  applicantPerson: "22222222-2222-4222-8222-222222222212",
  employerPerson: "22222222-2222-4222-8222-222222222213",
  applicantAccount: "33333333-3333-4333-8333-333333333311",
  employerAccount: "33333333-3333-4333-8333-333333333312",
  application1: "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a101",
  appDocPassport: "d0d0d0d0-d0d0-4d0d-8d0d-d0d0d0d0d001",
  appDocTranscript: "d0d0d0d0-d0d0-4d0d-8d0d-d0d0d0d0d002",
  appDocResume: "d0d0d0d0-d0d0-4d0d-8d0d-d0d0d0d0d003",
  appOffer1: "o0o0o0o0-o0o0-4o0o-8o0o-o0o0o0o0o001",
  employerOrg1: "e0e0e0e0-e0e0-4e0e-8e0e-e0e0e0e0e001",
  placement1: "p0p0p0p0-p0p0-4p0p-8p0p-p0p0p0p0p001",
  placement2: "p0p0p0p0-p0p0-4p0p-8p0p-p0p0p0p0p002",
  hours1: "h0h0h0h0-h0h0-4h0h-8h0h-h0h0h0h0h001",
  hours2: "h0h0h0h0-h0h0-4h0h-8h0h-h0h0h0h0h002",
  eval1: "v0v0v0v0-v0v0-4v0v-8v0v-v0v0v0v0v001",
  agreement1: "g0g0g0g0-g0g0-4g0g-8g0g-g0g0g0g0g001",
  programCs: "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b101",
  programVersionCs: "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b201",
  math210: "66666666-6666-4666-8666-666666666605",
  stat310: "66666666-6666-4666-8666-666666666606",
  data401: "66666666-6666-4666-8666-666666666607",
  cs201: "66666666-6666-4666-8666-666666666608",
  knowledgeDegree: "k0k0k0k0-k0k0-4k0k-8k0k-k0k0k0k0k001",
  knowledgeCalendar: "k0k0k0k0-k0k0-4k0k-8k0k-k0k0k0k0k002",
  knowledgeServices: "k0k0k0k0-k0k0-4k0k-8k0k-k0k0k0k0k003",
  knowledgeAdmissions: "k0k0k0k0-k0k0-4k0k-8k0k-k0k0k0k0k004",
  knowledgeNormalization: "k0k0k0k0-k0k0-4k0k-8k0k-k0k0k0k0k005",
  rubricCs: "r0r0r0r0-r0r0-4r0r-8r0r-r0r0r0r0r001",
  rubricCrit1: "r0r0r0r0-r0r0-4r0r-8r0r-r0r0r0r0r002",
  rubricCrit2: "r0r0r0r0-r0r0-4r0r-8r0r-r0r0r0r0r003",
  career1: "c0c0c0c0-c0c0-4c0c-8c0c-c0c0c0c0c001",
  offeringMath: "o1o1o1o1-o1o1-4o1o-8o1o-o1o1o1o1o101",
  transferMarcus: "t0t0t0t0-t0t0-4t0t-8t0t-t0t0t0t0t001",
};

type PortalSeed = {
  screenPath: string;
  role: string;
  primaryText: string;
  secondaryText?: string;
  metaText?: string;
  href?: string;
  sortOrder?: number;
  audienceAccountId?: string;
};

const PORTAL: PortalSeed[] = [
  // Student services
  { screenPath: "/student/fees", role: "student", primaryText: "Tuition Fall 2026", secondaryText: "Balance due", metaText: "CAD 2,450.00", href: "/student/fees", sortOrder: 1 },
  { screenPath: "/student/fees", role: "student", primaryText: "Lab fee CS301", secondaryText: "Paid Sep 2", metaText: "CAD 85.00", href: "/student/fees", sortOrder: 2 },
  { screenPath: "/student/documents", role: "student", primaryText: "Student ID card", secondaryText: "Digital wallet ready", metaText: "Active", href: "/student/documents", sortOrder: 1 },
  { screenPath: "/student/documents", role: "student", primaryText: "Unofficial transcript", secondaryText: "PDF available", metaText: "Download", href: "/student/documents", sortOrder: 2 },
  { screenPath: "/student/library", role: "student", primaryText: "Algorithms textbook", secondaryText: "Due in 12 days", metaText: "Checked out", href: "/student/library", sortOrder: 1 },
  { screenPath: "/student/library", role: "student", primaryText: "Library laptop loan", secondaryText: "Science Hall desk", metaText: "Available", href: "/student/library", sortOrder: 2 },
  { screenPath: "/student/advising", role: "student", primaryText: "Program check-in", secondaryText: "Advisor: Campus Success", metaText: "Booked", href: "/student/advising", sortOrder: 1 },
  { screenPath: "/student/holds", role: "student", primaryText: "No active holds", secondaryText: "Registration clear", metaText: "OK", href: "/student/holds", sortOrder: 1 },
  { screenPath: "/student/f/st-16-services", role: "student", primaryText: "Academic advising", secondaryText: "Program planning and registration support", metaText: "Available", href: "/student/advising", sortOrder: 1 },
  { screenPath: "/student/f/st-16-services", role: "student", primaryText: "Wellness and accessibility", secondaryText: "Confidential student support services", metaText: "Book", href: "/student/messages", sortOrder: 2 },
  { screenPath: "/student/f/st-17-practicum", role: "student", primaryText: "Practicum readiness", secondaryText: "Requirements and placement documents", metaText: "In progress", href: "/student/documents", sortOrder: 1 },
  { screenPath: "/student/f/st-19-credentials", role: "student", primaryText: "Computer Science diploma", secondaryText: "Credential progress follows your degree requirements", metaText: "In progress", href: "/student/degree", sortOrder: 1 },
  { screenPath: "/student/f/st-19-credentials", role: "student", primaryText: "Unofficial transcript", secondaryText: "Current academic record", metaText: "Available", href: "/student/documents", sortOrder: 2 },
  { screenPath: "/student/f/st-20-career", role: "student", primaryText: "Career coaching", secondaryText: "Resume, interview, and job-search support", metaText: "Book", href: "/student/messages", sortOrder: 1 },
  { screenPath: "/student/f/st-20-career", role: "student", primaryText: "Work-integrated learning", secondaryText: "Explore practicum and placement opportunities", metaText: "Explore", href: "/student/f/st-17-practicum", sortOrder: 2 },
  { screenPath: "/student/attendance", role: "student", primaryText: "CS301 attendance", secondaryText: "Present 11 / 12", metaText: "94%", href: "/student/attendance", sortOrder: 1 },
  { screenPath: "/student/attendance", role: "student", primaryText: "ACC201 attendance", secondaryText: "Present 10 / 11", metaText: "91%", href: "/student/attendance", sortOrder: 2 },
  { screenPath: "/student/lectures", role: "student", primaryText: "CS301 Lecture 8", secondaryText: "Online · Recording ready", metaText: "Join", href: "/student/lectures", sortOrder: 1 },
  { screenPath: "/student/labs", role: "student", primaryText: "Algorithms lab B", secondaryText: "Science Hall 110", metaText: "Thu 2pm", href: "/student/f/st-13-lab-detail", sortOrder: 1 },
  { screenPath: "/student/f/st-13-lab-detail", role: "student", primaryText: "Algorithms lab B", secondaryText: "Science Hall 110 · Thursday 2:00–4:00 PM", metaText: "Scheduled", href: "/student/labs", sortOrder: 1 },
  { screenPath: "/student/f/st-13-lab-detail", role: "student", primaryText: "Lab safety acknowledgement", secondaryText: "Required before practical work", metaText: "Complete", href: "/student/documents", sortOrder: 2 },
  { screenPath: "/student/announcements", role: "student", primaryText: "Fall reading week", secondaryText: "No classes Oct 13–17", metaText: "Campus", href: "/student/announcements", sortOrder: 1 },
  { screenPath: "/student/ask", role: "student", primaryText: "Ask MyHeritage", secondaryText: "Grounded answers with citations", metaText: "AI", href: "/student/ask", sortOrder: 1 },
  { screenPath: "/student/success", role: "student", primaryText: "Success plan", secondaryText: "Midterm coaching available", metaText: "Open", href: "/student/advising", sortOrder: 1 },
  { screenPath: "/student/success", role: "student", primaryText: "Study support", secondaryText: "Tutoring and learning strategy appointments", metaText: "Available", href: "/student/messages", sortOrder: 2 },
  { screenPath: "/student/*", role: "student", primaryText: "Campus services", secondaryText: "Live portal record", metaText: "Open", href: "/student", sortOrder: 1 },

  // Instructor
  { screenPath: "/instructor/lectures", role: "instructor", primaryText: "CS301 Lecture 8", secondaryText: "Publish slides before 9am", metaText: "Today", href: "/instructor/lectures", sortOrder: 1 },
  { screenPath: "/instructor/labs", role: "instructor", primaryText: "Lab supervision CS301", secondaryText: "Science Hall 110", metaText: "Thu", href: "/instructor/labs", sortOrder: 1 },
  { screenPath: "/instructor/announcements", role: "instructor", primaryText: "Midterm review session", secondaryText: "Posted to CS301-01", metaText: "Sent", href: "/instructor/announcements", sortOrder: 1 },
  { screenPath: "/instructor/studio", role: "instructor", primaryText: "AI course studio draft", secondaryText: "Outcome mapping ready", metaText: "Open", href: "/instructor/studio", sortOrder: 1 },
  { screenPath: "/instructor/modules", role: "instructor", primaryText: "Module 4 · Graphs", secondaryText: "CS301-01", metaText: "Published", href: "/instructor/modules", sortOrder: 1 },
  { screenPath: "/instructor/*", role: "instructor", primaryText: "Teaching workspace", secondaryText: "Live portal record", metaText: "Open", href: "/instructor", sortOrder: 1 },

  // Admin domains
  { screenPath: "/admin/finance", role: "admin", primaryText: "Refund queue", secondaryText: "8 student refunds awaiting auth", metaText: "Urgent", href: "/admin/refunds", sortOrder: 1 },
  { screenPath: "/admin/payments", role: "admin", primaryText: "Tuition batch T-2026F-09", secondaryText: "Cleared CAD 184,200", metaText: "Posted", href: "/admin/payments", sortOrder: 1 },
  { screenPath: "/admin/refunds", role: "admin", primaryText: "Refund · Daniel Okafor", secondaryText: "Tuition adjustment", metaText: "Pending", href: "/admin/refunds", sortOrder: 1 },
  { screenPath: "/admin/admissions", role: "admin", primaryText: "Application queue", secondaryText: "14 awaiting verification", metaText: "Open", href: "/admin/admissions", sortOrder: 1 },
  { screenPath: "/admin/crm", role: "admin", primaryText: "Counsellor queue", secondaryText: "7 leads this week", metaText: "CRM", href: "/admin/crm", sortOrder: 1 },
  { screenPath: "/admin/compliance", role: "admin", primaryText: "Curriculum policy audit", secondaryText: "3 packs pending", metaText: "Review", href: "/admin/compliance", sortOrder: 1 },
  { screenPath: "/admin/programs", role: "admin", primaryText: "Computer Science diploma", secondaryText: "Active · Fall 2026", metaText: "AC", href: "/admin/programs", sortOrder: 1 },
  { screenPath: "/admin/terms", role: "admin", primaryText: "Fall 2026", secondaryText: "2026-09-01 → 2026-12-18", metaText: "Current", href: "/admin/terms", sortOrder: 1 },
  { screenPath: "/admin/integrations", role: "admin", primaryText: "SIS sync", secondaryText: "Healthy · last run 4m ago", metaText: "OK", href: "/admin/integrations", sortOrder: 1 },
  { screenPath: "/admin/operations", role: "admin", primaryText: "Outbox worker", secondaryText: "Queue depth 0", metaText: "Healthy", href: "/admin/operations", sortOrder: 1 },
  { screenPath: "/admin/settings", role: "admin", primaryText: "Institution settings", secondaryText: "Heritage College · CAD", metaText: "Edit", href: "/admin/settings", sortOrder: 1 },
  { screenPath: "/admin/ai", role: "admin", primaryText: "AI evaluation dashboard", secondaryText: "Citation failures: 0", metaText: "Monitor", href: "/admin/ai", sortOrder: 1 },
  { screenPath: "/admin/analytics", role: "admin", primaryText: "Enrolment funnel", secondaryText: "Live dashboards", metaText: "Open", href: "/admin/analytics", sortOrder: 1 },
  { screenPath: "/admin/*", role: "admin", primaryText: "Administration record", secondaryText: "Live portal data", metaText: "Open", href: "/admin", sortOrder: 1 },

  // Applicant / employer
  { screenPath: "/applicant/application", role: "applicant", primaryText: "Application draft", secondaryText: "Nursing diploma", metaText: "In progress", href: "/applicant/application", sortOrder: 1 },
  { screenPath: "/applicant/documents", role: "applicant", primaryText: "Passport scan", secondaryText: "Awaiting review", metaText: "Uploaded", href: "/applicant/documents", sortOrder: 1 },
  { screenPath: "/applicant/offers", role: "applicant", primaryText: "Conditional offer", secondaryText: "Fall 2026 intake", metaText: "Review", href: "/applicant/offers", sortOrder: 1 },
  { screenPath: "/applicant/*", role: "applicant", primaryText: "Applicant workspace", secondaryText: "Live portal data", metaText: "Open", href: "/applicant", sortOrder: 1 },
  { screenPath: "/employer/placements", role: "employer", primaryText: "Practicum site A", secondaryText: "2 active students", metaText: "Open", href: "/employer/placements", sortOrder: 1 },
  { screenPath: "/employer/hours", role: "employer", primaryText: "Hours log week 38", secondaryText: "Awaiting sign-off", metaText: "Pending", href: "/employer/hours", sortOrder: 1 },
  { screenPath: "/employer/*", role: "employer", primaryText: "Employer workspace", secondaryText: "Live portal data", metaText: "Open", href: "/employer", sortOrder: 1 },

  // Mobile mirrors
  { screenPath: "/m/student/fees", role: "student", primaryText: "Tuition balance", secondaryText: "CAD 2,450.00", metaText: "Due", href: "/m/student/fees", sortOrder: 1 },
  { screenPath: "/m/student/library", role: "student", primaryText: "Checked-out items", secondaryText: "1 textbook", metaText: "Open", href: "/m/student/library", sortOrder: 1 },
  { screenPath: "/m/student/documents", role: "student", primaryText: "Student ID", secondaryText: "Digital card", metaText: "Show", href: "/m/student/documents", sortOrder: 1 },
  { screenPath: "/m/instructor/attendance", role: "instructor", primaryText: "CS301-01 roster", secondaryText: "Mark today's session", metaText: "Open", href: "/m/instructor/attendance", sortOrder: 1 },
  { screenPath: "/student/courses", role: "student", primaryText: "Courses record", secondaryText: "Live campus data for /student/courses", metaText: "Open", href: "/student/courses", sortOrder: 1 },
  { screenPath: "/student/courses/demo", role: "student", primaryText: "Demo record", secondaryText: "Live campus data for /student/courses/demo", metaText: "Open", href: "/student/courses/demo", sortOrder: 1 },
  { screenPath: "/student/modules", role: "student", primaryText: "Modules record", secondaryText: "Live campus data for /student/modules", metaText: "Open", href: "/student/modules", sortOrder: 1 },
  { screenPath: "/student/continue", role: "student", primaryText: "Continue record", secondaryText: "Live campus data for /student/continue", metaText: "Open", href: "/student/continue", sortOrder: 1 },
  { screenPath: "/student/assessments", role: "student", primaryText: "Assessments record", secondaryText: "Live campus data for /student/assessments", metaText: "Open", href: "/student/assessments", sortOrder: 1 },
  { screenPath: "/student/grades", role: "student", primaryText: "Grades record", secondaryText: "Live campus data for /student/grades", metaText: "Open", href: "/student/grades", sortOrder: 1 },
  { screenPath: "/student/calendar", role: "student", primaryText: "Calendar record", secondaryText: "Live campus data for /student/calendar", metaText: "Open", href: "/student/calendar", sortOrder: 1 },
  { screenPath: "/student/profile", role: "student", primaryText: "Profile record", secondaryText: "Live campus data for /student/profile", metaText: "Open", href: "/student/profile", sortOrder: 1 },
  { screenPath: "/student/notifications", role: "student", primaryText: "Notifications record", secondaryText: "Live campus data for /student/notifications", metaText: "Open", href: "/student/notifications", sortOrder: 1 },
  { screenPath: "/student/messages", role: "student", primaryText: "Messages record", secondaryText: "Live campus data for /student/messages", metaText: "Open", href: "/student/messages", sortOrder: 1 },
  { screenPath: "/instructor/sections", role: "instructor", primaryText: "Sections record", secondaryText: "Live campus data for /instructor/sections", metaText: "Open", href: "/instructor/sections", sortOrder: 1 },
  { screenPath: "/instructor/sections/demo", role: "instructor", primaryText: "Demo record", secondaryText: "Live campus data for /instructor/sections/demo", metaText: "Open", href: "/instructor/sections/demo", sortOrder: 1 },
  { screenPath: "/instructor/assessments", role: "instructor", primaryText: "Assessments record", secondaryText: "Live campus data for /instructor/assessments", metaText: "Open", href: "/instructor/assessments", sortOrder: 1 },
  { screenPath: "/instructor/submissions", role: "instructor", primaryText: "Submissions record", secondaryText: "Live campus data for /instructor/submissions", metaText: "Open", href: "/instructor/submissions", sortOrder: 1 },
  { screenPath: "/instructor/gradebook", role: "instructor", primaryText: "Gradebook record", secondaryText: "Live campus data for /instructor/gradebook", metaText: "Open", href: "/instructor/gradebook", sortOrder: 1 },
  { screenPath: "/instructor/attendance", role: "instructor", primaryText: "Attendance record", secondaryText: "Live campus data for /instructor/attendance", metaText: "Open", href: "/instructor/attendance", sortOrder: 1 },
  { screenPath: "/instructor/profile", role: "instructor", primaryText: "Profile record", secondaryText: "Live campus data for /instructor/profile", metaText: "Open", href: "/instructor/profile", sortOrder: 1 },
  { screenPath: "/instructor/notifications", role: "instructor", primaryText: "Notifications record", secondaryText: "Live campus data for /instructor/notifications", metaText: "Open", href: "/instructor/notifications", sortOrder: 1 },
  { screenPath: "/instructor/messages", role: "instructor", primaryText: "Messages record", secondaryText: "Live campus data for /instructor/messages", metaText: "Open", href: "/instructor/messages", sortOrder: 1 },
  { screenPath: "/instructor/calendar", role: "instructor", primaryText: "Calendar record", secondaryText: "Live campus data for /instructor/calendar", metaText: "Open", href: "/instructor/calendar", sortOrder: 1 },
  { screenPath: "/instructor/roster", role: "instructor", primaryText: "Roster record", secondaryText: "Live campus data for /instructor/roster", metaText: "Open", href: "/instructor/roster", sortOrder: 1 },
  { screenPath: "/admin/notifications", role: "admin", primaryText: "Notifications record", secondaryText: "Live campus data for /admin/notifications", metaText: "Open", href: "/admin/notifications", sortOrder: 1 },
  { screenPath: "/admin/calendar", role: "admin", primaryText: "Calendar record", secondaryText: "Live campus data for /admin/calendar", metaText: "Open", href: "/admin/calendar", sortOrder: 1 },
  { screenPath: "/admin/profile", role: "admin", primaryText: "Profile record", secondaryText: "Live campus data for /admin/profile", metaText: "Open", href: "/admin/profile", sortOrder: 1 },
  { screenPath: "/admin/security", role: "admin", primaryText: "Security record", secondaryText: "Live campus data for /admin/security", metaText: "Open", href: "/admin/security", sortOrder: 1 },
  { screenPath: "/admin/help", role: "admin", primaryText: "Help record", secondaryText: "Live campus data for /admin/help", metaText: "Open", href: "/admin/help", sortOrder: 1 },
  { screenPath: "/admin/approvals", role: "admin", primaryText: "Approvals record", secondaryText: "Live campus data for /admin/approvals", metaText: "Open", href: "/admin/approvals", sortOrder: 1 },
  { screenPath: "/admin/users", role: "admin", primaryText: "Users record", secondaryText: "Live campus data for /admin/users", metaText: "Open", href: "/admin/users", sortOrder: 1 },
  { screenPath: "/admin/permissions", role: "admin", primaryText: "Permissions record", secondaryText: "Live campus data for /admin/permissions", metaText: "Open", href: "/admin/permissions", sortOrder: 1 },
  { screenPath: "/admin/templates", role: "admin", primaryText: "Templates record", secondaryText: "Live campus data for /admin/templates", metaText: "Open", href: "/admin/templates", sortOrder: 1 },
  { screenPath: "/admin/search", role: "admin", primaryText: "Search record", secondaryText: "Live campus data for /admin/search", metaText: "Open", href: "/admin/search", sortOrder: 1 },
  { screenPath: "/admin/platform", role: "admin", primaryText: "Platform record", secondaryText: "Live campus data for /admin/platform", metaText: "Open", href: "/admin/platform", sortOrder: 1 },
  { screenPath: "/admin/flags", role: "admin", primaryText: "Flags record", secondaryText: "Live campus data for /admin/flags", metaText: "Open", href: "/admin/flags", sortOrder: 1 },
  { screenPath: "/admin/audit", role: "admin", primaryText: "Audit record", secondaryText: "Live campus data for /admin/audit", metaText: "Open", href: "/admin/audit", sortOrder: 1 },
  { screenPath: "/admin/files", role: "admin", primaryText: "Files record", secondaryText: "Live campus data for /admin/files", metaText: "Open", href: "/admin/files", sortOrder: 1 },
  { screenPath: "/admin/jobs", role: "admin", primaryText: "Jobs record", secondaryText: "Live campus data for /admin/jobs", metaText: "Open", href: "/admin/jobs", sortOrder: 1 },
  { screenPath: "/admin/courses", role: "admin", primaryText: "Courses record", secondaryText: "Live campus data for /admin/courses", metaText: "Open", href: "/admin/courses", sortOrder: 1 },
  { screenPath: "/admin/sections", role: "admin", primaryText: "Sections record", secondaryText: "Live campus data for /admin/sections", metaText: "Open", href: "/admin/sections", sortOrder: 1 },
  { screenPath: "/admin/schedule", role: "admin", primaryText: "Schedule record", secondaryText: "Live campus data for /admin/schedule", metaText: "Open", href: "/admin/schedule", sortOrder: 1 },
  { screenPath: "/admin/students", role: "admin", primaryText: "Students record", secondaryText: "Live campus data for /admin/students", metaText: "Open", href: "/admin/students", sortOrder: 1 },
  { screenPath: "/admin/records", role: "admin", primaryText: "Records record", secondaryText: "Live campus data for /admin/records", metaText: "Open", href: "/admin/records", sortOrder: 1 },
  { screenPath: "/admin/transcripts", role: "admin", primaryText: "Transcripts record", secondaryText: "Live campus data for /admin/transcripts", metaText: "Open", href: "/admin/transcripts", sortOrder: 1 },
  { screenPath: "/admin/corrections", role: "admin", primaryText: "Corrections record", secondaryText: "Live campus data for /admin/corrections", metaText: "Open", href: "/admin/corrections", sortOrder: 1 },
  { screenPath: "/admin/success", role: "admin", primaryText: "Success record", secondaryText: "Live campus data for /admin/success", metaText: "Open", href: "/admin/success", sortOrder: 1 },
  { screenPath: "/admin/workflows", role: "admin", primaryText: "Workflows record", secondaryText: "Live campus data for /admin/workflows", metaText: "Open", href: "/admin/workflows", sortOrder: 1 },
  { screenPath: "/admin/rules", role: "admin", primaryText: "Rules record", secondaryText: "Live campus data for /admin/rules", metaText: "Open", href: "/admin/rules", sortOrder: 1 },
  { screenPath: "/admin/forms", role: "admin", primaryText: "Forms record", secondaryText: "Live campus data for /admin/forms", metaText: "Open", href: "/admin/forms", sortOrder: 1 },
  { screenPath: "/admin/labs", role: "admin", primaryText: "Labs record", secondaryText: "Live campus data for /admin/labs", metaText: "Open", href: "/admin/labs", sortOrder: 1 },
  { screenPath: "/admin/practicum", role: "admin", primaryText: "Practicum record", secondaryText: "Live campus data for /admin/practicum", metaText: "Open", href: "/admin/practicum", sortOrder: 1 },
  { screenPath: "/applicant", role: "applicant", primaryText: "Applicant record", secondaryText: "Live campus data for /applicant", metaText: "Open", href: "/applicant", sortOrder: 1 },
  { screenPath: "/applicant/messages", role: "applicant", primaryText: "Messages record", secondaryText: "Live campus data for /applicant/messages", metaText: "Open", href: "/applicant/messages", sortOrder: 1 },
  { screenPath: "/applicant/timeline", role: "applicant", primaryText: "Timeline record", secondaryText: "Live campus data for /applicant/timeline", metaText: "Open", href: "/applicant/timeline", sortOrder: 1 },
  { screenPath: "/employer", role: "employer", primaryText: "Employer record", secondaryText: "Live campus data for /employer", metaText: "Open", href: "/employer", sortOrder: 1 },
  { screenPath: "/employer/evaluations", role: "employer", primaryText: "Evaluations record", secondaryText: "Live campus data for /employer/evaluations", metaText: "Open", href: "/employer/evaluations", sortOrder: 1 },
  { screenPath: "/employer/agreements", role: "employer", primaryText: "Agreements record", secondaryText: "Live campus data for /employer/agreements", metaText: "Open", href: "/employer/agreements", sortOrder: 1 },
  { screenPath: "/employer/profile", role: "employer", primaryText: "Profile record", secondaryText: "Live campus data for /employer/profile", metaText: "Open", href: "/employer/profile", sortOrder: 1 },
  { screenPath: "/m/student/courses", role: "student", primaryText: "Courses record", secondaryText: "Live campus data for /m/student/courses", metaText: "Open", href: "/m/student/courses", sortOrder: 1 },
  { screenPath: "/m/student/grades", role: "student", primaryText: "Grades record", secondaryText: "Live campus data for /m/student/grades", metaText: "Open", href: "/m/student/grades", sortOrder: 1 },
  { screenPath: "/m/student/profile", role: "student", primaryText: "Profile record", secondaryText: "Live campus data for /m/student/profile", metaText: "Open", href: "/m/student/profile", sortOrder: 1 },
  { screenPath: "/m/instructor/grades", role: "instructor", primaryText: "Grades record", secondaryText: "Live campus data for /m/instructor/grades", metaText: "Open", href: "/m/instructor/grades", sortOrder: 1 },
  { screenPath: "/m/instructor/home", role: "instructor", primaryText: "Home record", secondaryText: "Live campus data for /m/instructor/home", metaText: "Open", href: "/m/instructor/home", sortOrder: 1 },
];

async function main() {
  await prisma.sisScreenState.deleteMany().catch(() => undefined);
  await prisma.portalRecord.deleteMany().catch(() => undefined);
  await prisma.aiInteraction.deleteMany().catch(() => undefined);
  await prisma.applicationTimelineEvent.deleteMany().catch(() => undefined);
  await prisma.applicationDocument.deleteMany().catch(() => undefined);
  await prisma.applicationOffer.deleteMany().catch(() => undefined);
  await prisma.admissionsApplication.deleteMany().catch(() => undefined);
  await prisma.hoursEntry.deleteMany().catch(() => undefined);
  await prisma.placementEvaluation.deleteMany().catch(() => undefined);
  await prisma.affiliationAgreement.deleteMany().catch(() => undefined);
  await prisma.placement.deleteMany().catch(() => undefined);
  await prisma.employerOrg.deleteMany().catch(() => undefined);
  await prisma.passwordResetToken.deleteMany().catch(() => undefined);
  await prisma.idempotencyKey.deleteMany();
  await prisma.message.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.eventOutbox.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.gradeItem.deleteMany();
  await prisma.fileObject.deleteMany().catch(() => undefined);
  await prisma.submission.deleteMany().catch(() => undefined);
  await prisma.assignment.deleteMany();
  await prisma.enrolment.deleteMany();
  await prisma.classSession.deleteMany().catch(() => undefined);
  await prisma.section.deleteMany();
  await prisma.degreePlanScenario.deleteMany().catch(() => undefined);
  await prisma.degreeRequirement.deleteMany().catch(() => undefined);
  await prisma.coursePrerequisite.deleteMany().catch(() => undefined);
  await prisma.courseCorequisite.deleteMany().catch(() => undefined);
  await prisma.courseOffering.deleteMany().catch(() => undefined);
  await prisma.transferCredit.deleteMany().catch(() => undefined);
  await prisma.careerOpportunity.deleteMany().catch(() => undefined);
  await prisma.interventionTask.deleteMany().catch(() => undefined);
  await prisma.successCase.deleteMany().catch(() => undefined);
  await prisma.advisingAppointment.deleteMany().catch(() => undefined);
  await prisma.rubricCriterion.deleteMany().catch(() => undefined);
  await prisma.rubric.deleteMany().catch(() => undefined);
  await prisma.knowledgeDocument.deleteMany().catch(() => undefined);
  await prisma.course.deleteMany();
  await prisma.term.deleteMany();
  await prisma.student.deleteMany();
  await prisma.programVersion.deleteMany().catch(() => undefined);
  await prisma.program.deleteMany().catch(() => undefined);
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.person.deleteMany();
  await prisma.securityPolicy.deleteMany();
  await prisma.institution.deleteMany();

  const passwordHash = await bcrypt.hash("Heritage!2026", 10);

  await prisma.institution.create({
    data: {
      id: INST,
      institutionId: INST,
      name: "Heritage College",
      legalName: "Heritage College of Applied Arts",
      addressLine1: "12345 King George Blvd",
      city: "Surrey",
      region: "BC",
      postalCode: "V3T 2W1",
      country: "CA",
    },
  });

  await prisma.securityPolicy.create({
    data: { institutionId: INST, maxConcurrentSessions: 3, sharedIpAlertWindowMinutes: 5 },
  });

  const people = [
    { id: ids.marcusPerson, givenName: "Marcus", familyName: "Vance", email: "marcus.vance@heritage.edu", dateOfBirth: "2003-11-14" },
    { id: ids.priyaPerson, givenName: "Priya", familyName: "Sandhu", email: "priya.sandhu@heritage.edu", dateOfBirth: "2002-04-09" },
    { id: ids.danielPerson, givenName: "Daniel", familyName: "Okafor", email: "daniel.okafor@heritage.edu", dateOfBirth: "2001-08-22" },
    { id: ids.vancePerson, givenName: "Elena", familyName: "Vance", email: "vance.instructor@heritage.edu" },
    { id: ids.pendeltonPerson, givenName: "James", familyName: "Pendelton", email: "pendelton@heritage.edu" },
    { id: ids.adminPerson, givenName: "Aisha", familyName: "Khan", email: "admin@heritage.edu" },
    { id: ids.jordanPerson, givenName: "Jordan", familyName: "Lee", email: "jordan.lee@heritage.edu", dateOfBirth: "2004-02-18" },
    { id: ids.meiPerson, givenName: "Mei", familyName: "Chen", email: "mei.chen@heritage.edu", dateOfBirth: "2003-06-03" },
    { id: ids.lucasPerson, givenName: "Lucas", familyName: "Moreau", email: "lucas.moreau@heritage.edu", dateOfBirth: "2002-12-11" },
    { id: ids.fatimaPerson, givenName: "Fatima", familyName: "Hassan", email: "fatima.hassan@heritage.edu", dateOfBirth: "2003-09-27" },
    { id: ids.applicantPerson, givenName: "Nora", familyName: "Reyes", email: "nora.reyes@applicant.heritage.edu", dateOfBirth: "2004-01-20" },
    { id: ids.employerPerson, givenName: "Sam", familyName: "Okello", email: "sam.okello@fraserhealth.partner" },
  ];

  for (const p of people) {
    await prisma.person.create({ data: { ...p, institutionId: INST } });
  }

  const accounts = [
    { id: ids.marcusAccount, personId: ids.marcusPerson, email: "marcus.vance@heritage.edu", roles: ["student"] },
    { id: ids.priyaAccount, personId: ids.priyaPerson, email: "priya.sandhu@heritage.edu", roles: ["student"] },
    { id: ids.danielAccount, personId: ids.danielPerson, email: "daniel.okafor@heritage.edu", roles: ["student"] },
    { id: ids.vanceAccount, personId: ids.vancePerson, email: "vance.instructor@heritage.edu", roles: ["instructor"] },
    { id: ids.pendeltonAccount, personId: ids.pendeltonPerson, email: "pendelton@heritage.edu", roles: ["instructor"] },
    { id: ids.adminAccount, personId: ids.adminPerson, email: "admin@heritage.edu", roles: ["admin", "registrar"] },
    { id: ids.jordanAccount, personId: ids.jordanPerson, email: "jordan.lee@heritage.edu", roles: ["student"] },
    { id: ids.meiAccount, personId: ids.meiPerson, email: "mei.chen@heritage.edu", roles: ["student"] },
    { id: ids.lucasAccount, personId: ids.lucasPerson, email: "lucas.moreau@heritage.edu", roles: ["student"] },
    { id: ids.fatimaAccount, personId: ids.fatimaPerson, email: "fatima.hassan@heritage.edu", roles: ["student"] },
    { id: ids.applicantAccount, personId: ids.applicantPerson, email: "nora.reyes@applicant.heritage.edu", roles: ["applicant"] },
    { id: ids.employerAccount, personId: ids.employerPerson, email: "sam.okello@fraserhealth.partner", roles: ["employer"] },
  ];

  for (const a of accounts) {
    await prisma.account.create({
      data: {
        id: a.id,
        institutionId: INST,
        personId: a.personId,
        email: a.email,
        passwordHash,
        rolesJson: JSON.stringify(a.roles),
      },
    });
  }

  await prisma.student.createMany({
    data: [
      { id: ids.marcusStudent, institutionId: INST, personId: ids.marcusPerson, studentNumber: "ST-2024-001", programName: "Computer Science", standing: "good" },
      { id: ids.priyaStudent, institutionId: INST, personId: ids.priyaPerson, studentNumber: "ST-2024-014", programName: "Nursing", standing: "good" },
      { id: ids.danielStudent, institutionId: INST, personId: ids.danielPerson, studentNumber: "ST-2023-088", programName: "Computer Science", standing: "alert" },
      { id: ids.jordanStudent, institutionId: INST, personId: ids.jordanPerson, studentNumber: "ST-2025-022", programName: "Computer Science", standing: "good" },
      { id: ids.meiStudent, institutionId: INST, personId: ids.meiPerson, studentNumber: "ST-2025-031", programName: "Nursing", standing: "good" },
      { id: ids.lucasStudent, institutionId: INST, personId: ids.lucasPerson, studentNumber: "ST-2024-055", programName: "Business Administration", standing: "good" },
      { id: ids.fatimaStudent, institutionId: INST, personId: ids.fatimaPerson, studentNumber: "ST-2025-044", programName: "Nursing", standing: "probation" },
    ],
  });

  await prisma.term.create({
    data: {
      id: ids.term,
      institutionId: INST,
      code: "2026F",
      name: "Fall 2026",
      startsOn: "2026-09-01",
      endsOn: "2026-12-18",
    },
  });

  await prisma.course.createMany({
    data: [
      { id: ids.cs301, institutionId: INST, code: "CS301", title: "Algorithms", credits: 3 },
      { id: ids.acc201, institutionId: INST, code: "ACC201", title: "Financial Accounting", credits: 3 },
      { id: ids.nurs400, institutionId: INST, code: "NURS400", title: "Clinical Practicum IV", credits: 4 },
      { id: ids.eng110, institutionId: INST, code: "ENG110", title: "Academic Writing", credits: 3 },
      { id: ids.cs201, institutionId: INST, code: "CS201", title: "Data Structures", credits: 3 },
      { id: ids.math210, institutionId: INST, code: "MATH210", title: "Discrete Mathematics", credits: 3 },
      { id: ids.stat310, institutionId: INST, code: "STAT310", title: "Applied Statistics", credits: 3 },
      { id: ids.data401, institutionId: INST, code: "DATA401", title: "Data Engineering", credits: 3 },
    ],
  });

  await prisma.program.create({
    data: {
      id: ids.programCs,
      institutionId: INST,
      code: "CS-DIP",
      name: "Computer Science",
      awardLevel: "diploma",
    },
  });
  await prisma.programVersion.create({
    data: {
      id: ids.programVersionCs,
      institutionId: INST,
      programId: ids.programCs,
      label: "2024.1",
      effectiveOn: "2024-09-01",
      totalCredits: 27,
      status: "active",
    },
  });
  await prisma.degreeRequirement.createMany({
    data: [
      { id: "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c101", institutionId: INST, programVersionId: ids.programVersionCs, courseId: ids.cs201, courseCode: "CS201", title: "Data Structures", credits: 3, kind: "required", sortOrder: 1 },
      { id: "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c102", institutionId: INST, programVersionId: ids.programVersionCs, courseId: ids.cs301, courseCode: "CS301", title: "Algorithms", credits: 3, kind: "required", sortOrder: 2 },
      { id: "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c103", institutionId: INST, programVersionId: ids.programVersionCs, courseId: ids.eng110, courseCode: "ENG110", title: "Academic Writing", credits: 3, kind: "required", sortOrder: 3 },
      { id: "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c104", institutionId: INST, programVersionId: ids.programVersionCs, courseId: ids.math210, courseCode: "MATH210", title: "Discrete Mathematics", credits: 3, kind: "required", sortOrder: 4 },
      { id: "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c105", institutionId: INST, programVersionId: ids.programVersionCs, courseId: ids.stat310, courseCode: "STAT310", title: "Applied Statistics", credits: 3, kind: "required", sortOrder: 5 },
      { id: "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c106", institutionId: INST, programVersionId: ids.programVersionCs, courseId: ids.data401, courseCode: "DATA401", title: "Data Engineering", credits: 3, kind: "required", sortOrder: 6 },
      { id: "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c107", institutionId: INST, programVersionId: ids.programVersionCs, courseId: ids.acc201, courseCode: "ACC201", title: "Financial Accounting", credits: 3, kind: "elective", sortOrder: 7 },
      { id: "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c108", institutionId: INST, programVersionId: ids.programVersionCs, courseId: null, courseCode: "ELECTIVE", title: "Open elective", credits: 3, kind: "elective", sortOrder: 8 },
      { id: "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c109", institutionId: INST, programVersionId: ids.programVersionCs, courseId: null, courseCode: "CAPSTONE", title: "CS Capstone", credits: 3, kind: "capstone", sortOrder: 9 },
    ],
  });
  await prisma.coursePrerequisite.createMany({
    data: [
      { id: "p1p1p1p1-p1p1-4p1p-8p1p-p1p1p1p1p101", institutionId: INST, courseId: ids.cs301, prerequisiteCourseId: ids.cs201 },
      { id: "p1p1p1p1-p1p1-4p1p-8p1p-p1p1p1p1p102", institutionId: INST, courseId: ids.stat310, prerequisiteCourseId: ids.math210 },
      { id: "p1p1p1p1-p1p1-4p1p-8p1p-p1p1p1p1p103", institutionId: INST, courseId: ids.data401, prerequisiteCourseId: ids.stat310 },
    ],
  });
  await prisma.knowledgeDocument.create({
    data: {
      id: ids.knowledgeDegree,
      institutionId: INST,
      slug: "cs-diploma-requirements-2024",
      title: "Computer Science Diploma Requirements 2024.1",
      docType: "program_handbook",
      body: "CS diploma requires 27 credits including MATH210 → STAT310 → DATA401 prerequisite chain.",
      uri: "/student/degree",
      versionLabel: "2024.1",
      status: "published",
    },
  });
  await prisma.knowledgeDocument.createMany({
    data: [
      {
        id: ids.knowledgeCalendar,
        institutionId: INST,
        slug: "academic-calendar-2026",
        title: "Academic Calendar 2026–2027",
        docType: "academic_calendar",
        body: "Fall 2026 classes begin September 8. Reading week is November 10–14. Withdrawal deadline without academic penalty is October 31. Winter term starts January 12 2027.",
        uri: "/student/calendar",
        versionLabel: "2026.1",
        status: "published",
      },
      {
        id: ids.knowledgeServices,
        institutionId: INST,
        slug: "student-services-handbook",
        title: "Student Services Handbook",
        docType: "student_handbook",
        body: "Request an official transcript from Documents. Book an academic advisor under Advising. Tuition receipts appear under Fees. Accommodation requests are filed through Campus services. Address changes require a profile change request.",
        uri: "/student/advising",
        versionLabel: "2026.1",
        status: "published",
      },
      {
        id: ids.knowledgeAdmissions,
        institutionId: INST,
        slug: "admissions-requirements",
        title: "Admissions Requirements Overview",
        docType: "admissions_policy",
        body: "Applicants must submit transcript, identification, and program application. Offers are issued by Admissions staff. AI does not make final admissions decisions. Missing documents are listed on the applicant Documents screen.",
        uri: "/applicant/application",
        versionLabel: "2026.1",
        status: "published",
      },
      {
        id: ids.knowledgeNormalization,
        institutionId: INST,
        slug: "cs301-normalization-brief",
        title: "CS301 Database Normalization Brief",
        docType: "course_material",
        body: "Normalization organizes relations to reduce redundancy. First normal form requires atomic values. Second normal form removes partial dependency on a composite key. Third normal form removes transitive dependencies. Practice by decomposing an unnormalized enrolment table into Student, Course, and Enrolment relations.",
        uri: "/student/courses",
        versionLabel: "2026.1",
        status: "published",
      },
    ],
  });
  await prisma.rubric.create({
    data: {
      id: ids.rubricCs,
      institutionId: INST,
      title: "CS301 Project Rubric",
      description: "Rubric for Project 1 deliverables",
      maxScore: 100,
      status: "published",
      criteria: {
        create: [
          {
            id: ids.rubricCrit1,
            institutionId: INST,
            label: "Correctness",
            description: "Solution meets functional requirements",
            maxPoints: 60,
            sortOrder: 1,
          },
          {
            id: ids.rubricCrit2,
            institutionId: INST,
            label: "Clarity",
            description: "Explanation and structure are clear",
            maxPoints: 40,
            sortOrder: 2,
          },
        ],
      },
    },
  });
  await prisma.courseOffering.create({
    data: {
      id: ids.offeringMath,
      institutionId: INST,
      courseId: ids.math210,
      termCode: "2027W",
      termName: "Winter 2027",
      seatsOpen: 18,
      seatsTotal: 30,
      status: "published",
    },
  });
  await prisma.careerOpportunity.create({
    data: {
      id: ids.career1,
      institutionId: INST,
      title: "Junior Data Analyst (co-op)",
      employerName: "Surrey Civic Analytics",
      skillsJson: JSON.stringify(["SQL", "normalization", "reporting"]),
      programCodesJson: JSON.stringify(["CS-DIP"]),
      status: "open",
      href: "/student/f/st-20-career",
    },
  });
  await prisma.student.updateMany({
    where: { id: { in: [ids.marcusStudent, ids.danielStudent, ids.jordanStudent] }, institutionId: INST },
    data: { programVersionId: ids.programVersionCs },
  });

  await prisma.section.createMany({
    data: [
      { id: ids.sectionCs, institutionId: INST, courseId: ids.cs301, termId: ids.term, code: "CS301-01", instructorPersonId: ids.vancePerson },
      { id: ids.sectionAcc, institutionId: INST, courseId: ids.acc201, termId: ids.term, code: "ACC201-01", instructorPersonId: ids.pendeltonPerson },
      { id: ids.sectionNurs, institutionId: INST, courseId: ids.nurs400, termId: ids.term, code: "NURS400-01", instructorPersonId: ids.pendeltonPerson },
      { id: ids.sectionEng, institutionId: INST, courseId: ids.eng110, termId: ids.term, code: "ENG110-01", instructorPersonId: ids.vancePerson },
      { id: "77777777-7777-4777-8777-777777777705", institutionId: INST, courseId: ids.cs201, termId: ids.term, code: "CS201-01", instructorPersonId: ids.vancePerson },
      { id: "77777777-7777-4777-8777-777777777706", institutionId: INST, courseId: ids.math210, termId: ids.term, code: "MATH210-01", instructorPersonId: ids.pendeltonPerson },
    ],
  });

  await prisma.enrolment.createMany({
    data: [
      { id: ids.enrolMarcusCs, institutionId: INST, sectionId: ids.sectionCs, studentId: ids.marcusStudent },
      { id: ids.enrolMarcusAcc, institutionId: INST, sectionId: ids.sectionAcc, studentId: ids.marcusStudent },
      { id: "88888888-8888-4888-8888-888888888810", institutionId: INST, sectionId: "77777777-7777-4777-8777-777777777705", studentId: ids.marcusStudent, status: "completed" },
      { id: "88888888-8888-4888-8888-888888888811", institutionId: INST, sectionId: ids.sectionEng, studentId: ids.marcusStudent, status: "completed" },
      { id: "88888888-8888-4888-8888-888888888812", institutionId: INST, sectionId: "77777777-7777-4777-8777-777777777706", studentId: ids.marcusStudent },
      { id: ids.enrolPriya, institutionId: INST, sectionId: ids.sectionCs, studentId: ids.priyaStudent },
      { id: ids.enrolDaniel, institutionId: INST, sectionId: ids.sectionCs, studentId: ids.danielStudent },
      { id: ids.enrolMeiNurs, institutionId: INST, sectionId: ids.sectionNurs, studentId: ids.meiStudent },
      { id: ids.enrolJordanCs, institutionId: INST, sectionId: ids.sectionCs, studentId: ids.jordanStudent },
      { id: ids.enrolLucasAcc, institutionId: INST, sectionId: ids.sectionAcc, studentId: ids.lucasStudent },
      { id: ids.enrolFatimaNurs, institutionId: INST, sectionId: ids.sectionNurs, studentId: ids.fatimaStudent },
      { id: ids.enrolPriyaNurs, institutionId: INST, sectionId: ids.sectionNurs, studentId: ids.priyaStudent },
    ],
  });

  await prisma.assignment.createMany({
    data: [
      {
        id: ids.asgMidterm,
        institutionId: INST,
        sectionId: ids.sectionCs,
        title: "Midterm Exam",
        maxScore: 100,
        weightPercent: 30,
        dueAt: new Date("2026-10-20T16:00:00.000Z"),
      },
      {
        id: ids.asgProject,
        institutionId: INST,
        sectionId: ids.sectionCs,
        title: "Project 1",
        maxScore: 100,
        weightPercent: 20,
        dueAt: new Date("2026-10-15T23:59:00.000Z"),
      },
      {
        id: ids.asgAccHw,
        institutionId: INST,
        sectionId: ids.sectionAcc,
        title: "Homework 5",
        maxScore: 100,
        weightPercent: 10,
        dueAt: new Date("2026-10-12T23:59:00.000Z"),
      },
      {
        id: ids.asgNursClinic,
        institutionId: INST,
        sectionId: ids.sectionNurs,
        title: "Clinical Skills Check",
        maxScore: 100,
        weightPercent: 40,
        dueAt: new Date("2026-11-05T16:00:00.000Z"),
      },
      {
        id: ids.asgEngEssay,
        institutionId: INST,
        sectionId: ids.sectionEng,
        title: "Research Essay",
        maxScore: 100,
        weightPercent: 25,
        dueAt: new Date("2026-10-28T23:59:00.000Z"),
      },
    ],
  });
  await prisma.assignment.update({
    where: { id: ids.asgProject },
    data: { rubricId: ids.rubricCs },
  });
  await prisma.transferCredit.create({
    data: {
      id: ids.transferMarcus,
      institutionId: INST,
      studentId: ids.marcusStudent,
      courseId: ids.eng110,
      externalCode: "ENGL101",
      externalTitle: "College Writing Transfer",
      credits: 3,
      status: "accepted",
    },
  });

  await prisma.classSession.createMany({
    data: [
      {
        id: ids.sessionCsOnline,
        institutionId: INST,
        sectionId: ids.sectionCs,
        title: "Algorithms · Graph Traversal",
        startsAt: new Date("2026-09-17T17:00:00.000Z"),
        endsAt: new Date("2026-09-17T18:20:00.000Z"),
        location: "Online",
        joinUrl: "https://meet.jit.si/heritage-cs301-01",
        deliveryMode: "online",
      },
      {
        id: ids.sessionAccRoom,
        institutionId: INST,
        sectionId: ids.sectionAcc,
        title: "Financial Accounting · Ledgers",
        startsAt: new Date("2026-09-18T19:00:00.000Z"),
        endsAt: new Date("2026-09-18T20:20:00.000Z"),
        location: "Business Centre 204",
        deliveryMode: "in_person",
      },
    ],
  });

  await prisma.submission.create({
    data: {
      id: ids.submissionMarcusProject,
      institutionId: INST,
      assignmentId: ids.asgProject,
      studentId: ids.marcusStudent,
      status: "draft",
    },
  });

  await prisma.gradeItem.createMany({
    data: [
      { id: ids.gradeMarcusMid, institutionId: INST, assignmentId: ids.asgMidterm, studentId: ids.marcusStudent, enrolmentId: ids.enrolMarcusCs, score: 88, maxScore: 100, letter: "A-", status: "published", publishedAt: new Date("2026-10-01T12:00:00.000Z") },
      { id: ids.gradeMarcusProj, institutionId: INST, assignmentId: ids.asgProject, studentId: ids.marcusStudent, enrolmentId: ids.enrolMarcusCs, score: 92, maxScore: 100, letter: "A", status: "draft" },
      { id: ids.gradePriyaMid, institutionId: INST, assignmentId: ids.asgMidterm, studentId: ids.priyaStudent, enrolmentId: ids.enrolPriya, score: 91, maxScore: 100, letter: "A", status: "published", publishedAt: new Date("2026-10-01T12:00:00.000Z") },
      { id: ids.gradeDanielMid, institutionId: INST, assignmentId: ids.asgMidterm, studentId: ids.danielStudent, enrolmentId: ids.enrolDaniel, score: 64, maxScore: 100, letter: "C", status: "draft" },
      { id: ids.gradeMarcusAcc, institutionId: INST, assignmentId: ids.asgAccHw, studentId: ids.marcusStudent, enrolmentId: ids.enrolMarcusAcc, score: 76, maxScore: 100, letter: "B", status: "published", publishedAt: new Date("2026-09-28T12:00:00.000Z") },
      { id: ids.gradeMeiClinic, institutionId: INST, assignmentId: ids.asgNursClinic, studentId: ids.meiStudent, enrolmentId: ids.enrolMeiNurs, score: 87, maxScore: 100, letter: "A-", status: "published", publishedAt: new Date("2026-10-08T12:00:00.000Z") },
      { id: ids.gradeJordanMid, institutionId: INST, assignmentId: ids.asgMidterm, studentId: ids.jordanStudent, enrolmentId: ids.enrolJordanCs, score: 79, maxScore: 100, letter: "B+", status: "published", publishedAt: new Date("2026-10-01T12:00:00.000Z") },
      { id: ids.gradeLucasHw, institutionId: INST, assignmentId: ids.asgAccHw, studentId: ids.lucasStudent, enrolmentId: ids.enrolLucasAcc, score: 82, maxScore: 100, letter: "B", status: "draft" },
      { id: ids.gradeFatimaClinic, institutionId: INST, assignmentId: ids.asgNursClinic, studentId: ids.fatimaStudent, enrolmentId: ids.enrolFatimaNurs, score: 58, maxScore: 100, letter: "D+", status: "draft" },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        institutionId: INST,
        recipientAccountId: ids.marcusAccount,
        channel: "in_app",
        title: "Grade published · CS301 Midterm",
        body: "Your midterm score is now visible in Grades.",
        templateKey: "grade.published",
      },
      {
        institutionId: INST,
        recipientAccountId: ids.marcusAccount,
        channel: "in_app",
        title: "Assignment due soon",
        body: "Project 1 is due Oct 15.",
        templateKey: "assignment.due",
      },
      {
        institutionId: INST,
        recipientAccountId: ids.vanceAccount,
        channel: "in_app",
        title: "Publish reminder",
        body: "Project 1 drafts are ready for publish approval.",
        templateKey: "grade.publish_reminder",
      },
      {
        institutionId: INST,
        recipientAccountId: ids.pendeltonAccount,
        channel: "in_app",
        title: "ACC201 homework drafts",
        body: "Ledger homework drafts are waiting in your gradebook.",
        templateKey: "grade.publish_reminder",
      },
      {
        institutionId: INST,
        recipientAccountId: ids.adminAccount,
        channel: "in_app",
        title: "Approval inbox",
        body: "Grade publish requests may arrive from instructors.",
        templateKey: "approvals.digest",
      },
      {
        institutionId: INST,
        recipientAccountId: ids.meiAccount,
        channel: "in_app",
        title: "Clinical check published",
        body: "NURS400 Clinical Skills Check is now visible.",
        templateKey: "grade.published",
      },
      {
        institutionId: INST,
        recipientAccountId: ids.fatimaAccount,
        channel: "in_app",
        title: "Standing review",
        body: "Your academic standing is under registrar review.",
        templateKey: "standing.alert",
      },
    ],
  });

  await prisma.messageThread.create({
    data: {
      id: ids.thread1,
      institutionId: INST,
      subject: "Question about CS301 Midterm",
      participantAccountIdsJson: JSON.stringify([ids.marcusAccount, ids.vanceAccount]),
      messages: {
        create: {
          id: ids.msg1,
          institutionId: INST,
          senderAccountId: ids.marcusAccount,
          body: "Could you clarify the weighting for question 3?",
          relatedGradeItemId: ids.gradeMarcusMid,
        },
      },
    },
  });

  await prisma.approvalRequest.create({
    data: {
      id: ids.approval1,
      institutionId: INST,
      type: "grade_publish",
      subjectRef: ids.sectionCs,
      proposedDiffJson: JSON.stringify({ gradeItemIds: [ids.gradeMarcusProj] }),
      requestedBy: ids.vanceAccount,
      requiredApproverRolesJson: JSON.stringify(["registrar", "admin"]),
      requiredCount: 1,
      status: "pending",
    },
  });

  await prisma.approvalRequest.create({
    data: {
      id: ids.approval2,
      institutionId: INST,
      type: "grade_publish",
      subjectRef: ids.sectionAcc,
      proposedDiffJson: JSON.stringify({ gradeItemIds: [ids.gradeLucasHw] }),
      requestedBy: ids.pendeltonAccount,
      requiredApproverRolesJson: JSON.stringify(["registrar", "admin"]),
      requiredCount: 1,
      status: "pending",
    },
  });

  await prisma.auditEvent.create({
    data: {
      institutionId: INST,
      actorId: ids.adminAccount,
      eventName: "seed.complete",
      purpose: "bootstrap",
      afterJson: JSON.stringify({ ok: true }),
      source: "seed",
      correlationId: "seed-fd07",
    },
  });

  await prisma.portalRecord.createMany({
    data: PORTAL.map((p, i) => ({
      institutionId: INST,
      screenPath: p.screenPath,
      role: p.role,
      primaryText: p.primaryText,
      secondaryText: p.secondaryText,
      metaText: p.metaText,
      href: p.href,
      sortOrder: p.sortOrder ?? i,
      audienceAccountId: p.audienceAccountId,
    })),
  });

  // Admin SIS screens compose live from domain tables — clear any leftover fixture payloads.
  await prisma.sisScreenState.deleteMany({ where: { institutionId: INST } });
  console.log("SisScreenState cleared (domain-composed at request time)");

  await prisma.admissionsApplication.create({
    data: {
      id: ids.application1,
      institutionId: INST,
      accountId: ids.applicantAccount,
      personId: ids.applicantPerson,
      programName: "Nursing diploma",
      intakeTerm: "Fall 2026",
      status: "draft",
      progressPct: 45,
      notes: "International applicant · Surrey campus preference",
      documents: {
        create: [
          {
            id: ids.appDocPassport,
            institutionId: INST,
            label: "Passport scan",
            status: "uploaded",
            fileName: "passport_scan.pdf",
          },
          {
            id: ids.appDocTranscript,
            institutionId: INST,
            label: "Official transcript",
            status: "missing",
          },
          {
            id: ids.appDocResume,
            institutionId: INST,
            label: "Resume / CV",
            status: "missing",
          },
        ],
      },
      offers: {
        create: [
          {
            id: ids.appOffer1,
            institutionId: INST,
            title: "Conditional offer · Nursing diploma",
            status: "pending",
            conditions: "Complete document packet + deposit within 14 days",
            expiresOn: "2026-10-15",
          },
        ],
      },
      timeline: {
        create: [
          {
            institutionId: INST,
            title: "Application started",
            detail: "Nursing diploma draft created",
            occurredAt: new Date("2026-09-01T10:00:00Z"),
          },
          {
            institutionId: INST,
            title: "Passport uploaded",
            detail: "Awaiting remaining documents",
            occurredAt: new Date("2026-09-05T16:30:00Z"),
          },
        ],
      },
    },
  });

  await prisma.employerOrg.create({
    data: {
      id: ids.employerOrg1,
      institutionId: INST,
      accountId: ids.employerAccount,
      name: "Fraser Health",
      siteName: "Surrey Memorial · Clinical unit A",
      contactEmail: "sam.okello@fraserhealth.partner",
      agreements: {
        create: [
          {
            id: ids.agreement1,
            institutionId: INST,
            title: "Affiliation MOU 2026–2028",
            status: "active",
            renewsOn: "2028-06-30",
          },
        ],
      },
      placements: {
        create: [
          {
            id: ids.placement1,
            institutionId: INST,
            studentName: "Mei Chen",
            programName: "Nursing · NURS400",
            status: "active",
            startsOn: "2026-09-08",
            endsOn: "2026-12-12",
            hours: {
              create: [
                {
                  id: ids.hours1,
                  institutionId: INST,
                  weekLabel: "Week 38",
                  hours: 32,
                  status: "pending",
                },
                {
                  id: ids.hours2,
                  institutionId: INST,
                  weekLabel: "Week 37",
                  hours: 28,
                  status: "approved",
                },
              ],
            },
            evaluations: {
              create: [
                {
                  id: ids.eval1,
                  institutionId: INST,
                  studentName: "Mei Chen",
                  status: "due",
                },
              ],
            },
          },
          {
            id: ids.placement2,
            institutionId: INST,
            studentName: "Fatima Hassan",
            programName: "Nursing · NURS400",
            status: "active",
            startsOn: "2026-09-08",
            endsOn: "2026-12-12",
          },
        ],
      },
    },
  });

  await prisma.messageThread.create({
    data: {
      institutionId: INST,
      subject: "Admissions · document checklist",
      participantAccountIdsJson: JSON.stringify([ids.applicantAccount, ids.adminAccount]),
      messages: {
        create: {
          institutionId: INST,
          senderAccountId: ids.adminAccount,
          body: "Hi Nora — please upload your transcript and resume to complete the packet.",
        },
      },
    },
  });

  console.log("FD-07 + portal + applicant/employer seed complete. Password for all accounts: Heritage!2026");
  console.log("Applicant: nora.reyes@applicant.heritage.edu");
  console.log("Employer: sam.okello@fraserhealth.partner");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

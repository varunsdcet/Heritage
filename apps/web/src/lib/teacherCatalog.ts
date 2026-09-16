export type TeacherArchetype =
  | "dashboard"
  | "profileBio"
  | "profileTopics"
  | "availability"
  | "compensation"
  | "schedule"
  | "settings"
  | "security"
  | "accomplishments"
  | "courseList"
  | "courseDetail"
  | "courseMgmt"
  | "announcements"
  | "versionEditor"
  | "evaluations"
  | "repository"
  | "pendingSchedules"
  | "courseHistory"
  | "table"
  | "form"
  | "cards"
  | "splitPane"
  | "lectures"
  | "lectureReview"
  | "labSession"
  | "approval"
  | "modal"
  | "aiStudio"
  | "studioGeneration"
  | "outcomeMapping"
  | "questionGenerator"
  | "rubricGenerator"
  | "messages"
  | "notifications"
  | "timetable"
  | "fileManager"
  | "helpSupport"
  | "attendanceSession"
  | "attendanceReview"
  | "assessmentBuilder"
  | "gradingSchemes"
  | "pendingGrades"
  | "workshops"
  | "workshopDetail"
  | "studentsDirectory"
  | "studentDetail"
  | "hub"
  | "grades"
  | "scheduler"
  | "calendar"
  | "syllabusDiff"
  | "authGate"
  | "alertList"
  | "gradebook"
  | "statusFilter";

export type TeacherBadgeTone =
  | "active"
  | "review"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "success"
  | "draft";

export type TeacherScreenConfig = {
  path: string;
  figmaId: string;
  title: string;
  subtitle: string;
  breadcrumbs: string[];
  activeHref: string;
  archetype: TeacherArchetype;
  shell?: "campus" | "studio";
  primaryAction?: string;
  primaryActionHref?: string;
  secondaryAction?: string;
  secondaryActionHref?: string;
  searchPlaceholder?: string;
  filters?: string[];
  countLabel?: string;
  columns?: string[];
  columnTemplate?: string;
  rows?: Array<{
    cells: string[];
    primary?: string;
    secondary?: string;
    badge?: string;
    badgeTone?: TeacherBadgeTone;
    href?: string;
    action?: string;
  }>;
  kpis?: Array<{
    label: string;
    value: string;
    hint: string;
    tone?: "up" | "danger" | "muted" | "highlight";
  }>;
  dashboard?: {
    greeting: string;
    name: string;
    meta: string;
    statusBadge: string;
    quickActions: Array<{ label: string; href: string; variant?: "primary" | "secondary" | "ai" }>;
    timetable: Array<{
      time: string;
      code: string;
      title: string;
      room: string;
      status: string;
      statusTone?: TeacherBadgeTone;
      action?: string;
      href?: string;
    }>;
    announcements: Array<{ title: string; body: string; when: string }>;
    alerts: Array<{ title: string; body: string; tone: "critical" | "warning" | "info" }>;
    officeHours: Array<{ day: string; window: string; mode: string; remaining?: string }>;
  };
  profileBio?: {
    name: string;
    role: string;
    department: string;
    initials: string;
    staffId: string;
    tabs: Array<{ label: string; href: string; active?: boolean }>;
    personal: Array<{ label: string; value: string }>;
    academic: Array<{ label: string; value: string }>;
    expertise: string[];
    bio: string;
  };
  profileTopics?: {
    tabs: Array<{ label: string; href: string; active?: boolean }>;
    teaching: string[];
    research: string[];
    certifications: Array<{ name: string; issuer: string; year: string }>;
  };
  availability?: {
    tabs: Array<{ label: string; href: string; active?: boolean }>;
    slots: Array<{ day: string; start: string; end: string; mode: string; location: string }>;
    note?: string;
  };
  compensation?: {
    tabs: Array<{ label: string; href: string; active?: boolean }>;
    summary: Array<{ label: string; value: string }>;
    payPeriods: Array<{ period: string; amount: string; status: string; tone?: TeacherBadgeTone }>;
    contracts: Array<{ title: string; detail: string; status: string }>;
  };
  schedule?: {
    tabs: Array<{ label: string; href: string; active?: boolean }>;
    weeks: Array<{
      label: string;
      entries: Array<{ day: string; time: string; course: string; room: string }>;
    }>;
  };
  settings?: {
    groups: Array<{
      title: string;
      fields: Array<{ label: string; value: string; hint?: string }>;
    }>;
  };
  security?: {
    mfaEnabled: boolean;
    sessions: Array<{ device: string; location: string; lastActive: string; current?: boolean }>;
    recentActivity: Array<{ event: string; when: string }>;
  };
  accomplishments?: {
    stats: Array<{ label: string; value: string }>;
    items: Array<{ title: string; detail: string; year: string; tone?: TeacherBadgeTone }>;
  };
  courseList?: {
    filters: string[];
    courses: Array<{
      code: string;
      title: string;
      term: string;
      schedule: string;
      room: string;
      enrolled: string;
      capacity: string;
      status: string;
      statusTone?: TeacherBadgeTone;
      href: string;
    }>;
  };
  courseDetail?: {
    code: string;
    title: string;
    meta: string;
    status: string;
    tabs: string[];
    activeTab?: string;
    overview: Array<{ label: string; value: string }>;
    modules: Array<{ title: string; items: number; status: string }>;
    team: Array<{ name: string; role: string; initials: string }>;
  };
  courseMgmt?: {
    tools: Array<{ title: string; detail: string; href: string; badge?: string }>;
  };
  announcements?: {
    course: string;
    posts: Array<{ title: string; body: string; when: string; audience: string; pinned?: boolean }>;
  };
  versionEditor?: {
    course: string;
    version: string;
    notice: string;
    outline: Array<{ id: string; label: string; children?: string[] }>;
    editor: { title: string; body: string; wordCount: string };
    versions: Array<{ label: string; when: string; author: string; current?: boolean }>;
  };
  evaluations?: {
    summary: Array<{ label: string; value: string; hint: string }>;
    comments: Array<{ rating: string; text: string; term: string }>;
  };
  repository?: {
    folders: Array<{ name: string; files: number; updated: string }>;
    files: Array<{ name: string; type: string; size: string; updated: string }>;
  };
  pendingSchedules?: {
    requests: Array<{
      course: string;
      requested: string;
      proposer: string;
      status: string;
      tone?: TeacherBadgeTone;
    }>;
  };
  courseHistory?: {
    terms: Array<{
      term: string;
      courses: Array<{ code: string; title: string; enrollment: string; avgEval: string }>;
    }>;
  };
  form?: {
    groups: Array<{
      title: string;
      fields: Array<{ label: string; value: string; type?: "text" | "select" | "textarea" | "number" }>;
    }>;
    submitLabel?: string;
  };
  cards?: {
    items: Array<{
      title: string;
      subtitle: string;
      meta: string;
      badge?: string;
      badgeTone?: TeacherBadgeTone;
      href?: string;
    }>;
  };
  splitPane?: {
    leftTitle: string;
    leftItems: Array<{ label: string; meta: string; active?: boolean }>;
    rightTitle: string;
    rightFields: Array<{ label: string; value: string }>;
    resources?: Array<{ name: string; type: string; size: string }>;
  };
  lectures?: {
    course: string;
    sessions: Array<{
      title: string;
      when: string;
      duration: string;
      status: string;
      tone?: TeacherBadgeTone;
      href?: string;
    }>;
  };
  lectureReview?: {
    title: string;
    meta: string;
    transcript: string;
    highlights: string[];
    aiNotes: string;
  };
  labSession?: {
    course: string;
    labs: Array<{
      title: string;
      when: string;
      room: string;
      capacity: string;
      status: string;
      tone?: TeacherBadgeTone;
    }>;
  };
  approval?: {
    course: string;
    steps: Array<{ label: string; state: "done" | "current" | "todo" }>;
    summary: Array<{ label: string; value: string }>;
    reviewers: Array<{ name: string; role: string; status: string }>;
    comments: Array<{ author: string; body: string; when: string; role?: string }>;
  };
  syllabusDiff?: {
    badge: string;
    currentTitle: string;
    proposedTitle: string;
    current: Array<{ label: string; value: string }>;
    proposed: Array<{ label: string; value?: string; added?: string; removed?: string }>;
    comments: Array<{ author: string; role: string; when: string; body: string }>;
  };
  workshops?: {
    tabs: string[];
    activeTab: string;
    credits: string;
    cards: Array<{
      tag: string;
      org: string;
      seats: string;
      title: string;
      description: string;
      when: string;
      where: string;
      href?: string;
    }>;
    registrations: Array<{ title: string; when: string }>;
  };
  workshopDetail?: {
    title: string;
    status: string;
    when: string;
    where: string;
    seats: string;
    description: string;
    agenda: string[];
    materials: Array<{ label: string; meta: string }>;
  };
  studentsDirectory?: {
    rosterFilter: string;
    riskFilter: string;
    note: string;
    students: Array<{
      id: string;
      name: string;
      program: string;
      attendance: string;
      gpa: string;
      missing: string;
      risk: string;
      riskTone: TeacherBadgeTone;
    }>;
    drawer: { name: string; meta: string; alert: string; body: string; action: string };
  };
  studentDetail?: {
    name: string;
    meta: string;
    tabs: string[];
    fields: Array<{ label: string; value: string }>;
    alerts: Array<{ title: string; body: string; tone: TeacherBadgeTone }>;
    courses: Array<{ code: string; title: string; grade: string; status: string }>;
  };
  hub?: {
    cards: Array<{ title: string; body: string; href: string; meta?: string }>;
  };
  gradesQueue?: Array<{
    code: string;
    title: string;
    instructor: string;
    submitted: string;
    enrolled: string;
    distribution: string;
    bars: [number, number, number, number?];
    status: string;
  }>;
  scheduler?: {
    days: string[];
    slots: Array<{
      day: number;
      start: string;
      end: string;
      label: string;
      room: string;
      tone?: "primary" | "muted";
    }>;
  };
  calendarBoard?: {
    months: string[];
    events: Array<{ date: string; label: string; tone?: TeacherBadgeTone }>;
  };
  authGate?: {
    heading: string;
    description: string;
    fieldLabel: string;
    fieldValue: string;
    cta: string;
    help: string;
    extraFields?: Array<{ label: string; value: string }>;
  };
  alertList?: {
    badge: string;
    items: Array<{
      name: string;
      course: string;
      tag: string;
      tagTone: "danger" | "warning" | "info";
      body: string;
      avatar?: string;
    }>;
  };
  gradebook?: {
    course: string;
    publishLabel: string;
    columns: string[];
    rows: Array<{
      name: string;
      id: string;
      assessments: string[];
      total: string;
      letter: string;
      status: string;
    }>;
    legend?: string[];
  };
  statusFilter?: {
    filters: Array<{ label: string; count: string; active?: boolean }>;
    columns: string[];
    rows: Array<{
      cells: string[];
      badge?: string;
      badgeTone?: TeacherBadgeTone;
    }>;
  };
  modal?: {
    title: string;
    description: string;
    fields: Array<{ label: string; value: string; type?: "text" | "select" | "time" }>;
    confirmLabel: string;
    cancelLabel: string;
    backdropHref?: string;
  };
  aiStudio?: {
    eyebrow: string;
    courseTitle: string;
    version: string;
    drafts: Array<{ version: string; status: string; tone?: TeacherBadgeTone; detail?: string }>;
    tabs: string[];
    activeTab?: string;
    sources: Array<{ name: string; status: string; size?: string }>;
  };
  studioGeneration?: {
    wizardTitle: string;
    badge?: string;
    steps: Array<{ label: string; state: "done" | "current" | "todo" }>;
    progressLabel: string;
    progressPct: number;
    sources: string[];
    cards: Array<{
      kind: string;
      drafted?: string;
      title: string;
      body: string;
      citations: string[];
    }>;
  };
  outcomeMapping?: {
    clos: Array<{ id: string; label: string; coverage: number }>;
    bloomRows: Array<{
      level: string;
      verb?: string;
      tags?: string[];
      cells?: Array<{ tags: string[] }>;
    }>;
  };
  questionGenerator?: {
    topic: string;
    difficulty: string;
    type: string;
    count: string;
    questions: Array<{
      id: string;
      prompt: string;
      options: Array<{ key: string; text: string; correct?: boolean }>;
    }>;
  };
  rubricGenerator?: {
    criteria: Array<{
      name: string;
      weight: string;
      excellent: string;
      proficient: string;
      developing: string;
      beginning: string;
    }>;
  };
  messages?: {
    threads: Array<{
      id: string;
      name: string;
      role: string;
      preview: string;
      unread?: number;
      time: string;
    }>;
    chat: Array<
      | { kind: "message"; from: "them" | "me"; text: string; time: string }
      | { kind: "attachment"; name: string; size: string; time: string }
      | { kind: "system"; text: string }
    >;
    context: {
      program: string;
      grade: string;
      gradePct: string;
      attendance: string;
      attendanceTone: string;
      missing: string;
      sharedFiles: Array<{ name: string; size: string }>;
    };
  };
  notifications?: {
    filters: Array<{ label: string; count?: number }>;
    items: Array<{
      title: string;
      body: string;
      when: string;
      category: string;
      unread?: boolean;
      tone?: TeacherBadgeTone;
    }>;
    pagination: string;
  };
  timetable?: {
    rangeLabel: string;
    termLabel: string;
    views: string[];
    activeView?: string;
    filters: string[];
    days: Array<{
      label: string;
      date: string;
      events: Array<{ title: string; time: string; tone: "blue" | "green" | "purple" | "orange" }>;
    }>;
  };
  fileManager?: {
    courseTitle: string;
    breadcrumbs: string[];
    tree: Array<{ name: string; children?: string[]; active?: boolean }>;
    files: Array<{
      name: string;
      type: string;
      size: string;
      updated: string;
      visibility: "Published" | "Hidden";
      selected?: boolean;
    }>;
  };
  helpSupport?: {
    topics: Array<{ title: string; detail: string; icon?: string }>;
    tickets: Array<{ id: string; subject: string; status: string; tone?: TeacherBadgeTone }>;
    references: Array<{ name: string; meta: string }>;
  };
  attendanceSession?: {
    alert: string;
    classNode: string;
    dateLabel: string;
    rosterTitle: string;
    draftStatus: string;
    students: Array<{
      name: string;
      id: string;
      status: "Present" | "Absent" | "Late" | "Excused";
      note: string;
      pct: string;
      atRisk?: boolean;
      avatar?: string;
    }>;
    stats: Array<{ label: string; count: number; pct: string }>;
  };
  attendanceReview?: {
    filters: Array<{ label: string; count: number; active?: boolean }>;
    requests: Array<{
      name: string;
      id: string;
      course: string;
      date: string;
      current: string;
      requested: string;
      reason: string;
      attachment: string;
    }>;
    compliance: {
      student: string;
      fromPct: string;
      toPct: string;
      badge: string;
    };
    logNote: string;
  };
  assessmentBuilder?: {
    crumb: string[];
    heading: string;
    description: string;
    title: string;
    type: string;
    weight: string;
    rubricHeaders: string[];
    rubricRows: Array<{ criterion: string; excellent: string; good: string; poor: string }>;
    uploadHint: string;
    uploadFormats: string;
    preview: {
      badge: string;
      title: string;
      weight: string;
      openDate: string;
      dueDate: string;
    };
  };
  gradingSchemes?: {
    schemeLabel: string;
    rows: Array<{
      letter: string;
      min: string;
      max: string;
      gpa: string;
      description: string;
      status: "PASS" | "FAIL";
      letterTone: "a" | "b" | "c" | "d" | "f";
    }>;
    distribution: Array<{ label: string; meta: string; pct: number; tone: "a" | "b" | "c" | "d" | "f" }>;
    presets: Array<{ label: string; value: string; tone: "warning" | "success" }>;
  };
  pendingGrades?: {
    alert: string;
    queueTitle: string;
    actionBadge: string;
    rows: Array<{
      code: string;
      title: string;
      teacher: string;
      students: string;
      missing: string;
      missingTone: "ok" | "warn";
      status: "SUBMITTED" | "UNDER REVIEW" | "REJECTED";
      active?: boolean;
    }>;
    audit: {
      title: string;
      locked: string;
      average: string;
      notes: string;
      rejectPlaceholder: string;
    };
  };
};

const PROFILE_TABS = [
  { label: "Biography", href: "/instructor/f/t02-profile-biography" },
  { label: "Topics & Expertise", href: "/instructor/f/t03-profile-topics" },
  { label: "Availability", href: "/instructor/f/t04-profile-availability" },
  { label: "Compensation", href: "/instructor/f/t05-profile-compensation" },
  { label: "Schedule", href: "/instructor/f/t06-profile-schedule" },
] as const;

function profileTabs(activeHref: string) {
  return PROFILE_TABS.map((t) => ({ ...t, active: t.href === activeHref }));
}

function makeTable(
  partial: Omit<TeacherScreenConfig, "archetype"> & {
    columns: string[];
    rows: NonNullable<TeacherScreenConfig["rows"]>;
    archetype?: TeacherArchetype;
  },
): TeacherScreenConfig {
  const { archetype = "table", ...rest } = partial;
  return {
    archetype,
    searchPlaceholder: `Search ${partial.title.toLowerCase()}…`,
    filters: partial.filters || ["Term: Fall 2026", "Status", "Department"],
    countLabel: partial.countLabel || `${partial.rows.length} records`,
    columnTemplate:
      partial.columnTemplate ||
      "minmax(140px,1.2fr) minmax(120px,1fr) minmax(100px,0.8fr) minmax(100px,0.8fr) minmax(90px,0.6fr) minmax(80px,0.5fr)",
    ...rest,
  };
}

export const TEACHER_SCREENS: Record<string, TeacherScreenConfig> = {
  "/instructor": {
    path: "/instructor",
    figmaId: "3:3698",
    title: "Teacher Dashboard",
    subtitle: "Faculty teaching workspace for Fall 2026.",
    breadcrumbs: ["Home", "Dashboard"],
    activeHref: "/instructor",
    archetype: "dashboard",
    kpis: [
      { label: "Active Courses", value: "4", hint: "This Term", tone: "up" },
      { label: "Today's Classes", value: "3", hint: "Lectures", tone: "highlight" },
      { label: "Pending Grading", value: "12", hint: "Submissions", tone: "danger" },
      { label: "Pending Attendance", value: "2", hint: "Classes", tone: "muted" },
    ],
    dashboard: {
      greeting: "Good Morning,",
      name: "Dr. Sarah Mitchell",
      meta: "Associate Professor • Fall 2026 Term • Business Administration Department",
      statusBadge: "DEPT_CHAIR_REVIEWS: PENDING",
      quickActions: [
        { label: "Mark Attendance", href: "/instructor/attendance", variant: "primary" },
        { label: "Enter Grades", href: "/instructor/gradebook", variant: "secondary" },
        { label: "Add Availability", href: "/instructor/f/t25-add-availability-modal", variant: "secondary" },
        { label: "Open AI Course Studio", href: "/instructor/f/in-12-ai-course-studio", variant: "ai" },
      ],
      timetable: [
        {
          time: "09:00 – 10:30",
          code: "ACC201",
          title: "Financial Accounting I",
          room: "Hall A-102",
          status: "In 45 min",
          statusTone: "info",
          action: "LAUNCH",
          href: "/instructor/f/t08-my-courses-detail",
        },
        {
          time: "11:00 – 12:30",
          code: "FIN301",
          title: "Corporate Finance",
          room: "Hall B-204",
          status: "Upcoming",
          statusTone: "muted",
          action: "LAUNCH",
          href: "/instructor/f/t08-my-courses-detail",
        },
        {
          time: "14:00 – 15:30",
          code: "ACC201",
          title: "Financial Accounting I — Lab",
          room: "Lab C-01",
          status: "Upcoming",
          statusTone: "muted",
          action: "LAUNCH",
          href: "/instructor/f/in-10-lab-sessions",
        },
      ],
      announcements: [
        {
          title: "Midterm Exam Schedule Released",
          body: "ACC201 midterm is scheduled for Oct 15 in Hall A-102. Review sessions available.",
          when: "2 hours ago",
        },
        {
          title: "Library Hours Extended",
          body: "Main library will remain open until 11 PM during midterm week.",
          when: "Yesterday",
        },
        {
          title: "Faculty Senate Meeting",
          body: "Monthly faculty senate meeting on Thursday at 3 PM in Conference Room B.",
          when: "2 days ago",
        },
      ],
      alerts: [
        {
          title: "Grade Submission Deadline",
          body: "FIN301 midterm grades due in 3 days. 8 submissions still pending review.",
          tone: "critical",
        },
        {
          title: "Attendance Incomplete",
          body: "2 class sessions from last week need attendance records completed.",
          tone: "warning",
        },
        {
          title: "New Student Enrolled",
          body: "Marcus Vance has been added to ACC201 Section A. Roster updated.",
          tone: "info",
        },
      ],
      officeHours: [
        { day: "Today", window: "16:00 – 17:30", mode: "In-Person · Office 312", remaining: "In 5 hours" },
        { day: "Tomorrow", window: "10:00 – 11:00", mode: "Virtual · Zoom", remaining: "Tomorrow" },
        { day: "Thursday", window: "14:00 – 15:30", mode: "In-Person · Office 312" },
      ],
    },
  },

  "/instructor/sections": {
    path: "/instructor/sections",
    figmaId: "3:4608",
    title: "My Courses",
    subtitle: "Courses you are teaching this term.",
    breadcrumbs: ["Home", "My Courses"],
    activeHref: "/instructor/sections",
    archetype: "courseList",
    primaryAction: "Browse Catalog",
    primaryActionHref: "/instructor/f/t37-course-repository",
    courseList: {
      filters: ["Fall 2026", "All Status", "Accounting & Finance"],
      courses: [
        {
          code: "ACC201",
          title: "Financial Accounting I",
          term: "Fall 2026",
          schedule: "Mon / Wed 09:00–10:30",
          room: "Hall A-102",
          enrolled: "42",
          capacity: "45",
          status: "Active",
          statusTone: "active",
          href: "/instructor/f/t08-my-courses-detail",
        },
        {
          code: "FIN301",
          title: "Corporate Finance",
          term: "Fall 2026",
          schedule: "Tue / Thu 11:00–12:30",
          room: "Hall B-204",
          enrolled: "38",
          capacity: "40",
          status: "Active",
          statusTone: "active",
          href: "/instructor/f/t08-my-courses-detail",
        },
        {
          code: "MKT210",
          title: "Principles of Marketing",
          term: "Fall 2026",
          schedule: "Wed 14:00–17:00",
          room: "Hall C-110",
          enrolled: "35",
          capacity: "40",
          status: "Active",
          statusTone: "active",
          href: "/instructor/f/t08-my-courses-detail",
        },
        {
          code: "BUS405",
          title: "Strategic Management",
          term: "Fall 2026",
          schedule: "Fri 09:00–12:00",
          room: "Seminar 5",
          enrolled: "28",
          capacity: "30",
          status: "Draft Modules",
          statusTone: "review",
          href: "/instructor/f/t26-course-version-editor",
        },
      ],
    },
  },

  "/instructor/f/t02-profile-biography": {
    path: "/instructor/f/t02-profile-biography",
    figmaId: "3:3890",
    title: "Manage My Profile",
    subtitle: "Keep your faculty biography and contact details current.",
    breadcrumbs: ["Home", "My Profile", "Biography"],
    activeHref: "/instructor/f/t02-profile-biography",
    archetype: "profileBio",
    primaryAction: "Save Changes",
    secondaryAction: "Cancel",
    profileBio: {
      name: "Dr. Sarah Mitchell",
      role: "Lead Instructor",
      department: "Accounting & Finance",
      initials: "SM",
      staffId: "EMP-2847",
      tabs: profileTabs("/instructor/f/t02-profile-biography"),
      personal: [
        { label: "Full Name", value: "Dr. Sarah Elizabeth Mitchell" },
        { label: "Preferred Name", value: "Dr. Sarah Mitchell" },
        { label: "Email", value: "s.mitchell@heritage.edu" },
        { label: "Phone", value: "+1 (416) 555-0198" },
        { label: "Office", value: "Building A · Room 312" },
        { label: "Pronouns", value: "She / Her" },
      ],
      academic: [
        { label: "Highest Degree", value: "Ph.D. Accounting — University of Toronto" },
        { label: "Years Teaching", value: "12 years" },
        { label: "Department", value: "Accounting & Finance" },
        { label: "Faculty Rank", value: "Lead Instructor" },
        { label: "Hire Date", value: "August 15, 2014" },
        { label: "Staff ID", value: "EMP-2847" },
      ],
      expertise: ["Financial Reporting", "IFRS", "Managerial Accounting", "Audit Analytics", "ESG Reporting"],
      bio: "Dr. Sarah Mitchell is a Lead Instructor in Accounting & Finance at Heritage Community College. Her teaching focuses on financial reporting standards, corporate finance foundations, and applied analytics for undergraduate learners. She previously practiced as a CPA auditor and publishes on ESG disclosure quality.",
    },
  },

  "/instructor/f/t03-profile-topics": {
    path: "/instructor/f/t03-profile-topics",
    figmaId: "3:4011",
    title: "Topics & Expertise",
    subtitle: "Subject areas used for course matching and student discovery.",
    breadcrumbs: ["Home", "My Profile", "Topics"],
    activeHref: "/instructor/f/t02-profile-biography",
    archetype: "profileTopics",
    primaryAction: "Save Topics",
    profileTopics: {
      tabs: profileTabs("/instructor/f/t03-profile-topics"),
      teaching: [
        "Financial Accounting",
        "Managerial Accounting",
        "Corporate Finance",
        "Audit & Assurance",
        "Taxation Fundamentals",
      ],
      research: ["ESG Reporting Quality", "IFRS Adoption Impacts", "Learning Analytics in Accounting"],
      certifications: [
        { name: "CPA, Ontario", issuer: "CPA Ontario", year: "2012" },
        { name: "CFA Level II", issuer: "CFA Institute", year: "2016" },
        { name: "Certified Online Instructor", issuer: "Quality Matters", year: "2021" },
      ],
    },
  },

  "/instructor/f/t04-profile-availability": {
    path: "/instructor/f/t04-profile-availability",
    figmaId: "3:4135",
    title: "Availability",
    subtitle: "Office hours and booking windows students can request.",
    breadcrumbs: ["Home", "My Profile", "Availability"],
    activeHref: "/instructor/f/t02-profile-biography",
    archetype: "availability",
    primaryAction: "Add Slot",
    primaryActionHref: "/instructor/f/t25-add-availability-modal",
    availability: {
      tabs: profileTabs("/instructor/f/t04-profile-availability"),
      slots: [
        { day: "Monday", start: "16:00", end: "17:30", mode: "In-Person", location: "Office 312" },
        { day: "Tuesday", start: "10:00", end: "11:00", mode: "Virtual", location: "Zoom Faculty Room" },
        { day: "Thursday", start: "14:00", end: "15:30", mode: "In-Person", location: "Office 312" },
        { day: "Friday", start: "09:00", end: "10:00", mode: "By Appointment", location: "Office 312" },
      ],
      note: "Students may book up to 2 weeks in advance. Buffer of 10 minutes between appointments.",
    },
  },

  "/instructor/f/t05-profile-compensation": {
    path: "/instructor/f/t05-profile-compensation",
    figmaId: "3:4278",
    title: "Compensation",
    subtitle: "Contract load, pay periods, and stipend visibility.",
    breadcrumbs: ["Home", "My Profile", "Compensation"],
    activeHref: "/instructor/f/t02-profile-biography",
    archetype: "compensation",
    compensation: {
      tabs: profileTabs("/instructor/f/t05-profile-compensation"),
      summary: [
        { label: "Base Appointment", value: "Full-time Faculty" },
        { label: "Teaching Load", value: "4 courses · Fall 2026" },
        { label: "Contact Hours", value: "12 hrs / week" },
        { label: "YTD Earnings", value: "$68,420" },
      ],
      payPeriods: [
        { period: "Sep 1 – Sep 15, 2026", amount: "$3,850.00", status: "Paid", tone: "success" },
        { period: "Sep 16 – Sep 30, 2026", amount: "$3,850.00", status: "Paid", tone: "success" },
        { period: "Oct 1 – Oct 15, 2026", amount: "$3,850.00", status: "Scheduled", tone: "info" },
      ],
      contracts: [
        { title: "AY 2026–27 Faculty Contract", detail: "Accounting & Finance · Lead Instructor", status: "Active" },
        { title: "AI Course Studio Stipend", detail: "Pilot program · Fall 2026", status: "Pending HR" },
      ],
    },
  },

  "/instructor/f/t06-profile-schedule": {
    path: "/instructor/f/t06-profile-schedule",
    figmaId: "3:4396",
    title: "Teaching Schedule",
    subtitle: "Weekly teaching commitments across your sections.",
    breadcrumbs: ["Home", "My Profile", "Schedule"],
    activeHref: "/instructor/f/t02-profile-biography",
    archetype: "schedule",
    schedule: {
      tabs: profileTabs("/instructor/f/t06-profile-schedule"),
      weeks: [
        {
          label: "Week of Oct 6, 2026",
          entries: [
            { day: "Mon", time: "09:00–10:30", course: "ACC201 · Lecture", room: "A-102" },
            { day: "Mon", time: "16:00–17:30", course: "Office Hours", room: "312" },
            { day: "Tue", time: "11:00–12:30", course: "FIN301 · Lecture", room: "B-204" },
            { day: "Wed", time: "09:00–10:30", course: "ACC201 · Lecture", room: "A-102" },
            { day: "Wed", time: "14:00–17:00", course: "MKT210 · Workshop", room: "C-110" },
            { day: "Thu", time: "11:00–12:30", course: "FIN301 · Lecture", room: "B-204" },
            { day: "Fri", time: "09:00–12:00", course: "BUS405 · Seminar", room: "Sem 5" },
          ],
        },
      ],
    },
  },

  "/instructor/f/t08-my-courses-detail": {
    path: "/instructor/f/t08-my-courses-detail",
    figmaId: "3:4781",
    title: "ACC201 — Financial Accounting I",
    subtitle: "Course workspace for Fall 2026 Section A.",
    breadcrumbs: ["Home", "My Courses", "ACC201"],
    activeHref: "/instructor/sections",
    archetype: "courseDetail",
    primaryAction: "Open Gradebook",
    primaryActionHref: "/instructor/gradebook",
    secondaryAction: "Announcements",
    secondaryActionHref: "/instructor/f/t23-course-announcements",
    courseDetail: {
      code: "ACC201",
      title: "Financial Accounting I",
      meta: "Fall 2026 · Section A · Mon/Wed 09:00–10:30 · Hall A-102 · 42/45 enrolled",
      status: "Published",
      tabs: ["Overview", "Modules", "Roster", "Assessments", "Lectures", "Labs", "Resources"],
      activeTab: "Overview",
      overview: [
        { label: "Credits", value: "3.0" },
        { label: "Delivery", value: "In-person + Lab" },
        { label: "Term Dates", value: "Sep 2 – Dec 12, 2026" },
        { label: "Passing Grade", value: "60%" },
        { label: "Coordinator", value: "Dr. Sarah Mitchell" },
        { label: "Last Updated", value: "Oct 4, 2026" },
      ],
      modules: [
        { title: "Module 1 — Accounting Cycle", items: 6, status: "Complete" },
        { title: "Module 2 — Adjusting Entries", items: 5, status: "In Progress" },
        { title: "Module 3 — Financial Statements", items: 7, status: "Draft" },
        { title: "Module 4 — Cash & Receivables", items: 4, status: "Not Started" },
      ],
      team: [
        { name: "Dr. Sarah Mitchell", role: "Lead Instructor", initials: "SM" },
        { name: "James Okonkwo", role: "Teaching Assistant", initials: "JO" },
        { name: "Priya Shah", role: "Lab Facilitator", initials: "PS" },
      ],
    },
  },

  "/instructor/f/t14-course-management": {
    path: "/instructor/f/t14-course-management",
    figmaId: "3:5722",
    title: "Course Management",
    subtitle: "Administrative tools for course setup and maintenance.",
    breadcrumbs: ["Home", "Course Management"],
    activeHref: "/instructor/f/t14-course-management",
    archetype: "courseMgmt",
    courseMgmt: {
      tools: [
        {
          title: "Active Courses",
          detail: "Review live sections, enrolment, and publish state.",
          href: "/instructor/f/t56-active-courses",
          badge: "4 live",
        },
        {
          title: "Add Course",
          detail: "Create a new course shell for curriculum review.",
          href: "/instructor/f/t55-add-course-form",
        },
        {
          title: "Sessions & Meetings",
          detail: "Manage lecture, lab, and seminar session templates.",
          href: "/instructor/f/t54-courses-sessions",
        },
        {
          title: "Textbooks",
          detail: "Assign required and recommended course materials.",
          href: "/instructor/f/t57-course-textbooks",
        },
        {
          title: "Categories",
          detail: "Organize courses by academic category.",
          href: "/instructor/f/t58-course-categories",
        },
        {
          title: "Groups & Types",
          detail: "Configure course groups and delivery types.",
          href: "/instructor/f/t59-course-groups-types",
        },
        {
          title: "Resources",
          detail: "Upload and tag shared instructional resources.",
          href: "/instructor/f/t60-course-resources-management",
        },
        {
          title: "Version Editor",
          detail: "Edit outline drafts before curriculum approval.",
          href: "/instructor/f/t26-course-version-editor",
          badge: "1 draft",
        },
        {
          title: "Pending Schedules",
          detail: "Approve or return proposed meeting patterns.",
          href: "/instructor/f/t38-pending-course-schedules",
          badge: "3",
        },
        {
          title: "Course Repository",
          detail: "Browse master course definitions and archives.",
          href: "/instructor/f/t37-course-repository",
        },
      ],
    },
  },

  "/instructor/f/t15-settings": {
    path: "/instructor/f/t15-settings",
    figmaId: "3:5875",
    title: "Settings",
    subtitle: "Time zone, locale, and notification preferences.",
    breadcrumbs: ["Home", "Settings"],
    activeHref: "/instructor/f/t15-settings",
    archetype: "settings",
    primaryAction: "Save Preferences",
    settings: {
      groups: [
        {
          title: "Locale & Time",
          fields: [
            { label: "Time Zone", value: "America/Toronto (Eastern)", hint: "Used for timetable and office hours" },
            { label: "Date Format", value: "MMM D, YYYY" },
            { label: "Time Format", value: "24-hour" },
            { label: "Language", value: "English (Canada)" },
          ],
        },
        {
          title: "Notifications",
          fields: [
            { label: "Email Digests", value: "Daily at 07:00" },
            { label: "Grade Alerts", value: "Immediate" },
            { label: "Attendance Reminders", value: "Enabled" },
            { label: "Student Messages", value: "Push + Email" },
          ],
        },
        {
          title: "Teaching Defaults",
          fields: [
            { label: "Default Launch Mode", value: "In-person classroom" },
            { label: "Attendance Grace Period", value: "10 minutes" },
            { label: "Grade Release", value: "Manual publish" },
          ],
        },
      ],
    },
  },

  "/instructor/f/t23-course-announcements": {
    path: "/instructor/f/t23-course-announcements",
    figmaId: "4:7509",
    title: "Course Announcements",
    subtitle: "Publish updates to enrolled students in ACC201.",
    breadcrumbs: ["Home", "My Courses", "ACC201", "Announcements"],
    activeHref: "/instructor/sections",
    archetype: "announcements",
    primaryAction: "New Announcement",
    announcements: {
      course: "ACC201 · Financial Accounting I",
      posts: [
        {
          title: "Midterm Review Session",
          body: "Optional review Thursday 16:00–17:00 in Hall A-102. Bring Module 1–2 notes.",
          when: "Oct 5, 2026 · 09:12",
          audience: "All enrolled",
          pinned: true,
        },
        {
          title: "Lab C-01 Access Cards",
          body: "Students without building access should visit Security Desk before Friday lab.",
          when: "Oct 3, 2026 · 14:40",
          audience: "Section A",
        },
        {
          title: "Assignment 2 Extension",
          body: "Deadline moved to Oct 12 23:59 for students affected by transit disruption.",
          when: "Oct 1, 2026 · 18:05",
          audience: "All enrolled",
        },
      ],
    },
  },

  "/instructor/f/t25-add-availability-modal": {
    path: "/instructor/f/t25-add-availability-modal",
    figmaId: "4:7837",
    title: "Add Availability Slot",
    subtitle: "Terminal Availability Hub · Dr. Sarah Mitchell Availability Scheduling",
    breadcrumbs: ["Home", "My Profile", "Availability", "Add Slot"],
    activeHref: "/instructor/f/t02-profile-biography",
    archetype: "modal",
    modal: {
      title: "Add Availability Slot",
      description:
        "This overlaps with ACC201 Sec-A class on Mon 09:00-10:30 AM — please adjust time or contact admin.",
      fields: [
        { label: "Availability Name", value: "Business Admin - Office Hours", type: "text" },
        { label: "Availability Type", value: "Office Hours", type: "select" },
        { label: "Date", value: "Mon Oct 12, 2026", type: "text" },
        { label: "Start Time", value: "09:30 AM", type: "time" },
        { label: "End Time", value: "11:30 AM", type: "time" },
        { label: "Repeat Weekly on", value: "Mon · Wed · Fri", type: "text" },
      ],
      confirmLabel: "Save Availability Slot",
      cancelLabel: "Cancel",
      backdropHref: "/instructor/f/t04-profile-availability",
    },
  },

  "/instructor/f/t26-course-version-editor": {
    path: "/instructor/f/t26-course-version-editor",
    figmaId: "4:7961",
    title: "Course Version Editor",
    subtitle: "Edit BUS405 outline draft before curriculum approval.",
    breadcrumbs: ["Home", "Course Management", "Version Editor"],
    activeHref: "/instructor/f/t14-course-management",
    archetype: "versionEditor",
    primaryAction: "Submit for Approval",
    primaryActionHref: "/instructor/f/in-17-course-approval",
    secondaryAction: "Save Draft",
    versionEditor: {
      course: "BUS405 · Strategic Management",
      version: "v0.4 Draft",
      notice: "This draft is editable. Publishing requires curriculum committee approval.",
      outline: [
        {
          id: "1",
          label: "1. Course Overview",
          children: ["1.1 Description", "1.2 Learning Outcomes", "1.3 Prerequisites"],
        },
        {
          id: "2",
          label: "2. Weekly Modules",
          children: ["2.1 Strategy Foundations", "2.2 External Analysis", "2.3 Competitive Advantage"],
        },
        {
          id: "3",
          label: "3. Assessments",
          children: ["3.1 Case Memo", "3.2 Midterm", "3.3 Capstone Presentation"],
        },
        { id: "4", label: "4. Resources", children: ["4.1 Readings", "4.2 Templates"] },
      ],
      editor: {
        title: "1.2 Learning Outcomes",
        body: "By the end of this course, students will be able to: (1) evaluate industry structure using established strategy frameworks; (2) formulate and defend a competitive strategy for a mid-market firm; (3) communicate strategic recommendations to executive stakeholders with evidence-backed rationale.",
        wordCount: "64 words",
      },
      versions: [
        { label: "v0.4 Draft", when: "Oct 5, 2026", author: "Dr. Sarah Mitchell", current: true },
        { label: "v0.3 Draft", when: "Sep 28, 2026", author: "Dr. Sarah Mitchell" },
        { label: "v0.2 Draft", when: "Sep 12, 2026", author: "Curriculum Office" },
      ],
    },
  },

  "/instructor/f/t34-accomplishments": {
    path: "/instructor/f/t34-accomplishments",
    figmaId: "4:10861",
    title: "Accomplishments",
    subtitle: "Awards, publications, and teaching recognitions.",
    breadcrumbs: ["Home", "My Profile", "Accomplishments"],
    activeHref: "/instructor/f/t34-accomplishments",
    archetype: "accomplishments",
    accomplishments: {
      stats: [
        { label: "Awards", value: "6" },
        { label: "Publications", value: "14" },
        { label: "Conference Talks", value: "9" },
        { label: "Teaching Years", value: "12" },
      ],
      items: [
        {
          title: "Faculty Excellence in Teaching",
          detail: "Heritage Community College · Accounting & Finance",
          year: "2025",
          tone: "success",
        },
        {
          title: "ESG Disclosure Quality in Mid-Market Firms",
          detail: "Journal of Applied Accounting Research",
          year: "2024",
          tone: "info",
        },
        {
          title: "CPA Ontario Mentor of the Year (Nominee)",
          detail: "Student pathway mentoring cohort",
          year: "2023",
          tone: "review",
        },
        {
          title: "Digital Pedagogy Innovation Grant",
          detail: "AI Course Studio pilot funding",
          year: "2026",
          tone: "active",
        },
      ],
    },
  },

  "/instructor/f/t35-security-settings": {
    path: "/instructor/f/t35-security-settings",
    figmaId: "4:11045",
    title: "Security Settings",
    subtitle: "Multi-factor authentication, sessions, and account activity.",
    breadcrumbs: ["Home", "My Profile", "Security"],
    activeHref: "/instructor/f/t35-security-settings",
    archetype: "security",
    primaryAction: "Update Password",
    security: {
      mfaEnabled: true,
      sessions: [
        {
          device: "MacBook Pro · Chrome",
          location: "Toronto, ON",
          lastActive: "Active now",
          current: true,
        },
        { device: "iPhone 15 · Safari", location: "Toronto, ON", lastActive: "2 hours ago" },
        { device: "Campus Lab PC · Edge", location: "Heritage Main", lastActive: "Yesterday" },
      ],
      recentActivity: [
        { event: "Successful sign-in", when: "Today · 08:12" },
        { event: "MFA challenge approved", when: "Today · 08:12" },
        { event: "Password changed", when: "Sep 18, 2026" },
        { event: "Recovery codes regenerated", when: "Aug 02, 2026" },
      ],
    },
  },

  "/instructor/f/t36-course-evaluations": {
    path: "/instructor/f/t36-course-evaluations",
    figmaId: "4:11188",
    title: "Course Evaluations",
    subtitle: "Student feedback summaries for your recent sections.",
    breadcrumbs: ["Home", "My Courses", "Evaluations"],
    activeHref: "/instructor/sections",
    archetype: "evaluations",
    evaluations: {
      summary: [
        { label: "Overall Rating", value: "4.6", hint: "Out of 5.0" },
        { label: "Response Rate", value: "78%", hint: "ACC201 Fall 2025" },
        { label: "Clarity", value: "4.7", hint: "Instruction quality" },
        { label: "Supportiveness", value: "4.8", hint: "Office hours & feedback" },
      ],
      comments: [
        {
          rating: "5.0",
          text: "Clear explanations and practical examples made IFRS topics approachable.",
          term: "Fall 2025 · ACC201",
        },
        {
          rating: "4.0",
          text: "Would like more worked solutions posted before exams.",
          term: "Fall 2025 · ACC201",
        },
        {
          rating: "5.0",
          text: "Office hours were the most helpful part of the course.",
          term: "Winter 2025 · FIN301",
        },
      ],
    },
  },

  "/instructor/f/t37-course-repository": makeTable({
    path: "/instructor/f/t37-course-repository",
    figmaId: "4:11353",
    title: "Course Repository",
    subtitle: "SYS.TEACHER_HUB // ACADEMIC_ASSETS",
    breadcrumbs: ["Home", "Course Management", "Repository"],
    activeHref: "/instructor/f/t14-course-management",
    archetype: "repository",
    primaryAction: "Upload Asset",
    countLabel: "86 shared learning assets",
    columns: ["Resource Name", "Course", "Category", "Size", "Actions"],
    columnTemplate:
      "minmax(220px,1.6fr) minmax(90px,0.7fr) minmax(90px,0.7fr) minmax(70px,0.5fr) minmax(80px,0.5fr)",
    rows: [
      {
        cells: ["ACC201_Syllabus_Fall26_v2.pdf", "ACC201", "Syllabi", "1.2 MB", "Download"],
        badge: "Syllabi",
        badgeTone: "info",
        href: "/instructor/f/t08-my-courses-detail",
      },
      {
        cells: ["Week3_Asset_Valuation_LectureNotes.pptx", "FIN301", "Lectures", "14.8 MB", "Download"],
        badge: "Lectures",
        badgeTone: "active",
      },
      {
        cells: ["Interactive_Double_Entry_LabGuide.pdf", "ACC201-L", "Labs", "4.5 MB", "Download"],
        badge: "Labs",
        badgeTone: "warning",
      },
      {
        cells: ["LMS_Instructor_Handbook_OS4.pdf", "Global", "Manuals", "8.1 MB", "Download"],
        badge: "Manuals",
        badgeTone: "muted",
      },
    ],
    repository: {
      folders: [
        { name: "All Resources", files: 86, updated: "Oct 6, 2026" },
        { name: "Course Syllabi", files: 12, updated: "Oct 5, 2026" },
        { name: "Core Lecture Notes", files: 34, updated: "Oct 4, 2026" },
        { name: "Laboratory Guides", files: 18, updated: "Sep 28, 2026" },
        { name: "Audio & Video Media", files: 22, updated: "Sep 20, 2026" },
      ],
      files: [
        { name: "ACC201_Syllabus_Fall26_v2.pdf", type: "Syllabi", size: "1.2 MB", updated: "Oct 5, 2026" },
        { name: "Week3_Asset_Valuation_LectureNotes.pptx", type: "Lectures", size: "14.8 MB", updated: "Oct 3, 2026" },
        { name: "Interactive_Double_Entry_LabGuide.pdf", type: "Labs", size: "4.5 MB", updated: "Sep 28, 2026" },
      ],
    },
  }),

  "/instructor/f/t38-pending-course-schedules": {
    path: "/instructor/f/t38-pending-course-schedules",
    figmaId: "4:11508",
    title: "Pending Course Schedules",
    subtitle: "Proposed meeting patterns awaiting faculty confirmation.",
    breadcrumbs: ["Home", "Course Management", "Pending Schedules"],
    activeHref: "/instructor/f/t14-course-management",
    archetype: "pendingSchedules",
    primaryAction: "Review Queue",
    pendingSchedules: {
      requests: [
        {
          course: "ACC201-A · Mon/Wed 09:00–10:30 · A-102",
          requested: "Oct 4, 2026",
          proposer: "Registrar Scheduling",
          status: "Needs Confirmation",
          tone: "warning",
        },
        {
          course: "FIN301-B · Tue/Thu 13:00–14:30 · B-204",
          requested: "Oct 3, 2026",
          proposer: "Dept. Chair",
          status: "Conflict Detected",
          tone: "danger",
        },
        {
          course: "BUS405 · Fri 09:00–12:00 · Seminar 5",
          requested: "Oct 2, 2026",
          proposer: "Curriculum Office",
          status: "Ready to Approve",
          tone: "info",
        },
      ],
    },
  },

  "/instructor/f/t39-course-history": {
    path: "/instructor/f/t39-course-history",
    figmaId: "4:11657",
    title: "Course History",
    subtitle: "Prior teaching assignments and evaluation averages.",
    breadcrumbs: ["Home", "My Courses", "History"],
    activeHref: "/instructor/sections",
    archetype: "courseHistory",
    courseHistory: {
      terms: [
        {
          term: "Winter 2026",
          courses: [
            { code: "ACC201", title: "Financial Accounting I", enrollment: "44", avgEval: "4.5" },
            { code: "FIN301", title: "Corporate Finance", enrollment: "36", avgEval: "4.7" },
          ],
        },
        {
          term: "Fall 2025",
          courses: [
            { code: "ACC201", title: "Financial Accounting I", enrollment: "41", avgEval: "4.6" },
            { code: "MKT210", title: "Principles of Marketing", enrollment: "33", avgEval: "4.4" },
            { code: "ACC310", title: "Intermediate Accounting", enrollment: "29", avgEval: "4.3" },
          ],
        },
      ],
    },
  },

  "/instructor/f/t54-courses-sessions": makeTable({
    path: "/instructor/f/t54-courses-sessions",
    figmaId: "4:14505",
    title: "Courses & Sessions Catalog",
    subtitle: "SYS.COURSE_REPOSITORY // ALL_WORKSPACES",
    breadcrumbs: ["Home", "Course Management", "Sessions"],
    activeHref: "/instructor/f/t14-course-management",
    primaryAction: "Create Course",
    countLabel: "Showing 5 of 32 courses",
    columns: ["Course Name / Number", "Credit Value", "Sessions Status", "Actions"],
    columnTemplate: "minmax(220px,1.6fr) minmax(100px,0.7fr) minmax(140px,1fr) minmax(90px,0.6fr)",
    rows: [
      {
        cells: ["Computerized Accounting · CAPA-DAP 105", "4.0 Credits", "2 Active • 4 Completed", "Sessions"],
        badge: "Active",
        badgeTone: "active",
      },
      {
        cells: ["Modern Office Technology · CAPA-DAP 106", "3.5 Credits", "1 Active • 2 Completed", "Sessions"],
        badge: "Active",
        badgeTone: "active",
      },
      {
        cells: ["Payroll Compliance Basics · CAPA-DAP 110", "3.0 Credits", "0 Active • 1 Completed", "Sessions"],
        badge: "Completed",
        badgeTone: "muted",
      },
      {
        cells: ["Business Communication Theory · CAPA-DIB 112", "3.0 Credits", "2 Active • 0 Completed", "Sessions"],
        badge: "Active",
        badgeTone: "active",
      },
      {
        cells: ["Essential Workplace Skills · CAPA-Orientation", "1.0 Credits", "0 Active • 8 Completed", "Sessions"],
        badge: "Completed",
        badgeTone: "muted",
      },
    ],
  }),

  "/instructor/f/t55-add-course-form": {
    path: "/instructor/f/t55-add-course-form",
    figmaId: "4:14670",
    title: "Add New Course Instance",
    subtitle: "SYS.COURSE_MANAGER // WORKSPACE_VERIFIER",
    breadcrumbs: ["Home", "Course Management", "Add Course"],
    activeHref: "/instructor/f/t14-course-management",
    archetype: "form",
    primaryAction: "Save Course",
    secondaryAction: "Cancel",
    form: {
      submitLabel: "Save Course",
      groups: [
        {
          title: "Course Details",
          fields: [
            { label: "Course Category", value: "DAP: Accounting", type: "select" },
            { label: "Course Group", value: "Accounting Principles", type: "select" },
            { label: "Course Name", value: "Computerized Accounting Core", type: "text" },
            { label: "Course Number", value: "CAPA-DAP 105", type: "text" },
            { label: "Course Credit Value", value: "4.0", type: "number" },
            { label: "Intake Type", value: "Standard Intake", type: "select" },
          ],
        },
        {
          title: "Course Outline & Syllabus",
          fields: [
            {
              label: "Course Description",
              value: "Describe the course content, requirements and objectives here...",
              type: "textarea",
            },
            { label: "Total Course Hours", value: "120 Hours", type: "text" },
            { label: "Hours Per Day", value: "3 Hours", type: "text" },
          ],
        },
        {
          title: "Course Tuition & Finances",
          fields: [
            { label: "Domestic Tuition Cost ($)", value: "1,200.00", type: "number" },
            { label: "International Tuition Cost ($)", value: "3,400.00", type: "number" },
            { label: "Grading Scheme", value: "Standard GPA Ladder", type: "select" },
            { label: "Registration Limit", value: "Max 45 Students", type: "text" },
          ],
        },
      ],
    },
  },

  "/instructor/f/t56-active-courses": {
    path: "/instructor/f/t56-active-courses",
    figmaId: "4:14878",
    title: "Active Course Deliveries",
    subtitle: "SYS.WORKSPACE // ACTIVE_SESSIONS",
    breadcrumbs: ["Home", "Course Management", "Active Courses"],
    activeHref: "/instructor/f/t14-course-management",
    archetype: "cards",
    cards: {
      items: [
        {
          title: "ACC201 · Intermediate Financial Accounting",
          subtitle: "3 Sections Active · 87 Students",
          meta: "Fall '26 Term · Syllabus 65% · Next Class: Today at 14:00",
          badge: "In Progress",
          badgeTone: "active",
          href: "/instructor/f/t08-my-courses-detail",
        },
        {
          title: "FIN301 · Corporate Finance Theory",
          subtitle: "2 Sections Active · 56 Students",
          meta: "Fall '26 Term · Syllabus 40% · Next Class: Tomorrow at 09:30",
          badge: "In Progress",
          badgeTone: "active",
          href: "/instructor/f/t08-my-courses-detail",
        },
        {
          title: "MGT102 · Introductory Strategy & Management",
          subtitle: "4 Sections Active · 120 Students",
          meta: "Fall '26 Term · Syllabus 80% · Next Class: Mon at 11:00",
          badge: "In Progress",
          badgeTone: "active",
        },
        {
          title: "HRM204 · Human Resource Compliance",
          subtitle: "1 Section Active · 28 Students",
          meta: "Fall '26 Term · Syllabus 15% · Next Class: Thu at 13:30",
          badge: "In Progress",
          badgeTone: "info",
        },
      ],
    },
  },

  "/instructor/f/t57-course-textbooks": makeTable({
    path: "/instructor/f/t57-course-textbooks",
    figmaId: "4:15104",
    title: "Course Textbook Adoptions",
    subtitle: "SYS.BOOKSTORE_GATEWAY // AUDIT_ENGINE",
    breadcrumbs: ["Home", "Course Management", "Textbooks"],
    activeHref: "/instructor/f/t14-course-management",
    primaryAction: "Add New Book",
    countLabel: "Active adoptions & compliance",
    columns: ["Book Title & Publisher", "ISBN / ISBN-13", "Adoption", "Opt-Out Rate", "Actions"],
    columnTemplate:
      "minmax(200px,1.5fr) minmax(110px,0.8fr) minmax(120px,0.9fr) minmax(100px,0.7fr) minmax(80px,0.5fr)",
    rows: [
      {
        cells: [
          "Principles of Auditing & GAAP · Pearson Publishing (12th Ed)",
          "978-013444",
          "Required (ACC201)",
          "12% Opt-Out",
          "Edit",
        ],
        badge: "Required",
        badgeTone: "active",
      },
      {
        cells: [
          "Corporate Finance Foundations · McGraw-Hill Education",
          "978-007803",
          "Optional (FIN301)",
          "45% Opt-Out",
          "Edit",
        ],
        badge: "Optional",
        badgeTone: "info",
      },
      {
        cells: [
          "Managerial Accounting Ledger Concepts · Wiley Academic",
          "978-111874",
          "Required (ACC102)",
          "8% Opt-Out",
          "Edit",
        ],
        badge: "Required",
        badgeTone: "active",
      },
    ],
  }),

  "/instructor/f/t58-course-categories": makeTable({
    path: "/instructor/f/t58-course-categories",
    figmaId: "4:15486",
    title: "Course Categories",
    subtitle: "SYS.COURSE_MGMT // CATEGORIES_EDITOR",
    breadcrumbs: ["Home", "Course Management", "Categories"],
    activeHref: "/instructor/f/t14-course-management",
    primaryAction: "Quick-Create Category",
    countLabel: "8 root categories",
    columns: ["Category Name", "Code", "Description", "Courses", "Parent", "Status"],
    rows: [
      {
        cells: ["Accounting", "DAP", "Core accounting principals and tax regulations", "14", "None (Root)", "ACTIVE"],
        badge: "ACTIVE",
        badgeTone: "active",
      },
      {
        cells: ["Business", "DIB", "Enterprise governance and administration studies", "22", "None (Root)", "ACTIVE"],
        badge: "ACTIVE",
        badgeTone: "active",
      },
      {
        cells: ["Computing", "COMP", "Advanced programming, AI architecture & engineering", "31", "None (Root)", "ACTIVE"],
        badge: "ACTIVE",
        badgeTone: "active",
      },
      {
        cells: ["Marketing", "MARK", "Public relations, brand management and digital ops", "—", "None (Root)", "ACTIVE"],
        badge: "ACTIVE",
        badgeTone: "active",
      },
      {
        cells: ["Economics", "ECON", "Macro-analysis, global banking and market theory", "15", "None (Root)", "INACTIVE"],
        badge: "INACTIVE",
        badgeTone: "muted",
      },
    ],
  }),

  "/instructor/f/t59-course-groups-types": makeTable({
    path: "/instructor/f/t59-course-groups-types",
    figmaId: "4:15699",
    title: "Course Groups & Types",
    subtitle: "SYS.COURSE_MGMT // GROUP_TYPES",
    breadcrumbs: ["Home", "Course Management", "Groups & Types"],
    activeHref: "/instructor/f/t14-course-management",
    countLabel: "6 groups · 8 types",
    columns: ["Group / Type", "Code", "Description", "Courses", "Status"],
    rows: [
      {
        cells: ["Core Courses", "—", "Mandatory foundation modules required for department major", "12", "ACTIVE"],
        badge: "ACTIVE",
        badgeTone: "active",
      },
      {
        cells: ["Electives", "—", "Student choice catalog subjects within requirements", "—", "ACTIVE"],
        badge: "ACTIVE",
        badgeTone: "active",
      },
      {
        cells: ["Standard Lecture", "STD", "Theoretical classroom lectures", "42", "ACTIVE"],
        badge: "ACTIVE",
        badgeTone: "active",
      },
      {
        cells: ["Lab session", "LAB", "Scientific or terminal hands-on projects", "—", "ACTIVE"],
        badge: "ACTIVE",
        badgeTone: "active",
      },
      {
        cells: ["Workshop", "WKS", "Interactive modular collaboration groups", "11", "ACTIVE"],
        badge: "ACTIVE",
        badgeTone: "active",
      },
      {
        cells: ["Prerequisites", "—", "Required structural step-ladder courses", "—", "INACTIVE"],
        badge: "INACTIVE",
        badgeTone: "muted",
      },
    ],
  }),

  "/instructor/f/t60-course-resources-management": {
    path: "/instructor/f/t60-course-resources-management",
    figmaId: "4:15877",
    title: "Manage Course Resources",
    subtitle: "SYS.COURSE_MGMT // FILE_REPOSITORY",
    breadcrumbs: ["Home", "Course Management", "Resources"],
    activeHref: "/instructor/f/t14-course-management",
    archetype: "splitPane",
    primaryAction: "Upload Resource",
    splitPane: {
      leftTitle: "Current Resource Categories",
      leftItems: [
        { label: "Ledgers", meta: "Syllabus modules", active: true },
        { label: "Core Framework", meta: "Overview docs" },
        { label: "Formulas", meta: "Calculation guides" },
        { label: "Quick Guides", meta: "Reference cards" },
        { label: "Simulations", meta: "Interactive links" },
      ],
      rightTitle: "ACC201 Resources",
      rightFields: [
        { label: "Category Name", value: "Core Curriculum Ledgers" },
        { label: "Visibility", value: "Enrolled students" },
        { label: "Owner", value: "Dr. Sarah Mitchell" },
      ],
      resources: [
        { name: "Accounting Ledger Template (Syllabus Module 1)", type: "Microsoft Excel", size: "2.4 MB" },
        { name: "Corporate Financial Framework 2026 Overview", type: "PDF Document", size: "12.8 MB" },
        { name: "Adjusted Trial Balance Calculations & Rules", type: "Microsoft Word", size: "912 KB" },
        { name: "GAAP Standard Adjustments Reference Card", type: "PDF Document", size: "4.1 MB" },
        { name: "Interactive Ledger Balancing Simulator v1.0", type: "Exec Link", size: "14 KB" },
      ],
    },
  },

  "/instructor/f/in-08-lectures": {
    path: "/instructor/f/in-08-lectures",
    figmaId: "17:7058",
    title: "Lectures",
    subtitle: "Lecture sessions and launch controls for ACC201.",
    breadcrumbs: ["Home", "My Courses", "ACC201", "Lectures"],
    activeHref: "/instructor/sections",
    archetype: "lectures",
    primaryAction: "Schedule Lecture",
    lectures: {
      course: "ACC201 · Financial Accounting I",
      sessions: [
        {
          title: "Lecture 05 — Adjusting Entries",
          when: "Mon Oct 6 · 09:00–10:30",
          duration: "90 min",
          status: "Ready to Launch",
          tone: "info",
          href: "/instructor/f/in-09-lecture-review",
        },
        {
          title: "Lecture 04 — Trial Balance",
          when: "Wed Oct 1 · 09:00–10:30",
          duration: "90 min",
          status: "Completed",
          tone: "success",
          href: "/instructor/f/in-09-lecture-review",
        },
        {
          title: "Lecture 03 — Journal Entries",
          when: "Mon Sep 29 · 09:00–10:30",
          duration: "90 min",
          status: "Completed",
          tone: "success",
          href: "/instructor/f/in-09-lecture-review",
        },
        {
          title: "Lecture 06 — Financial Statements Intro",
          when: "Wed Oct 8 · 09:00–10:30",
          duration: "90 min",
          status: "Scheduled",
          tone: "muted",
        },
      ],
    },
  },

  "/instructor/f/in-09-lecture-review": {
    path: "/instructor/f/in-09-lecture-review",
    figmaId: "17:7147",
    title: "Lecture Review",
    subtitle: "Recording, transcript, and AI highlights for Lecture 04.",
    breadcrumbs: ["Home", "My Courses", "ACC201", "Lectures", "Review"],
    activeHref: "/instructor/sections",
    archetype: "lectureReview",
    primaryAction: "Share with Class",
    lectureReview: {
      title: "Lecture 04 — Trial Balance",
      meta: "ACC201 · Wed Oct 1 · 09:00–10:30 · Hall A-102 · 39 attendees",
      transcript:
        "Today we reconciled the unadjusted trial balance and walked through common transposition errors. Students practiced locating imbalance sources using the accounting equation checkpoints. We closed with a short formative quiz on debit/credit orientation.",
      highlights: [
        "39 of 42 students attended (93%)",
        "Average quiz score: 81%",
        "Most missed concept: contra-asset presentation",
        "AI suggested follow-up worksheet on suspense accounts",
      ],
      aiNotes:
        "Recommend a 10-minute recap at the start of Lecture 05 covering contra accounts before introducing adjusting entries.",
    },
  },

  "/instructor/f/in-10-lab-sessions": {
    path: "/instructor/f/in-10-lab-sessions",
    figmaId: "17:7217",
    title: "Lab Sessions",
    subtitle: "Hands-on lab schedule and room readiness for ACC201.",
    breadcrumbs: ["Home", "My Courses", "ACC201", "Labs"],
    activeHref: "/instructor/sections",
    archetype: "labSession",
    primaryAction: "Open Lab Roster",
    labSession: {
      course: "ACC201 · Financial Accounting I",
      labs: [
        {
          title: "Lab 03 — Spreadsheet Journals",
          when: "Wed Oct 8 · 14:00–15:30",
          room: "Lab C-01",
          capacity: "22/24",
          status: "Ready",
          tone: "info",
        },
        {
          title: "Lab 02 — Trial Balance Workshop",
          when: "Wed Oct 1 · 14:00–15:30",
          room: "Lab C-01",
          capacity: "24/24",
          status: "Completed",
          tone: "success",
        },
        {
          title: "Lab 01 — Chart of Accounts Setup",
          when: "Wed Sep 24 · 14:00–15:30",
          room: "Lab C-01",
          capacity: "23/24",
          status: "Completed",
          tone: "success",
        },
        {
          title: "Lab 04 — Adjusting Entry Sims",
          when: "Wed Oct 15 · 14:00–15:30",
          room: "Lab C-01",
          capacity: "0/24",
          status: "Scheduled",
          tone: "muted",
        },
      ],
    },
  },

  "/instructor/f/in-17-course-approval": {
    path: "/instructor/f/in-17-course-approval",
    figmaId: "17:7922",
    title: "Course Version Approval Review",
    subtitle: "Review detailed modifications for Syllabus CS-301 (Spring 2026)",
    breadcrumbs: ["Studio", "Approval"],
    activeHref: "/instructor/f/in-17-course-approval",
    shell: "studio",
    archetype: "syllabusDiff",
    primaryAction: "Approve proposed syllabus",
    secondaryAction: "Request changes",
    syllabusDiff: {
      badge: "Pending Review",
      currentTitle: "Current Syllabus Structure",
      proposedTitle: "Proposed Changes (v3.0)",
      current: [
        { label: "Prerequisites:", value: "Prerequisite: MATH-101 Calculus I" },
        { label: "Week 4 Topic:", value: "Simple linear search and array lists sorting algorithms." },
        { label: "Total Assessments:", value: "Four localized in-class assignments worth 40% total." },
      ],
      proposed: [
        {
          label: "Prerequisites:",
          added: "Prerequisite: MATH-101 Calculus I AND CS-201 Discrete Structures",
        },
        {
          label: "Week 4 Topic:",
          removed: "Simple linear search and array lists sorting algorithms.",
          added: "Complex recursion trees and master-method analysis computations.",
        },
        { label: "Total Assessments:", value: "Four localized in-class assignments worth 40% total." },
      ],
      comments: [
        {
          author: "Dean Eleanor Vance",
          role: "Faculty Chair",
          when: "Yesterday",
          body: "The addition of discrete structures is vital before jumping into advanced recursion bounds. Recommended change looks good.",
        },
        {
          author: "Prof. Art Pendelton",
          role: "Peer Reviewer",
          when: "2h ago",
          body: "Ensure the syllabus specifies the edition of CLRS being used so the bookstores can update.",
        },
      ],
    },
  },

  "/instructor/f/in-12-ai-course-studio": {
    path: "/instructor/f/in-12-ai-course-studio",
    figmaId: "17:7388",
    title: "CS 301 AI Assistant & Studio v2.4",
    subtitle: "Synthesize lecture materials, syllabi and knowledge graph to power the virtual tutor.",
    breadcrumbs: ["Studio", "CS 301"],
    activeHref: "/instructor/f/in-12-ai-course-studio",
    shell: "studio",
    archetype: "aiStudio",
    primaryAction: "+ Start a new version",
    primaryActionHref: "/instructor/f/in-13-studio-generation",
    aiStudio: {
      eyebrow: "HERITAGE AI STUDIO",
      courseTitle: "CS 301 AI Assistant & Studio v2.4",
      version: "v2.4",
      drafts: [
        { version: "v2.4 Draft", status: "Drafting", tone: "draft", detail: "Syllabus and Module 1 update in progress" },
        { version: "v2.3 Published", status: "Live", tone: "active", detail: "Currently active for student tutoring session" },
      ],
      tabs: ["Sources", "Outcomes", "Modules", "Assessments", "Rubrics", "Review"],
      activeTab: "Sources",
      sources: [
        { name: "Syllabus_2026_Advanced_Data_Structures.pdf", status: "Ingested" },
        { name: "CS301_Complete_Lecture_Slides_Week_1_6.ppt", status: "Ingested" },
        { name: "HeapSort_Reference_Implementation.java", status: "Ingested" },
      ],
    },
  },

  "/instructor/f/in-13-studio-generation": {
    path: "/instructor/f/in-13-studio-generation",
    figmaId: "17:7479",
    title: "AI Course Studio",
    subtitle: "Generate structured, rigorous academic content from trusted sources",
    breadcrumbs: ["Studio", "Generation"],
    activeHref: "/instructor/f/in-12-ai-course-studio",
    shell: "studio",
    archetype: "studioGeneration",
    primaryAction: "Continue to Outcomes",
    primaryActionHref: "/instructor/f/in-14-outcome-mapping",
    studioGeneration: {
      wizardTitle: "AI Course Studio",
      badge: "Beta Wizard",
      steps: [
        { label: "Select sources", state: "done" },
        { label: "Set outcomes", state: "done" },
        { label: "Generate", state: "current" },
        { label: "Review each object", state: "todo" },
        { label: "Send for approval", state: "todo" },
      ],
      progressLabel: "Generating module 3 of 8",
      progressPct: 35,
      sources: [
        "Syllabus_CS301_v2.pdf",
        "Introduction_to_Algorithms_CLRS.epub",
        "ACM_Curriculum_Guidelines_2024.pdf",
      ],
      cards: [
        {
          kind: "AI: MODULE 3 OBJECTIVE",
          drafted: "Drafted 1m ago",
          title: "Analyze average and worst-case time complexities of basic graph search procedures.",
          body: "",
          citations: [
            'Source Citation: "Introduction to Algorithms (CLRS)", Chapter 22 (Elementary Graph Algorithms), Section 22.2, Page 594.',
          ],
        },
        {
          kind: "AI: ASSESSMENT CRITERIA",
          drafted: "Drafted 2m ago",
          title: "",
          body: "Formulate mathematical proofs verifying memory complexity bounds O(V + E) of Depth-First Search algorithms on adjacency lists.",
          citations: ['Source Citation: "Syllabus_CS301_v2.pdf", Course Prerequisites, Page 2.'],
        },
      ],
    },
  },

  "/instructor/f/in-14-outcome-mapping": {
    path: "/instructor/f/in-14-outcome-mapping",
    figmaId: "17:7596",
    title: "Course Learning Outcomes Matrix",
    subtitle: "Map weekly syllabus objectives across Bloom's Taxonomy cognitive dimensions",
    breadcrumbs: ["Studio", "Outcomes"],
    activeHref: "/instructor/f/in-14-outcome-mapping",
    shell: "studio",
    archetype: "outcomeMapping",
    primaryAction: "Open Question Generator",
    primaryActionHref: "/instructor/f/in-15-question-generator",
    outcomeMapping: {
      clos: [
        { id: "CLO-1", label: "Implement advanced graph storage schemas on sparse matrices.", coverage: 90 },
        { id: "CLO-2", label: "Verify binary heap structures and analyze tree mutation algorithms.", coverage: 65 },
        { id: "CLO-3", label: "Design recursive partition schemas for distributed databases.", coverage: 40 },
      ],
      bloomRows: [
        { level: "Knowledge & Recall", verb: "Core verb: Define", tags: ["CLO-1 Theory"] },
        { level: "Comprehension", verb: "Core verb: Explain", tags: [] },
        { level: "Application", verb: "Core verb: Solve / Use", tags: ["CLO-1 Practice", "CLO-2 Lab"] },
        { level: "Analysis", verb: "Core verb: Differentiate", tags: ["CLO-3 Analysis"] },
        { level: "Synthesis & Design", verb: "Core verb: Construct", tags: ["CLO-3 Architecture"] },
        { level: "Evaluation", verb: "Core verb: Critique", tags: [] },
      ],
    },
  },

  "/instructor/f/in-15-question-generator": {
    path: "/instructor/f/in-15-question-generator",
    figmaId: "17:7724",
    title: "AI Question Generator",
    subtitle: "Auto-generate diverse question sets optimized for direct course objective assessment",
    breadcrumbs: ["Studio", "Assessments"],
    activeHref: "/instructor/f/in-15-question-generator",
    shell: "studio",
    archetype: "questionGenerator",
    primaryAction: "Generate Questions",
    secondaryAction: "Add to Question Bank",
    secondaryActionHref: "/instructor/f/in-16-rubric-generator",
    questionGenerator: {
      topic: "Recursion Trees & Merge Sort Complexity",
      difficulty: "Medium (Undergraduate Core)",
      type: "Multiple Choice (MCQ)",
      count: "5 Questions",
      questions: [
        {
          id: "q1",
          prompt: "What is the height of a recursion tree generated by T(n) = 2T(n/2) + O(n)?",
          options: [
            { key: "A", text: "O(1)" },
            { key: "B", text: "O(log n)", correct: true },
            { key: "C", text: "O(n)" },
            { key: "D", text: "O(n log n)" },
          ],
        },
        {
          id: "q2",
          prompt: "What is the work completed at the root of a partition recursion tree of size N?",
          options: [
            { key: "A", text: "O(1)" },
            { key: "B", text: "O(N)", correct: true },
            { key: "C", text: "O(log N)" },
            { key: "D", text: "O(N log N)" },
          ],
        },
      ],
    },
  },

  "/instructor/f/in-16-rubric-generator": {
    path: "/instructor/f/in-16-rubric-generator",
    figmaId: "17:7830",
    title: "Syllabus Grading Rubric Studio",
    subtitle: "Generate standardized assessment rubrics synced to specific assignment topics",
    breadcrumbs: ["Studio", "Rubrics"],
    activeHref: "/instructor/f/in-16-rubric-generator",
    shell: "studio",
    archetype: "rubricGenerator",
    primaryAction: "Use this rubric",
    secondaryAction: "Submit for Approval",
    secondaryActionHref: "/instructor/f/in-17-course-approval",
    rubricGenerator: {
      criteria: [
        {
          name: "Code Design & Style",
          weight: "35%",
          excellent: "Exemplary recursive architectures cleanly utilizing modularized, memory efficient algorithms.",
          proficient: "Code designs are modularized correctly but miss optimal local complexity boundaries.",
          developing: "Contains partial modularization but recursive traces are poorly bound.",
          beginning: "Linear unstructured codes with no recursive depth or encapsulation.",
        },
        {
          name: "Mathematical Proof",
          weight: "35%",
          excellent: "Complete induction steps and sound recurrence relations mapping trees directly.",
          proficient: "Valid induction structure with minor calculation errors on tree height boundaries.",
          developing: "Missing clear recurrence formulas but maintains base induction logic.",
          beginning: "No mathematical mappings or valid proofs of complexity bounds.",
        },
        {
          name: "Test Coverage",
          weight: "35%",
          excellent: "All edge cases (empty matrices, single trees) tested rigorously with zero fail bounds.",
          proficient: "Primary paths covered thoroughly but misses boundary edge variables.",
          developing: "Minimal testing implemented without edge-case assertions.",
          beginning: "No program tests executed or logged in submittal schema.",
        },
      ],
    },
  },

  "/instructor/f/t16-teacher-messages-chat": {
    path: "/instructor/f/t16-teacher-messages-chat",
    figmaId: "4:6136",
    title: "Messages",
    subtitle: "Secure faculty messaging with student academic context.",
    breadcrumbs: ["Home", "Messages"],
    activeHref: "/instructor/f/t16-teacher-messages-chat",
    shell: "campus",
    archetype: "messages",
    messages: {
      threads: [
        {
          id: "ahmed",
          name: "Ahmed Hassan",
          role: "Student",
          preview: "Attached my ACC201 draft for feedback…",
          unread: 2,
          time: "10:42",
        },
        {
          id: "dean",
          name: "Dean Alistair",
          role: "Administration",
          preview: "Faculty senate packet is ready for review.",
          time: "Yesterday",
        },
        {
          id: "helen",
          name: "Prof. Helen Carter",
          role: "Faculty",
          preview: "Can we sync on the midterm schedule?",
          time: "Mon",
        },
        {
          id: "chloe",
          name: "Chloe Miller",
          role: "Student",
          preview: "Office hours question about Module 2.",
          time: "Sun",
        },
      ],
      chat: [
        {
          kind: "attachment",
          name: "ACC201_Draft_V2.pdf",
          size: "420 KB",
          time: "10:38",
        },
        {
          kind: "message",
          from: "them",
          text: "Hi Dr. Mitchell — I've attached my revised draft. Could you review the adjusting entries section before Thursday?",
          time: "10:39",
        },
        {
          kind: "message",
          from: "me",
          text: "Received. I'll review tonight and send annotated notes. Please also check your attendance for last week's lab.",
          time: "10:41",
        },
        {
          kind: "system",
          text: "Academic alert: attendance below threshold (72%). Advisor notification available.",
        },
      ],
      context: {
        program: "B.BA Management Science",
        grade: "B+",
        gradePct: "84.2%",
        attendance: "72%",
        attendanceTone: "At Risk",
        missing: "1",
        sharedFiles: [
          { name: "ACC201_Draft_V2.pdf", size: "420 KB" },
          { name: "Office_Hours_Notes.docx", size: "88 KB" },
        ],
      },
    },
  },

  "/instructor/notifications": {
    path: "/instructor/notifications",
    figmaId: "4:6347",
    title: "Notifications Terminal",
    subtitle: "Alerts across grading, attendance, and academic operations.",
    breadcrumbs: ["Home", "Notifications"],
    activeHref: "/instructor/notifications",
    shell: "campus",
    archetype: "notifications",
    notifications: {
      filters: [
        { label: "All Alerts" },
        { label: "Unread", count: 7 },
        { label: "Academic", count: 3 },
        { label: "Grading", count: 4 },
        { label: "System", count: 2 },
      ],
      items: [
        {
          title: "Grade submission approved",
          body: "FIN301 midterm grades cleared curriculum audit and are ready to publish.",
          when: "12 min ago",
          category: "Grading",
          unread: true,
          tone: "success",
        },
        {
          title: "Attendance threshold alert",
          body: "Ahmed Hassan (ACC201) dropped to 72% attendance — below early-warning threshold.",
          when: "38 min ago",
          category: "Academic",
          unread: true,
          tone: "warning",
        },
        {
          title: "New message from Dean Alistair",
          body: "Faculty senate packet attached for Thursday review.",
          when: "1 hour ago",
          category: "Academic",
          unread: true,
          tone: "info",
        },
        {
          title: "Lab roster updated",
          body: "2 students added to ACC201 Lab C-01 for Oct 8 session.",
          when: "3 hours ago",
          category: "System",
          tone: "muted",
        },
        {
          title: "Rubric draft saved",
          body: "CS 301 Syllabus Grading Rubric Studio auto-saved v0.6.",
          when: "Yesterday",
          category: "Grading",
          tone: "info",
        },
        {
          title: "Calendar conflict detected",
          body: "Office hours overlap Academic Board meeting on Oct 9 14:00.",
          when: "Yesterday",
          category: "System",
          unread: true,
          tone: "danger",
        },
      ],
      pagination: "Showing 1–6 of 24",
    },
  },

  "/instructor/calendar": {
    path: "/instructor/calendar",
    figmaId: "4:6547",
    title: "Teaching Calendar",
    subtitle: "Week view across classes, office hours, and committees.",
    breadcrumbs: ["Home", "Calendar"],
    activeHref: "/instructor/calendar",
    shell: "campus",
    archetype: "timetable",
    timetable: {
      rangeLabel: "October 7–11 2026",
      termLabel: "FALL 2026 TERM",
      views: ["Day", "Week", "Month", "Today"],
      activeView: "Week",
      filters: ["Show All", "Classes", "Office Hours", "Committees"],
      days: [
        {
          label: "Mon",
          date: "7",
          events: [
            { title: "Accounting Principles", time: "09:00–10:30", tone: "blue" },
            { title: "Office Hours", time: "16:00–17:30", tone: "green" },
          ],
        },
        {
          label: "Tue",
          date: "8",
          events: [{ title: "Corporate Finance", time: "11:00–12:30", tone: "purple" }],
        },
        {
          label: "Wed",
          date: "9",
          events: [
            { title: "Accounting Principles", time: "09:00–10:30", tone: "blue" },
            { title: "Academic Board", time: "14:00–15:30", tone: "orange" },
          ],
        },
        {
          label: "Thu",
          date: "10",
          events: [
            { title: "Corporate Finance", time: "11:00–12:30", tone: "purple" },
            { title: "Office Hours", time: "14:00–15:30", tone: "green" },
          ],
        },
        {
          label: "Fri",
          date: "11",
          events: [{ title: "Strategic Management", time: "09:00–12:00", tone: "blue" }],
        },
      ],
    },
  },

  "/instructor/f/t32-resource-file-manager": {
    path: "/instructor/f/t32-resource-file-manager",
    figmaId: "4:8858",
    title: "ACC201 Resources",
    subtitle: "Course file manager for Section A instructional materials.",
    breadcrumbs: ["Home", "My Courses", "ACC201", "Resources"],
    activeHref: "/instructor/sections",
    shell: "campus",
    archetype: "fileManager",
    primaryAction: "Upload Files",
    secondaryAction: "Create Folder",
    fileManager: {
      courseTitle: "ACC201 Resources",
      breadcrumbs: ["My Courses", "ACC201 Sec-A", "Resources"],
      tree: [
        { name: "Syllabus & Policies", children: ["Syllabus_Fall2026.pdf", "Academic_Integrity.pdf"] },
        {
          name: "Week Materials",
          active: true,
          children: ["Week_01", "Week_02", "Week_03", "Week_04"],
        },
        { name: "Assessments", children: ["Midterm_Blueprint.docx", "Rubrics"] },
        { name: "Archives", children: ["Fall_2025"] },
      ],
      files: [
        {
          name: "W04_Adjusting_Entries.pptx",
          type: "Slides",
          size: "4.8 MB",
          updated: "Oct 5, 2026",
          visibility: "Published",
          selected: true,
        },
        {
          name: "Journal_Entry_Template.xlsx",
          type: "Sheet",
          size: "128 KB",
          updated: "Oct 4, 2026",
          visibility: "Published",
          selected: true,
        },
        {
          name: "Lab_C01_Checklist.pdf",
          type: "PDF",
          size: "210 KB",
          updated: "Oct 3, 2026",
          visibility: "Published",
          selected: true,
        },
        {
          name: "Midterm_Practice_Set.pdf",
          type: "PDF",
          size: "890 KB",
          updated: "Oct 2, 2026",
          visibility: "Hidden",
          selected: true,
        },
        {
          name: "Instructor_Notes_Private.docx",
          type: "Doc",
          size: "64 KB",
          updated: "Oct 1, 2026",
          visibility: "Hidden",
        },
      ],
    },
  },

  "/instructor/f/t33-help-support": {
    path: "/instructor/f/t33-help-support",
    figmaId: "4:9078",
    title: "Faculty Support Center",
    subtitle: "Guides, tickets, and secure escalation for instructors.",
    breadcrumbs: ["Home", "Help & Support"],
    activeHref: "/instructor/f/t33-help-support",
    shell: "campus",
    archetype: "helpSupport",
    primaryAction: "Consult AI",
    helpSupport: {
      topics: [
        { title: "Gradebook & Publishing", detail: "Submission windows, overrides, and audit trails.", icon: "bar-chart" },
        { title: "Attendance & Early Warning", detail: "Thresholds, alerts, and advisor handoff.", icon: "user-check" },
        { title: "AI Course Studio", detail: "Ingestion, generation, outcomes, and rubrics.", icon: "sparkle" },
        { title: "Scheduling Conflicts", detail: "Resolve meeting pattern and room clashes.", icon: "calendar" },
        { title: "Student Messaging", detail: "Secure threads and academic context panels.", icon: "file-text" },
        { title: "Account & Security", detail: "MFA, sessions, and recovery codes.", icon: "user" },
      ],
      tickets: [
        { id: "TKT-9201", subject: "Cannot publish FIN301 midterm grades", status: "In Progress", tone: "warning" },
        { id: "TKT-9188", subject: "Office hours booking widget offline", status: "Resolved", tone: "success" },
      ],
      references: [
        { name: "Faculty_Grade_Submission_Guide.pdf", meta: "PDF · 12 pages" },
        { name: "Early_Warning_Protocol.pdf", meta: "PDF · 6 pages" },
        { name: "AI_Studio_Faculty_Quickstart.pdf", meta: "PDF · 9 pages" },
      ],
    },
  },

  "/instructor/attendance": {
    path: "/instructor/attendance",
    figmaId: "3:4952",
    title: "Attendance Session",
    subtitle: "ACC201 // ACTIVE_SESSION_DRAFT // SEC_A",
    breadcrumbs: ["Attendance session", "ACC201"],
    activeHref: "/instructor/attendance",
    shell: "campus",
    archetype: "attendanceSession",
    primaryAction: "Submit & Finalize Session",
    secondaryAction: "Save Draft State",
    attendanceSession: {
      alert:
        "System Deviation Alert: 3 students are below the 75% attendance compliance threshold in this section. Affected: Aris Thorne, Chloe Miller, Dave Patel.",
      classNode: "ACC201 Sec-A",
      dateLabel: "Oct 7, 2026 (09:00 AM)",
      rosterTitle: "Student Roster (32 Total)",
      draftStatus: "STATUS: DRAFT // 28_MARKED",
      students: [
        {
          name: "Aris Thorne",
          id: "ST-9284",
          status: "Late",
          note: "Transit delays reported on Subway Node C",
          pct: "72%",
          atRisk: true,
          avatar: "/brand/teacher/student-aris.jpeg",
        },
        {
          name: "Marcus Vance",
          id: "ST-1102",
          status: "Present",
          note: "—",
          pct: "96%",
          avatar: "/brand/teacher/student-marcus.jpeg",
        },
        {
          name: "Chloe Miller",
          id: "ST-4521",
          status: "Absent",
          note: "Medical notice submitted",
          pct: "74%",
          atRisk: true,
          avatar: "/brand/teacher/student-chloe.jpeg",
        },
        {
          name: "Elena Rostova",
          id: "ST-8831",
          status: "Present",
          note: "—",
          pct: "98%",
          avatar: "/brand/teacher/student-elena.png",
        },
        {
          name: "Dave Patel",
          id: "ST-2290",
          status: "Excused",
          note: "Official athletic travel waiver",
          pct: "68%",
          atRisk: true,
          avatar: "/brand/teacher/student-dave.png",
        },
      ],
      stats: [
        { label: "Present", count: 24, pct: "75.0%" },
        { label: "Absent", count: 4, pct: "12.5%" },
        { label: "Late", count: 3, pct: "9.4%" },
        { label: "Excused", count: 1, pct: "3.1%" },
      ],
    },
  },

  "/instructor/f/t21-attendance-correction-review": {
    path: "/instructor/f/t21-attendance-correction-review",
    figmaId: "4:7002",
    title: "Attendance Reviews",
    subtitle: "SYS.ATTENDANCE_DESK // DR_SARAH_MITCHELL",
    breadcrumbs: ["Home", "Attendance Reviews"],
    activeHref: "/instructor/f/t21-attendance-correction-review",
    shell: "campus",
    archetype: "attendanceReview",
    attendanceReview: {
      filters: [
        { label: "Pending Corrections", count: 3, active: true },
        { label: "Approved", count: 12 },
        { label: "Rejected", count: 2 },
      ],
      requests: [
        {
          name: "Aris Thorne",
          id: "ST-9284",
          course: "ACC201 Sec-A",
          date: "Oct 3, 2026",
          current: "Absent",
          requested: "Excused",
          reason: "Transit delays due to Subway Node C outage. Official delay notice attached.",
          attachment: "Subway_Delay_Notice_Oct3.pdf",
        },
        {
          name: "Chloe Miller",
          id: "ST-4521",
          course: "ACC201 Sec-A",
          date: "Oct 5, 2026",
          current: "Absent",
          requested: "Present",
          reason: "Incorrect mark — student was in lab overflow room B210 with TA sign-in.",
          attachment: "Lab_Overflow_SignIn_Oct5.pdf",
        },
      ],
      compliance: {
        student: "Aris Thorne",
        fromPct: "72%",
        toPct: "75%",
        badge: "Clears Critical System Deviation Alert",
      },
      logNote:
        "All processed attendance tokens are logged under university quality audit rules. Changes reflect immediately in student GPA dashboards.",
    },
  },

  "/instructor/f/t19-create-edit-assessment": {
    path: "/instructor/f/t19-create-edit-assessment",
    figmaId: "4:6721",
    title: "Create Assessment",
    subtitle: "SYS.STUDIO_WRITER // ACC201 // DR_SARAH_MITCHELL",
    breadcrumbs: ["My Courses", "ACC201 Sec-A", "New Assessment"],
    activeHref: "/instructor/f/t14-course-management",
    shell: "campus",
    archetype: "assessmentBuilder",
    primaryAction: "Publish Assessment",
    secondaryAction: "Save Draft",
    assessmentBuilder: {
      crumb: ["My Courses", "ACC201 Sec-A", "New Assessment"],
      heading: "Design New Assessment",
      description: "Create grade matching rubrics and upload syllabus artifacts.",
      title: "ACC201 Midterm Examination 2026",
      type: "Written Exam",
      weight: "20%",
      rubricHeaders: ["Criterion", "Excellent (5pts)", "Good (4pts)", "Poor (2pts)"],
      rubricRows: [
        {
          criterion: "Balance Accuracy",
          excellent: "Zero ledger error",
          good: "Minor rounding",
          poor: ">5% discrepancy",
        },
      ],
      uploadHint: "Drag & drop syllabus outline or rubric files",
      uploadFormats: "Supported formats: PDF, DOCX up to 16MB",
      preview: {
        badge: "ACC201 SEC-A • MIDTERM",
        title: "ACC201 Midterm Examination 2026",
        weight: "Weight: 20% of final grade",
        openDate: "Open Date: Oct 12, 2026",
        dueDate: "Due Date: Oct 15, 2026",
      },
    },
  },

  "/instructor/f/t20-grade-correction-workflow": {
    path: "/instructor/f/t20-grade-correction-workflow",
    figmaId: "4:6864",
    title: "Grade Correction Review",
    subtitle: "Review the requested ACC201 grade correction for Aris Thorne.",
    breadcrumbs: ["Home", "Grades", "Grade Correction"],
    activeHref: "/instructor/f/t14-course-management",
    archetype: "syllabusDiff",
    primaryAction: "Approve correction",
    secondaryAction: "Return request",
    syllabusDiff: {
      badge: "Pending Review",
      currentTitle: "Current Grade",
      proposedTitle: "Proposed Correction",
      current: [
        { label: "Student", value: "Aris Thorne · HCC-2026-1842" },
        { label: "Course", value: "ACC201 · Financial Accounting I" },
        { label: "Recorded Grade", value: "C+" },
      ],
      proposed: [
        { label: "Student", value: "Aris Thorne · HCC-2026-1842" },
        { label: "Course", value: "ACC201 · Financial Accounting I" },
        { label: "Corrected Grade", removed: "C+", added: "B-" },
      ],
      comments: [
        {
          author: "Dr. Sarah Mitchell",
          role: "Course Instructor",
          when: "Today",
          body: "The final project regrade adds six points and changes the calculated final grade from C+ to B-.",
        },
        {
          author: "Heritage Community College Registrar",
          role: "Records Review",
          when: "1h ago",
          body: "Supporting rubric and calculation worksheet received. Awaiting faculty approval.",
        },
      ],
    },
  },

  "/instructor/f/t61-grading-schemes": {
    path: "/instructor/f/t61-grading-schemes",
    figmaId: "4:16047",
    title: "Grading Schemes",
    subtitle: "SYS.COURSE_MGMT // GRADING_RULES",
    breadcrumbs: ["Home", "Course Management", "Grading Schemes"],
    activeHref: "/instructor/f/t14-course-management",
    shell: "campus",
    archetype: "gradingSchemes",
    primaryAction: "+ New Scheme",
    secondaryAction: "Custom Standard Scheme",
    gradingSchemes: {
      schemeLabel: "Grading Scale Configuration",
      rows: [
        { letter: "A+", min: "90%", max: "100%", gpa: "4.0", description: "Outstanding, absolute mastery of core requirements", status: "PASS", letterTone: "a" },
        { letter: "A", min: "85%", max: "89%", gpa: "3.9", description: "Excellent evaluation, minor structural errors", status: "PASS", letterTone: "a" },
        { letter: "B+", min: "80%", max: "84%", gpa: "3.3", description: "Very good standard competency validation", status: "PASS", letterTone: "b" },
        { letter: "B", min: "75%", max: "79%", gpa: "3.0", description: "Good overall understanding of complex units", status: "PASS", letterTone: "b" },
        { letter: "C+", min: "70%", max: "74%", gpa: "2.3", description: "Satisfactory compliance performance", status: "PASS", letterTone: "c" },
        { letter: "C", min: "65%", max: "69%", gpa: "2.0", description: "Average validation metrics met", status: "PASS", letterTone: "c" },
        { letter: "D", min: "60%", max: "64%", gpa: "1.0", description: "Marginal outcome progress limits", status: "PASS", letterTone: "d" },
        { letter: "F", min: "0%", max: "59%", gpa: "0.0", description: "Failure to establish outcome competencies", status: "FAIL", letterTone: "f" },
      ],
      distribution: [
        { label: "A Range (A+, A)", meta: "52 Students (24%)", pct: 24, tone: "a" },
        { label: "B Range (B+, B)", meta: "98 Students (45%)", pct: 45, tone: "b" },
        { label: "C Range (C+, C)", meta: "46 Students (21%)", pct: 21, tone: "c" },
        { label: "D Range", meta: "15 Students (7%)", pct: 7, tone: "d" },
        { label: "F Range (Fail)", meta: "6 Students (3%)", pct: 3, tone: "f" },
      ],
      presets: [
        { label: "Academic Pass Threshold", value: "60.0% (D)", tone: "warning" },
        { label: "Honours Threshold", value: "80.0% (B+)", tone: "success" },
      ],
    },
  },

  "/instructor/f/t62-pending-grade-submissions": {
    path: "/instructor/f/t62-pending-grade-submissions",
    figmaId: "4:16245",
    title: "Pending Grade Submissions",
    subtitle: "SYS.STUDENTS // GRADES_REVIEW",
    breadcrumbs: ["Home", "Grades", "Pending Submissions"],
    activeHref: "/instructor/f/t14-course-management",
    shell: "campus",
    archetype: "pendingGrades",
    primaryAction: "Audit & Approve",
    secondaryAction: "Reject Submission",
    pendingGrades: {
      alert: "PENDING GRADE AUDITS REQUIRE IMMEDIATE INSTRUCTOR SIGN-OFF BY DEC 15 SPRINT END.",
      queueTitle: "Auditable Submissions Queue",
      actionBadge: "4 ACTION REQUIRED",
      rows: [
        { code: "ACC201 A", title: "Accounting Principles", teacher: "D. Mitchell", students: "32", missing: "0", missingTone: "ok", status: "SUBMITTED", active: true },
        { code: "FIN301 B", title: "Corporate Finance", teacher: "J. Vance", students: "28", missing: "3", missingTone: "warn", status: "UNDER REVIEW" },
        { code: "MGT101 C", title: "Business Basics", teacher: "S. Harris", students: "45", missing: "1", missingTone: "warn", status: "SUBMITTED" },
        { code: "MKT302 A", title: "Brand Marketing", teacher: "A. Sterling", students: "24", missing: "0", missingTone: "ok", status: "REJECTED" },
      ],
      audit: {
        title: "Gradebook Audit: ACC201 Sec A",
        locked: "100% Locked",
        average: "B+ (82.4%)",
        notes: "All ledger tasks and midterm tests audited. Student profiles cross-verified with registry outcomes.",
        rejectPlaceholder: "Specify reasons here...",
      },
    },
  },

  "/instructor/f/t11-workshops": {
    path: "/instructor/f/t11-workshops",
    figmaId: "3:5292",
    title: "Professional Development",
    subtitle: "WORKSHOPS // Rubric_Design // CTE_PORTAL",
    breadcrumbs: ["Home", "Workshops"],
    activeHref: "/instructor/f/t11-workshops",
    archetype: "workshops",
    primaryAction: "New enrollment",
    primaryActionHref: "/instructor/f/t42-new-workshop-enrollment",
    workshops: {
      tabs: ["Available (5)", "Registered (2)", "Completed (8)"],
      activeTab: "Available (5)",
      credits: "CREDITS COMPLETED: 16.0 CEUs",
      cards: [
        {
          tag: "AI-AUGMENTED",
          org: "Center for Teaching Excellence",
          seats: "8 Seats Left",
          title: "Advanced Rubric Design with AI Models",
          description:
            "Drafting rigorous, AI-matched grading schemas that map perfectly to the fall syllabus requirements.",
          when: "Oct 15, 2:00 PM - 4:00 PM",
          where: "Room A101 / Hybrid",
          href: "/instructor/f/t24-workshop-detail",
        },
      ],
      registrations: [{ title: "Neuromorphic FinTech Ethics", when: "Oct 12 @ 09:00 AM" }],
    },
  },

  "/instructor/f/t24-workshop-detail": {
    path: "/instructor/f/t24-workshop-detail",
    figmaId: "4:7678",
    title: "Advanced Rubric Design",
    subtitle: "Faculty workshop details and materials.",
    breadcrumbs: ["Home", "Workshops", "Advanced Rubric Design"],
    activeHref: "/instructor/f/t11-workshops",
    archetype: "workshopDetail",
    primaryAction: "Enroll in workshop",
    workshopDetail: {
      title: "Advanced Rubric Design",
      status: "Open for Enrollment",
      when: "October 22, 2026 · 9:00 AM–12:00 PM",
      where: "Learning Commons · Room 204 · Heritage Community College",
      seats: "12 of 30 seats remaining",
      description: "A practical session for faculty designing transparent, reliable analytic rubrics. Dr. Sarah Mitchell can earn three professional-development credits.",
      agenda: ["Rubric anatomy and alignment", "Performance-level calibration", "Peer review and revision", "Canvas gradebook integration"],
      materials: [
        { label: "Rubric Design Workbook", meta: "PDF · 2.4 MB" },
        { label: "Calibration Sample Pack", meta: "ZIP · 8.1 MB" },
      ],
    },
  },

  "/instructor/f/t40-workshop-enrollment-status": makeTable({
    path: "/instructor/f/t40-workshop-enrollment-status",
    figmaId: "4:11882",
    title: "Workshop Enrolments",
    subtitle: "WORKSHOPS // ENROLMENT_LEDGER // FALL_26",
    breadcrumbs: ["Home", "Workshops", "Enrollment Status"],
    activeHref: "/instructor/f/t11-workshops",
    filters: ["Term: Fall '26", "Category: All", "Status: Pending"],
    countLabel: "Pending (2) · Approved (5) · Declined (1)",
    columns: ["Workshop Title", "Host", "Date & Time", "Location", "Seats", "Status", "Applied"],
    columnTemplate:
      "minmax(160px,1.3fr) minmax(120px,1fr) minmax(110px,0.9fr) minmax(100px,0.8fr) minmax(70px,0.5fr) minmax(100px,0.8fr) minmax(90px,0.7fr)",
    rows: [
      {
        cells: [
          "Generative AI Pedagogies",
          "Dr. James Wilson",
          "Oct 15, 2:00 PM",
          "Online / Zoom",
          "15/30",
          "Pending Review",
          "Oct 02, 2026",
        ],
        badge: "Pending Review",
        badgeTone: "warning",
      },
      {
        cells: [
          "Canvas Rubric Automation",
          "Prof. Helen Carter",
          "Oct 19, 10:00 AM",
          "Room B302",
          "28/30",
          "Approved",
          "Oct 01, 2026",
        ],
        badge: "Approved",
        badgeTone: "success",
      },
    ],
  }),

  "/instructor/f/t41-workshop-attendance": makeTable({
    path: "/instructor/f/t41-workshop-attendance",
    figmaId: "4:12042",
    title: "Workshop Attendance",
    subtitle: "WORKSHOPS // PROFESSIONAL_DEVELOPMENT // LEDGER",
    breadcrumbs: ["Home", "Workshops", "Attendance"],
    activeHref: "/instructor/f/t11-workshops",
    primaryAction: "Download Certificate PDF",
    countLabel: "Attendance rate 92% · 24 workshops · 72.0 CEU hours",
    columns: ["Workshop Session", "Date", "Time", "Duration", "Status", "Certificate", "CEU Earned"],
    columnTemplate:
      "minmax(160px,1.3fr) minmax(100px,0.8fr) minmax(100px,0.8fr) minmax(70px,0.5fr) minmax(90px,0.7fr) minmax(90px,0.7fr) minmax(80px,0.6fr)",
    rows: [
      {
        cells: ["Generative AI Pedagogies", "Oct 15, 2026", "14:00 - 16:00", "2.0h", "Present ✓", "Earned", "2.0 CEUs"],
        badge: "Present ✓",
        badgeTone: "success",
      },
      {
        cells: ["Flipped Classroom Methods", "Sep 22, 2026", "09:00 - 12:00", "3.0h", "Present ✓", "Earned", "3.0 CEUs"],
        badge: "Present ✓",
        badgeTone: "success",
      },
      {
        cells: ["Cybersecurity for Educators", "Sep 08, 2026", "13:00 - 15:00", "2.0h", "Absent ✗", "N/A", "0.0 CEUs"],
        badge: "Absent ✗",
        badgeTone: "danger",
      },
    ],
  }),

  "/instructor/f/t42-new-workshop-enrollment": {
    path: "/instructor/f/t42-new-workshop-enrollment",
    figmaId: "4:12222",
    title: "Available Workshops",
    subtitle: "WORKSHOPS // REGISTER_NEW_SKILLS // CAMPUS_OS",
    breadcrumbs: ["Home", "Workshops", "New Enrollment"],
    activeHref: "/instructor/f/t11-workshops",
    archetype: "form",
    primaryAction: "Register Now",
    secondaryAction: "Cancel",
    form: {
      submitLabel: "Register Now",
      groups: [
        {
          title: "Workshop Selection",
          fields: [
            { label: "Workshop", value: "AI in Education: Practical Applications", type: "select" },
            { label: "Conducted by", value: "Dr. James Wilson", type: "text" },
            { label: "Category", value: "Technology", type: "select" },
            { label: "Seats", value: "12/30 seats available", type: "text" },
          ],
        },
        {
          title: "Schedule",
          fields: [
            { label: "Date", value: "Oct 15, 2025", type: "text" },
            { label: "Time", value: "9:00 AM - 12:00 PM", type: "text" },
            { label: "Location", value: "Online Zoom", type: "text" },
            {
              label: "Description",
              value: "Practical prompts, syllabus design, and automated grade assistants in the modern classroom.",
              type: "textarea",
            },
          ],
        },
      ],
    },
  },

  "/instructor/f/t12-students-view": {
    path: "/instructor/f/t12-students-view",
    figmaId: "3:5401",
    title: "Assigned Student Directory",
    subtitle: "STUDENTS_MGMT // ACCESS_RESTRICTED // DR_SARAH",
    breadcrumbs: ["Home", "Students"],
    activeHref: "/instructor/f/t12-students-view",
    archetype: "studentsDirectory",
    studentsDirectory: {
      rosterFilter: "Roster: ACC201 Sec-A",
      riskFilter: "Risk Level: All",
      note: "YOU ONLY VIEW ASSIGNED CLASS SECTIONS.",
      students: [
        {
          id: "ST-9284",
          name: "Aris Thorne",
          program: "BSc Finance",
          attendance: "72%",
          gpa: "2.8",
          missing: "2",
          risk: "High Risk",
          riskTone: "danger",
        },
        {
          id: "ST-4412",
          name: "Maya Chen",
          program: "AS Computer Science",
          attendance: "96%",
          gpa: "3.7",
          missing: "0",
          risk: "Normal",
          riskTone: "active",
        },
        {
          id: "ST-7781",
          name: "Luis Ortega",
          program: "BSc Accounting",
          attendance: "88%",
          gpa: "3.2",
          missing: "1",
          risk: "Normal",
          riskTone: "active",
        },
      ],
      drawer: {
        name: "Aris Thorne",
        meta: "ST-9284 // BSC_FIN",
        alert: "URGENT VERIFICATION",
        body: "Attendance is currently at 72% (deviation limit breached). 2 missing homework submissions for ACC201.",
        action: "Send Direct Notification",
      },
    },
  },

  "/instructor/f/t22-student-detail-full-page": {
    path: "/instructor/f/t22-student-detail-full-page",
    figmaId: "4:7293",
    title: "Aris Thorne",
    subtitle: "Student academic profile at Heritage Community College.",
    breadcrumbs: ["Home", "Students", "Aris Thorne"],
    activeHref: "/instructor/f/t12-students-view",
    archetype: "studentDetail",
    primaryAction: "Create academic alert",
    studentDetail: {
      name: "Aris Thorne",
      meta: "HCC-2026-1842 · B.BA Accounting · Advisor: Dr. Sarah Mitchell",
      tabs: ["Overview", "Assessments", "Requirements", "Flags", "Leave"],
      fields: [
        { label: "Institution", value: "Heritage Community College" },
        { label: "Current GPA", value: "2.1" },
        { label: "Attendance", value: "68%" },
        { label: "Academic Standing", value: "Conditional" },
      ],
      alerts: [
        { title: "High academic risk", body: "Three missing assessments and attendance below 70%.", tone: "danger" },
      ],
      courses: [
        { code: "ACC201", title: "Financial Accounting I", grade: "C+", status: "Correction Pending" },
        { code: "FIN210", title: "Personal Finance", grade: "B-", status: "Active" },
      ],
    },
  },

  "/instructor/f/t43-create-student-profile": {
    path: "/instructor/f/t43-create-student-profile",
    figmaId: "4:12383",
    title: "Create Student Profile",
    subtitle: "STUDENTS // DIRECT_REGISTRATION // TERMINAL",
    breadcrumbs: ["Home", "Students", "Create Profile"],
    activeHref: "/instructor/f/t12-students-view",
    archetype: "form",
    primaryAction: "Create Profile",
    secondaryAction: "Save as Draft",
    form: {
      submitLabel: "Create Profile",
      groups: [
        {
          title: "New Student Onboarding Form",
          fields: [
            { label: "First Name *", value: "Maria", type: "text" },
            { label: "Last Name *", value: "Santos", type: "text" },
            { label: "Academic Program *", value: "Associate of AAS - Accounting", type: "select" },
            { label: "Student Status", value: "Active", type: "select" },
            { label: "Primary Email Address *", value: "m.santos@campus.edu", type: "text" },
          ],
        },
      ],
    },
  },

  "/instructor/f/t44-academic-alerts": {
    path: "/instructor/f/t44-academic-alerts",
    figmaId: "4:12498",
    title: "Academic Alerts",
    subtitle: "STUDENTS // DISCIPLINARY_AND_PERFORMANCE_MONITOR",
    breadcrumbs: ["Home", "Students", "Academic Alerts"],
    activeHref: "/instructor/f/t12-students-view",
    archetype: "alertList",
    primaryAction: "Create alert",
    alertList: {
      badge: "12 ACTIVE",
      items: [
        {
          name: "Maria Santos",
          course: "BUS101",
          tag: "ATTENDANCE RISK",
          tagTone: "danger",
          body: "Attendance has fallen below 60% standard threshold.",
          avatar: "MS",
        },
        {
          name: "John Lee",
          course: "ACC201",
          tag: "GRADE / MISSING WORK",
          tagTone: "warning",
          body: "3 assignments flagged as missing over past fortnight.",
          avatar: "JL",
        },
        {
          name: "Sarah Kim",
          course: "MAT201",
          tag: "PERFORMANCE SLIP",
          tagTone: "info",
          body: "Mid-term grade projected to drop below C average.",
          avatar: "SK",
        },
      ],
    },
  },

  "/instructor/f/t45-student-flags": makeTable({
    path: "/instructor/f/t45-student-flags",
    figmaId: "4:12620",
    title: "Student Flags",
    subtitle: "STUDENTS // RED_FLAGS_AND_ACCOLADES // SYSTEM",
    breadcrumbs: ["Home", "Students", "Student Flags"],
    activeHref: "/instructor/f/t12-students-view",
    primaryAction: "Create Flag",
    columns: ["Student Name", "Flag Type", "Description", "Priority", "Status"],
    rows: [
      {
        cells: [
          "James Morrison · ID-49032",
          "ACADEMIC RISK",
          "Gradebook matching falls short on mid-term standard.",
          "High",
          "Active",
        ],
        badge: "High",
        badgeTone: "danger",
      },
      {
        cells: [
          "Chloe Henderson · ID-99014",
          "FINANCIAL HOLD",
          "Outstanding library module dues.",
          "Medium",
          "Active",
        ],
        badge: "Medium",
        badgeTone: "warning",
      },
      {
        cells: [
          "Arthur Pendelton · ID-12009",
          "SUCCESS NOTE",
          "Completed CTE Advanced syllabus benchmarks early.",
          "Low",
          "Resolved",
        ],
        badge: "Resolved",
        badgeTone: "success",
      },
    ],
  }),

  "/instructor/f/t46-student-assessments": makeTable({
    path: "/instructor/f/t46-student-assessments",
    figmaId: "4:12840",
    title: "Student Assessments",
    subtitle: "SYS.STUDENT_HUB // ASSESSMENTS_OVERVIEW",
    breadcrumbs: ["Home", "Students", "Assessments"],
    activeHref: "/instructor/f/t12-students-view",
    countLabel: "45 tasks · 8 pending grading · 12 missing",
    columns: ["Student", "Course", "Assessment Title", "Status", "Score", "Feedback"],
    rows: [
      {
        cells: ["Aria Vance · BBA-26-809", "ACC201 Sec A", "Mid-Term Audit Project", "Submitted ✓", "92 / 100", "Given"],
        badge: "Submitted ✓",
        badgeTone: "success",
      },
      {
        cells: [
          "Elena Rostova · BBA-26-441",
          "FIN301 Sec B",
          "Corporate valuation Case",
          "Late !",
          "Pending",
          "Pending Grading",
        ],
        badge: "Late !",
        badgeTone: "warning",
      },
      {
        cells: ["Marcus Brody · BBA-26-112", "ACC201 Sec A", "Mid-Term Audit Project", "Missing ✗", "-- / 100", "—"],
        badge: "Missing ✗",
        badgeTone: "danger",
      },
      {
        cells: ["Chloe Dupont · BBA-26-303", "ACC201 Sec A", "Mid-Term Audit Project", "Draft", "81 / 100", "Given"],
        badge: "Draft",
        badgeTone: "draft",
      },
    ],
  }),

  "/instructor/f/t47-student-requirements": makeTable({
    path: "/instructor/f/t47-student-requirements",
    figmaId: "4:13060",
    title: "Student Requirements",
    subtitle: "SYS.STUDENT_HUB // COMPLIANCE_AND_REQUIREMENTS",
    breadcrumbs: ["Home", "Students", "Requirements"],
    activeHref: "/instructor/f/t12-students-view",
    countLabel: "23 unmet critical · 5 deadlines this week",
    columns: ["Student", "Requirement", "Type", "Deadline", "Status", "Submitted"],
    rows: [
      {
        cells: ["Johnathan Smith · BBA-26-092", "ACC101 Prerequisite", "Prereq", "Sep 01, 2026", "Met ✓", "Aug 15, 2026"],
        badge: "Met ✓",
        badgeTone: "success",
      },
      {
        cells: [
          "Aria Vance · BBA-26-809",
          "Financial Statement Sign-off",
          "Financial",
          "Sep 15, 2026",
          "Pending ◯",
          "Sep 12, 2026",
        ],
        badge: "Pending ◯",
        badgeTone: "warning",
      },
      {
        cells: [
          "Elena Rostova · BBA-26-441",
          "Immunization Record V2",
          "Compliance",
          "Aug 20, 2026",
          "Unmet ✗",
          "MISSING",
        ],
        badge: "Unmet ✗",
        badgeTone: "danger",
      },
      {
        cells: [
          "Chloe Dupont · BBA-26-303",
          "Syllabus Compliance Pledge",
          "Document",
          "Sep 30, 2026",
          "Waived ~",
          "WAIVED BY DEAN",
        ],
        badge: "Waived ~",
        badgeTone: "muted",
      },
    ],
  }),

  "/instructor/f/t48-leave-of-absence": makeTable({
    path: "/instructor/f/t48-leave-of-absence",
    figmaId: "4:13242",
    title: "Leave of Absence (LOA)",
    subtitle: "SYS.STUDENT_HUB // LEAVE_MANAGEMENT",
    breadcrumbs: ["Home", "Students", "Leave of Absence"],
    activeHref: "/instructor/f/t12-students-view",
    primaryAction: "Submit New LOA",
    countLabel: "Active LOA · Pending Requests · Completed 15 · Denied",
    columns: ["Student", "Program", "LOA Type", "Start Date", "Expected Return", "Status"],
    rows: [
      {
        cells: [
          "Devon Lane · BBA-26-302",
          "Bachelor of Business Admin",
          "Medical",
          "Oct 12, 2026",
          "Jan 15, 2027",
          "Active - Med",
        ],
        badge: "Active - Med",
        badgeTone: "warning",
      },
      {
        cells: [
          "Jenny Wilson · BBA-25-104",
          "Bachelor of Business Admin",
          "Family Leave",
          "Nov 01, 2026",
          "Mar 01, 2027",
          "Active - Pers",
        ],
        badge: "Active - Pers",
        badgeTone: "info",
      },
      {
        cells: [
          "Guy Hawkins · BBA-26-905",
          "Bachelor of Business Admin",
          "Academic Prep",
          "Sep 15, 2026",
          "Feb 01, 2027",
          "Active - Acad",
        ],
        badge: "Active - Acad",
        badgeTone: "active",
      },
    ],
  }),

  "/instructor/f/t49-course-withdraw-requests": makeTable({
    path: "/instructor/f/t49-course-withdraw-requests",
    figmaId: "4:13392",
    title: "Withdraw Requests",
    subtitle: "SYS.STUDENT_HUB // WITHDRAWAL_QUEUE",
    breadcrumbs: ["Home", "Students", "Course Withdrawals"],
    activeHref: "/instructor/f/t12-students-view",
    countLabel: "Pending Review · Approved 12 · Denied",
    columns: ["Student", "Course", "Reason Category", "Reason Text", "Grade", "Att %"],
    rows: [
      {
        cells: [
          "Robert Fox · BBA-26-104",
          "ACC201 Sec A",
          "Academic Difficulty",
          "Struggling with ledger math fundamentals...",
          "52%",
          "64%",
        ],
        badge: "Pending",
        badgeTone: "warning",
      },
      {
        cells: [
          "Jane Cooper · BBA-26-905",
          "FIN301 Sec B",
          "Schedule Conflict",
          "New shift work hours overlap with lecture times...",
          "84%",
          "92%",
        ],
        badge: "Pending",
        badgeTone: "warning",
      },
      {
        cells: [
          "Cody Fisher · BBA-25-883",
          "ACC201 Sec A",
          "Personal Reasons",
          "Medical issue requiring family care commitments...",
          "78%",
          "81%",
        ],
        badge: "Pending",
        badgeTone: "info",
      },
    ],
  }),

  "/instructor/f/t63-students-by-status-filter": {
    path: "/instructor/f/t63-students-by-status-filter",
    figmaId: "4:16388",
    title: "Student Directory",
    subtitle: "SYS.STUDENTS // COHORT_EXPLORER",
    breadcrumbs: ["Home", "Students", "Status Filter"],
    activeHref: "/instructor/f/t12-students-view",
    archetype: "statusFilter",
    statusFilter: {
      filters: [
        { label: "New Inquiry", count: "—" },
        { label: "Approved Application", count: "—" },
        { label: "Declined Application", count: "82" },
        { label: "Registered Student", count: "—" },
        { label: "Active Student", count: "279", active: true },
        { label: "Graduated", count: "437" },
        { label: "Incomplete", count: "—" },
        { label: "Withdrawn Students", count: "247" },
        { label: "Dismissed", count: "408" },
        { label: "Refused Visa", count: "105" },
        { label: "File not Logged", count: "111" },
      ],
      columns: ["Student Name", "Student ID", "Program Major", "Advisor", "Cohort Admission Term", "Status"],
      rows: [
        {
          cells: ["Mitchell, Arthur", "MH-2026-9810", "Accounting", "D. Mitchell", "Fall 2026 Term", "ACTIVE"],
          badge: "ACTIVE",
          badgeTone: "active",
        },
        {
          cells: ["Manning, Jessica", "MH-2026-1024", "Corporate Finance", "J. Vance", "Fall 2026 Term", "ACTIVE"],
          badge: "ACTIVE",
          badgeTone: "active",
        },
        {
          cells: ["McDonald, Douglas", "MH-2025-4512", "Business Admin", "S. Harris", "Spring 2025 Term", "ACTIVE"],
          badge: "ACTIVE",
          badgeTone: "active",
        },
        {
          cells: ["Miller, Gregory", "MH-2026-8822", "Economics", "D. Mitchell", "Fall 2026 Term", "ACTIVE"],
          badge: "ACTIVE",
          badgeTone: "active",
        },
      ],
    },
  },

  "/instructor/f/t13-program-management": {
    path: "/instructor/f/t13-program-management",
    figmaId: "3:5572",
    title: "Program Management",
    subtitle: "Academic program operations for Heritage Community College.",
    breadcrumbs: ["Home", "Program Management"],
    activeHref: "/instructor/f/t13-program-management",
    archetype: "hub",
    hub: {
      cards: [
        { title: "Program Types", body: "Manage degree, diploma, certificate, and non-credit program categories.", href: "/instructor/f/t50-program-types", meta: "8 active types" },
        { title: "Manage Terms", body: "Configure academic terms, registration windows, and grade deadlines.", href: "/instructor/f/t51-manage-terms", meta: "Fall 2026 active" },
        { title: "Academic Calendars", body: "Review key dates and institution-wide academic events.", href: "/instructor/f/t52-academic-calendars", meta: "24 upcoming events" },
        { title: "Master Scheduling", body: "Coordinate rooms, instructors, and section meeting patterns.", href: "/instructor/f/t53-master-scheduling", meta: "6 conflicts" },
        { title: "Program Change Request", body: "Submit curriculum changes for academic approval.", href: "/instructor/f/t27-program-change-request", meta: "Dr. Sarah Mitchell · 2 drafts" },
      ],
    },
  },

  "/instructor/f/t27-program-change-request": {
    path: "/instructor/f/t27-program-change-request",
    figmaId: "4:8112",
    title: "New Program Change Request",
    subtitle: "BBA_PROGRAM_STUDIES // CURRICULUM_AMENDMENT",
    breadcrumbs: ["Home", "Program Management", "Change Request"],
    activeHref: "/instructor/f/t13-program-management",
    archetype: "form",
    primaryAction: "Submit to Academic Chair",
    secondaryAction: "Save Draft",
    form: {
      submitLabel: "Submit to Academic Chair",
      groups: [
        {
          title: "Curriculum Amendment Form",
          fields: [
            {
              label: "Program",
              value: "Bachelor of Business Administration (BBA) • Version 2024.1 • Academic Chair: Prof. James Chen",
              type: "text",
            },
            {
              label: "Request Title",
              value: "Add Data Analytics Elective course to BBA Year 3 curriculum",
              type: "text",
            },
            { label: "Change Category", value: "Add Course Block / Curriculum Restructure", type: "select" },
            {
              label: "Detailed Justification",
              value:
                "Market feedback indicates strong demand for Business Data Analytics principles. Introducing this course during Semester A of Year 3 ensures our BBA candidates maintain analytical compliance before entering career pathways.",
              type: "textarea",
            },
            {
              label: "Supporting Academic Research Evidence",
              value: "Curriculum_Benchmark_Study.pdf attached",
              type: "text",
            },
          ],
        },
      ],
    },
  },

  "/instructor/f/t50-program-types": makeTable({
    path: "/instructor/f/t50-program-types",
    figmaId: "4:13533",
    title: "Program Types",
    subtitle: "SYS.PROGRAM_ADMIN // CONFIGURATION",
    breadcrumbs: ["Home", "Program Management", "Program Types"],
    activeHref: "/instructor/f/t13-program-management",
    primaryAction: "Add Program Type",
    columns: ["Type Name", "Code", "Description", "Active Programs", "Status"],
    rows: [
      {
        cells: ["Bachelor's Degree", "BACC", "Four-year undergraduate program of academic study.", "4 Programs", "Active"],
        badge: "Active",
        badgeTone: "active",
      },
      {
        cells: ["Associate Degree", "ASSOC", "Two-year foundation study leading to university track.", "2 Programs", "Active"],
        badge: "Active",
        badgeTone: "active",
      },
      {
        cells: [
          "Advanced Diploma",
          "ADIP",
          "Professional competency track focused on industry sync.",
          "1 Program",
          "Active",
        ],
        badge: "Active",
        badgeTone: "active",
      },
      {
        cells: [
          "Micro-Credential",
          "MICRO",
          "Short intensive industry outcomes & skills focus.",
          "12 Programs",
          "Active",
        ],
        badge: "Active",
        badgeTone: "active",
      },
      {
        cells: [
          "Post-Grad Certificate",
          "PGCERT",
          "Specialist postgraduate cohort training matrix.",
          "0 Programs",
          "Inactive",
        ],
        badge: "Inactive",
        badgeTone: "muted",
      },
    ],
  }),

  "/instructor/f/t51-manage-terms": makeTable({
    path: "/instructor/f/t51-manage-terms",
    figmaId: "4:13710",
    title: "Manage Academic Terms",
    subtitle: "SYS.PROGRAM_ADMIN // TERM_SCHEDULER",
    breadcrumbs: ["Home", "Program Management", "Terms"],
    activeHref: "/instructor/f/t13-program-management",
    primaryAction: "Add Term",
    columns: ["Term Name", "Code", "Start Date", "End Date", "Registration Open", "Registration Close", "Status"],
    columnTemplate:
      "minmax(100px,0.9fr) minmax(60px,0.5fr) minmax(100px,0.8fr) minmax(100px,0.8fr) minmax(100px,0.8fr) minmax(100px,0.8fr) minmax(80px,0.6fr)",
    rows: [
      {
        cells: ["Fall 2025", "FA25", "Sep 01, 2025", "Dec 20, 2025", "May 01, 2025", "Aug 15, 2025", "Active"],
        badge: "Active",
        badgeTone: "active",
      },
      {
        cells: ["Spring 2026", "SP26", "Jan 10, 2026", "May 05, 2026", "Oct 01, 2025", "Jan 05, 2026", "Upcoming"],
        badge: "Upcoming",
        badgeTone: "info",
      },
      {
        cells: ["Summer 2026", "SU26", "Jun 01, 2026", "Aug 20, 2026", "Mar 01, 2026", "May 15, 2026", "Upcoming"],
        badge: "Upcoming",
        badgeTone: "info",
      },
      {
        cells: ["Winter 2026", "WI26", "Nov 01, 2026", "Dec 30, 2026", "Sep 01, 2026", "Oct 15, 2026", "Draft"],
        badge: "Draft",
        badgeTone: "draft",
      },
    ],
  }),

  "/instructor/f/t52-academic-calendars": {
    path: "/instructor/f/t52-academic-calendars",
    figmaId: "4:14049",
    title: "Academic Calendar Management",
    subtitle: "SYS.REGISTRY_HUB // CALENDAR_ENGINE",
    breadcrumbs: ["Home", "Program Management", "Academic Calendars"],
    activeHref: "/instructor/f/t13-program-management",
    archetype: "calendar",
    primaryAction: "Schedule Event",
    calendarBoard: {
      months: ["September 2026", "October 2026", "November 2026", "December 2026"],
      events: [
        { date: "Sep 1", label: "Classes Start · Fall 2026 Term", tone: "active" },
        { date: "Sep 11", label: "Add/Drop Deadline", tone: "warning" },
        { date: "Sep 15", label: "Senate Review", tone: "info" },
        { date: "Sep 25", label: "Midterm Setup", tone: "info" },
        { date: "Oct 12", label: "Thanksgiving · College Closed", tone: "muted" },
        { date: "Dec 18", label: "Final grades due", tone: "danger" },
      ],
    },
  },

  "/instructor/f/t53-master-scheduling": {
    path: "/instructor/f/t53-master-scheduling",
    figmaId: "4:14305",
    title: "Master Schedule Planner",
    subtitle: "SYS.SCHEDULER // DR_SARAH_MITCHELL",
    breadcrumbs: ["Home", "Program Management", "Master Scheduling"],
    activeHref: "/instructor/f/t13-program-management",
    archetype: "scheduler",
    primaryAction: "Auto-Resolve Conflicts",
    secondaryAction: "Weekly Grid View",
    scheduler: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      slots: [
        { day: 0, start: "08:00", end: "09:30", label: "FIN301-A", room: "Room 201", tone: "primary" },
        { day: 1, start: "09:30", end: "11:00", label: "ACC201-B", room: "Room C104", tone: "primary" },
        { day: 2, start: "09:30", end: "11:00", label: "ACC201-B · ROOM OVERLAP CONFLICT", room: "Room C104", tone: "muted" },
        { day: 3, start: "11:00", end: "12:30", label: "MKT105", room: "Room 303", tone: "primary" },
        { day: 4, start: "13:30", end: "15:00", label: "HRM204", room: "Room B102", tone: "primary" },
        { day: 1, start: "13:30", end: "15:00", label: "FIN301-Lab", room: "Room 201", tone: "primary" },
      ],
    },
  },

  "/instructor/f/t10-assessments-gradebook": {
    path: "/instructor/f/t10-assessments-gradebook",
    figmaId: "3:5121",
    title: "Assessments & Gradebook",
    subtitle: "ACC201 // GRADES_AUDIT_PUBLISH",
    breadcrumbs: ["Home", "My Courses", "ACC201", "Gradebook"],
    activeHref: "/instructor/f/t10-assessments-gradebook",
    archetype: "gradebook",
    primaryAction: "Publish Final Marks",
    secondaryAction: "Export CSV",
    gradebook: {
      course: "ACC201 · GRADE_STATUS: DRAFT · Submission Target: Dec 15, 2026",
      publishLabel: "Publish Final Marks",
      columns: ["STUDENT", "QUIZ 1 (10%)", "MIDTERM (25%)", "ASSIGN 1 (15%)", "LABS (20%)", "FINAL EXAM (30%)", "WEIGHTED TOTAL"],
      rows: [
        {
          name: "Aris Thorne",
          id: "ST-1029",
          assessments: ["82% (B)", "78% (B)", "85% (A)", "90% (A)", "80% (B)"],
          total: "81.4%",
          letter: "B+",
          status: "Draft",
        },
        {
          name: "Chloe Miller",
          id: "ST-2041",
          assessments: ["95% (A)", "92% (A)", "88% (B)", "94% (A)", "91% (A)"],
          total: "91.8%",
          letter: "A",
          status: "Draft",
        },
        {
          name: "Dave Patel",
          id: "ST-3102",
          assessments: ["60% (D)", "65% (D)", "70% (C)", "72% (C)", "58% (F)"],
          total: "63.9%",
          letter: "D",
          status: "Draft",
        },
        {
          name: "Eva Jenkins",
          id: "ST-4418",
          assessments: ["84% (B)", "89% (B)", "88% (B)", "90% (A)", "88% (B)"],
          total: "88.5%",
          letter: "A-",
          status: "Draft",
        },
      ],
      legend: [
        "Spreadsheet Ledger Mode · FORMULA_MODE: ISO_3901_AUTO",
        "Active Audit Selection · ST-1029 // DIST_L5",
        "Performances show a +4.2% deviation above section average. Final exam draft complete. Attendance validated at 98.4%.",
      ],
    },
  },

  "/instructor/f/t29-password-reset-flow": {
    path: "/instructor/f/t29-password-reset-flow",
    figmaId: "4:8499",
    title: "Password Reset",
    subtitle: "Secure account recovery for faculty terminals.",
    breadcrumbs: ["Home", "System", "Password Reset"],
    activeHref: "/instructor/f/t29-password-reset-flow",
    archetype: "authGate",
    shell: "campus",
    authGate: {
      heading: "Reset Password",
      description: "Enter your email address and we'll send a secure reset link.",
      fieldLabel: "Email address",
      fieldValue: "teacher@heritage.edu",
      cta: "Send Reset Link",
      help: "Need help? Contact the Registrar's Office",
    },
  },

  "/instructor/f/t30-mfa-challenge": {
    path: "/instructor/f/t30-mfa-challenge",
    figmaId: "4:8586",
    title: "MFA Challenge",
    subtitle: "Complete your security verification to continue to the dashboard.",
    breadcrumbs: ["Home", "System", "MFA Challenge"],
    activeHref: "/instructor/f/t30-mfa-challenge",
    archetype: "authGate",
    shell: "campus",
    authGate: {
      heading: "MFA Challenge",
      description: "Complete your security verification to continue to the dashboard.",
      fieldLabel: "Verification code",
      fieldValue: "••••••",
      cta: "Verify Access",
      help: "Need help? Contact the Registrar's Office",
    },
  },

  "/instructor/f/t31-first-login-profile-completion": {
    path: "/instructor/f/t31-first-login-profile-completion",
    figmaId: "4:8650",
    title: "Welcome Aboard — Faculty Onboarding",
    subtitle: "SYS.ONBOARDING // NEW_FACULTY_NODE",
    breadcrumbs: ["Home", "Onboarding", "Profile Completion"],
    activeHref: "/instructor/f/t31-first-login-profile-completion",
    archetype: "authGate",
    shell: "campus",
    authGate: {
      heading: "Temporary Password Update",
      description: "Please complete your primary contact details. This will be validated by the registrar.",
      fieldLabel: "Current Temporary Password",
      fieldValue: "••••••••",
      cta: "Save & Continue",
      help: "Need assistance with academic credentials? Contact Academic Operations",
      extraFields: [
        { label: "Full Name", value: "Dr. Sarah Mitchell" },
        { label: "Preferred Name", value: "Sarah" },
        { label: "Phone Number", value: "+1 (416) 555-0142" },
        { label: "Office Location", value: "Hall A · Office 312" },
        { label: "Emergency Contact (Name, Phone, Relation)", value: "" },
        { label: "New Secure Password", value: "" },
        { label: "Confirm New Password", value: "" },
      ],
    },
  },


};


// Alias instructor Figma paths onto existing dedicated configs.
const _t08 = TEACHER_SCREENS["/instructor/f/t08-my-courses-detail"];
const _t12 = TEACHER_SCREENS["/instructor/f/t12-students-view"];
const _t22 = TEACHER_SCREENS["/instructor/f/t22-student-detail-full-page"];
const _t04 = TEACHER_SCREENS["/instructor/f/t04-profile-availability"];
const _t05 = TEACHER_SCREENS["/instructor/f/t05-profile-compensation"];
const _t11 = TEACHER_SCREENS["/instructor/f/t11-workshops"];
const _t10 = TEACHER_SCREENS["/instructor/f/t10-assessments-gradebook"];

TEACHER_SCREENS["/instructor/f/in-03-course-detail"] = {
  ..._t08,
  path: "/instructor/f/in-03-course-detail",
  figmaId: "17:6652",
  title: "Course Detail",
};
TEACHER_SCREENS["/instructor/f/in-04-roster"] = {
  ..._t12,
  path: "/instructor/f/in-04-roster",
  figmaId: "17:6739",
  title: "Course Roster",
};
TEACHER_SCREENS["/instructor/f/in-11-student-detail"] = {
  ..._t22,
  path: "/instructor/f/in-11-student-detail",
  figmaId: "17:7313",
  title: "Student Detail",
};
TEACHER_SCREENS["/instructor/f/in-18-availability"] = {
  ..._t04,
  path: "/instructor/f/in-18-availability",
  figmaId: "17:8021",
  title: "Availability",
};
TEACHER_SCREENS["/instructor/f/in-19-compensation"] = {
  ..._t05,
  path: "/instructor/f/in-19-compensation",
  figmaId: "17:8223",
  title: "Compensation",
};
TEACHER_SCREENS["/instructor/f/in-20-workshops"] = {
  ..._t11,
  path: "/instructor/f/in-20-workshops",
  figmaId: "17:8317",
  title: "Workshops",
};
TEACHER_SCREENS["/instructor/f/in-06-assessment-manager"] = {
  ..._t10,
  path: "/instructor/f/in-06-assessment-manager",
  figmaId: "17:6962",
  title: "Assessment Manager",
  subtitle: "Assessments · ACC201 gradebook ledger",
};
TEACHER_SCREENS["/instructor/f/in-07-gradebook"] = {
  ..._t10,
  path: "/instructor/f/in-07-gradebook",
  figmaId: "17:775",
  title: "ACC201 Gradebook",
  subtitle: "Draft gradebook · Save Draft · Publish Grades",
};

// Legacy pretty routes → same live SIS configs (no orphan GenericLiveScreen pages)
const _t16 = TEACHER_SCREENS["/instructor/f/t16-teacher-messages-chat"];
const _t02 = TEACHER_SCREENS["/instructor/f/t02-profile-biography"];
const _t23 = TEACHER_SCREENS["/instructor/f/t23-course-announcements"];

if (_t16) {
  TEACHER_SCREENS["/instructor/messages"] = { ..._t16, path: "/instructor/messages", title: "Messages" };
}
if (_t02) {
  TEACHER_SCREENS["/instructor/profile"] = { ..._t02, path: "/instructor/profile", title: "Profile" };
}
if (_t12) {
  TEACHER_SCREENS["/instructor/roster"] = { ..._t12, path: "/instructor/roster", title: "Roster" };
}
if (_t10) {
  TEACHER_SCREENS["/instructor/assessments"] = {
    ..._t10,
    path: "/instructor/assessments",
    title: "Assessments",
    primaryActionHref: "/instructor/gradebook",
  };
  TEACHER_SCREENS["/instructor/submissions"] = {
    ..._t10,
    path: "/instructor/submissions",
    title: "Submissions",
    primaryActionHref: "/instructor/gradebook",
  };
}
if (_t23) {
  TEACHER_SCREENS["/instructor/announcements"] = {
    ..._t23,
    path: "/instructor/announcements",
    title: "Announcements",
  };
}
if (_t08) {
  TEACHER_SCREENS["/instructor/modules"] = { ..._t08, path: "/instructor/modules", title: "Modules" };
  TEACHER_SCREENS["/instructor/lectures"] = {
    ..._t08,
    path: "/instructor/lectures",
    title: "Lectures",
    primaryAction: "Schedule Lecture",
  };
  TEACHER_SCREENS["/instructor/labs"] = {
    ..._t08,
    path: "/instructor/labs",
    title: "Labs",
    primaryAction: "Open Lab Roster",
    primaryActionHref: "/instructor/roster",
  };
  TEACHER_SCREENS["/instructor/studio"] = {
    ..._t08,
    path: "/instructor/studio",
    title: "Course Studio",
    shell: "studio",
  };
  TEACHER_SCREENS["/instructor/sections/demo"] = {
    ..._t08,
    path: "/instructor/sections/demo",
    title: "Section detail",
  };
}

export function getTeacherScreen(path: string): TeacherScreenConfig | undefined {
  return TEACHER_SCREENS[path];
}

export const TEACHER_SCREEN_PATHS = Object.keys(TEACHER_SCREENS);

export type AdminNavChild = { label: string; href: string };

export type AdminNavItem = {
  label: string;
  href: string;
  icon: string;
  children?: AdminNavChild[];
};

export type AdminSidebarEntry = { type: "label"; label: string } | { type: "item"; item: AdminNavItem };

export const PLATFORM_NAV: AdminNavChild[] = [
  { label: "Platform Home", href: "/admin/platform" },
  { label: "Users", href: "/admin/users" },
  { label: "Student onboarding", href: "/admin/users/create?role=student" },
  { label: "Instructor onboarding", href: "/admin/users/create?role=instructor" },
  { label: "Permissions", href: "/admin/permissions" },
  { label: "Integrations Home", href: "/admin/integrations" },
  { label: "Users & Roles", href: "/admin/f/pl-01-users-and-roles" },
  { label: "Permission Matrix", href: "/admin/f/pl-02-permission-matrix" },
  { label: "Security Policy", href: "/admin/f/pl-03-security-policy" },
  { label: "Session & Login Audit", href: "/admin/f/pl-04-session-login-audit" },
  { label: "Integrations", href: "/admin/f/pl-05-integrations" },
  { label: "System Operations", href: "/admin/f/pl-06-operations" },
  { label: "Institution Settings", href: "/admin/f/pl-07-institution-settings" },
  { label: "Notification Templates", href: "/admin/f/pl-08-notification-templates" },
];

export const LABS_NAV: AdminNavChild[] = [
  { label: "Labs Home", href: "/admin/labs" },
  { label: "Lab Dashboard", href: "/admin/f/lb-01-lab-dashboard" },
  { label: "Rooms", href: "/admin/f/lb-02-lab-rooms" },
  { label: "Equipment", href: "/admin/f/lb-03-lab-equipment-list" },
  { label: "Equipment Detail", href: "/admin/f/lb-04-equipment-detail" },
  { label: "Inventory", href: "/admin/f/lb-05-inventory" },
  { label: "Safety Rules", href: "/admin/f/lb-06-safety-rules" },
  { label: "Eligibility", href: "/admin/f/lb-07-student-eligibility" },
  { label: "Lab Session", href: "/admin/f/lb-08-lab-session" },
  { label: "Notebook", href: "/admin/f/lb-09-lab-notebook" },
  { label: "Incidents", href: "/admin/f/lb-10-incident" },
  { label: "Virtual Labs", href: "/admin/f/lb-11-virtual-labs" },
  { label: "Environments", href: "/admin/f/lb-12-computer-environments" },
];

export const COMPLIANCE_NAV: AdminNavChild[] = [
  { label: "Compliance Home", href: "/admin/compliance" },
  { label: "Dashboard", href: "/admin/f/cp-01-compliance-dashboard" },
  { label: "Completeness", href: "/admin/f/cp-02-record-completeness" },
  { label: "Record Vault", href: "/admin/f/cp-03-record-vault" },
  { label: "Retention", href: "/admin/f/cp-04-retention-policies" },
  { label: "Legal Holds", href: "/admin/f/cp-05-legal-holds" },
  { label: "Evidence Mapping", href: "/admin/f/cp-06-evidence-mapping" },
  { label: "Accreditation", href: "/admin/f/cp-07-accreditation-assistant" },
  { label: "Inspection Pack", href: "/admin/f/cp-08-inspection-pack" },
  { label: "Disposal Review", href: "/admin/f/cp-09-disposal-review" },
  { label: "Privacy Requests", href: "/admin/f/cp-10-privacy-requests" },
];

export const AI_NAV: AdminNavChild[] = [
  { label: "AI Hub", href: "/admin/ai" },
  { label: "Ask MyHeritage", href: "/admin/ai/ask" },
  { label: "AI Dashboard", href: "/admin/f/ai-01-ai-dashboard" },
  { label: "Models", href: "/admin/f/ai-02-model-registry" },
  { label: "Prompts", href: "/admin/f/ai-03-prompt-registry" },
  { label: "Tools", href: "/admin/f/ai-04-tool-registry" },
  { label: "Knowledge", href: "/admin/f/ai-05-knowledge-sources" },
  { label: "Ingestion", href: "/admin/f/ai-06-ingestion-jobs" },
  { label: "Retrieval", href: "/admin/f/ai-07-retrieval-inspector" },
  { label: "Evaluation", href: "/admin/f/ai-08-evaluation-dashboard" },
  { label: "Citations", href: "/admin/f/ai-09-citation-failures" },
  { label: "Usage & Cost", href: "/admin/f/ai-10-usage-cost" },
  { label: "AI Policy", href: "/admin/f/ai-11-ai-policy" },
  { label: "Tool Audit", href: "/admin/f/ai-12-tool-call-audit" },
];

export const ACADEMICS_NAV: AdminNavChild[] = [
  { label: "Courses", href: "/admin/courses" },
  { label: "Programs Home", href: "/admin/programs" },
  { label: "Terms", href: "/admin/terms" },
  { label: "Sections", href: "/admin/sections" },
  { label: "Scheduling", href: "/admin/schedule" },
  { label: "Programs", href: "/admin/f/ac-03-programs" },
  { label: "Academic Terms", href: "/admin/f/ac-01-academic-terms" },
  { label: "Calendar", href: "/admin/f/ac-02-academic-calendar" },
  { label: "Program Detail", href: "/admin/f/ac-04-program-detail" },
  { label: "Change Requests", href: "/admin/f/ac-05-program-change-request" },
  { label: "Course Catalogue", href: "/admin/f/ac-06-course-catalogue" },
  { label: "Course Setup", href: "/admin/f/ac-07-course-setup" },
  { label: "Categories", href: "/admin/f/ac-08-course-categories" },
  { label: "Sections", href: "/admin/f/ac-09-sections" },
  { label: "Master Scheduling", href: "/admin/f/ac-10-master-scheduling" },
  { label: "Pending Schedules", href: "/admin/f/ac-11-pending-schedules" },
  { label: "Grading Schemes", href: "/admin/f/ac-12-grading-schemes" },
  { label: "Pending Grades", href: "/admin/f/ac-13-pending-grades" },
  { label: "Faculty roster", href: "/admin/f/ac-14-faculty" },
  { label: "Instructor 360", href: "/admin/f/ac-14-faculty-360" },
  { label: "Instructor onboarding", href: "/admin/users/create?role=instructor" },
  { label: "Evaluations", href: "/admin/f/ac-15-course-evaluations" },
  { label: "Resources", href: "/admin/f/ac-16-course-resources" },
  { label: "Requirements", href: "/admin/f/ac-17-student-requirements" },
  { label: "LOA Requests", href: "/admin/f/ac-18-loa-requests" },
  { label: "Withdrawals", href: "/admin/f/ac-19-withdraw-requests" },
  { label: "Create user", href: "/admin/users/create" },
];

export const ADMISSIONS_NAV: AdminNavChild[] = [
  { label: "Admissions Home", href: "/admin/admissions" },
  { label: "Dashboard", href: "/admin/f/ad-01-admissions-dashboard" },
  { label: "Application Queue", href: "/admin/f/ad-02-application-queue" },
  { label: "Application Detail", href: "/admin/f/ad-03-application-detail" },
  { label: "Requirement Review", href: "/admin/f/ad-04-requirement-review" },
  { label: "Document Review", href: "/admin/f/ad-05-document-review" },
  { label: "Interviews", href: "/admin/f/ad-06-interview-workspace" },
  { label: "Decision", href: "/admin/f/ad-07-decision-workspace" },
  { label: "Offer Builder", href: "/admin/f/ad-08-offer-builder" },
  { label: "LOA Builder", href: "/admin/f/ad-09-loa-builder" },
  { label: "Conversion", href: "/admin/f/ad-10-conversion" },
  { label: "Conversion Dashboard", href: "/admin/f/ad-10-conversion-dashboard" },
  { label: "Intake Capacity", href: "/admin/f/ad-11-intake-capacity" },
];

export const PRACTICUM_NAV: AdminNavChild[] = [
  { label: "Practicum Home", href: "/admin/practicum" },
  { label: "Dashboard", href: "/admin/f/pr-01-practicum-dashboard" },
  { label: "Employers", href: "/admin/f/pr-02-employers-registry" },
  { label: "Sites", href: "/admin/f/pr-03-sites" },
  { label: "Opportunities", href: "/admin/f/pr-04-opportunities" },
  { label: "Placements", href: "/admin/f/pr-05-placements-workspace" },
  { label: "Agreements", href: "/admin/f/pr-06-agreements" },
  { label: "Logs", href: "/admin/f/pr-07-logs" },
  { label: "Evaluations", href: "/admin/f/pr-08-evaluations" },
  { label: "Incidents", href: "/admin/f/pr-09-incidents" },
];

export const REGISTRAR_NAV: AdminNavChild[] = [
  { label: "Students", href: "/admin/students" },
  { label: "Student 360", href: "/admin/f/rg-01-student-360" },
  { label: "Student onboarding", href: "/admin/users/create?role=student" },
  { label: "Enrolments", href: "/admin/enrolments" },
  { label: "Records", href: "/admin/records" },
  { label: "Transcripts", href: "/admin/transcripts" },
  { label: "Dashboard", href: "/admin/f/rg-00-registrar-dashboard" },
  { label: "Academic History", href: "/admin/f/rg-02-academic-history" },
  { label: "Status History", href: "/admin/f/rg-03-status-history" },
  { label: "Transfer Credits", href: "/admin/f/rg-04-transfer-credits" },
  { label: "Academic Standing", href: "/admin/f/rg-05-academic-standing" },
  { label: "Completion Audit", href: "/admin/f/rg-06-completion-audit" },
  { label: "Transcript", href: "/admin/f/rg-07-transcript" },
  { label: "Corrections", href: "/admin/f/rg-08-registrar-correction" },
  { label: "Official Export", href: "/admin/f/rg-09-official-export" },
  { label: "Approvals", href: "/admin/approvals" },
  { label: "Cohorts", href: "/admin/cohorts" },
  { label: "Retakes / Make-up", href: "/admin/retakes" },
  { label: "Student Documents", href: "/admin/student-documents" },
  { label: "Extracurricular", href: "/admin/extracurricular" },
  { label: "Tax Documents", href: "/admin/tax-documents" },
  { label: "Mail Policy", href: "/admin/mail-policy" },
];

export const CRM_NAV: AdminNavChild[] = [
  { label: "CRM Home", href: "/admin/crm" },
  { label: "Dashboard", href: "/admin/f/crm-01-dashboard" },
  { label: "Leads", href: "/admin/f/crm-02-leads" },
  { label: "Lead 360", href: "/admin/f/crm-03-lead-360" },
  { label: "Campaigns", href: "/admin/f/crm-04-campaigns" },
  { label: "Campaign Detail", href: "/admin/f/crm-05-campaign-detail" },
  { label: "Events", href: "/admin/f/crm-06-events" },
  { label: "Counsellor Queue", href: "/admin/f/crm-07-counsellor-queue" },
  { label: "Funnel Analytics", href: "/admin/f/crm-08-funnel-analytics" },
];

export const FINANCE_NAV: AdminNavChild[] = [
  { label: "Finance Home", href: "/admin/finance" },
  { label: "AR / Payment Posting", href: "/admin/finance/posting" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Refunds", href: "/admin/refunds" },
  { label: "Dashboard", href: "/admin/f/fn-01-finance-dashboard" },
  { label: "Student Account", href: "/admin/f/fn-02-student-account" },
  { label: "Charges", href: "/admin/f/fn-03-charges" },
  { label: "Payments", href: "/admin/f/fn-04-payments" },
  { label: "Reconciliation", href: "/admin/f/fn-05-reconciliation" },
  { label: "Refund Queue", href: "/admin/f/fn-06-refund-queue" },
  { label: "Holds", href: "/admin/f/fn-07-holds" },
  { label: "Export", href: "/admin/f/fn-08-finance-export" },
  { label: "Tax Documents", href: "/admin/tax-documents" },
];

export const SUCCESS_NAV: AdminNavChild[] = [
  { label: "Success Home", href: "/admin/success" },
  { label: "Flags", href: "/admin/flags" },
  { label: "Dashboard", href: "/admin/f/ss-01-success-dashboard" },
  { label: "Alert Queue", href: "/admin/f/ss-02-alert-queue" },
  { label: "Student 360", href: "/admin/f/ss-03-student-success-360" },
  { label: "Case", href: "/admin/f/ss-04-case" },
  { label: "Action Plan", href: "/admin/f/ss-05-action-plan" },
  { label: "Appointments", href: "/admin/f/ss-06-appointments" },
  { label: "Analytics", href: "/admin/f/ss-07-intervention-analytics" },
];

export const WORKFLOW_NAV: AdminNavChild[] = [
  { label: "Workflows Home", href: "/admin/workflows" },
  { label: "Workflows", href: "/admin/f/wf-01-workflow-list" },
  { label: "Designer", href: "/admin/f/wf-02-workflow-designer" },
  { label: "Test Runner", href: "/admin/f/wf-03-workflow-test" },
  { label: "Runs", href: "/admin/f/wf-04-workflow-runs" },
];

export const FORMS_NAV: AdminNavChild[] = [
  { label: "Forms Home", href: "/admin/forms" },
  { label: "Templates", href: "/admin/templates" },
  { label: "Files", href: "/admin/files" },
  { label: "Form List", href: "/admin/f/fm-01-form-list" },
  { label: "Designer", href: "/admin/f/fm-02-form-designer" },
  { label: "Versions", href: "/admin/f/fm-03-form-version" },
  { label: "Submissions", href: "/admin/f/fm-04-form-submissions" },
];

export const RULES_NAV: AdminNavChild[] = [
  { label: "Rules Home", href: "/admin/rules" },
  { label: "Rule Sets", href: "/admin/f/rl-01-rule-sets" },
  { label: "Designer", href: "/admin/f/rl-02-rule-designer" },
  { label: "Simulator", href: "/admin/f/rl-03-rule-simulator" },
];

export const GLOBAL_NAV: AdminNavChild[] = [
  { label: "Search", href: "/admin/search" },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "Profile", href: "/admin/profile" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Approvals", href: "/admin/approvals" },
  { label: "Calendar", href: "/admin/calendar" },
  { label: "Security", href: "/admin/security" },
  { label: "Help", href: "/admin/help" },
  { label: "Jobs", href: "/admin/jobs" },
  { label: "Operations", href: "/admin/operations" },
  { label: "Settings", href: "/admin/settings" },
  { label: "Corrections", href: "/admin/corrections" },
  { label: "Audit", href: "/admin/audit" },
];

export const ADMIN_SIDEBAR: AdminSidebarEntry[] = [
  { type: "item", item: { label: "Dashboard", href: "/admin", icon: "home" } },
  { type: "item", item: { label: "Workspace", href: "/admin/search", icon: "file-text", children: GLOBAL_NAV } },
  { type: "label", label: "RECRUIT" },
  {
    type: "item",
    item: { label: "Admissions", href: "/admin/f/ad-01-admissions-dashboard", icon: "bar-chart", children: ADMISSIONS_NAV },
  },
  { type: "item", item: { label: "CRM", href: "/admin/f/crm-01-dashboard", icon: "users", children: CRM_NAV } },
  { type: "label", label: "STUDENTS" },
  {
    type: "item",
    item: { label: "Student Success", href: "/admin/f/ss-01-success-dashboard", icon: "bell", children: SUCCESS_NAV },
  },
  {
    type: "item",
    item: { label: "Registrar", href: "/admin/f/rg-00-registrar-dashboard", icon: "school", children: REGISTRAR_NAV },
  },
  { type: "label", label: "ACADEMICS" },
  {
    type: "item",
    item: { label: "Academics", href: "/admin/f/ac-03-programs", icon: "book", children: ACADEMICS_NAV },
  },
  { type: "item", item: { label: "Labs", href: "/admin/f/lb-01-lab-dashboard", icon: "flask", children: LABS_NAV } },
  {
    type: "item",
    item: { label: "Practicum", href: "/admin/f/pr-01-practicum-dashboard", icon: "briefcase", children: PRACTICUM_NAV },
  },
  { type: "label", label: "FINANCE" },
  {
    type: "item",
    item: { label: "Finance", href: "/admin/f/fn-01-finance-dashboard", icon: "pie", children: FINANCE_NAV },
  },
  { type: "label", label: "SYSTEM" },
  { type: "item", item: { label: "AI Hub", href: "/admin/f/ai-01-ai-dashboard", icon: "sparkle", children: AI_NAV } },
  {
    type: "item",
    item: { label: "Compliance", href: "/admin/f/cp-01-compliance-dashboard", icon: "shield", children: COMPLIANCE_NAV },
  },
  { type: "item", item: { label: "Forms", href: "/admin/f/fm-01-form-list", icon: "file-text", children: FORMS_NAV } },
  { type: "item", item: { label: "Rules", href: "/admin/f/rl-01-rule-sets", icon: "list", children: RULES_NAV } },
  {
    type: "item",
    item: { label: "Workflows", href: "/admin/f/wf-01-workflow-list", icon: "briefcase", children: WORKFLOW_NAV },
  },
  {
    type: "item",
    item: { label: "Platform", href: "/admin/f/pl-07-institution-settings", icon: "settings", children: PLATFORM_NAV },
  },
];

export function adminHrefMatches(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function adminChildActive(pathname: string, child: AdminNavChild) {
  return adminHrefMatches(pathname, child.href);
}

export function adminGroupActive(pathname: string, item: AdminNavItem) {
  if (item.children?.length) {
    if (item.children.some((child) => adminChildActive(pathname, child))) return true;
    const prefix = item.href.match(/^(\/admin\/f\/[a-z]+-)/);
    return Boolean(prefix && pathname.startsWith(prefix[1]));
  }
  return adminHrefMatches(pathname, item.href);
}

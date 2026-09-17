import { z } from "zod";
import { IsoDateTime, Uuid } from "./base.js";
import { RoleName } from "./entities.js";

/** Action risk levels for AI capabilities (0 = answer … 4 = high-risk). */
export const AiActionClass = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const AiCapabilityId = z.enum([
  "campus_coach",
  "student_advisor",
  "degree_progress",
  "what_if_planner",
  "study_coach",
  "faculty_assistant",
  "student_success",
  "admin_ask_data",
  "admissions_assistant",
  "student_services",
]);

export const AiClaimKind = z.enum(["fact", "inference", "uncertainty", "action"]);

export const AiClaim = z.object({
  kind: AiClaimKind,
  text: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).default([]),
});

export const AiToolName = z.enum([
  "get_student_profile",
  "get_academic_record",
  "get_degree_requirements",
  "get_degree_progress",
  "get_course_catalog",
  "get_prerequisite_graph",
  "create_degree_plan_scenario",
  "save_degree_plan_scenario",
]);

export const AiToolDefinition = z.object({
  name: AiToolName,
  purpose: z.string().min(1),
  personas: z.array(RoleName).min(1),
  permissionKey: z.string().min(1),
  readOnly: z.boolean(),
  consequential: z.boolean(),
  approvalRequired: z.boolean(),
  actionClass: AiActionClass,
  auditEventName: z.string().min(1).nullable(),
});

export const AiRequestContext = z.object({
  accountId: Uuid,
  personId: Uuid,
  institutionId: Uuid,
  roles: z.array(RoleName),
  sessionId: Uuid,
  capability: AiCapabilityId,
  contextPath: z.string().startsWith("/").max(200).optional(),
  activeStudentId: Uuid.optional(),
  activeCourseId: Uuid.optional(),
  activeSectionId: Uuid.optional(),
  activeTermId: Uuid.optional(),
});

export const RequirementStatus = z.enum(["satisfied", "in_progress", "missing", "blocked"]);

export const DegreeRequirementItem = z.object({
  id: Uuid,
  code: z.string().min(1),
  title: z.string().min(1),
  credits: z.number().nonnegative(),
  kind: z.enum(["required", "elective", "capstone"]),
  status: RequirementStatus,
  satisfiedByCourseCode: z.string().nullable(),
  blockedByCourseCodes: z.array(z.string()),
});

export const PrerequisiteEdge = z.object({
  courseCode: z.string().min(1),
  requiresCourseCode: z.string().min(1),
});

export const DegreePlanAnalysis = z.object({
  studentId: Uuid,
  programCode: z.string().min(1),
  programName: z.string().min(1),
  programVersionLabel: z.string().min(1),
  remainingCredits: z.number().nonnegative(),
  completedCredits: z.number().nonnegative(),
  requiredCredits: z.number().positive(),
  remainingRequirements: z.array(DegreeRequirementItem),
  satisfiedRequirements: z.array(DegreeRequirementItem),
  prerequisiteConflicts: z.array(
    z.object({
      courseCode: z.string(),
      missingPrerequisites: z.array(z.string()),
    }),
  ),
  prerequisiteGraph: z.array(PrerequisiteEdge),
  projectedCompletionTerm: z.string().nullable(),
  warnings: z.array(z.string()),
  suggestedOptions: z.array(z.string()),
  evidence: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      uri: z.string().startsWith("/"),
    }),
  ),
  claims: z.array(AiClaim).default([]),
});

export const WhatIfScenarioRequest = z.object({
  dropCourseCodes: z.array(z.string().min(1)).max(20).default([]),
  failCourseCodes: z.array(z.string().min(1)).max(20).default([]),
  addCourseCodes: z.array(z.string().min(1)).max(20).default([]),
  label: z.string().trim().min(1).max(120).optional(),
  save: z.boolean().default(false),
});

export const WhatIfScenarioResponse = z.object({
  scenarioId: Uuid.nullable(),
  label: z.string(),
  baseline: DegreePlanAnalysis,
  projected: DegreePlanAnalysis,
  impactSummary: z.array(z.string()),
  claims: z.array(AiClaim),
});

export const DegreeProgressResponse = DegreePlanAnalysis;

export const AskCoachRequest = z.object({
  question: z.string().trim().min(1).max(2000),
  contextPath: z.string().startsWith("/").max(200).optional(),
  capability: AiCapabilityId.optional(),
});

export const CoachSource = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  uri: z.string().startsWith("/"),
});

export const CoachSuggestedAction = z.object({
  label: z.string().min(1),
  href: z.string().startsWith("/"),
});

export const CoachAnswer = z.object({
  interactionId: Uuid,
  role: RoleName,
  tier: z.enum(["read_only", "draft"]),
  capability: AiCapabilityId.default("campus_coach"),
  answer: z.string().min(1),
  sources: z.array(CoachSource).min(1),
  suggestedActions: z.array(CoachSuggestedAction),
  claims: z.array(AiClaim).default([]),
  analysis: DegreePlanAnalysis.optional(),
  createdAt: IsoDateTime,
});

export const CoachHistoryResponse = z.object({
  items: z.array(
    CoachAnswer.extend({
      question: z.string().min(1),
    }),
  ),
});

export type AiActionClass = z.infer<typeof AiActionClass>;
export type AiCapabilityId = z.infer<typeof AiCapabilityId>;
export type AiClaim = z.infer<typeof AiClaim>;
export type AiToolDefinition = z.infer<typeof AiToolDefinition>;
export type AiRequestContext = z.infer<typeof AiRequestContext>;
export type DegreeRequirementItem = z.infer<typeof DegreeRequirementItem>;
export type DegreePlanAnalysis = z.infer<typeof DegreePlanAnalysis>;
export type WhatIfScenarioRequest = z.infer<typeof WhatIfScenarioRequest>;
export type WhatIfScenarioResponse = z.infer<typeof WhatIfScenarioResponse>;
export type DegreeProgressResponse = z.infer<typeof DegreeProgressResponse>;
export type CoachSource = z.infer<typeof CoachSource>;
export type CoachSuggestedAction = z.infer<typeof CoachSuggestedAction>;
export type AskCoachRequest = z.infer<typeof AskCoachRequest>;
export type CoachAnswer = z.infer<typeof CoachAnswer>;
export type CoachHistoryResponse = z.infer<typeof CoachHistoryResponse>;

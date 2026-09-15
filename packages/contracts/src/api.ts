import { z } from "zod";
import { Uuid } from "./base.js";
import { GradeItem, ApprovalRequest, Message, RoleName } from "./entities.js";

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  deviceFingerprint: z.string().min(8),
});

export const LoginResponse = z.object({
  accessToken: z.string(),
  accountId: Uuid,
  personId: Uuid,
  institutionId: Uuid,
  roles: z.array(RoleName),
  givenName: z.string(),
  familyName: z.string(),
  requiresMfa: z.boolean(),
});

export const SessionClaims = z.object({
  sub: Uuid,
  accountId: Uuid,
  personId: Uuid,
  institutionId: Uuid,
  roles: z.array(RoleName),
  sessionId: Uuid,
});

export const UpsertGradeRequest = z.object({
  score: z.number().min(0),
  rowVersion: z.number().int().positive(),
});

export const PublishGradesRequest = z.object({
  gradeItemIds: z.array(Uuid).min(1),
});

export const DecideApprovalRequest = z.object({
  decision: z.enum(["approve", "reject"]),
  comment: z.string().optional(),
});

export const SendMessageRequest = z.object({
  body: z.string().min(1).max(4000),
  relatedGradeItemId: Uuid.optional(),
  subject: z.string().min(1).optional(),
});

export const StudentGradesResponse = z.object({
  cumulativeGpa: z.number(),
  standing: z.enum(["good", "warning", "probation", "alert"]),
  courses: z.array(
    z.object({
      sectionId: Uuid,
      code: z.string(),
      title: z.string(),
      instructorName: z.string(),
      credits: z.number(),
      currentPercent: z.number().nullable(),
      letter: z.string().nullable(),
      items: z.array(
        GradeItem.pick({
          id: true,
          score: true,
          maxScore: true,
          letter: true,
          status: true,
          publishedAt: true,
        }).extend({
          title: z.string(),
          weightPercent: z.number(),
          underReview: z.boolean(),
        }),
      ),
    }),
  ),
});

export const GradebookResponse = z.object({
  sectionId: Uuid,
  courseCode: z.string(),
  courseTitle: z.string(),
  assignments: z.array(
    z.object({
      id: Uuid,
      title: z.string(),
      maxScore: z.number(),
      weightPercent: z.number(),
    }),
  ),
  rows: z.array(
    z.object({
      studentId: Uuid,
      studentNumber: z.string(),
      name: z.string(),
      cells: z.array(
        z.object({
          gradeItemId: Uuid,
          assignmentId: Uuid,
          score: z.number().nullable(),
          maxScore: z.number(),
          status: GradeItem.shape.status,
          rowVersion: z.number().int(),
        }),
      ),
    }),
  ),
});

export const ApprovalInboxResponse = z.object({
  items: z.array(ApprovalRequest),
});

export const AskAboutGradeResponse = z.object({
  threadId: Uuid,
  message: Message,
});

export type LoginRequest = z.infer<typeof LoginRequest>;
export type LoginResponse = z.infer<typeof LoginResponse>;
export type SessionClaims = z.infer<typeof SessionClaims>;
export type StudentGradesResponse = z.infer<typeof StudentGradesResponse>;
export type GradebookResponse = z.infer<typeof GradebookResponse>;

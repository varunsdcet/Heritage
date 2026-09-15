import { z } from "zod";
import { IsoDateTime, MoneyCad, Uuid } from "./base.js";

export const StudentModuleId = z.enum([
  "ST-01",
  "ST-02",
  "ST-03",
  "ST-04",
  "ST-05",
  "ST-06",
  "ST-07",
  "ST-08",
  "ST-09",
  "ST-10",
  "ST-11",
  "ST-12",
  "ST-13",
  "ST-14",
  "ST-15",
  "ST-16",
  "ST-17",
  "ST-18",
  "ST-19",
  "ST-20",
  "ST-21",
  "ST-22",
]);

export const StudentCourseSummary = z.object({
  sectionId: Uuid,
  courseCode: z.string().min(1),
  courseTitle: z.string().min(1),
  sectionCode: z.string().min(1),
  termName: z.string().min(1),
  instructorName: z.string().min(1),
  credits: z.number().nonnegative(),
  enrolmentStatus: z.enum(["enrolled", "completed"]),
  progressPercent: z.number().min(0).max(100).nullable(),
});

export const StudentCoursesResponse = z.object({
  courses: z.array(StudentCourseSummary),
});

export const StudentSubmissionFile = z.object({
  id: Uuid,
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  version: z.number().int().positive(),
  createdAt: IsoDateTime,
});

export const StudentSubmissionSummary = z.object({
  id: Uuid,
  status: z.enum(["draft", "submitted", "returned"]),
  submittedAt: IsoDateTime.nullable(),
  files: z.array(StudentSubmissionFile),
});

export const StudentAssignmentSummary = z.object({
  id: Uuid,
  sectionId: Uuid,
  courseCode: z.string().min(1),
  courseTitle: z.string().min(1),
  title: z.string().min(1),
  dueAt: IsoDateTime.nullable(),
  maxScore: z.number().nonnegative(),
  weightPercent: z.number().min(0).max(100),
  state: z.enum(["upcoming", "due", "overdue", "draft", "submitted", "graded"]),
  submission: StudentSubmissionSummary.nullable(),
});

export const StudentAssignmentsResponse = z.object({
  assignments: z.array(StudentAssignmentSummary),
});

export const MAX_STUDENT_FILE_BYTES = 10 * 1024 * 1024;
export const StudentFileMimeType = z.enum([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/png",
  "image/jpeg",
  "application/zip",
]);

export const UploadStudentSubmissionFileRequest = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: StudentFileMimeType,
  sizeBytes: z.number().int().positive().max(MAX_STUDENT_FILE_BYTES),
  contentBase64: z.string().min(1).max(14_000_000),
});

export const UploadStudentSubmissionFileResponse = z.object({
  submission: StudentSubmissionSummary,
});

export const SubmitStudentAssignmentResponse = z.object({
  submission: StudentSubmissionSummary,
  alreadySubmitted: z.boolean(),
});

export const StudentCalendarEvent = z.object({
  id: z.string().min(1),
  kind: z.enum(["class", "assignment_deadline", "assessment", "advising"]),
  sectionId: Uuid.nullable(),
  title: z.string().min(1),
  startsAt: IsoDateTime,
  endsAt: IsoDateTime.nullable(),
  location: z.string().nullable(),
  joinUrl: z.string().url().refine((value) => value.startsWith("https://")).nullable(),
});

export const StudentCalendarResponse = z.object({
  events: z.array(StudentCalendarEvent),
});

export const StudentNotificationView = z.object({
  id: Uuid,
  title: z.string().min(1),
  body: z.string(),
  channel: z.enum(["in_app", "email", "push"]),
  createdAt: IsoDateTime,
  readAt: IsoDateTime.nullable(),
});

export const StudentNotificationsResponse = z.object({
  unreadCount: z.number().int().nonnegative(),
  notifications: z.array(StudentNotificationView),
});

export const MarkStudentNotificationReadResponse = z.object({
  notification: StudentNotificationView,
  changed: z.boolean(),
});

export const StudentProfileResponse = z.object({
  studentId: Uuid,
  studentNumber: z.string().min(1),
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  primaryEmail: z.string().email(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  programName: z.string().min(1),
  standing: z.enum(["good", "warning", "probation", "alert"]),
  timezone: z.string().min(1),
});

export const UpdateStudentPreferencesRequest = z.object({
  timezone: z.string().min(1).max(100),
});

export const RequestStudentProfileChange = z
  .object({
    givenName: z.string().trim().min(1).max(100).optional(),
    familyName: z.string().trim().min(1).max(100).optional(),
    primaryEmail: z.string().email().optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    reason: z.string().trim().min(10).max(1000),
  })
  .refine(
    ({ givenName, familyName, primaryEmail, dateOfBirth }) =>
      [givenName, familyName, primaryEmail, dateOfBirth].some((value) => value !== undefined),
    { message: "At least one official profile field is required" },
  );

export const StudentProfileChangeResponse = z.object({
  approvalRequestId: Uuid,
  status: z.literal("pending"),
});

export const StudentFinanceSummary = z.object({
  balance: MoneyCad,
  pastDue: MoneyCad,
  nextDueAt: IsoDateTime.nullable(),
  paymentExecutionEnabled: z.literal(false),
});

export const StudentPortalViewResponse = z.object({
  moduleId: StudentModuleId,
  title: z.string().min(1),
  subtitle: z.string().nullable(),
  state: z.enum(["empty", "ready", "unavailable"]),
  cards: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      value: z.string(),
      detail: z.string().nullable(),
    }),
  ),
  rows: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      subtitle: z.string().nullable(),
      status: z.string().nullable(),
      href: z.string().startsWith("/").nullable(),
    }),
  ),
});

export type StudentModuleId = z.infer<typeof StudentModuleId>;
export type StudentCourseSummary = z.infer<typeof StudentCourseSummary>;
export type StudentCoursesResponse = z.infer<typeof StudentCoursesResponse>;
export type StudentSubmissionSummary = z.infer<typeof StudentSubmissionSummary>;
export type StudentAssignmentSummary = z.infer<typeof StudentAssignmentSummary>;
export type StudentAssignmentsResponse = z.infer<typeof StudentAssignmentsResponse>;
export type UploadStudentSubmissionFileRequest = z.infer<
  typeof UploadStudentSubmissionFileRequest
>;
export type StudentCalendarResponse = z.infer<typeof StudentCalendarResponse>;
export type StudentNotificationsResponse = z.infer<typeof StudentNotificationsResponse>;
export type StudentProfileResponse = z.infer<typeof StudentProfileResponse>;

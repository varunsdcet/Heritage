/** One course status for every surface (My Courses, Program Plan, Final Marks, instructor lists). */
export type CourseStatus = "completed" | "in_progress" | "not_started" | "dropped";

export const COURSE_STATUS_LABEL: Record<CourseStatus, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  not_started: "Not Started",
  dropped: "Dropped Course",
};

const day = (v: string | null | undefined) => (v ?? "").slice(0, 10);

/**
 * A course carries a final mark once it is completed, or once an enrolled course has ended with published marks.
 * Until then it is "IP" (in progress) with its current percent, and stays out of credits earned and CGPA.
 */
export function hasFinalMark(row: { status: string; endsOn: string | null; averagePercent: number | null }, today: string) {
  if (row.status === "completed") return true;
  return row.status === "enrolled" && row.averagePercent != null && Boolean(row.endsOn) && day(row.endsOn) < day(today);
}

/**
 * Completed once the enrolment has a final mark (or is marked completed); dropped when withdrawn; otherwise
 * Not Started before the section's start date and In Progress from then on (an ended course awaiting its final
 * mark stays In Progress).
 */
export function courseStatus(
  row: { status: string; startsOn: string | null; endsOn: string | null; averagePercent: number | null },
  today: string,
): CourseStatus {
  if (row.status === "withdrawn") return "dropped";
  if (hasFinalMark(row, today)) return "completed";
  if (row.status === "waitlisted") return "not_started";
  if (row.startsOn && day(today) < day(row.startsOn)) return "not_started";
  return "in_progress";
}

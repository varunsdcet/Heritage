import { prisma } from "@myheritage/db";

type GradeBand = { letter?: unknown; percent?: unknown };

function parse(json: string) {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function configuredSchemeId(institutionId: string, sectionId: string, courseId: string) {
  const settings = await prisma.heritageRecord.findMany({
    where: {
      institutionId,
      deletedAt: null,
      singletonKey: "settings",
      OR: [
        { screenId: "CM:SESSION", contextKey: sectionId },
        { screenId: "CM:COURSE", contextKey: courseId },
      ],
    },
  });
  const session = settings.find((row) => row.screenId === "CM:SESSION");
  const course = settings.find((row) => row.screenId === "CM:COURSE");
  return String(parse(session?.dataJson ?? "{}").gradingScheme || parse(course?.dataJson ?? "{}").gradingScheme || "");
}

/** Resolves the section/course grading scheme; falls back to the standard scale only when none is configured. */
export async function letterForSection(institutionId: string, sectionId: string, courseId: string, score: number, maxScore: number) {
  const schemeId = await configuredSchemeId(institutionId, sectionId, courseId);
  const scheme = schemeId
    ? await prisma.heritageRecord.findFirst({ where: { id: schemeId, institutionId, screenId: "CM:GRADING", deletedAt: null } })
    : await prisma.heritageRecord.findFirst({ where: { institutionId, screenId: "CM:GRADING", deletedAt: null }, orderBy: { createdAt: "asc" } });
  const grades = Array.isArray(parse(scheme?.dataJson ?? "{}").grades) ? parse(scheme?.dataJson ?? "{}").grades as GradeBand[] : [];
  const pct = (score / maxScore) * 100;
  const matched = grades
    .map((grade) => ({ letter: String(grade.letter || ""), percent: Number(grade.percent) }))
    .filter((grade) => grade.letter && Number.isFinite(grade.percent))
    .sort((a, b) => b.percent - a.percent)
    .find((grade) => pct >= grade.percent);
  if (matched) return matched.letter;
  if (pct >= 90) return "A";
  if (pct >= 85) return "A-";
  if (pct >= 80) return "B+";
  if (pct >= 75) return "B";
  if (pct >= 70) return "B-";
  if (pct >= 65) return "C+";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

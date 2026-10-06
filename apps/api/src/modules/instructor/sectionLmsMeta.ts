import { prisma } from "@myheritage/db";

const MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];

function fmtDay(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export type SectionLmsMeta = {
  session: string;
  location: string;
  startsOn: string | null;
  endsOn: string | null;
  ended: boolean;
};

/** Course header facts shared by the admin, instructor and student course views, all from the section record. */
export async function sectionLmsMeta(institutionId: string, sectionId: string): Promise<SectionLmsMeta | null> {
  const section = await prisma.section.findFirst({
    where: { id: sectionId, institutionId },
    include: {
      term: true,
      academicBlock: true,
      classSessions: { orderBy: { startsAt: "asc" }, select: { location: true, deliveryMode: true } },
    },
  });
  if (!section) return null;
  const startsOn = section.academicBlock?.startsOn || section.term?.startsOn || null;
  const endsOn = section.academicBlock?.endsOn || section.term?.endsOn || null;
  const session =
    startsOn && endsOn
      ? `${section.code}: ${fmtDay(startsOn)} - ${fmtDay(endsOn)}`
      : `${section.code}${section.term?.name ? `: ${section.term.name}` : ""}`;
  const location =
    section.classSessions.map((s) => s.location?.trim()).find(Boolean) ||
    (section.classSessions.length && section.classSessions.every((s) => s.deliveryMode === "online")
      ? "Online"
      : "Location to be announced");
  const today = new Date().toISOString().slice(0, 10);
  return { session, location, startsOn, endsOn, ended: Boolean(endsOn && endsOn.slice(0, 10) < today) };
}

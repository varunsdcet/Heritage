import { Router, type Request } from "express";
import { prisma } from "@myheritage/db";
import type { SessionClaims } from "@myheritage/contracts";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import {
  bbbConfig,
  createMeeting,
  endMeeting,
  joinMeetingUrl,
  listRecordings,
  meetingInfo,
} from "../../lib/bigBlueButton.js";
import { jitsiMeetUrl } from "../../lib/jitsiMeet.js";
import { webPublicUrl } from "../../lib/liveClass.js";

export const liveRouter: Router = Router();

type LiveRole = "moderator" | "viewer";

function httpError(message: string, code: string, status: number) {
  return Object.assign(new Error(message), { code, status });
}

async function resolveRoom(user: SessionClaims, sectionId: string) {
  const section = await prisma.section.findFirst({
    where: { id: sectionId, institutionId: user.institutionId },
    include: { course: true, term: true },
  });
  if (!section) throw httpError("Class not found", "NOT_FOUND", 404);

  let role: LiveRole | null = null;
  if (section.instructorPersonId === user.personId) role = "moderator";
  else if (user.roles.includes("admin") || user.roles.includes("registrar")) role = "moderator";
  else {
    const enrolled = await prisma.enrolment.findFirst({
      where: {
        institutionId: user.institutionId,
        sectionId: section.id,
        status: "enrolled",
        student: { personId: user.personId },
      },
      select: { id: true },
    });
    if (enrolled) role = "viewer";
  }
  if (!role) throw httpError("You are not part of this class", "FORBIDDEN", 403);
  if (role === "viewer" && user.accountStatus === "paused") {
    throw httpError("Your account is paused. Resolve the compliance notice to rejoin classes.", "ACCOUNT_PAUSED", 403);
  }

  const person = await prisma.person.findFirst({
    where: { id: user.personId, institutionId: user.institutionId },
    select: { givenName: true, familyName: true },
  });
  const fullName = person ? `${person.givenName} ${person.familyName}`.trim() : "Participant";
  return {
    section,
    role,
    fullName,
    meetingId: `heritage-${section.id}`,
    meetingName: `${section.course.code} ${section.code} — ${section.course.title}`,
  };
}

function logoutUrl(req: Request, sectionId: string) {
  const path = `/live/${sectionId}?left=1`;
  const origin = req.header("origin");
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (host === "localhost" || host === "127.0.0.1") return `${origin}${path}`;
    } catch {
      // Fall through to the configured public URL.
    }
  }
  return webPublicUrl(path);
}

liveRouter.get("/config", requireAuth, (_req, res) => {
  res.json({ provider: bbbConfig() ? "bigbluebutton" : "jitsi" });
});

liveRouter.get("/sections/:sectionId", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const room = await resolveRoom(user, String(req.params.sectionId));
    const cfg = bbbConfig();
    const info = cfg ? await meetingInfo(cfg, room.meetingId) : null;
    res.json({
      provider: cfg ? "bigbluebutton" : "jitsi",
      sectionId: room.section.id,
      meetingName: room.meetingName,
      courseCode: room.section.course.code,
      sectionCode: room.section.code,
      role: room.role,
      running: info?.running ?? null,
      participantCount: info?.participantCount ?? null,
      recording: info?.recording ?? null,
      startedAt: info?.startTime ? new Date(info.startTime).toISOString() : null,
    });
  } catch (err) {
    next(err);
  }
});

liveRouter.post("/sections/:sectionId/join", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const room = await resolveRoom(user, String(req.params.sectionId));
    const cfg = bbbConfig();
    if (!cfg) {
      res.json({
        status: "ready",
        provider: "jitsi",
        role: room.role,
        meetingName: room.meetingName,
        url: jitsiMeetUrl(room.section.course.code, room.section.code),
      });
      return;
    }
    if (room.role === "moderator") {
      await createMeeting(cfg, {
        meetingId: room.meetingId,
        name: room.meetingName,
        welcome: `Welcome to <b>${room.meetingName}</b>.`,
        logoutUrl: logoutUrl(req, room.section.id),
        context: room.section.term?.name ?? undefined,
      });
    } else {
      const info = await meetingInfo(cfg, room.meetingId);
      if (!info.running) {
        res.json({ status: "waiting", provider: "bigbluebutton", role: room.role, meetingName: room.meetingName });
        return;
      }
    }
    res.json({
      status: "ready",
      provider: "bigbluebutton",
      role: room.role,
      meetingName: room.meetingName,
      url: joinMeetingUrl(cfg, {
        meetingId: room.meetingId,
        fullName: room.fullName,
        role: room.role === "moderator" ? "MODERATOR" : "VIEWER",
        userId: user.accountId,
      }),
    });
  } catch (err) {
    next(err);
  }
});

liveRouter.post("/sections/:sectionId/end", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const room = await resolveRoom(user, String(req.params.sectionId));
    if (room.role !== "moderator") throw httpError("Only the instructor can end the class", "FORBIDDEN", 403);
    const cfg = bbbConfig();
    if (!cfg) throw httpError("Live classes are not connected to BigBlueButton", "BBB_NOT_CONFIGURED", 409);
    const ended = await endMeeting(cfg, room.meetingId);
    res.json({ ended });
  } catch (err) {
    next(err);
  }
});

liveRouter.get("/sections/:sectionId/recordings", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const room = await resolveRoom(user, String(req.params.sectionId));
    const cfg = bbbConfig();
    if (!cfg) {
      res.json({ provider: "jitsi", recordings: [] });
      return;
    }
    const recordings = await listRecordings(cfg, room.meetingId);
    res.json({
      provider: "bigbluebutton",
      recordings: room.role === "moderator" ? recordings : recordings.filter((r) => r.published),
    });
  } catch (err) {
    next(err);
  }
});

import { api, loadSession } from "@/lib/api";

export type LiveProvider = "bigbluebutton" | "jitsi";

export type LiveRoomStatus = {
  provider: LiveProvider;
  sectionId: string;
  meetingName: string;
  courseCode: string;
  sectionCode: string;
  role: "moderator" | "viewer";
  running: boolean | null;
  participantCount: number | null;
  recording: boolean | null;
  startedAt: string | null;
};

export type LiveJoinResult =
  | { status: "ready"; provider: LiveProvider; role: "moderator" | "viewer"; meetingName: string; url: string }
  | { status: "waiting"; provider: LiveProvider; role: "moderator" | "viewer"; meetingName: string };

export type LiveRecording = {
  recordId: string;
  name: string;
  published: boolean;
  startTime: string | null;
  endTime: string | null;
  participants: number;
  playbackUrl: string | null;
  lengthMinutes: number | null;
};

/** Section id from an in-app launcher link (`/live/<sectionId>`), or null for external meeting links. */
export function liveSectionId(url: string | null | undefined) {
  const m = url?.trim().match(/^\/live\/([0-9a-zA-Z-]+)$/);
  return m ? m[1] : null;
}

export function openClassLink(url: string | null | undefined) {
  if (!url) return false;
  if (liveSectionId(url) || url.startsWith("https://") || url.startsWith("http://")) {
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }
  return false;
}

function token() {
  return loadSession()?.accessToken;
}

export function fetchLiveStatus(sectionId: string) {
  return api<LiveRoomStatus>(`/live/sections/${sectionId}`, {}, token());
}

export function joinLiveClass(sectionId: string) {
  return api<LiveJoinResult>(`/live/sections/${sectionId}/join`, { method: "POST", body: "{}" }, token());
}

export function endLiveClass(sectionId: string) {
  return api<{ ended: boolean }>(`/live/sections/${sectionId}/end`, { method: "POST", body: "{}" }, token());
}

export function fetchLiveRecordings(sectionId: string) {
  return api<{ provider: LiveProvider; recordings: LiveRecording[] }>(`/live/sections/${sectionId}/recordings`, {}, token());
}

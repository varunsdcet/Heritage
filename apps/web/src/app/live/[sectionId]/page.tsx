"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { loadSession } from "@/lib/api";
import { joinLiveClass } from "@/lib/liveClass";
import { LiveClassPanel } from "@/components/LiveClassPanel";
import "@/components/liveClass.css";

const RETRY_MS = 10_000;

function portalHome(roles: string[]) {
  if (roles.includes("admin") || roles.includes("registrar")) return "/admin";
  if (roles.includes("instructor")) return "/instructor/sections";
  return "/student/courses";
}

function LiveLauncher() {
  const router = useRouter();
  const { sectionId } = useParams<{ sectionId: string }>();
  const left = useSearchParams().get("left") === "1";
  const [state, setState] = useState<"joining" | "waiting" | "error" | "left">(left ? "left" : "joining");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [home, setHome] = useState("/");
  const timer = useRef<number | null>(null);

  const attempt = useCallback(async () => {
    try {
      const res = await joinLiveClass(sectionId);
      setTitle(res.meetingName);
      if (res.status === "ready") {
        window.location.replace(res.url);
        return;
      }
      setState("waiting");
      timer.current = window.setTimeout(() => void attempt(), RETRY_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the class.");
      setState("error");
    }
  }, [sectionId]);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(`/live/${sectionId}${left ? "?left=1" : ""}`)}`);
      return;
    }
    setHome(portalHome(session.roles ?? []));
    if (!left) void attempt();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [attempt, left, router, sectionId]);

  return (
    <main className="mh-live-launch">
      <div className="mh-live-launch__card">
        {state === "joining" ? (
          <div className="mh-live-launch__status">
            <div className="mh-live-launch__spinner" aria-hidden />
            <h1>Opening your class…</h1>
            <p>Connecting you to the live classroom.</p>
          </div>
        ) : null}
        {state === "waiting" ? (
          <div className="mh-live-launch__status" role="status">
            <div className="mh-live-launch__spinner" aria-hidden />
            <h1>{title || "Your class"} hasn&apos;t started yet</h1>
            <p>Keep this tab open — you&apos;ll be taken into the room as soon as your instructor starts the class.</p>
          </div>
        ) : null}
        {state === "error" ? (
          <div className="mh-live-launch__status" role="alert">
            <h1>Could not open the class</h1>
            <p>{error}</p>
          </div>
        ) : null}
        {state === "left" ? (
          <>
            <div className="mh-live-launch__status">
              <h1>You left the class</h1>
              <p>Rejoin below, or head back to your courses.</p>
            </div>
            <LiveClassPanel sectionId={sectionId} />
          </>
        ) : null}
        <a className="mh-live-launch__back" href={home}>
          ← Back to MyHeritage
        </a>
      </div>
    </main>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={null}>
      <LiveLauncher />
    </Suspense>
  );
}

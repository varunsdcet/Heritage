"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { splitScript } from "@/lib/monicaScript";

type Narration = { audio: string; duration: number; words: string[]; wtimes: number[]; wdurations: number[] };

const STORAGE_KEY = "monica-lecture-script";
const TITLE_KEY = "monica-lecture-title";
const PREFETCH = 2;
/** Roughly 150 spoken words a minute. */
const CHARS_PER_SEC = 14;

function clock(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function MonicaLecture() {
  const [script, setScript] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"edit" | "lecture">("edit");
  const [speed, setSpeed] = useState(1);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);
  const [status, setStatus] = useState("Loading teacher…");
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [durations, setDurations] = useState<Record<number, number>>({});

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const partRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const cacheRef = useRef(new Map<number, Promise<Narration>>());
  const playingRef = useRef(false);
  const runRef = useRef(0);
  const speakIdRef = useRef(0);
  const waitRef = useRef<{ id: number; resolve: () => void } | null>(null);

  useEffect(() => {
    setScript(localStorage.getItem(STORAGE_KEY) || "");
    setTitle(localStorage.getItem(TITLE_KEY) || "");
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, script);
  }, [script]);
  useEffect(() => {
    localStorage.setItem(TITLE_KEY, title);
  }, [title]);

  const parts = useMemo(() => splitScript(script), [script]);
  const words = useMemo(() => (script.trim() ? script.trim().split(/\s+/).length : 0), [script]);
  const estimate = (i: number) => durations[i] ?? parts[i].text.length / CHARS_PER_SEC / speed;
  const totalSec = parts.reduce((sum, _p, i) => sum + estimate(i), 0);
  const elapsedSec = parts.slice(0, index).reduce((sum, _p, i) => sum + estimate(i), 0);

  const resetVoice = useCallback(() => {
    cacheRef.current.clear();
    setDurations({});
  }, []);

  const post = (msg: Record<string, unknown>) => iframeRef.current?.contentWindow?.postMessage(msg, "*");

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === "th-ready") {
        setAvatarReady(true);
        setStatus("Ready — press Play");
      }
      if (ev.data?.type === "th-error") setStatus(`Teacher failed to load: ${ev.data.message || "unknown error"}`);
      const wait = waitRef.current;
      if (wait && ev.data?.type === "th-speak-done" && wait.id === ev.data.id) {
        waitRef.current = null;
        wait.resolve();
      }
    };
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener("message", onMsg);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("message", onMsg);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  useEffect(() => {
    if (mode === "lecture") partRefs.current[index]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [index, mode]);

  const narration = useCallback(
    (i: number) => {
      const cache = cacheRef.current;
      let pending = cache.get(i);
      if (!pending) {
        pending = fetch("/api/monica/narrate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: parts[i].text, speed }),
        }).then(async (res) => {
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.audio) throw new Error(json.error || `Voice request failed (${res.status})`);
          setDurations((d) => ({ ...d, [i]: json.duration }));
          return json as Narration;
        });
        pending.catch(() => cache.delete(i));
        cache.set(i, pending);
      }
      return pending;
    },
    [parts, speed],
  );

  const stop = useCallback((label = "Paused") => {
    playingRef.current = false;
    runRef.current += 1;
    setPlaying(false);
    setStatus(label);
    post({ type: "th-stop" });
    const wait = waitRef.current;
    waitRef.current = null;
    wait?.resolve();
  }, []);

  const playFrom = useCallback(
    async (start: number) => {
      if (!parts.length) return;
      const run = ++runRef.current;
      playingRef.current = true;
      setPlaying(true);
      setError("");
      post({ type: "th-resume" });
      for (let i = start; i < parts.length; i++) {
        if (run !== runRef.current) return;
        setIndex(i);
        for (let k = 1; k <= PREFETCH && i + k < parts.length; k++) void narration(i + k).catch(() => {});
        let n: Narration;
        try {
          if (!durations[i]) setStatus(`Preparing part ${i + 1} of ${parts.length}…`);
          n = await narration(i);
        } catch (err) {
          if (run !== runRef.current) return;
          setError(err instanceof Error ? err.message : "Voice request failed");
          stop("Stopped — press Play to retry this part");
          return;
        }
        if (run !== runRef.current) return;
        setStatus(`Reading part ${i + 1} of ${parts.length}`);
        const id = ++speakIdRef.current;
        await new Promise<void>((resolve) => {
          waitRef.current = { id, resolve };
          post({ type: "th-speak-audio", id, audio: n.audio, words: n.words, wtimes: n.wtimes, wdurations: n.wdurations });
          window.setTimeout(() => {
            if (waitRef.current?.id === id) {
              waitRef.current = null;
              resolve();
            }
          }, (n.duration + 15) * 1000);
        });
        if (run !== runRef.current) return;
        const paragraphEnd = parts[i + 1]?.paragraph !== parts[i].paragraph;
        await new Promise((r) => window.setTimeout(r, paragraphEnd ? 700 : 200));
      }
      if (run !== runRef.current) return;
      playingRef.current = false;
      setPlaying(false);
      setIndex(parts.length - 1);
      setStatus("Lecture finished");
      post({ type: "th-idle" });
    },
    [durations, narration, parts, stop],
  );

  const jump = (i: number) => {
    const next = Math.max(0, Math.min(parts.length - 1, i));
    const wasPlaying = playingRef.current;
    if (wasPlaying) stop();
    setIndex(next);
    if (wasPlaying) void playFrom(next);
  };

  const startLecture = () => {
    if (!parts.length) return;
    setMode("lecture");
    setIndex(0);
    setError("");
    setStatus(avatarReady ? "Ready — press Play" : "Loading teacher…");
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await stageRef.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      setFullscreen((v) => !v);
    }
  };

  return (
    <main className="mh-monica">
      <header className="mh-monica__head">
        <div>
          <p className="mh-monica__kicker">MyHeritage · Lecture reader</p>
          <h1>{mode === "lecture" && title.trim() ? title : "Monica"}</h1>
        </div>
        {mode === "lecture" ? (
          <button
            type="button"
            className="mh-monica__btn"
            onClick={() => {
              stop("Ready — press Play");
              setMode("edit");
            }}
          >
            Edit script
          </button>
        ) : null}
      </header>

      <div className={`mh-monica__layout${mode === "edit" ? " is-edit" : ""}`}>
        <section
          ref={stageRef}
          className={`mh-monica__stage${fullscreen ? " is-fullscreen" : ""}`}
          aria-label="Teacher avatar"
        >
          <div className="mh-monica__avatar">
            <iframe
              ref={iframeRef}
              title="Teacher avatar"
              src="/ai-draft/talkinghead-host.html?gender=female"
              allow="autoplay; fullscreen"
            />
          </div>
          {fullscreen && parts[index] ? <p className="mh-monica__caption">{parts[index].text}</p> : null}
          {mode === "edit" ? (
            <p className="mh-monica__status" role="status">
              {avatarReady ? "Teacher is ready. Paste your script and press Start lecture." : status}
            </p>
          ) : (
            <>
              <div className="mh-monica__progress" aria-hidden>
                <span style={{ width: `${totalSec ? Math.min(100, (elapsedSec / totalSec) * 100) : 0}%` }} />
              </div>
              <p className="mh-monica__status" role="status">
                {status} · {clock(elapsedSec)} / ~{clock(totalSec)}
              </p>
              {error ? (
                <p className="mh-monica__error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="mh-monica__controls">
                <button type="button" className="mh-monica__btn" disabled={index === 0} onClick={() => jump(index - 1)}>
                  ◀ Back
                </button>
                {playing ? (
                  <button type="button" className="mh-monica__btn mh-monica__btn--primary" onClick={() => stop()}>
                    Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mh-monica__btn mh-monica__btn--primary"
                    disabled={!avatarReady || !parts.length}
                    onClick={() => void playFrom(index)}
                  >
                    {index > 0 ? "Resume" : "Play lecture"}
                  </button>
                )}
                <button
                  type="button"
                  className="mh-monica__btn"
                  disabled={index >= parts.length - 1}
                  onClick={() => jump(index + 1)}
                >
                  Skip ▶
                </button>
                <label className="mh-monica__speed">
                  Pace
                  <select
                    value={speed}
                    disabled={playing}
                    onChange={(e) => {
                      setSpeed(Number(e.target.value));
                      resetVoice();
                    }}
                  >
                    <option value={0.9}>Slower</option>
                    <option value={1}>Normal</option>
                    <option value={1.1}>Faster</option>
                  </select>
                </label>
                <button type="button" className="mh-monica__btn" onClick={() => void toggleFullscreen()}>
                  {fullscreen ? "Exit full screen" : "Full screen"}
                </button>
              </div>
            </>
          )}
        </section>

        {mode === "edit" ? (
          <section className="mh-monica__editor">
            <label className="mh-monica__field">
              Lecture title
              <input value={title} placeholder="e.g. Introduction to Microeconomics" onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="mh-monica__field">
              Script
              <textarea
                value={script}
                placeholder="Paste the full lecture script here. Leave a blank line between paragraphs — the teacher pauses briefly at each one."
                onChange={(e) => {
                  setScript(e.target.value);
                  resetVoice();
                }}
              />
            </label>
            <div className="mh-monica__editor-foot">
              <span>
                {words.toLocaleString()} words · about {clock(parts.reduce((s, p) => s + p.text.length / CHARS_PER_SEC, 0))} spoken ·{" "}
                {parts.length} parts
              </span>
              <button
                type="button"
                className="mh-monica__btn mh-monica__btn--primary"
                disabled={!parts.length}
                onClick={startLecture}
              >
                Start lecture
              </button>
            </div>
            <p className="mh-monica__help">
              The script is saved in this browser automatically. The teacher reads it in the HeyGen voice, a few parts ahead are
              prepared while she speaks, and you can pause, go back or skip at any time.
            </p>
          </section>
        ) : (
          <section className="mh-monica__script" aria-label="Lecture script">
            {parts.map((p, i) => (
              <p
                key={i}
                ref={(el) => {
                  partRefs.current[i] = el;
                }}
                className={`mh-monica__part${i === index ? " is-current" : ""}${i < index ? " is-done" : ""}${
                  parts[i - 1] && parts[i - 1].paragraph !== p.paragraph ? " is-paragraph" : ""
                }`}
                onClick={() => jump(i)}
              >
                {p.text}
              </p>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

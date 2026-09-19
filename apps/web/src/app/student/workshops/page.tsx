"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { StudentSisShell } from "@/components/StudentSisShell";
import { api, loadSession } from "@/lib/api";

type Workshop = {
  id: string;
  code: string;
  title: string;
  description: string;
  creditsCeu: number;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  capacity: number;
  registeredCount: number;
  status: string;
  registrationStatus: string | null;
  instructorName?: string | null;
  lengthLabel?: string | null;
  scheduleText?: string | null;
};

type Payload = { available: Workshop[]; mine: Workshop[]; completed: Workshop[] };

type Tab = "mine" | "available" | "completed";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function WorkshopsInner() {
  const router = useRouter();
  const search = useSearchParams();
  const tab = (search.get("tab") as Tab) || "mine";
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Student");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const session = loadSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setName(`${session.givenName} ${session.familyName}`.trim() || "Student");
    const payload = await api<Payload>("/student/workshops", {}, session.accessToken);
    setData(payload);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [router]);

  async function register(workshopId: string) {
    const session = loadSession();
    if (!session) return;
    setBusyId(workshopId);
    setError(null);
    try {
      const payload = await api<Payload>(
        "/student/workshops/register",
        { method: "POST", body: JSON.stringify({ workshopId }) },
        session.accessToken,
      );
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusyId(null);
    }
  }

  function setTab(next: Tab) {
    const params = new URLSearchParams();
    if (next !== "mine") params.set("tab", next);
    const qs = params.toString();
    router.push(qs ? `/student/workshops?${qs}` : "/student/workshops");
  }

  const rows = useMemo(() => {
    if (!data) return [];
    if (tab === "available") return data.available;
    if (tab === "completed") return data.completed;
    return data.mine;
  }, [data, tab]);

  const titles: Record<Tab, string> = {
    mine: "MY WORKSHOPS",
    available: "AVAILABLE WORKSHOPS",
    completed: "COMPLETED WORKSHOPS",
  };

  return (
    <StudentSisShell title="" activeHref="/student/workshops" userName={name}>
      <div className="mh-hcc-page" data-stu={tab === "mine" ? "STU-13" : tab === "available" ? "STU-14" : "STU-15"}>
        <p className="mh-hcc-profile__crumb">
          Home <span>›</span> Workshops
        </p>
        <h1>{titles[tab]}</h1>
        <div className="mh-hcc-profile__tabs">
          <button type="button" className={tab === "mine" ? "is-active" : ""} onClick={() => setTab("mine")}>
            My Workshops
          </button>
          <button type="button" className={tab === "available" ? "is-active" : ""} onClick={() => setTab("available")}>
            Available
          </button>
          <button type="button" className={tab === "completed" ? "is-active" : ""} onClick={() => setTab("completed")}>
            Completed
          </button>
        </div>
        {error ? <p className="mh-teacher-muted" style={{ color: "#b42318" }}>{error}</p> : null}
        {!data && !error ? <p className="mh-teacher-muted">Loading workshops…</p> : null}
        {data ? (
          <table className="mh-hcc-table">
            <thead>
              <tr>
                <th>WORKSHOP</th>
                <th>INSTRUCTOR(S)</th>
                <th>STATUS</th>
                <th>LENGTH</th>
                <th>DATES</th>
                <th>SCHEDULE</th>
                {tab === "available" ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={tab === "available" ? 7 : 6}>
                    {tab === "available"
                      ? "No available workshops."
                      : tab === "completed"
                        ? "No completed workshops."
                        : "No active or upcoming workshops."}
                  </td>
                </tr>
              ) : (
                rows.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <strong>
                        {w.code} · {w.title}
                      </strong>
                      {w.description ? <em>{w.description}</em> : null}
                    </td>
                    <td>{w.instructorName || "—"}</td>
                    <td>
                      <span className="mh-hcc-pill">
                        {w.registrationStatus && w.registrationStatus !== "none" ? w.registrationStatus : w.status}
                      </span>
                    </td>
                    <td>{w.lengthLabel || `${w.creditsCeu} CEU`}</td>
                    <td>
                      {fmtDate(w.startsAt)}
                      {w.endsAt ? ` – ${fmtDate(w.endsAt)}` : ""}
                    </td>
                    <td className="mh-hcc-pre">{w.scheduleText || w.location || "—"}</td>
                    {tab === "available" ? (
                      <td>
                        {w.registrationStatus === "none" ? (
                          <button
                            type="button"
                            className="mh-hcc-btn"
                            disabled={busyId === w.id}
                            onClick={() => void register(w.id)}
                          >
                            {busyId === w.id ? "Saving…" : "Register"}
                          </button>
                        ) : (
                          <span className="mh-hcc-pill">{w.registrationStatus}</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : null}
      </div>
    </StudentSisShell>
  );
}

export default function WorkshopsPage() {
  return (
    <Suspense fallback={null}>
      <WorkshopsInner />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Panel } from "@myheritage/ui";
import { MobileChrome } from "@/components/ScreenScaffold";
import { api, clearSession, loadSession } from "@/lib/api";

type HomePayload = {
  standing?: string;
  programName?: string;
  enrolledCourses?: number;
  gpa?: number;
  nextDeadline?: { title: string; courseCode: string };
  items?: Array<{ label: string; sub?: string }>;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function MobileStudentHomePage() {
  const router = useRouter();
  const [name, setName] = useState("Student");
  const [data, setData] = useState<HomePayload | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/m/login");
      return;
    }
    setName(s.givenName || "Student");
    api<HomePayload>("/me/home", {}, s.accessToken).then(setData).catch(() => setData(null));
  }, [router]);

  const today = new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <MobileChrome title="Heritage" active="Home">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{`${greeting()}, ${name}`}</h1>
        <p style={{ margin: "4px 0 0", color: "var(--mh-text-muted)", fontSize: 13 }}>{today}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <Panel dense>
          <p style={{ margin: 0, fontSize: 11, color: "var(--mh-text-subtle)", fontWeight: 600, textTransform: "uppercase" }}>
            Next
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 700 }}>{data?.nextDeadline?.courseCode ?? "—"}</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--mh-brand)" }}>Deadline</p>
        </Panel>
        <Panel dense>
          <p style={{ margin: 0, fontSize: 11, color: "var(--mh-text-subtle)", fontWeight: 600, textTransform: "uppercase" }}>
            Due
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 700, color: "var(--mh-danger)" }}>
            {data?.nextDeadline ? "1 Item" : "0"}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--mh-text-muted)" }}>Assignments</p>
        </Panel>
        <Panel dense>
          <p style={{ margin: 0, fontSize: 11, color: "var(--mh-text-subtle)", fontWeight: 600, textTransform: "uppercase" }}>
            GPA
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 700 }}>{data?.gpa ?? "—"}</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--mh-olive)" }}>{data?.standing ?? "Standing"}</p>
        </Panel>
      </div>

      <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>Today&apos;s Schedule</h2>
      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: 14,
            borderRadius: 8,
            border: "1px solid var(--mh-brand)",
            background: "var(--mh-brand-soft)",
          }}
        >
          <div style={{ width: 70 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--mh-brand)" }}>09:00 AM</div>
            <div style={{ fontSize: 11, color: "var(--mh-text-subtle)" }}>Ongoing</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{data?.items?.[0]?.label ?? "CS301 Algorithms"}</div>
            <div style={{ fontSize: 12, color: "var(--mh-text-muted)" }}>Online · Live</div>
          </div>
          <Button type="button" style={{ padding: "4px 8px", fontSize: 10 }} onClick={() => router.push("/m/student/courses")}>
            JOIN
          </Button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: 14,
            borderRadius: 8,
            border: "1px solid var(--mh-border)",
            background: "var(--mh-surface)",
          }}
        >
          <div style={{ width: 70 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>01:30 PM</div>
            <div style={{ fontSize: 11, color: "var(--mh-text-subtle)" }}>Scheduled</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>ACC201 Financial Accounting</div>
            <div style={{ fontSize: 12, color: "var(--mh-text-muted)" }}>Building B · 110</div>
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        style={{ width: "100%" }}
        onClick={() => {
          clearSession();
          router.push("/m/login");
        }}
      >
        Sign out
      </Button>
    </MobileChrome>
  );
}

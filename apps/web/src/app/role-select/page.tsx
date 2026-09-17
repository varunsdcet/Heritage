"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Panel } from "@myheritage/ui";
import { loadSession, type Session } from "@/lib/api";

const OPTIONS = [
  { role: "student", label: "Student", href: "/student", email: "marcus.vance@heritage.edu" },
  { role: "instructor", label: "Teacher", href: "/instructor", email: "vance.instructor@heritage.edu" },
  { role: "admin", label: "Administration", href: "/admin", email: "admin@heritage.edu" },
  { role: "applicant", label: "Applicant", href: "/applicant", email: "nora.reyes@applicant.heritage.edu" },
  { role: "employer", label: "Employer", href: "/employer", email: "sam.okello@fraserhealth.partner" },
  { role: "mobile", label: "Mobile student", href: "/m/student", email: "marcus.vance@heritage.edu" },
  { role: "design", label: "Component library", href: "/design-system", email: "UI" },
  { role: "archive", label: "Archive & consolidate", href: "/archive", email: "Figma archive" },
] as const;

export default function RoleSelectPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <h1 style={{ fontFamily: "var(--mh-font-display)", fontSize: "var(--mh-h1)", margin: "0 0 0.35rem" }}>
          Choose a workspace
        </h1>
        <p style={{ color: "var(--mh-text-muted)", marginTop: 0 }}>
          {session
            ? `Signed in as ${session.givenName} ${session.familyName}`
            : "FD-07 demo roles · sign in first for live data"}
        </p>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {OPTIONS.map((opt) => (
            <Panel key={opt.role} dense>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <strong>{opt.label}</strong>
                  <div style={{ color: "var(--mh-text-muted)", fontSize: "var(--mh-body-compact)" }}>{opt.email}</div>
                </div>
                <Button type="button" onClick={() => router.push(opt.href)}>
                  Enter
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}

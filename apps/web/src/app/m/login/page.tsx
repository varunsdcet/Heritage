"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup, Button, Input } from "@myheritage/ui";
import { api, saveSession, type Session } from "@/lib/api";

export default function MobileLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await api<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          deviceFingerprint: "mobile-web-device-1",
        }),
      });
      saveSession(session);
      if (session.roles.includes("instructor")) router.push("/m/instructor/home");
      else if (session.roles.includes("admin") || session.roles.includes("registrar")) router.push("/admin");
      else router.push("/m/student");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        maxWidth: 430,
        margin: "0 auto",
        background: "var(--mh-bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          background: "var(--mh-brand)",
          color: "#fff",
          padding: "1.25rem 1.5rem 1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              background: "#fff",
              color: "var(--mh-brand)",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            H
          </div>
          <strong style={{ fontSize: 16 }}>Heritage</strong>
        </div>
        <h1 style={{ margin: "1.25rem 0 0.35rem", fontSize: 22, fontWeight: 700 }}>Sign in</h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: 13 }}>MyHeritage</p>
      </header>

      <form onSubmit={onSubmit} style={{ padding: "1.25rem 1.15rem 2rem", display: "grid", gap: 14 }}>
        {error ? (
          <div style={{ color: "var(--mh-danger)", fontSize: 13, display: "flex", gap: 6 }}>
            <span aria-hidden>⚠</span>
            {error}
          </div>
        ) : null}
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Campus email</span>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Password</span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <Button type="submit" disabled={loading} style={{ width: "100%", marginTop: 4 }}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <BrandLockup compact />
        </div>
      </form>
    </div>
  );
}

"use client";

import { FormEvent, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: 15,
  padding: "12px 14px",
  borderRadius: 6,
  border: "1px solid #E1E3DC",
  background: "#F9FAF6",
  color: "#1F2937",
  outline: "none",
};
const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const caption: CSSProperties = { fontSize: 14, fontWeight: 600, color: "#1F2937" };

export default function ApplyPage() {
  const router = useRouter();
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!givenName.trim() || !familyName.trim()) return setError("Enter your first and last name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const out = await api<{ email: string }>(
        "/public/apply",
        { method: "POST", body: JSON.stringify({ givenName: givenName.trim(), familyName: familyName.trim(), email: email.trim(), password }) },
        undefined,
        { skipAuthRedirect: true },
      );
      router.push(`/login?registered=1&next=${encodeURIComponent("/applicant/application")}&email=${encodeURIComponent(out.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account. Try again.");
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F6F7F4", fontFamily: "var(--mh-font-sans)", padding: "2rem 1rem" }}>
      <section style={{ width: "100%", maxWidth: 480, background: "#FFFFFF", borderRadius: 16, padding: "36px clamp(1.25rem, 5vw, 44px)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <img src="/brand/login_logo.png" alt="Heritage Community College" style={{ display: "block", height: 48, width: "auto", marginBottom: 24 }} />
        <h1 style={{ margin: "0 0 8px", fontFamily: "var(--mh-font-display)", fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", color: "#1F2937" }}>Apply to Heritage</h1>
        <p style={{ margin: "0 0 24px", color: "#5C5F5A", fontSize: 15, lineHeight: 1.4 }}>
          Create an applicant account. After you sign in you can fill in your application, choose a program and upload your documents.
        </p>
        <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error ? (
            <p role="alert" style={{ margin: 0, color: "#BA1A1A", fontSize: 14 }}>
              {error}
            </p>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={label}>
              <span style={caption}>First name</span>
              <input style={input} value={givenName} onChange={(e) => setGivenName(e.target.value)} autoComplete="given-name" maxLength={80} required />
            </label>
            <label style={label}>
              <span style={caption}>Last name</span>
              <input style={input} value={familyName} onChange={(e) => setFamilyName(e.target.value)} autoComplete="family-name" maxLength={80} required />
            </label>
          </div>
          <label style={label}>
            <span style={caption}>Email</span>
            <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={200} required />
          </label>
          <label style={label}>
            <span style={caption}>Password</span>
            <input style={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
            <span style={{ fontSize: 13, color: "#5C5F5A" }}>At least 8 characters.</span>
          </label>
          <label style={label}>
            <span style={caption}>Confirm password</span>
            <input style={input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          </label>
          <button
            type="submit"
            disabled={busy}
            style={{ width: "100%", border: "none", borderRadius: 6, background: busy ? "#C5C9C0" : "#2563EB", color: "#FFFFFF", fontSize: 15, fontWeight: 600, fontFamily: "inherit", padding: "12px 16px" }}
          >
            {busy ? "Creating account…" : "Create applicant account"}
          </button>
          <p style={{ margin: 0, fontSize: 14, color: "#5C5F5A", textAlign: "center" }}>
            Already have an account?{" "}
            <a href="/login" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </a>
          </p>
        </form>
      </section>
    </main>
  );
}

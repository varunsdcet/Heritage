"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, saveSession, type Session } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("marcus.vance@heritage.edu");
  const [password, setPassword] = useState("Heritage!2026");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);

  const passwordError = useMemo(() => {
    if (!touchedPassword && !error) return null;
    if (password.length > 0 && password.length < 8) return "Password must be at least 8 characters long.";
    return null;
  }, [password, touchedPassword, error]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouchedPassword(true);
    if (password.length > 0 && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await api<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          deviceFingerprint: `web-${typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 48) : "device"}`,
          remember,
        }),
      });
      saveSession(session);
      if (session.roles.includes("instructor")) router.push("/instructor");
      else if (session.roles.includes("admin") || session.roles.includes("registrar")) router.push("/admin");
      else if (session.roles.length > 1) router.push("/role-select");
      else router.push("/student");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Sign-in failed";
      const friendly =
        /Can't reach database|ECONNREFUSED|database server/i.test(raw)
          ? "Campus services are temporarily unavailable. Start the database and try again."
          : /Invalid credentials|unauthorized|401/i.test(raw)
            ? "Email or password is incorrect."
            : raw.length > 180
              ? "Sign-in failed. Please try again."
              : raw;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }

  const fieldError = Boolean(passwordError) || Boolean(error && password.length < 8);

  return (
    <div
      className="mh-login"
      data-node-id="17:6"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
        background: "#F6F7F4",
        fontFamily: "var(--mh-font-sans)",
      }}
    >
      <style>{`
        .mh-login { width: 100%; }
        .mh-login-form { flex: 0 0 792px; }
        .mh-login-hero { flex: 1 1 648px; min-width: 420px; }
        @media (max-width: 1100px) {
          .mh-login-form { flex: 0 0 55%; min-width: 360px; }
          .mh-login-hero { min-width: 280px; }
        }
        @media (max-width: 900px) {
          .mh-login { flex-direction: column !important; }
          .mh-login-hero { min-height: 240px !important; max-height: 320px !important; min-width: 100% !important; flex: none !important; order: -1; }
          .mh-login-form { width: 100% !important; flex: none !important; padding: 2rem 1.25rem !important; min-height: auto !important; }
        }
      `}</style>

      <section
        className="mh-login-form"
        style={{
          background: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "40px clamp(1.5rem, 6vw, 100px)",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        <img
          src="/brand/login_logo.png"
          alt="Heritage Community College"
          style={{ display: "block", height: 56, width: "auto", maxWidth: 280, objectFit: "contain" }}
        />

        <form onSubmit={onSubmit} style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1.2, color: "#1A1C19" }}>
              Sign in to MyHeritage
            </h1>
            <p style={{ margin: 0, color: "#5C5F5A", fontSize: 15, lineHeight: 1.4 }}>
              Access your student dashboard and academic services.
            </p>
          </div>

          {error && !passwordError ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", color: "#BA1A1A", fontSize: 13 }}>
              <img src="/brand/login/alert.svg" alt="" width={16} height={16} />
              <span>{error}</span>
            </div>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1C19" }}>Student Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="name@heritage.edu"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  fontSize: 15,
                  padding: "12px 14px",
                  borderRadius: 6,
                  border: "1px solid #E1E3DC",
                  background: "#F9FAF6",
                  color: "#1A1C19",
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1C19" }}>Password</span>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setTouchedPassword(true);
                  }}
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    fontSize: 15,
                    padding: "12px 44px 12px 14px",
                    borderRadius: 6,
                    border: `1px solid ${fieldError ? "#BA1A1A" : "#E1E3DC"}`,
                    background: "#F9FAF6",
                    color: "#1A1C19",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 0,
                    width: 20,
                    height: 20,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <img src="/brand/login/eye.svg" alt="" width={20} height={20} />
                </button>
              </div>
              {passwordError ? (
                <span style={{ display: "flex", gap: 6, alignItems: "center", color: "#BA1A1A", fontSize: 13 }}>
                  <img src="/brand/login/alert.svg" alt="" width={16} height={16} />
                  {passwordError}
                </span>
              ) : null}
            </label>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#5C5F5A", cursor: "pointer" }}>
                <span
                  role="checkbox"
                  aria-checked={remember}
                  tabIndex={0}
                  onClick={() => setRemember((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setRemember((v) => !v);
                    }
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${remember ? "#017F3F" : "#E1E3DC"}`,
                    background: remember ? "#017F3F" : "#FFFFFF",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    boxSizing: "border-box",
                  }}
                >
                  {remember ? <img src="/brand/login/check.svg" alt="" width={12} height={12} /> : null}
                </span>
                Remember me
              </label>
              <a href="/reset" style={{ color: "#017F3F", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                Forgot password?
              </a>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 6,
                background: "#017F3F",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
                padding: "12px 16px",
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.85 : 1,
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>

        </form>

        <div aria-hidden style={{ height: 1 }} />
      </section>

      <aside
        className="mh-login-hero"
        aria-hidden
        style={{
          position: "relative",
          minHeight: "100vh",
          overflow: "hidden",
        }}
      >
        <img
          src="/brand/login/hero.png"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(90deg, rgba(1,127,63,0.15), rgba(1,127,63,0.15)), linear-gradient(90deg, rgba(132,159,56,0.2), rgba(132,159,56,0.2))",
            pointerEvents: "none",
          }}
        />
      </aside>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadEnrollments, saveSelfpacedUser } from "@/lib/selfpacedAuth";

type Mode = "login" | "signup";

function checkoutDestFromNext(next: string): string | null {
  const raw = (next || "").trim();
  if (!raw) return null;
  if (raw.includes("/selfpaced/checkout")) return raw.split("&auth=")[0];
  try {
    const url = new URL(raw, "http://local.invalid");
    if (url.pathname.startsWith("/selfpaced/programs/")) {
      const slug = url.pathname.split("/").filter(Boolean).pop();
      if (slug) return `/selfpaced/checkout?slug=${encodeURIComponent(slug)}`;
    }
    if (url.searchParams.get("enroll") === "1") {
      const slug = url.pathname.split("/").filter(Boolean).pop();
      if (slug) return `/selfpaced/checkout?slug=${encodeURIComponent(slug)}`;
    }
  } catch {
    /* ignore */
  }
  if (raw.includes("enroll=1") && raw.includes("/programs/")) {
    const m = raw.match(/\/selfpaced\/programs\/([^/?#]+)/);
    if (m?.[1]) return `/selfpaced/checkout?slug=${encodeURIComponent(m[1])}`;
  }
  return null;
}

export function SelfpacedLoginModal({
  open,
  onClose,
  initialMode = "login",
  nextPath = "/selfpaced/dashboard",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
  nextPath?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setName("");
      setEmail("");
      setPassword("");
      setShowPw(false);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const resolveDest = (activeMode: Mode) => {
    const pay = checkoutDestFromNext(nextPath || "");
    if (pay) return pay;

    const next = (nextPath || "").trim();
    if (next && next !== "/selfpaced" && !next.startsWith("/selfpaced#") && !next.includes("/dashboard")) {
      return next;
    }

    // Unpaid accounts must buy before dashboard access.
    if (activeMode === "signup") return "/selfpaced#catalog";
    if (loadEnrollments().length > 0) return "/selfpaced/dashboard";
    return "/selfpaced#catalog";
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Enter your name.");
      return;
    }
    saveSelfpacedUser({
      name: name.trim() || trimmed.split("@")[0] || "Learner",
      email: trimmed,
    });
    const dest = resolveDest(mode);
    onClose();
    router.push(dest);
  };

  return (
    <div className="sp-modal" role="dialog" aria-modal="true" aria-labelledby="sp-login-title">
      <button type="button" className="sp-modal__backdrop" aria-label="Close" onClick={onClose} />
      <div className="sp-modal__panel">
        <button type="button" className="sp-modal__close" onClick={onClose} aria-label="Close dialog">
          ×
        </button>
        <div className="sp-modal__brand sp-modal__brand--logo-only">
          <img src="/brand/login_logo.png" alt="Heritage" />
        </div>
        <p className="sp-kicker">{mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}</p>
        <h2 id="sp-login-title">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p className="sp-modal__lede">
          {mode === "login"
            ? "Sign in, then complete Stripe payment for any program you have not purchased yet."
            : "Create an account, choose a program, and pay on Stripe. Courses unlock only after payment."}
        </p>
        <form className="sp-modal__form" onSubmit={submit}>
          {mode === "signup" ? (
            <label>
              Full name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" autoComplete="name" />
            </label>
          ) : null}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <div className="sp-modal__pw">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}>
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          {error ? <p className="sp-error">{error}</p> : null}
          <button type="submit" className="sp-btn sp-btn--primary sp-btn--block">
            {mode === "login" ? "Sign in" : "Create account & continue"}
          </button>
        </form>
        <p className="sp-modal__switch">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button type="button" onClick={() => setMode("signup")}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => setMode("login")}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

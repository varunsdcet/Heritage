"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button, Input, Banner } from "@myheritage/ui";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("marcus.vance@heritage.edu");
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--mh-surface)",
          border: "1px solid var(--mh-border)",
          borderRadius: "var(--mh-radius-lg)",
          padding: "2rem",
          boxShadow: "0 18px 40px rgba(26, 31, 22, 0.06)",
        }}
      >
        <div style={{ fontFamily: "var(--mh-font-display)", fontSize: "1.6rem" }}>MyHeritage</div>
        <p style={{ color: "var(--mh-text-muted)", marginTop: "0.35rem" }}>Reset password</p>
        {sent ? <Banner>If an account exists for {email}, reset instructions were sent.</Banner> : null}
        <label style={{ display: "grid", gap: "0.35rem", marginTop: "1rem" }}>
          Email
          <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <div style={{ marginTop: "1.25rem" }}>
          <Button type="submit" style={{ width: "100%" }}>
            Send reset link
          </Button>
        </div>
        <p style={{ marginTop: "1rem", fontSize: "var(--mh-body-compact)" }}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}

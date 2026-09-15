"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Banner } from "@myheritage/ui";

export default function MfaPage() {
  const router = useRouter();
  const [code, setCode] = useState("123456");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.trim().length < 6) {
      setError("Enter the 6-digit code from your authenticator.");
      return;
    }
    router.push("/role-select");
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
        <p style={{ color: "var(--mh-text-muted)", marginTop: "0.35rem" }}>Multi-factor authentication</p>
        {error ? <Banner>{error}</Banner> : null}
        <label style={{ display: "grid", gap: "0.35rem", marginTop: "1rem" }}>
          Authentication code
          <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" />
        </label>
        <div style={{ marginTop: "1.25rem" }}>
          <Button type="submit" style={{ width: "100%" }}>
            Verify
          </Button>
        </div>
      </form>
    </div>
  );
}

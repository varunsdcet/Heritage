"use client";

import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from "react";

const btnBase: CSSProperties = {
  fontFamily: "var(--mh-font-sans)",
  fontSize: "var(--mh-body-compact)",
  borderRadius: "var(--mh-radius-md)",
  border: "1px solid var(--mh-border)",
  padding: "0.7rem 1rem",
  cursor: "pointer",
  background: "var(--mh-surface)",
  color: "var(--mh-text)",
  fontWeight: 600,
  lineHeight: 1.2,
};

export function Button({
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ai" }) {
  const styles: Record<string, CSSProperties> = {
    primary: { ...btnBase, background: "var(--mh-brand)", color: "#fff", borderColor: "var(--mh-brand)" },
    secondary: btnBase,
    danger: { ...btnBase, background: "var(--mh-danger)", color: "#fff", borderColor: "var(--mh-danger)" },
    ai: {
      ...btnBase,
      background: "var(--mh-ai-soft)",
      color: "var(--mh-ai)",
      borderColor: "rgba(29, 78, 216, 0.19)",
    },
  };
  return <button {...props} style={{ ...styles[variant], ...props.style }} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        fontFamily: "var(--mh-font-sans)",
        fontSize: 15,
        padding: "0.75rem 0.875rem",
        borderRadius: "var(--mh-radius-md)",
        border: "1px solid var(--mh-border)",
        background: "var(--mh-surface-muted)",
        color: "var(--mh-text)",
        ...props.style,
      }}
    />
  );
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: "var(--mh-brand)",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--mh-font-sans)",
        fontWeight: 700,
        fontSize: size * 0.55,
        flexShrink: 0,
      }}
    >
      H
    </div>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <img
      src="/brand/login_logo.png"
      alt="Heritage Community College"
      style={{
        display: "block",
        height: compact ? 36 : 52,
        width: "auto",
        maxWidth: compact ? 180 : 260,
        objectFit: "contain",
      }}
    />
  );
}

export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "ai";
  children: ReactNode;
}) {
  const map = {
    neutral: { bg: "var(--mh-brand-soft)", fg: "var(--mh-brand)" },
    success: { bg: "var(--mh-olive-soft)", fg: "var(--mh-olive)" },
    warning: { bg: "var(--mh-warning-soft)", fg: "var(--mh-warning)" },
    danger: { bg: "var(--mh-danger-soft)", fg: "var(--mh-danger)" },
    ai: { bg: "var(--mh-ai-soft)", fg: "var(--mh-ai)" },
  } as const;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.12rem 0.5rem",
        borderRadius: "var(--mh-radius-sm)",
        background: map[tone].bg,
        color: map[tone].fg,
        fontSize: 12,
        fontFamily: "var(--mh-font-sans)",
        fontWeight: 600,
        letterSpacing: "0.01em",
      }}
    >
      {children}
    </span>
  );
}

export function Banner({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "success" | "danger" }) {
  const tones = {
    warning: { bg: "var(--mh-warning-soft)", fg: "var(--mh-warning)", border: "#B45309" },
    success: { bg: "var(--mh-brand-soft)", fg: "var(--mh-brand)", border: "var(--mh-brand)" },
    danger: { bg: "var(--mh-danger-soft)", fg: "var(--mh-danger)", border: "var(--mh-danger)" },
  } as const;
  const t = tones[tone];
  return (
    <div
      style={{
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.border}`,
        borderRadius: "var(--mh-radius-md)",
        padding: "0.65rem 0.9rem",
        fontFamily: "var(--mh-font-sans)",
        fontSize: 13,
        marginBottom: "1rem",
      }}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: "1.75rem", textAlign: "center", color: "var(--mh-text-muted)", fontFamily: "var(--mh-font-sans)" }}>
      <h3 style={{ color: "var(--mh-text)", marginBottom: "0.35rem", fontFamily: "var(--mh-font-display)" }}>{title}</h3>
      <p style={{ margin: 0 }}>{body}</p>
    </div>
  );
}

export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <p style={{ color: "var(--mh-text-subtle)", fontSize: 12, fontFamily: "var(--mh-font-sans)", margin: "0 0 0.35rem" }}>
      {items.join(" / ")}
    </p>
  );
}

export function Panel({ title, children, dense }: { title?: string; children: ReactNode; dense?: boolean }) {
  return (
    <section
      style={{
        background: "var(--mh-surface)",
        border: "1px solid var(--mh-border)",
        borderRadius: "var(--mh-radius-lg)",
        padding: dense ? "0.85rem 1rem" : "1.25rem 1.5rem",
        marginBottom: "0.85rem",
        boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
      }}
    >
      {title ? (
        <h2
          style={{
            margin: "0 0 1rem",
            fontSize: "var(--mh-h3)",
            fontFamily: "var(--mh-font-display)",
            fontWeight: 700,
          }}
        >
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      style={{
        flex: "1 1 160px",
        minWidth: 140,
        padding: "1.15rem 1.25rem",
        background: "var(--mh-surface)",
        borderRadius: "var(--mh-radius-lg)",
        border: "1px solid var(--mh-border)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          color: "var(--mh-text-subtle)",
          fontSize: 13,
          fontFamily: "var(--mh-font-sans)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: "var(--mh-font-display)", fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {hint ? <div style={{ color: "var(--mh-text-muted)", fontSize: 13, marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

export function ReadOnlyGuard({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      {children}
      {active ? (
        <div
          aria-label="Read only"
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(246,247,244,0.55)",
            display: "grid",
            placeItems: "center",
            borderRadius: "var(--mh-radius-md)",
          }}
        >
          <StatusPill tone="warning">Read only — request a correction</StatusPill>
        </div>
      ) : null}
    </div>
  );
}

export function ApprovalBar({
  pendingCount,
  onOpen,
}: {
  pendingCount: number;
  onOpen: () => void;
}) {
  if (!pendingCount) return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        padding: "0.65rem 0.9rem",
        background: "var(--mh-brand-soft)",
        borderRadius: "var(--mh-radius-md)",
        marginBottom: "1rem",
      }}
    >
      <span style={{ fontFamily: "var(--mh-font-sans)", color: "var(--mh-brand)", fontSize: "var(--mh-body-compact)" }}>
        {pendingCount} approval{pendingCount === 1 ? "" : "s"} waiting
      </span>
      <Button variant="primary" onClick={onOpen}>
        Open approval inbox
      </Button>
    </div>
  );
}

export function AIBlock({
  text,
  sources,
}: {
  text: string;
  sources: Array<{ id: string; title: string }>;
}) {
  if (!sources.length) {
    throw new Error("AIBlock requires sources");
  }
  return (
    <div
      style={{
        border: "1px solid rgba(29, 78, 216, 0.25)",
        background: "var(--mh-ai-soft)",
        borderRadius: "var(--mh-radius-md)",
        padding: "0.9rem 1rem",
        color: "var(--mh-ai)",
        fontFamily: "var(--mh-font-sans)",
        fontSize: "var(--mh-body-compact)",
      }}
    >
      <strong>Ask MyHeritage</strong>
      <p style={{ margin: "0.5rem 0" }}>{text}</p>
      <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
        {sources.map((s) => (
          <li key={s.id}>{s.title}</li>
        ))}
      </ul>
    </div>
  );
}

export function RecordHeader({ title, subtitle, meta }: { title: string; subtitle?: string; meta?: ReactNode }) {
  return (
    <header style={{ marginBottom: "1.25rem" }}>
      <h1
        style={{
          fontFamily: "var(--mh-font-display)",
          fontSize: "var(--mh-h1)",
          lineHeight: 1.2,
          margin: 0,
          color: "var(--mh-text)",
          fontWeight: 700,
        }}
      >
        {title}
      </h1>
      {subtitle ? (
        <p style={{ margin: "0.35rem 0 0", color: "var(--mh-text-muted)", fontFamily: "var(--mh-font-sans)", fontSize: 14 }}>
          {subtitle}
        </p>
      ) : null}
      {meta}
    </header>
  );
}

type Role = "applicant" | "student" | "instructor" | "admin" | "employer";

const MENUS: Record<Role, string[]> = {
  applicant: ["Application", "Documents", "Messages", "Offers"],
  student: ["Home", "Courses", "Schedule", "Grades", "Services", "Messages", "More"],
  instructor: ["Home", "Sections", "Gradebook", "Attendance", "Messages", "All screens"],
  admin: ["Overview", "Approvals Inbox", "Analytics", "Users", "Search", "Settings", "All screens"],
  employer: ["Placements", "Hours", "Evaluations", "Agreements", "Profile"],
};

const DROPDOWN_ITEMS = new Set(["Services", "More"]);

export function AppShell({
  role,
  userName,
  children,
  active,
  onNavigate,
}: {
  role: Role;
  userName: string;
  children: ReactNode;
  active?: string;
  onNavigate?: (item: string) => void;
}) {
  const searchPlaceholder = role === "admin" ? "Search administration" : "Search MyHeritage";
  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div style={{ minHeight: "100vh", background: "var(--mh-bg)", color: "var(--mh-text)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
          height: 56,
          padding: "0 clamp(1rem, 5vw, 80px)",
          borderBottom: "1px solid var(--mh-border)",
          background: "var(--mh-surface)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 40, minWidth: 0, height: "100%" }}>
          <BrandLockup compact />
          <nav style={{ display: "flex", gap: 24, height: "100%", alignItems: "stretch", overflowX: "auto" }}>
            {MENUS[role].map((item) => {
              const isActive = active === item || (item === "Overview" && active === "Home");
              const withChevron = DROPDOWN_ITEMS.has(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onNavigate?.(item)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: isActive ? "var(--mh-brand)" : "var(--mh-text-muted)",
                    padding: "0 4px",
                    cursor: "pointer",
                    fontFamily: "var(--mh-font-sans)",
                    fontSize: 14,
                    fontWeight: 600,
                    position: "relative",
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {item}
                  {withChevron ? <img src="/brand/icons/chevron-down.svg" alt="" width={16} height={16} /> : null}
                  {isActive ? (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 3,
                        background: "var(--mh-brand)",
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onNavigate?.("Search")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: 240,
              padding: "8px 12px",
              borderRadius: "var(--mh-radius-md)",
              border: "1px solid var(--mh-border)",
              background: "var(--mh-surface-muted)",
              color: "var(--mh-text-subtle)",
              fontFamily: "var(--mh-font-sans)",
              fontSize: 13,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <img src="/brand/icons/search.svg" alt="" width={16} height={16} />
            <span style={{ flex: 1 }}>{searchPlaceholder}</span>
            <span
              style={{
                border: "1px solid var(--mh-border)",
                borderRadius: 4,
                padding: "2px 6px",
                background: "var(--mh-surface)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              ⌘K
            </span>
          </button>
          <Button
            variant={role === "student" ? "ai" : "primary"}
            type="button"
            onClick={() => onNavigate?.("Ask MyHeritage")}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              ...(role !== "student"
                ? { background: "var(--mh-brand-soft)", color: "var(--mh-brand)", borderColor: "rgba(1,127,63,0.19)" }
                : null),
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <img src="/brand/icons/sparkle.svg" alt="" width={16} height={16} />
              Ask MyHeritage
            </span>
          </Button>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => onNavigate?.("Messages")}
            style={{
              width: 36,
              height: 36,
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <img src="/brand/icons/bell.svg" alt="" width={36} height={36} />
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.("More")}
            title={userName}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "999px",
                background: "var(--mh-brand-soft)",
                color: "var(--mh-brand)",
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "var(--mh-font-sans)",
              }}
            >
              {initials}
            </span>
            <img src="/brand/icons/chevron-down.svg" alt="" width={16} height={16} />
          </button>
        </div>
      </header>
      <main style={{ padding: "32px clamp(1rem, 5vw, 80px) 48px" }}>{children}</main>
    </div>
  );
}

export { MENUS };

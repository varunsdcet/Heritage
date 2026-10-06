"use client";

import { useRouter } from "next/navigation";

type Tone = "navy" | "rose" | "cyan" | "red" | "sky" | "blue" | "violet" | "indigo" | "amber" | "green" | "brown";
type IconName = "user-plus" | "teacher" | "check" | "search" | "mail" | "clipboard" | "dollar" | "file" | "receipt";

const QUICK_ACCESS: Array<{ label: string; href: string; tone: Tone; icon: IconName }> = [
  { label: "Student onboard", href: "/admin/users/create?role=student", tone: "rose", icon: "user-plus" },
  { label: "Instructor onboard", href: "/admin/users/create?role=instructor", tone: "violet", icon: "teacher" },
  { label: "Enrol student", href: "/admin/enrolments", tone: "green", icon: "check" },
  { label: "Search Students", href: "/admin/student-search", tone: "cyan", icon: "search" },
  { label: "Messages", href: "/admin/notifications", tone: "red", icon: "mail" },
  { label: "Approvals", href: "/admin/approvals", tone: "amber", icon: "clipboard" },
  { label: "AR posting", href: "/admin/finance/posting", tone: "navy", icon: "dollar" },
  { label: "Documents", href: "/admin/student-documents", tone: "sky", icon: "file" },
  { label: "Tax docs", href: "/admin/tax-documents", tone: "indigo", icon: "receipt" },
];

export type AdminTodo = { label: string; href: string };

function QuickIcon({ name }: { name: IconName }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (name) {
    case "user-plus":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="4" />
          <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M19 8v6M16 11h6" />
        </svg>
      );
    case "teacher":
      return (
        <svg {...common}>
          <path d="M22 10 12 5 2 10l10 5 10-5z" />
          <path d="M6 12v5c3 2 9 2 12 0v-5" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...common}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case "dollar":
      return (
        <svg {...common}>
          <path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6M8 13h8M8 17h5" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...common}>
          <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      );
  }
}

export function AdminQuickAccess({ todos }: { todos: AdminTodo[] | null }) {
  const router = useRouter();
  return (
    <aside className="mh-ct-dash__aside">
      <h2>Quick Access</h2>
      <div className="mh-ct-dash__qa-grid">
        {QUICK_ACCESS.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`mh-ct-dash__qa mh-ct-dash__qa--${item.tone}`}
            onClick={() => router.push(item.href)}
          >
            <span className="mh-ct-dash__qa-ico" aria-hidden>
              <QuickIcon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <details className="mh-ct-dash__acc" open={Boolean(todos?.length)}>
        <summary>To-do</summary>
        {todos === null ? (
          <p className="mh-teacher-muted">Loading…</p>
        ) : todos.length ? (
          <ul className="mh-ct-dash__todo">
            {todos.map((t) => (
              <li key={t.label}>
                <button type="button" onClick={() => router.push(t.href)}>
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mh-teacher-muted">Nothing pending.</p>
        )}
      </details>
    </aside>
  );
}

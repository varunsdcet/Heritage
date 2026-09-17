"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, loadSession } from "@/lib/api";

type NavChild = { label: string; href: string; match?: string[] };
type NavItem = {
  label: string;
  href: string;
  icon: string;
  children?: NavChild[];
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: "bar-chart" },
  {
    label: "My Courses",
    href: "/student/courses",
    icon: "book",
    children: [
      { label: "My courses", href: "/student/courses", match: ["/student/courses"] },
      { label: "Continue learning", href: "/student/continue" },
      { label: "Modules", href: "/student/modules" },
      {
        label: "Assignments",
        href: "/student/assignments",
        match: ["/student/assignments", "/student/f/st-04-assignments", "/student/f/st-05-assignment-detail"],
      },
      {
        label: "Assessments",
        href: "/student/assessments",
        match: ["/student/assessments", "/student/f/st-06-assessments"],
      },
      {
        label: "Lectures",
        href: "/student/lectures",
        match: ["/student/lectures", "/student/f/st-11-lecture-detail"],
      },
      {
        label: "Labs",
        href: "/student/labs",
        match: ["/student/labs", "/student/f/st-13-lab-detail"],
      },
    ],
  },
  {
    label: "Schedule",
    href: "/student/calendar",
    icon: "calendar",
    children: [
      { label: "Calendar", href: "/student/calendar" },
      { label: "Attendance", href: "/student/attendance" },
      { label: "Announcements", href: "/student/announcements" },
    ],
  },
  { label: "Grades", href: "/student/grades", icon: "briefcase" },
  {
    label: "Services",
    href: "/student/advising",
    icon: "school",
    children: [
      { label: "Degree progress", href: "/student/degree" },
      { label: "Study with AI", href: "/student/study" },
      { label: "Career", href: "/student/career" },
      { label: "Advising", href: "/student/advising" },
      { label: "Campus services", href: "/student/f/st-16-services" },
      { label: "Practicum", href: "/student/f/st-17-practicum" },
      { label: "Career", href: "/student/f/st-20-career" },
      { label: "Fees", href: "/student/fees" },
      { label: "Documents", href: "/student/documents" },
      { label: "Library", href: "/student/library" },
      { label: "Credentials", href: "/student/f/st-19-credentials" },
      { label: "Holds", href: "/student/holds" },
      { label: "Success", href: "/student/success" },
    ],
  },
  {
    label: "Messages",
    href: "/student/messages",
    icon: "users",
    children: [
      { label: "Inbox", href: "/student/messages" },
      { label: "Ask Heritage", href: "/student/ask" },
    ],
  },
  {
    label: "Account",
    href: "/student/profile",
    icon: "user",
    children: [
      { label: "Profile", href: "/student/profile" },
      { label: "Notifications", href: "/student/notifications" },
      { label: "Search", href: "/student/search" },
    ],
  },
];

function NavIcon({ name, active }: { name: string; active?: boolean }) {
  const stroke = active ? "#F1F0F7" : "#A29FBA";
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (name) {
    case "bar-chart":
      return (
        <svg {...common}>
          <path d="M4 20V10M12 20V4M20 20v-7" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z" />
          <path d="M6 3v14" />
        </svg>
      );
    case "school":
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5 9-5z" />
          <path d="M5 10.5V17c0 1.5 3 3 7 3s7-1.5 7-3v-6.5" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 11h18" />
        </svg>
      );
    default:
      return <span style={{ width: 16, height: 16 }} />;
  }
}

function pathMatches(pathname: string, href: string, extra: string[] = []) {
  return [href, ...extra].some((target) => {
    if (target === "/student") return pathname === "/student";
    return pathname === target || pathname.startsWith(`${target}/`);
  });
}

function childMatches(pathname: string, child: NavChild) {
  return pathMatches(pathname, child.href, child.match);
}

function isActive(pathname: string, item: NavItem) {
  if (item.children?.length) return item.children.some((child) => childMatches(pathname, child));
  return pathMatches(pathname, item.href);
}

export function StudentSisShell({
  children,
  title,
  subtitle,
  activeHref,
  userName = "Student",
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  activeHref?: string;
  userName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/student";
  const current = activeHref || pathname;
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");

  const initials = useMemo(
    () =>
      userName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "ST",
    [userName],
  );

  useEffect(() => {
    const match = NAV.find((item) => isActive(current, item) && item.children);
    setOpenGroup(match?.href ?? null);
  }, [current]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = searchQ.trim();
    router.push(q ? `/student/search?q=${encodeURIComponent(q)}` : "/student/search");
  }

  return (
    <div className="mh-teacher mh-student-shell" data-portal="student">
      <aside className="mh-teacher__sidebar">
        <div className="mh-teacher__sidebar-top">
          <button type="button" className="mh-teacher__brand mh-student-shell__brand" aria-label="Heritage Community College" onClick={() => router.push("/student")}>
            <img src="/brand/login_logo.png" alt="Heritage Community College" className="mh-student-shell__logo" />
          </button>

          <nav className="mh-teacher__nav" aria-label="Student">
            {NAV.map((item) => {
              const active = isActive(current, item);
              const expanded = Boolean(item.children) && openGroup === item.href;
              return (
                <div key={item.href} className={`mh-teacher__nav-group${active ? " is-active" : ""}`}>
                  <button
                    type="button"
                    className={`mh-teacher__nav-item${active ? " is-active" : ""}`}
                    aria-expanded={item.children ? expanded : undefined}
                    onClick={() => {
                      if (item.children) {
                        setOpenGroup((value) => (value === item.href ? null : item.href));
                        return;
                      }
                      setOpenGroup(null);
                      router.push(item.href);
                    }}
                  >
                    <span className="mh-teacher__nav-icon">
                      <NavIcon name={item.icon} active={active} />
                    </span>
                    <span className="mh-teacher__nav-text">{item.label}</span>
                    {item.children ? (
                      <img
                        src={`/brand/icons/chevron-${expanded ? "down" : "right"}.svg`}
                        alt=""
                        width={16}
                        height={16}
                        className="mh-teacher__nav-chevron"
                      />
                    ) : null}
                  </button>
                  {item.children && expanded ? (
                    <div className="mh-teacher__nav-sub">
                      {item.children.map((child) => (
                        <button
                          key={child.href}
                          type="button"
                          className={`mh-teacher__nav-subitem${childMatches(current, child) ? " is-active" : ""}`}
                          onClick={() => router.push(child.href)}
                        >
                          <span className="mh-teacher__nav-dot" />
                          {child.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="mh-teacher__sidebar-foot">
          <div className="mh-teacher__user-card">
            <span className="mh-teacher__avatar" aria-hidden>
              {initials}
            </span>
            <span>
              <strong>{userName}</strong>
              <span>Student</span>
            </span>
          </div>
          <div className="mh-teacher__foot-actions">
            <button type="button" aria-label="Messages" onClick={() => router.push("/student/messages")}>
              <img src="/brand/icons/file-text.svg" alt="" width={16} height={16} />
            </button>
            <button type="button" aria-label="Home" onClick={() => router.push("/student")}>
              <img src="/brand/icons/school.svg" alt="" width={16} height={16} />
            </button>
            <button type="button" aria-label="Notifications" onClick={() => router.push("/student/notifications")}>
              <img src="/brand/icons/bell.svg" alt="" width={16} height={16} />
            </button>
            <button
              type="button"
              className="mh-student-shell__sign-out"
              aria-label="Sign out"
              onClick={() => {
                clearSession();
                router.replace("/login");
              }}
            >
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="mh-teacher__main">
        <header className="mh-teacher__header">
          <div className="mh-teacher__title-group">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="mh-teacher__header-actions">
            <form className="mh-teacher__search" onSubmit={onSearch}>
              <img src="/brand/icons/search.svg" alt="" width={14} height={14} />
              <input
                value={searchQ}
                onChange={(event) => setSearchQ(event.target.value)}
                placeholder="Search your portal…"
                aria-label="Search student portal"
              />
              <kbd>⌘K</kbd>
            </form>
            <button type="button" className="mh-teacher__ask-ai" onClick={() => router.push("/student/ask")}>
              <img src="/brand/icons/sparkle.svg" alt="" width={14} height={14} />
              Ask Heritage
            </button>
            <button
              type="button"
              className="mh-teacher__bell"
              aria-label="Notifications"
              onClick={() => router.push("/student/notifications")}
            >
              <img src="/brand/icons/bell.svg" alt="" width={18} height={18} />
            </button>
            <button
              type="button"
              className="mh-teacher__profile"
              onClick={() => router.push("/student/profile")}
              aria-label="Profile"
            >
              <span className="mh-teacher__avatar mh-teacher__avatar--photo" aria-hidden>
                {initials}
              </span>
              <span className="mh-teacher__profile-meta">
                <strong>{userName}</strong>
                <span className="mh-teacher__role-pill">STUDENT</span>
              </span>
            </button>
          </div>
        </header>
        <div className="mh-teacher__scroll">{children}</div>
      </div>
    </div>
  );
}

export function StudentFrame({
  title,
  subtitle,
  activeHref,
  children,
}: {
  role?: string;
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  active?: string;
  activeHref?: string;
  children: ReactNode;
}) {
  const [userName, setUserName] = useState("Student");

  useEffect(() => {
    const session = loadSession();
    if (session) setUserName(`${session.givenName} ${session.familyName}`.trim() || "Student");
  }, []);

  return (
    <StudentSisShell title={title} subtitle={subtitle} activeHref={activeHref} userName={userName}>
      <div className="mh-student-stack">{children}</div>
    </StudentSisShell>
  );
}

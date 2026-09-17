"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  children?: Array<{ label: string; href: string }>;
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/instructor", icon: "bar-chart" },
  {
    label: "My Profile / Settings",
    href: "/instructor/f/t02-profile-biography",
    icon: "user",
    children: [
      { label: "Manage My Profile", href: "/instructor/f/t02-profile-biography" },
      { label: "Accomplishments", href: "/instructor/f/t34-accomplishments" },
      { label: "Security Settings", href: "/instructor/f/t35-security-settings" },
      { label: "Settings", href: "/instructor/f/t15-settings" },
    ],
  },
  { label: "My Courses", href: "/instructor/sections", icon: "book" },
  { label: "Workshops", href: "/instructor/f/t11-workshops", icon: "school" },
  {
    label: "Students",
    href: "/instructor/f/t12-students-view",
    icon: "users",
  },
  { label: "Gradebook", href: "/instructor/gradebook", icon: "briefcase" },
  { label: "Course Management", href: "/instructor/f/t14-course-management", icon: "settings" },
];

const STUDIO_NAV = [
  { label: "Studio", href: "/instructor/f/in-12-ai-course-studio" },
  { label: "Outcomes", href: "/instructor/f/in-14-outcome-mapping" },
  { label: "Assessments", href: "/instructor/f/t10-assessments-gradebook" },
  { label: "Rubrics", href: "/instructor/f/in-16-rubric-generator" },
  { label: "Approval", href: "/instructor/f/in-17-course-approval" },
  { label: "Availability", href: "/instructor/f/t04-profile-availability" },
  { label: "Compensation", href: "/instructor/f/t05-profile-compensation" },
  { label: "Workshops", href: "/instructor/f/t11-workshops" },
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
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    default:
      return <span style={{ width: 16, height: 16 }} />;
  }
}

function isActive(activeHref: string, href: string, children?: NavItem["children"]) {
  if (activeHref === href) return true;
  return Boolean(children?.some((c) => activeHref === c.href || activeHref.startsWith(c.href)));
}

export function TeacherSisShell({
  children,
  activeHref = "/instructor",
  title = "Campus OS",
  subtitle,
  shell = "campus",
  studioActive,
  userName = "Instructor",
  userRole = "INSTRUCTOR",
  studentCount,
}: {
  children: ReactNode;
  activeHref?: string;
  title?: string;
  subtitle?: string;
  shell?: "campus" | "studio";
  studioActive?: string;
  userName?: string;
  userRole?: string;
  studentCount?: number;
}) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(true);
  const [searchQ, setSearchQ] = useState("");

  const navItems = useMemo(
    () =>
      NAV.map((item) =>
        item.href === "/instructor/f/t12-students-view" && studentCount != null
          ? { ...item, badge: studentCount.toLocaleString() }
          : item,
      ),
    [studentCount],
  );

  const initials = useMemo(
    () =>
      userName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "IN",
    [userName],
  );

  if (shell === "studio") {
    return (
      <div className="mh-teacher mh-teacher--studio" data-figma="teacher-studio">
        <header className="mh-teacher-studio__nav">
          <div className="mh-teacher-studio__brand">
            <span className="mh-teacher-studio__logo">H</span>
            <span className="mh-teacher-studio__brand-copy">
              <strong>Heritage</strong>
              <span>Community College</span>
            </span>
            <nav className="mh-teacher-studio__links" aria-label="Course studio">
              {STUDIO_NAV.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  className={`mh-teacher-studio__link${(studioActive || activeHref) === item.href ? " is-active" : ""}`}
                  onClick={() => router.push(item.href)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="mh-teacher-studio__actions">
            <label className="mh-teacher__search">
              <img src="/brand/icons/search.svg" alt="" width={14} height={14} />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search catalog..."
                aria-label="Search catalog"
              />
            </label>
            <button type="button" className="mh-teacher__ask-ai" onClick={() => router.push("/instructor/ask")}>
              <img src="/brand/icons/sparkle.svg" alt="" width={14} height={14} />
              Ask AI
            </button>
            <div className="mh-teacher__profile-chip">
              <span className="mh-teacher__avatar mh-teacher__avatar--sm" aria-hidden>
                {initials}
              </span>
              <span>Dr. Vance</span>
            </div>
          </div>
        </header>
        <div className="mh-teacher__scroll">{children}</div>
      </div>
    );
  }

  return (
    <div className="mh-teacher" data-figma="teacher-campus-os">
      <aside className="mh-teacher__sidebar">
        <div className="mh-teacher__sidebar-top">
          <div className="mh-teacher__brand">
            <span className="mh-teacher__logo">MH</span>
            <span className="mh-teacher__brand-copy">
              <strong>Campus OS</strong>
              <span>Heritage Community College</span>
            </span>
          </div>

          <nav className="mh-teacher__nav" aria-label="Teacher">
            {navItems.map((item) => {
              const active = isActive(activeHref, item.href, item.children);
              const expanded = Boolean(item.children) && (profileOpen || active);
              return (
                <div key={item.href} className={`mh-teacher__nav-group${active ? " is-active" : ""}`}>
                  <button
                    type="button"
                    className={`mh-teacher__nav-item${active ? " is-active" : ""}`}
                    onClick={() => {
                      if (item.children) {
                        setProfileOpen((v) => !v);
                        return;
                      }
                      router.push(item.href);
                    }}
                  >
                    <span className="mh-teacher__nav-icon">
                      <NavIcon name={item.icon} active={active} />
                    </span>
                    <span className="mh-teacher__nav-text">{item.label}</span>
                    {item.badge ? <span className="mh-teacher__nav-badge">{item.badge}</span> : null}
                    {item.children || item.label !== "Dashboard" ? (
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
                          className={`mh-teacher__nav-subitem${activeHref === child.href ? " is-active" : ""}`}
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
              <span>Instructor</span>
            </span>
          </div>
          <div className="mh-teacher__foot-actions">
            <button type="button" aria-label="Messages" onClick={() => router.push("/instructor/f/t16-teacher-messages-chat")}>
              <img src="/brand/icons/file-text.svg" alt="" width={16} height={16} />
            </button>
            <button type="button" aria-label="Home" onClick={() => router.push("/instructor")}>
              <img src="/brand/icons/school.svg" alt="" width={16} height={16} />
            </button>
            <button type="button" aria-label="Notifications" onClick={() => router.push("/instructor/notifications")}>
              <img src="/brand/icons/bell.svg" alt="" width={16} height={16} />
            </button>
            <button
              type="button"
              aria-label="Sign out"
              onClick={() => {
                try {
                  localStorage.removeItem("mh.session");
                } catch {
                  /* ignore */
                }
                router.push("/login");
              }}
            >
              <img src="/brand/icons/chevron-right.svg" alt="" width={16} height={16} />
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
            <label className="mh-teacher__search">
              <img src="/brand/icons/search.svg" alt="" width={14} height={14} />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search OS..."
                aria-label="Search Campus OS"
              />
              <kbd>⌘K</kbd>
            </label>
            <button
              type="button"
              className="mh-teacher__ask-ai"
              onClick={() => router.push("/instructor/ask")}
            >
              <img src="/brand/icons/sparkle.svg" alt="" width={14} height={14} />
              Ask MyHeritage
            </button>
            <button
              type="button"
              className="mh-teacher__bell"
              aria-label="Notifications"
              onClick={() => router.push("/instructor/notifications")}
            >
              <img src="/brand/icons/bell.svg" alt="" width={18} height={18} />
            </button>
            <div className="mh-teacher__profile">
              <span className="mh-teacher__avatar mh-teacher__avatar--photo" aria-hidden>
                {initials}
              </span>
              <span className="mh-teacher__profile-meta">
                <strong>{userName}</strong>
                <span className="mh-teacher__role-pill">{userRole}</span>
              </span>
            </div>
          </div>
        </header>
        <div className="mh-teacher__scroll">{children}</div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { SelfpacedLoginModal } from "@/components/selfpaced/SelfpacedLoginModal";
import { clearSelfpacedUser, loadEnrollments, loadSelfpacedUser, type SelfpacedUser } from "@/lib/selfpacedAuth";

const NAV = [
  { href: "/selfpaced", label: "Home" },
  { href: "/selfpaced#about", label: "About Us" },
  { href: "/selfpaced#catalog", label: "Programs" },
  { href: "/selfpaced#contact", label: "Contact Us" },
];

function ShellInner({
  children,
  nextAfterLogin = "/selfpaced/dashboard",
}: {
  children: ReactNode;
  nextAfterLogin?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<SelfpacedUser | null>(null);
  const [enrollments, setEnrollments] = useState<string[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    setUser(loadSelfpacedUser());
    setEnrollments(loadEnrollments());
  }, [pathname, authOpen]);

  useEffect(() => {
    const auth = searchParams.get("auth");
    if (auth === "login" || auth === "signup") {
      setAuthMode(auth);
      setAuthOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const onOpen = (ev: Event) => {
      const mode = (ev as CustomEvent<string>).detail === "signup" ? "signup" : "login";
      setAuthMode(mode);
      setAuthOpen(true);
    };
    window.addEventListener("sp-open-auth", onOpen);
    return () => window.removeEventListener("sp-open-auth", onOpen);
  }, []);

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const closeAuth = () => {
    setAuthOpen(false);
    setUser(loadSelfpacedUser());
    setEnrollments(loadEnrollments());
    if (searchParams.get("auth")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("auth");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    }
  };

  return (
    <div className="sp-root">
      <header className="sp-nav">
        <Link href="/selfpaced" className="sp-brand sp-brand--logo-only">
          <img src="/brand/login_logo.png" alt="Heritage" className="sp-brand__logo" />
        </Link>
        <nav className="sp-nav__links" aria-label="Self-paced">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === "/selfpaced" && item.href === "/selfpaced" ? "is-active" : ""}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <Link
              href="/selfpaced/dashboard"
              className={
                pathname.startsWith("/selfpaced/dashboard") || pathname.startsWith("/selfpaced/learn")
                  ? "is-active"
                  : ""
              }
            >
              Dashboard
            </Link>
          ) : null}
        </nav>
        <div className="sp-nav__actions">
          {user ? (
            <>
              <Link href="/selfpaced/dashboard" className="sp-nav__account">
                <span className="sp-nav__avatar" aria-hidden />
                {user.name}
              </Link>
              <button
                type="button"
                className="sp-btn sp-btn--ghost sp-btn--sm"
                onClick={() => {
                  clearSelfpacedUser();
                  setUser(null);
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button type="button" className="sp-btn sp-btn--ghost sp-btn--sm" onClick={() => openAuth("login")}>
                Log In
              </button>
              <button type="button" className="sp-btn sp-btn--primary sp-btn--sm" onClick={() => openAuth("signup")}>
                Sign Up
              </button>
            </>
          )}
        </div>
      </header>
      <main>{children}</main>
      <footer className="sp-footer" id="contact">
        <div className="sp-footer__grid">
          <div>
            <strong>Heritage Community College</strong>
            <p>Empowering futures through career-focused education and real-world training.</p>
            <p>Surrey — Unit 110, 8166 128th Street, Surrey, BC V3W 1R1</p>
            <p>Victoria — 759 Courtney St, Victoria, BC V8W 1C3</p>
            <p>
              <a href="tel:+16045935400">+1 (604) 593-5400</a> · <a href="mailto:info@hccbc.com">info@hccbc.com</a>
            </p>
          </div>
          <div>
            <h3>Quick Links</h3>
            <ul>
              <li>
                <Link href="/selfpaced">Home</Link>
              </li>
              <li>
                <Link href="/selfpaced#catalog">Programs</Link>
              </li>
              <li>
                <button type="button" onClick={() => openAuth("login")}>
                  Log In
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h3>Self-paced</h3>
            <ul>
              <li>
                <Link href="/selfpaced#catalog">Browse programs</Link>
              </li>
              <li>
                <Link href="/selfpaced#about">About eLearning</Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="sp-footer__meta">© {new Date().getFullYear()} Heritage Community College. All rights reserved.</p>
      </footer>
      <SelfpacedLoginModal
        open={authOpen}
        onClose={closeAuth}
        initialMode={authMode}
        nextPath={
          searchParams.get("next") ||
          (pathname.startsWith("/selfpaced/checkout")
            ? `${pathname}${searchParams.get("slug") ? `?slug=${searchParams.get("slug")}` : ""}`
            : authMode === "signup"
              ? "/selfpaced#catalog"
              : nextAfterLogin)
        }
      />
    </div>
  );
}

export function SelfpacedShell({
  children,
  nextAfterLogin = "/selfpaced/dashboard",
}: {
  children: ReactNode;
  nextAfterLogin?: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="sp-root">
          <main>{children}</main>
        </div>
      }
    >
      <ShellInner nextAfterLogin={nextAfterLogin}>{children}</ShellInner>
    </Suspense>
  );
}

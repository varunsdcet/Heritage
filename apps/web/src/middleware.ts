import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  registrar: "/admin",
  instructor: "/instructor",
  student: "/student",
  applicant: "/applicant",
  employer: "/employer",
};

function portalForPath(pathname: string): string | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/instructor" || pathname.startsWith("/instructor/")) return "instructor";
  if (pathname === "/student" || pathname.startsWith("/student/")) return "student";
  if (pathname === "/applicant" || pathname.startsWith("/applicant/")) return "applicant";
  if (pathname === "/employer" || pathname.startsWith("/employer/")) return "employer";
  return null;
}

function rolesFromCookie(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const decoded = decodeURIComponent(raw);
    // Prefer JSON array when present.
    if (decoded.trim().startsWith("[")) {
      const parsed = JSON.parse(decoded) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    }
    // Comma-separated: admin,registrar
    return decoded.split(",").map((r) => r.trim()).filter(Boolean);
  } catch {
    return raw.split(",").map((r) => r.trim()).filter(Boolean);
  }
}

function homeForRoles(roles: string[]): string {
  for (const role of ["admin", "registrar", "instructor", "applicant", "employer", "student"]) {
    if (roles.includes(role)) return ROLE_HOME[role] ?? "/login";
  }
  return "/login";
}

function canAccess(portal: string, roles: string[]): boolean {
  if (portal === "admin") return roles.includes("admin") || roles.includes("registrar");
  return roles.includes(portal);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const portal = portalForPath(pathname);
  if (!portal) return NextResponse.next();

  const roles = rolesFromCookie(request.cookies.get("mh_roles")?.value);
  if (roles.length === 0) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (!canAccess(portal, roles)) {
    const dest = request.nextUrl.clone();
    dest.pathname = homeForRoles(roles);
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/instructor",
    "/instructor/:path*",
    "/student",
    "/student/:path*",
    "/applicant",
    "/applicant/:path*",
    "/employer",
    "/employer/:path*",
  ],
};

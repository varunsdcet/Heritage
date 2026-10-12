import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function request(path: string, roles: string) {
  return new NextRequest(`https://appslure.app${path}`, {
    headers: { cookie: `mh_roles=${encodeURIComponent(roles)}` },
  });
}

describe("portal middleware", () => {
  it.each(["/instructor/gradebook?sectionId=section-1", "/instructor/submissions?sectionId=section-1"])(
    "allows an admin to review course work at %s",
    (path) => {
      const response = middleware(request(path, "admin"));
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("does not grant an admin general access to the instructor portal", () => {
    const response = middleware(request("/instructor/sections", "admin"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://appslure.app/admin");
  });

  it("keeps the full instructor portal available to instructors", () => {
    const response = middleware(request("/instructor/gradebook?sectionId=section-1", "instructor"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

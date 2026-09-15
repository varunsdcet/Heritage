import { describe, expect, it } from "vitest";
import { hasRole } from "./index.js";

describe("auth helpers", () => {
  it("checks roles", () => {
    expect(hasRole(["student"], "student")).toBe(true);
    expect(hasRole(["student"], ["instructor", "admin"])).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { designTokens } from "./index.js";

describe("tokens", () => {
  it("uses corrected warning and border-strong", () => {
    expect(designTokens.color.warning).toBe("#8A5A00");
    expect(designTokens.color.borderStrong).toBe("#C9CEC2");
    expect(designTokens.color.olive).toBe("#5F7A1F");
  });
});

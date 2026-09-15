import { describe, expect, it } from "vitest";
import { citeOrRefuse } from "./index.js";

describe("ai gateway", () => {
  it("refuses without sources", () => {
    expect(() => citeOrRefuse({ text: "hello", sources: [] })).toThrow(/citations/);
  });

  it("returns cited answer", () => {
    const ans = citeOrRefuse({
      text: "Your midterm was 88/100.",
      sources: [{ id: "g1", title: "GradeItem Midterm" }],
    });
    expect(ans.sources).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { MAX_PART_CHARS, splitScript } from "./monicaScript";

const words = (s: string) => s.split(/\s+/).filter(Boolean);

describe("splitScript", () => {
  it("keeps every word of a 40-minute script, in order, within the part limit", () => {
    const sentence = "Supply and demand set the market price when buyers and sellers meet. ";
    const script = Array.from({ length: 60 }, (_, p) => `Paragraph ${p + 1}. ${sentence.repeat(7)}`).join("\n\n");
    const parts = splitScript(script);

    expect(words(parts.map((p) => p.text).join(" "))).toEqual(words(script));
    expect(parts.every((p) => p.text.length <= MAX_PART_CHARS)).toBe(true);
    expect(new Set(parts.map((p) => p.paragraph)).size).toBe(60);
  });

  it("breaks a run-on sentence with no punctuation", () => {
    const script = "word ".repeat(400).trim();
    const parts = splitScript(script);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.text.length <= MAX_PART_CHARS)).toBe(true);
    expect(words(parts.map((p) => p.text).join(" ")).length).toBe(400);
  });

  it("ignores blank input", () => {
    expect(splitScript("  \n\n  ")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { estimateWordTimes } from "./xttsSpeech";

describe("estimateWordTimes", () => {
  it("spreads every word across the clip in order", () => {
    const words = estimateWordTimes("Good morning class. Today we study supply and demand.", 4);
    expect(words.map((w) => w.word)).toEqual(["Good", "morning", "class.", "Today", "we", "study", "supply", "and", "demand."]);
    for (let i = 1; i < words.length; i++) expect(words[i].start).toBeGreaterThanOrEqual(words[i - 1].end);
    expect(words[0].start).toBe(0);
    expect(words.at(-1)!.end).toBeLessThanOrEqual(4);
  });

  it("leaves a pause after sentence punctuation", () => {
    const [, morning, cls, today] = estimateWordTimes("Good morning class. Today", 3);
    expect(today.start - cls.end).toBeGreaterThan(morning.start - morning.end + 0.1);
  });

  it("returns nothing for empty text", () => {
    expect(estimateWordTimes("   ", 2)).toEqual([]);
  });
});

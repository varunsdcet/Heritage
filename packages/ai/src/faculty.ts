import { citeOrRefuse } from "./coach.js";
import type { GroundedCoachResult } from "./types.js";

export function isFacultyAssistantQuestion(question: string) {
  const q = question.toLowerCase();
  return /missing|not submitted|need help|declining|check-in|which students|roster|outstanding|draft grade|intervention/.test(
    q,
  );
}

export function facultyAssistantAnswer(input: {
  question: string;
  rows: Array<{ id: string; title: string; uri: string; text: string }>;
}): GroundedCoachResult {
  if (!input.rows.length) {
    const answer = citeOrRefuse({
      text: "No missing-submission or draft-grade signals were found in your assigned sections from live records.",
      sources: [{ id: "faculty:empty", title: "Your sections", uri: "/instructor/sections" }],
      tier: "read_only",
    });
    return {
      ...answer,
      suggestedActions: [{ label: "Open sections", href: "/instructor/sections" }],
      claims: [
        {
          kind: "fact",
          text: "No actionable faculty insight rows for assigned sections.",
          evidenceIds: ["faculty:empty"],
        },
      ],
    };
  }
  const lines = input.rows.slice(0, 12).map((row, index) => `${index + 1}. ${row.text}`);
  const answer = citeOrRefuse({
    text: [
      "Faculty Assistant — signals from your authorized sections only:",
      "",
      ...lines,
      "",
      "Draft outreach below is a suggestion only; you send messages yourself.",
    ].join("\n"),
    sources: input.rows.map(({ id, title, uri }) => ({ id, title, uri })),
    tier: "draft",
  });
  return {
    ...answer,
    suggestedActions: [
      { label: "Open gradebook", href: "/instructor/gradebook" },
      { label: "Open sections", href: "/instructor/sections" },
    ],
    claims: [
      {
        kind: "fact",
        text: `${input.rows.length} authorized section signal(s) surfaced.`,
        evidenceIds: input.rows.map((r) => r.id),
      },
      {
        kind: "action",
        text: "Review the list and send any check-in from Messages yourself.",
        evidenceIds: [],
      },
    ],
  };
}

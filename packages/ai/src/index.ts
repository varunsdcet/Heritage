export type Citation = { id: string; title: string; uri?: string };

export type AiAnswer = {
  tier: "read_only" | "draft" | "consequential";
  text: string;
  sources: Citation[];
};

export function citeOrRefuse(input: { text: string; sources: Citation[]; tier?: AiAnswer["tier"] }): AiAnswer {
  if (!input.sources.length) {
    throw Object.assign(new Error("AI refused: citations required"), {
      code: "CITATION_FAILURE",
      status: 422,
    });
  }
  return {
    tier: input.tier ?? "read_only",
    text: input.text,
    sources: input.sources,
  };
}

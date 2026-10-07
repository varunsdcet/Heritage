export type ScriptPart = { text: string; paragraph: number };

export const MAX_PART_CHARS = 600;

/** Splits a lecture script into sentence-aligned parts of at most MAX_PART_CHARS, remembering each part's paragraph. */
export function splitScript(script: string): ScriptPart[] {
  const paragraphs = script
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const parts: ScriptPart[] = [];
  paragraphs.forEach((para, paragraph) => {
    const sentences = para.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [para];
    let buf = "";
    const flush = () => {
      if (buf) parts.push({ text: buf, paragraph });
      buf = "";
    };
    for (const sentence of sentences) {
      if (sentence.length > MAX_PART_CHARS) {
        flush();
        let rest = sentence;
        while (rest.length > MAX_PART_CHARS) {
          let cut = rest.lastIndexOf(" ", MAX_PART_CHARS);
          if (cut < MAX_PART_CHARS / 2) cut = MAX_PART_CHARS;
          parts.push({ text: rest.slice(0, cut).trim(), paragraph });
          rest = rest.slice(cut).trim();
        }
        buf = rest;
        continue;
      }
      if (buf && buf.length + sentence.length + 1 > MAX_PART_CHARS) flush();
      buf = buf ? `${buf} ${sentence}` : sentence;
    }
    flush();
  });
  return parts;
}

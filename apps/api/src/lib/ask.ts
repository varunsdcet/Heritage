const DEFAULT_ASK_URL = "https://onlinemandiapp.com/Humanitix/api/ask";
const ASK_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = ASK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export type AskResult = {
  answer: string;
  model: string;
  source: "humanitix" | "openai" | "anthropic" | "fallback";
};

function askConfigured() {
  const url = process.env.HUMANITIX_ASK_URL || DEFAULT_ASK_URL;
  return Boolean(url && url !== "off");
}

async function callHumanitixAsk(systemPrompt: string, question: string): Promise<AskResult> {
  const url = process.env.HUMANITIX_ASK_URL || DEFAULT_ASK_URL;
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ system_prompt: systemPrompt, question }),
  });
  if (!response.ok) throw new Error(`Humanitix ask failed: ${response.status}`);
  const body = (await response.json()) as { success?: boolean; answer?: unknown; model?: string };
  if (!body?.success || body.answer == null) throw new Error("Humanitix ask returned empty answer");

  let answer = body.answer;
  if (typeof answer !== "string") {
    answer = JSON.stringify(answer);
  }
  return {
    answer: String(answer).trim(),
    model: body.model ? `humanitix:${body.model}` : "humanitix:ask",
    source: "humanitix",
  };
}

async function callOpenAi(systemPrompt: string, question: string): Promise<AskResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI failed: ${response.status}`);
  const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const answer = body.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("OpenAI empty answer");
  return { answer, model: process.env.OPENAI_MODEL || "gpt-4o-mini", source: "openai" };
}

async function callAnthropic(systemPrompt: string, question: string): Promise<AskResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: question }],
    }),
  });
  if (!response.ok) throw new Error(`Anthropic failed: ${response.status}`);
  const body = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const answer = body.content?.find((c) => c.type === "text")?.text?.trim();
  if (!answer) throw new Error("Anthropic empty answer");
  return {
    answer,
    model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",
    source: "anthropic",
  };
}

export async function askHeritageAi(input: {
  question: string;
  systemPrompt?: string;
  role?: string;
}): Promise<AskResult> {
  const question = String(input.question || "").trim();
  if (!question) {
    throw Object.assign(new Error("question is required"), { status: 400 });
  }
  const systemPrompt =
    input.systemPrompt ||
    `You are Ask Heritage, the campus AI assistant for MyHeritage AI Campus OS.
Help ${input.role || "campus"} users with courses, grades, schedules, fees, attendance, and campus policies.
Be concise, accurate, and cite which campus area the answer relates to.
Never invent student grades or financial balances — tell the user to open the relevant portal screen.`;

  const errors: string[] = [];
  if (askConfigured()) {
    try {
      const result = await callHumanitixAsk(systemPrompt, question);
      if (!result.answer || result.answer.trim().toLowerCase() === question.toLowerCase()) {
        throw new Error("Humanitix returned empty or echoed question");
      }
      return result;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "humanitix failed");
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await callAnthropic(systemPrompt, question);
      if (!result.answer || result.answer.trim().toLowerCase() === question.toLowerCase()) {
        throw new Error("Anthropic returned empty or echoed question");
      }
      return result;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "anthropic failed");
    }
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await callOpenAi(systemPrompt, question);
      if (!result.answer || result.answer.trim().toLowerCase() === question.toLowerCase()) {
        throw new Error("OpenAI returned empty or echoed question");
      }
      return result;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "openai failed");
    }
  }

  return {
    answer: [
      "I couldn't reach the live AI provider just now.",
      "Try Global Search for people/courses, or open Grades, Fees, Attendance, and Schedule from your portal.",
      errors.length ? `(debug: ${errors.join("; ")})` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    model: "fallback",
    source: "fallback",
  };
}

export type Citation = { id: string; title: string; uri?: string };

export type AiAnswer = {
  tier: "read_only" | "draft" | "consequential";
  text: string;
  sources: Citation[];
};

export type GroundedCoachFact = Citation & {
  uri: string;
  text: string;
  kind:
    | "institution"
    | "profile"
    | "course"
    | "assignment"
    | "session"
    | "grade"
    | "notification"
    | "approval"
    | "portal";
};

export type CoachAction = { label: string; href: string };

export type GroundedCoachResult = AiAnswer & {
  suggestedActions: CoachAction[];
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

function uniqueFacts(facts: GroundedCoachFact[]) {
  return [...new Map(facts.map((fact) => [fact.id, fact])).values()];
}

function intentFor(question: string) {
  const normalized = question.toLowerCase();
  if (/grade|gpa|score|mark/.test(normalized)) return "grade" as const;
  if (/assignment|deadline|due|today|focus|priority/.test(normalized)) return "priority" as const;
  if (/schedule|calendar|class|join|session/.test(normalized)) return "schedule" as const;
  if (/course|section|teaching|roster/.test(normalized)) return "course" as const;
  if (/notification|message|inbox/.test(normalized)) return "notification" as const;
  if (/approval|operation|campus|admin/.test(normalized)) return "operations" as const;
  return "overview" as const;
}

function actionFor(role: string, intent: ReturnType<typeof intentFor>): CoachAction[] {
  const root = role === "registrar" ? "admin" : role;
  if (intent === "grade") {
    return [{ label: role === "student" ? "Open grades" : "Open gradebook", href: role === "student" ? "/student/grades" : "/instructor/gradebook" }];
  }
  if (intent === "priority") {
    return [{ label: role === "student" ? "Open assignments" : "Open home", href: role === "student" ? "/student/assignments" : `/${root}` }];
  }
  if (intent === "schedule") return [{ label: "Open calendar", href: `/${root}/calendar` }];
  if (intent === "course") return [{ label: "Open courses", href: role === "student" ? "/student/courses" : role === "instructor" ? "/instructor/sections" : `/${root}` }];
  if (intent === "notification") return [{ label: "Open notifications", href: `/${root}/notifications` }];
  if (intent === "operations" && (role === "admin" || role === "registrar")) {
    return [{ label: "Open approvals", href: "/admin/approvals" }];
  }
  return [{ label: "Open home", href: `/${root}` }];
}

export function groundedCoachAnswer(input: {
  role: string;
  question: string;
  facts: GroundedCoachFact[];
}): GroundedCoachResult {
  const facts = uniqueFacts(input.facts);
  const intent = intentFor(input.question);
  const kindsByIntent: Record<typeof intent, GroundedCoachFact["kind"][]> = {
    grade: ["grade", "course", "profile"],
    priority: ["assignment", "session", "notification", "course"],
    schedule: ["session", "assignment", "course"],
    course: ["course", "assignment", "session"],
    notification: ["notification", "portal"],
    operations: ["approval", "notification", "institution"],
    overview: ["profile", "course", "assignment", "portal", "institution"],
  };
  const selected = kindsByIntent[intent]
    .flatMap((kind) => facts.filter((fact) => fact.kind === kind))
    .slice(0, 5);
  const grounded = selected.length ? selected : facts.slice(0, 3);
  const intro =
    grounded.length === 1
      ? "I found one relevant campus record:"
      : `I found ${grounded.length} relevant campus records:`;
  const text = `${intro}\n${grounded.map((fact) => `- ${fact.text}`).join("\n")}\n\nI only used records available to your ${input.role} account.`;
  const answer = citeOrRefuse({
    text,
    tier: "read_only",
    sources: grounded.map(({ id, title, uri }) => ({ id, title, uri })),
  });
  return { ...answer, suggestedActions: actionFor(input.role, intent) };
}

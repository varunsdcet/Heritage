import type { AiAnswer, Citation, CoachAction, GroundedCoachFact, GroundedCoachResult } from "./types.js";

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
  if (/fee|tuition|balance|payment|document|tax/.test(normalized)) return "services" as const;
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
  if (intent === "schedule") return [{ label: "Open calendar", href: role === "student" ? "/student/calendar" : `/${root}/calendar` }];
  if (intent === "services") {
    return role === "student"
      ? [
          { label: "Student services", href: "/student/advising" },
          { label: "Fees", href: "/student/fees" },
        ]
      : [{ label: "Open home", href: `/${root}` }];
  }
  if (intent === "course") return [{ label: "Open courses", href: role === "student" ? "/student/courses" : role === "instructor" ? "/instructor/sections" : `/${root}` }];
  if (intent === "notification") return [{ label: "Open notifications", href: `/${root}/notifications` }];
  if (intent === "operations" && (role === "admin" || role === "registrar")) {
    return [{ label: "Open approvals", href: "/admin/approvals" }];
  }
  return [{ label: "Open home", href: `/${root}` }];
}

function proseLead(role: string, intent: ReturnType<typeof intentFor>, grounded: GroundedCoachFact[]) {
  if (!grounded.length) {
    return `I do not have enough ${role} records yet to answer that. Open your portal home and try again after your enrolments load.`;
  }
  if (intent === "priority") {
    return "Here is what deserves attention first based on your live campus records:";
  }
  if (intent === "grade") {
    return "Here is what your published grade records show:";
  }
  if (intent === "schedule") {
    return "Here is your upcoming class and deadline schedule:";
  }
  if (intent === "services") {
    return "Here is where to handle fees, documents, and student services:";
  }
  if (intent === "course") {
    return "Here is your current course picture:";
  }
  if (intent === "notification") {
    return "Here are the latest messages and notices I can see for you:";
  }
  if (intent === "operations") {
    return "Here is the current operations snapshot:";
  }
  return "Here is a short answer from your campus records:";
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
    services: ["portal", "profile", "course"],
    course: ["course", "assignment", "session"],
    notification: ["notification", "portal"],
    operations: ["approval", "notification", "institution"],
    overview: ["profile", "course", "assignment", "portal", "institution"],
  };
  const selected = kindsByIntent[intent]
    .flatMap((kind) => facts.filter((fact) => fact.kind === kind))
    .slice(0, 5);
  const grounded = selected.length ? selected : facts.slice(0, 4);
  const lines = grounded.map((fact, index) => `${index + 1}. ${fact.text}`);
  const nextStep =
    input.role === "student"
      ? intent === "priority"
        ? "Open Assignments to submit or check due work, or open Calendar for class join links."
        : intent === "grade"
          ? "Open Grades for the full published mark list, or Ask about a specific course."
          : "Use the suggested action below to jump straight into the matching student screen."
      : "Use the suggested action below to open the matching workspace screen.";
  const text = `${proseLead(input.role, intent, grounded)}\n\n${lines.join("\n")}\n\n${nextStep}`;
  const answer = citeOrRefuse({
    text,
    tier: "read_only",
    sources: grounded.map(({ id, title, uri }) => ({ id, title, uri })),
  });
  return { ...answer, suggestedActions: actionFor(input.role, intent) };
}

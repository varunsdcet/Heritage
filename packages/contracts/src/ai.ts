import { z } from "zod";
import { IsoDateTime, Uuid } from "./base.js";
import { RoleName } from "./entities.js";

export const CoachSource = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  uri: z.string().startsWith("/"),
});

export const CoachSuggestedAction = z.object({
  label: z.string().min(1),
  href: z.string().startsWith("/"),
});

export const AskCoachRequest = z.object({
  question: z.string().trim().min(3).max(2000),
  contextPath: z.string().startsWith("/").max(200).optional(),
});

export const CoachAnswer = z.object({
  interactionId: Uuid,
  role: RoleName,
  tier: z.literal("read_only"),
  answer: z.string().min(1),
  sources: z.array(CoachSource).min(1),
  suggestedActions: z.array(CoachSuggestedAction),
  createdAt: IsoDateTime,
});

export const CoachHistoryResponse = z.object({
  items: z.array(
    CoachAnswer.extend({
      question: z.string().min(1),
    }),
  ),
});

export type CoachSource = z.infer<typeof CoachSource>;
export type CoachSuggestedAction = z.infer<typeof CoachSuggestedAction>;
export type AskCoachRequest = z.infer<typeof AskCoachRequest>;
export type CoachAnswer = z.infer<typeof CoachAnswer>;
export type CoachHistoryResponse = z.infer<typeof CoachHistoryResponse>;

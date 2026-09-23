import samples from "@/data/ai-draft/samples.json";

export type AiDraftSlide = {
  number: number;
  heading: string;
  bullets: string[];
  narration: string;
};

export type AiDraftStoryboard = {
  title: string;
  estimated_duration_sec: number;
  slides: AiDraftSlide[];
};

export type AiDraftLesson = {
  id: string;
  topicId: string;
  topicTitle: string;
  title: string;
  minutes: number;
  contentType: string;
  order: number;
  seedContent: string;
  content: string;
  storyboard: AiDraftStoryboard;
};

export type AiDraftTopic = {
  id: string;
  title: string;
};

export const AI_DRAFT_TOPICS = samples.topics as AiDraftTopic[];
export const AI_DRAFT_LESSONS = samples.lessons as AiDraftLesson[];

export function getAiDraftLesson(id: string): AiDraftLesson | undefined {
  return AI_DRAFT_LESSONS.find((l) => l.id === id);
}

export function lessonsForTopic(topicId: string): AiDraftLesson[] {
  return AI_DRAFT_LESSONS.filter((l) => l.topicId === topicId).sort((a, b) => a.order - b.order);
}

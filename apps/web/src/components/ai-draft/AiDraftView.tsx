"use client";

import { useMemo, useState } from "react";
import {
  AI_DRAFT_LESSONS,
  AI_DRAFT_TOPICS,
  type AiDraftLesson,
  type AiDraftStoryboard,
  lessonsForTopic,
} from "@/lib/aiDraftSamples";
import { AiDraftVideoPlayer } from "@/components/ai-draft/AiDraftVideoPlayer";

type DraftState = {
  title: string;
  contentType: string;
  order: string;
  minutes: string;
  content: string;
  storyboard: AiDraftStoryboard | null;
  generated: boolean;
};

function blankDraft(lesson: AiDraftLesson): DraftState {
  return {
    title: lesson.title,
    contentType: lesson.contentType,
    order: String(lesson.order),
    minutes: "",
    content: lesson.seedContent || "",
    storyboard: null,
    generated: false,
  };
}

export function AiDraftView() {
  const [topicId, setTopicId] = useState(AI_DRAFT_TOPICS[0]?.id || "cab");
  const lessons = useMemo(() => lessonsForTopic(topicId), [topicId]);
  const [editing, setEditing] = useState<AiDraftLesson | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [busy, setBusy] = useState<"lesson" | "video" | "quiz" | null>(null);
  const [storyboardOpen, setStoryboardOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const openEdit = (lesson: AiDraftLesson) => {
    setEditing(lesson);
    setDraft(blankDraft(lesson));
    setStoryboardOpen(false);
    setVideoOpen(false);
    setSavedNote(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setDraft(null);
    setBusy(null);
    setStoryboardOpen(false);
  };

  const generateLesson = () => {
    if (!editing || !draft) return;
    setBusy("lesson");
    window.setTimeout(() => {
      setDraft({
        ...draft,
        content: editing.content,
        minutes: String(editing.minutes),
        contentType: "Text article",
        generated: true,
      });
      setBusy(null);
      setSavedNote("AI lesson plan applied to the editor (local sample — no API call).");
    }, 450);
  };

  const buildQuizHtml = (lesson: AiDraftLesson) => {
    const topic = lesson.topicTitle || "this topic";
    const title = lesson.title;
    return `<h2>Quiz — ${title}</h2>
<p>AI-generated formative quiz for <strong>${topic}</strong>. Mark the best answer for each question.</p>
<ol class="mh-ai-quiz">
  <li>
    <p><strong>Q1.</strong> What is the main learning focus of “${title}”?</p>
    <ul>
      <li>A) Memorizing unrelated dates only</li>
      <li>B) Applying core concepts from ${topic} to practical scenarios ✅</li>
      <li>C) Ignoring business impact</li>
      <li>D) Skipping review questions</li>
    </ul>
  </li>
  <li>
    <p><strong>Q2.</strong> Which action best shows comprehension of this lesson?</p>
    <ul>
      <li>A) Copying text without reflection</li>
      <li>B) Explaining one concept in your own words and giving a workplace example ✅</li>
      <li>C) Closing the lesson immediately</li>
      <li>D) Changing the topic title only</li>
    </ul>
  </li>
  <li>
    <p><strong>Q3.</strong> A short application task:</p>
    <ul>
      <li>A) List one risk and one mitigation step related to this lesson ✅</li>
      <li>B) Delete the lesson content</li>
      <li>C) Skip formative checks</li>
      <li>D) Avoid examples</li>
    </ul>
  </li>
  <li>
    <p><strong>Q4 (short answer).</strong> In 2–3 sentences, summarize how “${title}” connects to ${topic} for a diploma student.</p>
  </li>
</ol>
<p><em>Answer key: Q1 B · Q2 B · Q3 A · Q4 instructor-graded</em></p>`;
  };

  const generateQuiz = () => {
    if (!editing || !draft) return;
    setBusy("quiz");
    window.setTimeout(() => {
      setDraft({
        ...draft,
        title: draft.title.toLowerCase().includes("quiz") ? draft.title : `Quiz: ${draft.title}`,
        contentType: "Quiz",
        content: buildQuizHtml(editing),
        minutes: draft.minutes || "15",
        generated: true,
      });
      setBusy(null);
      setSavedNote("AI quiz draft created from this lesson (local sample — editable).");
    }, 500);
  };

  const convertToVideo = () => {
    if (!editing || !draft) return;
    setBusy("video");
    window.setTimeout(() => {
      setDraft({
        ...draft,
        storyboard: editing.storyboard,
        content: draft.content?.trim() ? draft.content : editing.content,
        minutes: draft.minutes || String(editing.minutes),
        generated: true,
      });
      setBusy(null);
      setStoryboardOpen(true);
    }, 550);
  };

  const saveStoryboard = () => {
    setStoryboardOpen(false);
    setSavedNote("Storyboard saved to lesson. Open Play video to watch slideshow + voice + 3D avatar.");
  };

  return (
    <div className="mh-ai-draft">
      <header className="mh-ai-draft__hero">
        <div>
          <p className="mh-ai-draft__kicker">Teacher · Curriculum AI</p>
          <h1>AI Draft</h1>
          <p className="mh-ai-draft__lede">
            Generate lesson plans, AI quizzes, and narrated slideshows with male/female 3D avatars.
            Samples are local — no external lesson AI API calls.
          </p>
        </div>
      </header>

      <div className="mh-ai-draft__topics" role="tablist" aria-label="Topics">
        {AI_DRAFT_TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={topicId === t.id}
            className={`mh-ai-draft__topic${topicId === t.id ? " is-active" : ""}`}
            onClick={() => setTopicId(t.id)}
          >
            {t.title}
          </button>
        ))}
      </div>

      <section className="mh-ai-draft__chapter" aria-label="Chapters">
        <h2>{AI_DRAFT_TOPICS.find((t) => t.id === topicId)?.title}</h2>
        <ul className="mh-ai-draft__lessons">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <div>
                <strong>{lesson.title}</strong>
                <span>
                  text · {lesson.minutes} min read
                </span>
              </div>
              <button type="button" className="mh-teacher-btn mh-teacher-btn--primary" onClick={() => openEdit(lesson)}>
                Edit lesson
              </button>
            </li>
          ))}
        </ul>
        {topicId === "hrm" ? (
          <p className="mh-ai-draft__hint">Introduction to HRM and Strategic HRM use the same hardcoded sample payloads (no API).</p>
        ) : null}
      </section>

      {editing && draft ? (
        <div className="mh-ai-draft-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-draft-edit-title">
          <div className="mh-ai-draft-modal">
            <header className="mh-ai-draft-modal__head">
              <h2 id="ai-draft-edit-title">Edit lesson plan</h2>
              <button type="button" className="mh-ai-draft-modal__x" onClick={closeEdit} aria-label="Close">
                ×
              </button>
            </header>

            <div className="mh-ai-draft-modal__fields">
              <label>
                Lesson title
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </label>
              <div className="mh-ai-draft-modal__row">
                <label>
                  Content type
                  <select
                    value={draft.contentType}
                    onChange={(e) => setDraft({ ...draft, contentType: e.target.value })}
                  >
                    <option>Text article</option>
                    <option>Quiz</option>
                    <option>Video lesson</option>
                    <option>PDF</option>
                  </select>
                </label>
                <label>
                  Order
                  <input
                    type="number"
                    value={draft.order}
                    onChange={(e) => setDraft({ ...draft, order: e.target.value })}
                  />
                </label>
                <label>
                  <span className="mh-ai-draft-modal__req">REQUIRED FOR DIPLOMA PROGRAMS</span>
                  Minutes allotted
                  <input
                    placeholder="e.g. 45"
                    value={draft.minutes}
                    onChange={(e) => setDraft({ ...draft, minutes: e.target.value })}
                  />
                </label>
              </div>
              <p className="mh-ai-draft-modal__help">
                Estimated focused study time for this lesson. The 60% chapter time-gate uses the sum of all lesson minutes within a
                chapter to determine when the next chapter unlocks for diploma students.
              </p>
            </div>

            <div className="mh-ai-draft-modal__editor-wrap">
              <div className="mh-ai-draft-modal__editor-head">
                <span>{draft.contentType === "Quiz" ? "Quiz content" : "Lesson plan content"}</span>
                {draft.storyboard ? (
                  <span className="mh-ai-draft-modal__story-badge">Video storyboard attached</span>
                ) : null}
              </div>
              <div className="mh-ai-draft-modal__toolbar" aria-hidden>
                <span>H2</span>
                <span>H3</span>
                <span>B</span>
                <span>I</span>
                <span>U</span>
                <span>•</span>
                <span>1.</span>
                <span>🔗</span>
                <span>🖼</span>
              </div>
              <div className="mh-ai-draft-modal__ai-row">
                <button type="button" className="mh-ai-draft-modal__ai" disabled={busy !== null} onClick={generateLesson}>
                  ✦ {busy === "lesson" ? "Generating…" : "AI: Generate lesson plan"}
                </button>
                <button type="button" className="mh-ai-draft-modal__ai" disabled={busy !== null} onClick={generateQuiz}>
                  ✦ {busy === "quiz" ? "Building quiz…" : "AI: Create quiz"}
                </button>
                <button type="button" className="mh-ai-draft-modal__ai" disabled={busy !== null} onClick={convertToVideo}>
                  ▣ {busy === "video" ? "Building storyboard…" : "AI: Convert to video"}
                </button>
                {draft.storyboard ? (
                  <button type="button" className="mh-teacher-btn" onClick={() => setVideoOpen(true)}>
                    Play video
                  </button>
                ) : null}
              </div>
              <div
                key={`${editing.id}-${draft.generated ? "gen" : "seed"}-${draft.contentType}-${draft.content.length}`}
                className="mh-ai-draft-modal__editor"
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: draft.content }}
                onBlur={(e) => setDraft({ ...draft, content: e.currentTarget.innerHTML })}
              />
              {savedNote ? <p className="mh-ai-draft-modal__note" role="status">{savedNote}</p> : null}
            </div>

            <footer className="mh-ai-draft-modal__foot">
              <button type="button" className="mh-teacher-btn" onClick={closeEdit}>
                Cancel
              </button>
              <button
                type="button"
                className="mh-teacher-btn mh-teacher-btn--primary"
                onClick={() => {
                  setSavedNote(
                    draft.contentType === "Quiz"
                      ? "Quiz saved locally for this AI Draft session."
                      : "Lesson plan saved locally for this AI Draft session.",
                  );
                }}
              >
                {draft.contentType === "Quiz" ? "Save quiz" : "Save lesson plan"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {storyboardOpen && draft?.storyboard ? (
        <div className="mh-ai-draft-overlay" role="dialog" aria-modal="true" aria-label="Video storyboard">
          <div className="mh-ai-draft-story">
            <header className="mh-ai-draft-story__head">
              <div>
                <p className="mh-ai-draft-story__meta">
                  <span>✦ AI generated</span>
                  <span>{Math.round(draft.storyboard.estimated_duration_sec / 60)} min</span>
                  <span>{draft.storyboard.slides.length} slides</span>
                </p>
                <h2>Video storyboard — {draft.storyboard.title}</h2>
              </div>
              <button type="button" className="mh-ai-draft-modal__x" onClick={() => setStoryboardOpen(false)} aria-label="Close">
                ×
              </button>
            </header>
            <div className="mh-ai-draft-story__slides">
              {draft.storyboard.slides.map((s) => (
                <article key={s.number} className="mh-ai-draft-story__slide">
                  <h3>
                    Slide {s.number}: {s.heading}
                  </h3>
                  <ul>
                    {s.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <p className="mh-ai-draft-story__narration">{s.narration}</p>
                </article>
              ))}
            </div>
            <footer className="mh-ai-draft-modal__foot">
              <button type="button" className="mh-teacher-btn" onClick={() => setStoryboardOpen(false)}>
                Discard
              </button>
              <button type="button" className="mh-teacher-btn mh-teacher-btn--primary" onClick={saveStoryboard}>
                Save storyboard to lesson
              </button>
              <button
                type="button"
                className="mh-teacher-btn mh-teacher-btn--primary"
                onClick={() => {
                  saveStoryboard();
                  setVideoOpen(true);
                }}
              >
                Play slideshow + avatar
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {videoOpen && draft?.storyboard ? (
        <AiDraftVideoPlayer storyboard={draft.storyboard} onClose={() => setVideoOpen(false)} />
      ) : null}

      <p className="mh-ai-draft__footer-meta">
        {AI_DRAFT_LESSONS.length} sample lessons ready · local drafts only
      </p>
    </div>
  );
}

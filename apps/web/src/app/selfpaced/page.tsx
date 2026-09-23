"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SelfpacedShell } from "@/components/selfpaced/SelfpacedShell";
import { getCurriculum } from "@/lib/selfpacedCurriculum";
import { SELFPACED_PROGRAMS, formatCad } from "@/lib/selfpacedPrograms";

const HIGHLIGHTS = [
  ["Expert curriculum", "Programs shaped by instructors and aligned to Canadian educational standards."],
  ["Branded certificate", "Complete your program to receive a verifiable, branded PDF certificate."],
  ["Learn in community", "Discuss lessons with peers and receive feedback from subject-matter experts."],
];

export default function SelfpacedHomePage() {
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("All subjects");
  const [level, setLevel] = useState("All levels");

  const subjects = useMemo(
    () => ["All subjects", ...Array.from(new Set(SELFPACED_PROGRAMS.map((p) => p.subject)))],
    [],
  );
  const levels = ["All levels", "Beginner", "Intermediate", "Advanced"];

  const filtered = SELFPACED_PROGRAMS.filter((p) => {
    const hay = `${p.title} ${p.blurb} ${p.subject}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (subject !== "All subjects" && p.subject !== subject) return false;
    if (level !== "All levels" && p.level !== level) return false;
    return true;
  });

  return (
    <SelfpacedShell>
      <section className="sp-premium">
        <div className="sp-premium__copy">
          <p className="sp-pill">16+ years of trusted education · Heritage Community College</p>
          <h1>
            A classical education,
            <br />
            <span>re-imagined for the modern learner.</span>
          </h1>
          <p className="sp-premium__lede">
            Enroll in expertly-crafted programs aligned with Canadian curriculum standards. Study at your own pace,
            earn a branded certificate, and advance your career — all under one storied name.
          </p>
          <div className="sp-hero__cta">
            <a href="#catalog" className="sp-btn sp-btn--primary">
              Browse Programs →
            </a>
            <button
              type="button"
              className="sp-btn sp-btn--ghost"
              onClick={() => window.dispatchEvent(new CustomEvent("sp-open-auth", { detail: "login" }))}
            >
              I have an account
            </button>
          </div>
        </div>
        <div className="sp-premium__visual">
          <div className="sp-premium__slab" aria-hidden />
          <img src="/brand/campus/hero.png" alt="Heritage Community College learners" />
        </div>
      </section>

      <section className="sp-how" id="about">
        <div className="sp-how__intro">
          <p className="sp-kicker sp-kicker--on-dark">Why Heritage eLearning</p>
          <h2>Expert curriculum. Branded certificate. Real progress.</h2>
        </div>
        <div className="sp-how__grid">
          {HIGHLIGHTS.map(([title, copy], i) => (
            <article key={title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sp-catalog" id="catalog">
        <p className="sp-kicker">Catalog</p>
        <h2>Current Programs</h2>

        <div className="sp-filters">
          <label className="sp-search">
            <span className="sp-search__icon" aria-hidden>
              ⌕
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, description, or subject…"
            />
          </label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject">
            {subjects.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level">
            {levels.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="sp-grid">
          {filtered.map((p) => (
            <Link key={p.id} href={`/selfpaced/programs/${p.slug}`} className="sp-card">
              <div className="sp-card__media">
                <img src={p.image} alt="" />
                <span className="sp-card__badge">{p.level}</span>
              </div>
              <div className="sp-card__body">
                <div className="sp-card__tags">
                  <span>{p.subject}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.blurb}</p>
                <p className="sp-card__meta">
                  {p.hours.toFixed(1)} hrs · {getCurriculum(p.slug).length || p.chapters} chapters
                </p>
                <p className="sp-card__price">
                  <strong>{formatCad(p.priceCad)}</strong>
                  <span> · domestic</span>
                </p>
                <span className="sp-card__link">View curriculum →</span>
              </div>
            </Link>
          ))}
        </div>
        {filtered.length === 0 ? <p className="sp-empty">No programs match your filters.</p> : null}
      </section>
    </SelfpacedShell>
  );
}

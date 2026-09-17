"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherSisShell } from "@/components/TeacherSisShell";
import {
  TEACHER_SCREENS,
  type TeacherBadgeTone,
  type TeacherScreenConfig,
} from "@/lib/teacherCatalog";
import { loadSession } from "@/lib/api";
import {
  TeacherLiveProvider,
  mergeTeacherLive,
  useTeacherLive,
  useTeacherLivePayload,
  useOptionalTeacherLive,
} from "@/lib/useTeacherSisLive";

function badgeClass(tone?: TeacherBadgeTone) {
  const t = tone || "active";
  const mapped =
    t === "review" || t === "warning"
      ? "is-warning"
      : t === "danger"
        ? "is-danger"
        : t === "info"
          ? "is-info"
          : t === "muted" || t === "draft"
            ? "is-muted"
            : t === "success"
              ? "is-success"
              : "is-active";
  return `mh-teacher-badge ${mapped}`;
}

/** Shared CTA — navigates when href is set, otherwise POSTs /instructor/sis/action. */
function ActionBtn({
  label,
  href,
  tone = "primary",
  rowKey,
  className,
}: {
  label: string;
  href?: string;
  tone?: "primary" | "secondary";
  rowKey?: string;
  className?: string;
}) {
  const router = useRouter();
  const live = useOptionalTeacherLive();
  return (
    <button
      type="button"
      className={className || `mh-teacher-btn mh-teacher-btn--${tone}`}
      disabled={live?.busy}
      onClick={() => {
        if (href) {
          router.push(href);
          return;
        }
        if (live?.runAction) {
          void live.runAction(label, rowKey);
          return;
        }
      }}
    >
      {label}
    </button>
  );
}

function TeacherLiveStatusBar() {
  const live = useOptionalTeacherLive();
  if (!live) return null;
  if (!live.loading && !live.error && !live.toast && !live.source) return null;
  return (
    <div
      className="mh-teacher-muted"
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: 12,
        fontSize: 13,
      }}
      aria-live="polite"
    >
      {live.loading ? <span>Loading live data…</span> : null}
      {!live.loading && live.source ? <span>Live · domain API</span> : null}
      {live.error ? <span style={{ color: "#b91c1c" }}>{live.error}</span> : null}
      {live.toast ? <span style={{ color: "#0f766e" }}>{live.toast}</span> : null}
    </div>
  );
}

function PageActions({ config }: { config: TeacherScreenConfig }) {
  if (!config.primaryAction && !config.secondaryAction) return null;
  return (
    <div className="mh-teacher-actions">
      {config.secondaryAction ? (
        <ActionBtn label={config.secondaryAction} href={config.secondaryActionHref} tone="secondary" />
      ) : null}
      {config.primaryAction ? <ActionBtn label={config.primaryAction} href={config.primaryActionHref} /> : null}
    </div>
  );
}

function PageHead({ config, badge }: { config: TeacherScreenConfig; badge?: string }) {
  return (
    <div className="mh-teacher-page-head">
      <div>
        <div className="mh-teacher-page-head__row">
          <h2>{config.title}</h2>
          {badge ? <span className={badgeClass("active")}>{badge}</span> : null}
        </div>
        <p>{config.subtitle}</p>
      </div>
      <PageActions config={config} />
    </div>
  );
}

/* ——— Existing archetype views ——— */

function DashboardView({ config }: { config: TeacherScreenConfig }) {
  const router = useRouter();
  const d = config.dashboard;
  if (!d) return null;
  return (
    <div className="mh-teacher-dash" data-figma-id={config.figmaId}>
      <section className="mh-teacher-dash__hero">
        <div className="mh-teacher-dash__hero-left">
          <img src="/brand/teacher/avatar-lg.png" alt="" width={64} height={64} className="mh-teacher-dash__hero-avatar" />
          <div>
            <h1 className="mh-teacher-dash__greeting">
              {d.greeting} {d.name}
            </h1>
            <p className="mh-teacher-dash__role">{d.meta}</p>
          </div>
        </div>
        <span className="mh-teacher-dash__status">{d.statusBadge}</span>
      </section>

      <div className="mh-teacher-dash__quick">
        {d.quickActions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`mh-teacher-dash__quick-btn${a.variant === "ai" ? " is-ai" : ""}`}
            onClick={() => router.push(a.href)}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="mh-teacher-dash__kpis">
        {(config.kpis || []).map((k) => (
          <div key={k.label} className="mh-teacher-dash__kpi">
            <div className="mh-teacher-dash__kpi-label">{k.label}</div>
            <div className="mh-teacher-dash__kpi-value">{k.value}</div>
            <div className="mh-teacher-dash__kpi-hint">{k.hint}</div>
          </div>
        ))}
      </div>

      <div className="mh-teacher-dash__grid">
        <div className="mh-teacher-dash__col-main">
          <section className="mh-teacher-card">
            <div className="mh-teacher-card__head">
              <h2>Today&apos;s Timetable</h2>
              <button type="button" className="mh-teacher-link" onClick={() => router.push("/instructor/calendar")}>
                Open calendar
              </button>
            </div>
            <div className="mh-teacher-timetable">
              {d.timetable.map((row) => (
                <div key={row.time + row.code} className="mh-teacher-timetable__row">
                  <div className="mh-teacher-timetable__time">{row.time}</div>
                  <div className="mh-teacher-timetable__body">
                    <strong>
                      {row.code} · {row.title}
                    </strong>
                    <span>{row.room}</span>
                  </div>
                  <span className={badgeClass(row.statusTone)}>{row.status}</span>
                  {row.action ? (
                    <button
                      type="button"
                      className="mh-teacher-timetable__launch"
                      onClick={() => row.href && router.push(row.href)}
                    >
                      {row.action}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="mh-teacher-card">
            <h2>Announcements</h2>
            <div className="mh-teacher-announcements">
              {d.announcements.map((a) => (
                <div key={a.title} className="mh-teacher-announcements__item">
                  <div className="mh-teacher-announcements__top">
                    <strong>{a.title}</strong>
                    <span>{a.when}</span>
                  </div>
                  <p>{a.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mh-teacher-dash__col-side">
          <section className="mh-teacher-card">
            <h2>Alerts</h2>
            <div className="mh-teacher-alerts">
              {d.alerts.map((a) => (
                <div key={a.title} className={`mh-teacher-alert mh-teacher-alert--${a.tone}`}>
                  <strong>{a.title}</strong>
                  <p>{a.body}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="mh-teacher-card">
            <h2>Office Hours</h2>
            <div className="mh-teacher-office">
              {d.officeHours.map((o) => (
                <div key={o.day + o.window} className="mh-teacher-office__row">
                  <strong>{o.day}</strong>
                  <span>{o.window}</span>
                  <span className="mh-teacher-muted">{o.mode}</span>
                  {o.remaining ? <em>{o.remaining}</em> : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ProfileBioView({ config }: { config: TeacherScreenConfig }) {
  const p = config.profileBio;
  if (!p) return null;
  const router = useRouter();
  return (
    <div className="mh-teacher-profile" data-figma-id={config.figmaId}>
      <aside className="mh-teacher-profile__card">
        <img src="/brand/teacher/avatar-lg.png" alt="" width={180} height={180} className="mh-teacher-profile__avatar" />
        <h2>{p.name}</h2>
        <p>
          {p.role} · {p.department}
        </p>
        <p className="mh-teacher-mono">STAFF_ID: {p.staffId}</p>
      </aside>
      <section className="mh-teacher-card mh-teacher-profile__main">
        <div className="mh-teacher-tabs">
          {p.tabs.map((t) => (
            <button
              key={t.href}
              type="button"
              className={`mh-teacher-tabs__item${t.active ? " is-active" : ""}`}
              onClick={() => router.push(t.href)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mh-teacher-section">
          <div className="mh-teacher-section__label">PERSONAL INFO</div>
          <div className="mh-teacher-fields">
            {p.personal.map((f) => (
              <label key={f.label}>
                <span>{f.label}</span>
                <div className="mh-teacher-field">{f.value}</div>
              </label>
            ))}
          </div>
        </div>
        <div className="mh-teacher-section">
          <div className="mh-teacher-section__label">ACADEMIC BACKGROUND</div>
          <div className="mh-teacher-fields">
            {p.academic.map((f) => (
              <label key={f.label}>
                <span>{f.label}</span>
                <div className="mh-teacher-field">{f.value}</div>
              </label>
            ))}
          </div>
        </div>
        <div className="mh-teacher-section">
          <div className="mh-teacher-section__label">SUBJECT EXPERTISE</div>
          <div className="mh-teacher-tags">
            {p.expertise.map((t) => (
              <span key={t} className="mh-teacher-tag">
                {t}
              </span>
            ))}
          </div>
        </div>
        <p className="mh-teacher-muted">{p.bio}</p>
        <PageActions config={config} />
      </section>
    </div>
  );
}

function ProfileTopicsView({ config }: { config: TeacherScreenConfig }) {
  const p = config.profileTopics;
  if (!p) return null;
  const router = useRouter();
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <div className="mh-teacher-tabs">
        {p.tabs.map((t) => (
          <button
            key={t.href}
            type="button"
            className={`mh-teacher-tabs__item${t.active ? " is-active" : ""}`}
            onClick={() => router.push(t.href)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <section className="mh-teacher-card">
        <h2>Teaching Topics</h2>
        <div className="mh-teacher-tags">
          {p.teaching.map((t) => (
            <span key={t} className="mh-teacher-chip">
              {t}
            </span>
          ))}
        </div>
      </section>
      <section className="mh-teacher-card">
        <h2>Research</h2>
        <div className="mh-teacher-tags">
          {p.research.map((t) => (
            <span key={t} className="mh-teacher-chip">
              {t}
            </span>
          ))}
        </div>
      </section>
      <section className="mh-teacher-card">
        <h2>Certifications</h2>
        <div className="mh-teacher-list">
          {p.certifications.map((c) => (
            <div key={c.name} className="mh-teacher-list__item">
              <div>
                <strong>{c.name}</strong>
                <span>
                  {c.issuer} · {c.year}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <PageActions config={config} />
    </div>
  );
}

function AvailabilityView({ config }: { config: TeacherScreenConfig }) {
  const a = config.availability;
  if (!a) return null;
  const router = useRouter();
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-tabs">
        {a.tabs.map((t) => (
          <button
            key={t.href}
            type="button"
            className={`mh-teacher-tabs__item${t.active ? " is-active" : ""}`}
            onClick={() => router.push(t.href)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <section className="mh-teacher-card">
        <div className="mh-teacher-list">
          {a.slots.map((s) => (
            <div key={s.day + s.start} className="mh-teacher-list__item">
              <div>
                <strong>{s.day}</strong>
                <span>
                  {s.start}–{s.end} · {s.mode} · {s.location}
                </span>
              </div>
            </div>
          ))}
        </div>
        {a.note ? <p className="mh-teacher-muted">{a.note}</p> : null}
      </section>
    </div>
  );
}

function CompensationView({ config }: { config: TeacherScreenConfig }) {
  const c = config.compensation;
  if (!c) return null;
  const router = useRouter();
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-tabs">
        {c.tabs.map((t) => (
          <button
            key={t.href}
            type="button"
            className={`mh-teacher-tabs__item${t.active ? " is-active" : ""}`}
            onClick={() => router.push(t.href)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mh-teacher-dash__kpis">
        {c.summary.map((s) => (
          <div key={s.label} className="mh-teacher-dash__kpi">
            <div className="mh-teacher-dash__kpi-label">{s.label}</div>
            <div className="mh-teacher-dash__kpi-value" style={{ fontSize: 20 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
      <section className="mh-teacher-card">
        <h2>Pay Periods</h2>
        <div className="mh-teacher-list">
          {c.payPeriods.map((p) => (
            <div key={p.period} className="mh-teacher-list__item">
              <div>
                <strong>{p.period}</strong>
                <span>{p.amount}</span>
              </div>
              <span className={badgeClass(p.tone)}>{p.status}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="mh-teacher-card">
        <h2>Contracts</h2>
        <div className="mh-teacher-list">
          {c.contracts.map((x) => (
            <div key={x.title} className="mh-teacher-list__item">
              <div>
                <strong>{x.title}</strong>
                <span>{x.detail}</span>
              </div>
              <span className={badgeClass("info")}>{x.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ScheduleView({ config }: { config: TeacherScreenConfig }) {
  const s = config.schedule;
  if (!s) return null;
  const router = useRouter();
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-tabs">
        {s.tabs.map((t) => (
          <button
            key={t.href}
            type="button"
            className={`mh-teacher-tabs__item${t.active ? " is-active" : ""}`}
            onClick={() => router.push(t.href)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {s.weeks.map((w) => (
        <section key={w.label} className="mh-teacher-card">
          <h2>{w.label}</h2>
          <div className="mh-teacher-list">
            {w.entries.map((e) => (
              <div key={e.day + e.time + e.course} className="mh-teacher-list__item">
                <div>
                  <strong>
                    {e.day} · {e.time}
                  </strong>
                  <span>
                    {e.course} · {e.room}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SettingsView({ config }: { config: TeacherScreenConfig }) {
  const s = config.settings;
  if (!s) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      {s.groups.map((g) => (
        <section key={g.title} className="mh-teacher-card">
          <h2>{g.title}</h2>
          <div className="mh-teacher-fields">
            {g.fields.map((f) => (
              <label key={f.label}>
                <span>{f.label}</span>
                <div className="mh-teacher-field">{f.value}</div>
                {f.hint ? <em className="mh-teacher-muted">{f.hint}</em> : null}
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SecurityView({ config }: { config: TeacherScreenConfig }) {
  const s = config.security;
  if (!s) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <section className="mh-teacher-card">
        <h2>Multi-factor Authentication</h2>
        <span className={badgeClass(s.mfaEnabled ? "success" : "danger")}>
          {s.mfaEnabled ? "Enabled" : "Disabled"}
        </span>
      </section>
      <section className="mh-teacher-card">
        <h2>Active Sessions</h2>
        <div className="mh-teacher-list">
          {s.sessions.map((x) => (
            <div key={x.device} className="mh-teacher-list__item">
              <div>
                <strong>{x.device}</strong>
                <span>
                  {x.location} · {x.lastActive}
                </span>
              </div>
              {x.current ? <span className={badgeClass("active")}>Current</span> : null}
            </div>
          ))}
        </div>
      </section>
      <section className="mh-teacher-card">
        <h2>Recent Activity</h2>
        <div className="mh-teacher-list">
          {s.recentActivity.map((x) => (
            <div key={x.event + x.when} className="mh-teacher-list__item">
              <div>
                <strong>{x.event}</strong>
                <span>{x.when}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AccomplishmentsView({ config }: { config: TeacherScreenConfig }) {
  const a = config.accomplishments;
  if (!a) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-dash__kpis">
        {a.stats.map((s) => (
          <div key={s.label} className="mh-teacher-dash__kpi">
            <div className="mh-teacher-dash__kpi-label">{s.label}</div>
            <div className="mh-teacher-dash__kpi-value">{s.value}</div>
          </div>
        ))}
      </div>
      <section className="mh-teacher-card">
        <div className="mh-teacher-list">
          {a.items.map((i) => (
            <div key={i.title} className="mh-teacher-list__item">
              <div>
                <strong>{i.title}</strong>
                <span>
                  {i.detail} · {i.year}
                </span>
              </div>
              {i.tone ? <span className={badgeClass(i.tone)}>{i.year}</span> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CourseListView({ config }: { config: TeacherScreenConfig }) {
  const cl = config.courseList;
  const router = useRouter();
  if (config.archetype === "cards" && config.cards) {
    return (
      <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
        <PageHead config={config} />
        <div className="mh-teacher-card-grid">
          {config.cards.items.map((item) => (
            <button
              key={item.title}
              type="button"
              className="mh-teacher-card mh-teacher-card--interactive"
              onClick={() => item.href && router.push(item.href)}
            >
              <div className="mh-teacher-card__head">
                <h3>{item.title}</h3>
                {item.badge ? <span className={badgeClass(item.badgeTone)}>{item.badge}</span> : null}
              </div>
              <p>{item.subtitle}</p>
              <span className="mh-teacher-muted">{item.meta}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (!cl) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-filters">
        {cl.filters?.map((f) => (
          <span key={f} className="mh-teacher-chip">
            {f}
          </span>
        ))}
      </div>
      <div className="mh-teacher-card-grid">
        {(cl.courses ?? []).map((c) => (
          <button
            key={c.code}
            type="button"
            className="mh-teacher-card mh-teacher-card--interactive"
            onClick={() => router.push(c.href)}
          >
            <div className="mh-teacher-card__head">
              <h3>
                {c.code} · {c.title}
              </h3>
              <span className={badgeClass(c.statusTone)}>{c.status}</span>
            </div>
            <p>
              {c.schedule} · {c.room}
            </p>
            <span className="mh-teacher-muted">
              {c.term} · {c.enrolled}/{c.capacity} enrolled
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CourseDetailView({ config }: { config: TeacherScreenConfig }) {
  const c = config.courseDetail;
  const [tab, setTab] = useState(c?.activeTab || c?.tabs[0] || "Overview");
  if (!c) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} badge={c.status} />
      <p className="mh-teacher-muted">{c.meta}</p>
      <div className="mh-teacher-tabs">
        {c.tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`mh-teacher-tabs__item${tab === t ? " is-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="mh-teacher-card">
        <h2>Overview</h2>
        <div className="mh-teacher-fields">
          {c.overview.map((f) => (
            <label key={f.label}>
              <span>{f.label}</span>
              <div className="mh-teacher-field">{f.value}</div>
            </label>
          ))}
        </div>
      </section>
      <section className="mh-teacher-card">
        <h2>Modules</h2>
        <div className="mh-teacher-list">
          {c.modules.map((m) => (
            <div key={m.title} className="mh-teacher-list__item">
              <div>
                <strong>{m.title}</strong>
                <span>{m.items} items</span>
              </div>
              <span className={badgeClass("info")}>{m.status}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="mh-teacher-card">
        <h2>Teaching Team</h2>
        <div className="mh-teacher-list">
          {c.team.map((t) => (
            <div key={t.name} className="mh-teacher-list__item">
              <div>
                <strong>{t.name}</strong>
                <span>{t.role}</span>
              </div>
              <span className="mh-teacher__avatar mh-teacher__avatar--sm">{t.initials}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CourseMgmtView({ config }: { config: TeacherScreenConfig }) {
  const cm = config.courseMgmt;
  const router = useRouter();
  if (!cm) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-card-grid">
        {cm.tools.map((t) => (
          <button
            key={t.title}
            type="button"
            className="mh-teacher-card mh-teacher-card--interactive"
            onClick={() => router.push(t.href)}
          >
            <div className="mh-teacher-card__head">
              <h3>{t.title}</h3>
              {t.badge ? <span className={badgeClass("review")}>{t.badge}</span> : null}
            </div>
            <p>{t.detail}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function AnnouncementsView({ config }: { config: TeacherScreenConfig }) {
  const a = config.announcements;
  const live = useOptionalTeacherLive();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  if (!a) {
    return (
      <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
        <PageHead config={config} />
        <p className="mh-teacher-muted">No announcement workspace available yet.</p>
      </div>
    );
  }
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <p className="mh-teacher-muted">{a.course}</p>
      <section className="mh-teacher-card">
        <h2>Compose announcement</h2>
        <div className="mh-teacher-fields">
          <label>
            <span>Title</span>
            <input
              className="mh-teacher-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
            />
          </label>
          <label>
            <span>Body</span>
            <textarea
              className="mh-teacher-field mh-teacher-field--tall"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message for enrolled students"
              rows={4}
            />
          </label>
          <label>
            <span>Audience</span>
            <div className="mh-teacher-field">All enrolled students</div>
          </label>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            type="button"
            className="mh-teacher-btn mh-teacher-btn--primary"
            disabled={live?.busy || !title.trim() || !body.trim()}
            onClick={() => {
              void (async () => {
                await live?.runAction?.(
                  "Publish announcement",
                  JSON.stringify({ title: title.trim(), body: body.trim() }),
                );
                setTitle("");
                setBody("");
              })();
            }}
          >
            Publish announcement
          </button>
        </div>
      </section>
      <section className="mh-teacher-card">
        <h2>Published posts</h2>
        {(a.posts ?? []).length === 0 ? (
          <p className="mh-teacher-muted">No announcements published yet.</p>
        ) : (
          <div className="mh-teacher-announcements">
            {a.posts.map((p, i) => (
              <div key={`${p.title}-${p.when}-${i}`} className="mh-teacher-announcements__item">
                <div className="mh-teacher-announcements__top">
                  <strong>
                    {p.pinned ? "📌 " : ""}
                    {p.title}
                  </strong>
                  <span>{p.when}</span>
                </div>
                <p>{p.body}</p>
                <span className="mh-teacher-muted">{p.audience}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function VersionEditorView({ config }: { config: TeacherScreenConfig }) {
  const v = config.versionEditor;
  if (!v) return null;
  return (
    <div className="mh-teacher-studio-editor" data-figma-id={config.figmaId}>
      <PageHead config={config} badge={v.version} />
      <div className="mh-teacher-banner">{v.notice}</div>
      <div className="mh-teacher-split">
        <aside className="mh-teacher-card">
          <h2>Outline · {v.course}</h2>
          {v.outline.map((n) => (
            <div key={n.id} className="mh-teacher-outline-node">
              <strong>{n.label}</strong>
              {(n.children || []).map((c) => (
                <div key={c} className="mh-teacher-outline-child">
                  {c}
                </div>
              ))}
            </div>
          ))}
        </aside>
        <section className="mh-teacher-card">
          <h2>{v.editor.title}</h2>
          <p>{v.editor.body}</p>
          <span className="mh-teacher-muted">{v.editor.wordCount}</span>
          <h3>Versions</h3>
          <div className="mh-teacher-list">
            {v.versions.map((x) => (
              <div key={x.label} className="mh-teacher-list__item">
                <div>
                  <strong>{x.label}</strong>
                  <span>
                    {x.when} · {x.author}
                  </span>
                </div>
                {x.current ? <span className={badgeClass("active")}>Current</span> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function EvaluationsView({ config }: { config: TeacherScreenConfig }) {
  const e = config.evaluations;
  if (!e) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-dash__kpis">
        {e.summary.map((s) => (
          <div key={s.label} className="mh-teacher-dash__kpi">
            <div className="mh-teacher-dash__kpi-label">{s.label}</div>
            <div className="mh-teacher-dash__kpi-value">{s.value}</div>
            <div className="mh-teacher-dash__kpi-hint">{s.hint}</div>
          </div>
        ))}
      </div>
      <section className="mh-teacher-card">
        <h2>Student Comments</h2>
        <div className="mh-teacher-list">
          {e.comments.map((c) => (
            <div key={c.text} className="mh-teacher-list__item">
              <div>
                <strong>{c.text}</strong>
                <span>
                  {c.term} · Rating {c.rating}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RepositoryView({ config }: { config: TeacherScreenConfig }) {
  const r = config.repository;
  if (!r) return null;
  return (
    <div className="mh-teacher-split" data-figma-id={config.figmaId}>
      <aside className="mh-teacher-card">
        <h2>Folders</h2>
        <div className="mh-teacher-list">
          {r.folders.map((f) => (
            <div key={f.name} className="mh-teacher-list__item">
              <div>
                <strong>{f.name}</strong>
                <span>
                  {f.files} files · {f.updated}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <section className="mh-teacher-card">
        <PageHead config={config} />
        <TableBlock config={config} />
        <h3>Recent Files</h3>
        <div className="mh-teacher-list">
          {r.files.map((f) => (
            <div key={f.name} className="mh-teacher-list__item">
              <div>
                <strong>{f.name}</strong>
                <span>
                  {f.type} · {f.updated}
                </span>
              </div>
              <span className="mh-teacher-muted">{f.size}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PendingSchedulesView({ config }: { config: TeacherScreenConfig }) {
  const p = config.pendingSchedules;
  if (!p) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-list">
        {p.requests.map((r) => (
          <div key={r.course} className="mh-teacher-card mh-teacher-list__item">
            <div>
              <strong>{r.course}</strong>
              <span>
                Requested {r.requested} · {r.proposer}
              </span>
            </div>
            <span className={badgeClass(r.tone)}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CourseHistoryView({ config }: { config: TeacherScreenConfig }) {
  const h = config.courseHistory;
  if (!h) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      {h.terms.map((t) => (
        <section key={t.term} className="mh-teacher-card">
          <h2>{t.term}</h2>
          <div className="mh-teacher-list">
            {t.courses.map((c) => (
              <div key={c.code} className="mh-teacher-list__item">
                <div>
                  <strong>
                    {c.code} · {c.title}
                  </strong>
                  <span>
                    Enrollment {c.enrollment} · Avg eval {c.avgEval}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TableBlock({ config }: { config: TeacherScreenConfig }) {
  const router = useRouter();
  const cols = config.columns || [];
  if (!cols.length) return null;
  return (
    <section className="mh-teacher-card">
      <div className="mh-teacher-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>{config.title}</h2>
          {config.countLabel ? <p className="mh-teacher-muted">{config.countLabel}</p> : null}
        </div>
        <PageActions config={config} />
      </div>
      <div
        className="mh-teacher-table"
        style={{ gridTemplateColumns: config.columnTemplate || `repeat(${cols.length}, 1fr)` }}
      >
        <div className="mh-teacher-table__head">
          {cols.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        {(config.rows || []).map((r, i) => (
          <button
            key={i}
            type="button"
            className="mh-teacher-table__row mh-teacher-table__row--btn"
            onClick={() => r.href && router.push(r.href)}
          >
            {r.cells.map((cell, j) => (
              <span key={j}>
                {j === r.cells.length - 1 && r.badge ? <span className={badgeClass(r.badgeTone)}>{r.badge}</span> : cell}
              </span>
            ))}
          </button>
        ))}
      </div>
    </section>
  );
}

function FormView({ config }: { config: TeacherScreenConfig }) {
  const f = config.form;
  const live = useOptionalTeacherLive();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of f?.groups ?? []) {
      for (const field of g.fields) init[field.label] = field.value;
    }
    return init;
  });
  useEffect(() => {
    const init: Record<string, string> = {};
    for (const g of f?.groups ?? []) {
      for (const field of g.fields) init[field.label] = field.value;
    }
    setValues(init);
  }, [f]);
  if (!f) {
    return (
      <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
        <PageHead config={config} />
        <p className="mh-teacher-muted">No form fields available for this screen.</p>
      </div>
    );
  }
  const courseName = values["Course Name"] || values["Course Number"] || "";
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      {f.groups.map((g) => (
        <section key={g.title} className="mh-teacher-card">
          <h2>{g.title}</h2>
          <div className="mh-teacher-fields">
            {g.fields.map((field) => (
              <label key={field.label}>
                <span>{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea
                    className="mh-teacher-field mh-teacher-field--tall"
                    value={values[field.label] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.label]: e.target.value }))}
                    rows={4}
                  />
                ) : (
                  <input
                    className="mh-teacher-field"
                    type={field.type === "number" ? "text" : "text"}
                    value={values[field.label] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.label]: e.target.value }))}
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        {config.secondaryAction ? (
          <ActionBtn label={config.secondaryAction} tone="secondary" href={config.secondaryActionHref} />
        ) : null}
        <button
          type="button"
          className="mh-teacher-btn mh-teacher-btn--primary"
          disabled={live?.busy || !courseName.trim()}
          onClick={() => void live?.runAction?.(f.submitLabel || config.primaryAction || "Save Course", courseName.trim())}
        >
          {f.submitLabel || config.primaryAction || "Save Course"}
        </button>
      </div>
    </div>
  );
}

function SplitPaneView({ config }: { config: TeacherScreenConfig }) {
  const s = config.splitPane;
  if (!s) return null;
  return (
    <div className="mh-teacher-split" data-figma-id={config.figmaId}>
      <aside className="mh-teacher-card">
        <h2>{s.leftTitle}</h2>
        <div className="mh-teacher-list">
          {s.leftItems.map((i) => (
            <div key={i.label} className={`mh-teacher-list__item${i.active ? " is-active" : ""}`}>
              <div>
                <strong>{i.label}</strong>
                <span>{i.meta}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <section className="mh-teacher-card">
        <PageHead config={config} />
        <h2>{s.rightTitle}</h2>
        <div className="mh-teacher-fields">
          {s.rightFields.map((f) => (
            <label key={f.label}>
              <span>{f.label}</span>
              <div className="mh-teacher-field">{f.value}</div>
            </label>
          ))}
        </div>
        {s.resources ? (
          <div className="mh-teacher-list">
            {s.resources.map((r) => (
              <div key={r.name} className="mh-teacher-list__item">
                <div>
                  <strong>{r.name}</strong>
                  <span>{r.type}</span>
                </div>
                <span className="mh-teacher-muted">{r.size}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function LecturesView({ config }: { config: TeacherScreenConfig }) {
  const l = config.lectures;
  const router = useRouter();
  if (!l) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <p className="mh-teacher-muted">{l.course}</p>
      <div className="mh-teacher-list">
        {l.sessions.map((s) => (
          <div key={s.title} className="mh-teacher-card mh-teacher-list__item">
            <div>
              <strong>{s.title}</strong>
              <span>
                {s.when} · {s.duration}
              </span>
            </div>
            <span className={badgeClass(s.tone)}>{s.status}</span>
            {s.href ? (
              <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary" onClick={() => router.push(s.href!)}>
                Review
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function LectureReviewView({ config }: { config: TeacherScreenConfig }) {
  const l = config.lectureReview;
  if (!l) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <p className="mh-teacher-muted">{l.meta}</p>
      <section className="mh-teacher-card">
        <h2>{l.title}</h2>
        <p>{l.transcript}</p>
      </section>
      <section className="mh-teacher-card">
        <h2>Highlights</h2>
        <ul>
          {l.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <p className="mh-teacher-muted">{l.aiNotes}</p>
      </section>
    </div>
  );
}

function LabSessionView({ config }: { config: TeacherScreenConfig }) {
  const l = config.labSession;
  if (!l) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <p className="mh-teacher-muted">{l.course}</p>
      <div className="mh-teacher-list">
        {l.labs.map((lab) => (
          <div key={lab.title} className="mh-teacher-card mh-teacher-list__item">
            <div>
              <strong>{lab.title}</strong>
              <span>
                {lab.when} · {lab.room} · {lab.capacity}
              </span>
            </div>
            <span className={badgeClass(lab.tone)}>{lab.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovalView({ config }: { config: TeacherScreenConfig }) {
  const a = config.approval;
  if (!a) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <p className="mh-teacher-muted">{a.course}</p>
      <div className="mh-teacher-stepper">
        {a.steps.map((s) => (
          <div key={s.label} className={`mh-teacher-stepper__step is-${s.state}`}>
            <span className="mh-teacher-stepper__dot" />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="mh-teacher-split">
        <section className="mh-teacher-card">
          <h2>Summary</h2>
          <div className="mh-teacher-fields">
            {a.summary.map((f) => (
              <label key={f.label}>
                <span>{f.label}</span>
                <div className="mh-teacher-field">{f.value}</div>
              </label>
            ))}
          </div>
        </section>
        <section className="mh-teacher-card">
          <h2>Reviewers</h2>
          <div className="mh-teacher-list">
            {a.reviewers.map((r) => (
              <div key={r.name} className="mh-teacher-list__item">
                <div>
                  <strong>{r.name}</strong>
                  <span>{r.role}</span>
                </div>
                <span className={badgeClass("info")}>{r.status}</span>
              </div>
            ))}
          </div>
          <h3>Comments</h3>
          {a.comments.map((c) => (
            <div key={c.author + c.when} className="mh-teacher-announcements__item">
              <div className="mh-teacher-announcements__top">
                <strong>{c.author}</strong>
                <span>{c.when}</span>
              </div>
              <p>{c.body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function ModalView({ config }: { config: TeacherScreenConfig }) {
  const m = config.modal;
  const router = useRouter();
  if (!m) return null;
  return (
    <div className="mh-teacher-modal-backdrop" data-figma-id={config.figmaId}>
      <div className="mh-teacher-card mh-teacher-modal">
        <h2>{m.title}</h2>
        <p>{m.description}</p>
        <div className="mh-teacher-fields">
          {m.fields.map((f) => (
            <label key={f.label}>
              <span>{f.label}</span>
              <div className="mh-teacher-field">{f.value}</div>
            </label>
          ))}
        </div>
        <div className="mh-teacher-actions">
          <ActionBtn label={m.cancelLabel} href={m.backdropHref} tone="secondary" />
          <ActionBtn label={m.confirmLabel} href={m.backdropHref || config.activeHref} />
        </div>
        <button type="button" className="mh-teacher-link" onClick={() => m.backdropHref && router.push(m.backdropHref)}>
          Close
        </button>
      </div>
    </div>
  );
}

/* ——— New Figma-parity screens ——— */

function AiStudioView({ config }: { config: TeacherScreenConfig }) {
  const data = config.aiStudio;
  const [tab, setTab] = useState(data?.activeTab || "Sources");
  if (!data) return null;
  return (
    <div className="mh-teacher-studio-hero" data-figma-id={config.figmaId}>
      <section className="mh-teacher-card mh-teacher-studio-hero__banner">
        <div>
          <div className="mh-teacher-section__label">
            <img src="/brand/icons/sparkle.svg" alt="" width={16} height={16} />
            {data.eyebrow}
          </div>
          <h1>{data.courseTitle}</h1>
          <p className="mh-teacher-muted">{config.subtitle}</p>
        </div>
        <PageActions config={config} />
      </section>

      <div className="mh-teacher-split">
        <aside className="mh-teacher-drafts">
          <h2>Active Drafts</h2>
          {data.drafts.map((d) => (
            <div key={d.version} className="mh-teacher-card mh-teacher-drafts__item">
              <div className="mh-teacher-drafts__top">
                <strong>{d.version}</strong>
                <span className={badgeClass(d.tone)}>{d.status}</span>
              </div>
              {d.detail ? <p className="mh-teacher-muted">{d.detail}</p> : null}
            </div>
          ))}
        </aside>

        <section className="mh-teacher-card">
          <div className="mh-teacher-tabs">
            {data.tabs.map((t) => (
              <button
                key={t}
                type="button"
                className={`mh-teacher-tabs__item${tab === t ? " is-active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "Sources" ? (
            <div className="mh-teacher-sources">
              <h3>Active Knowledge Graph Sources</h3>
              {data.sources.map((s) => (
                <div key={s.name} className="mh-teacher-sources__row">
                  <span>{s.name}</span>
                  <strong className="mh-teacher-sources__status">{s.status}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mh-teacher-muted">{tab} workspace — switch to Sources for the knowledge graph.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function StudioGenerationView({ config }: { config: TeacherScreenConfig }) {
  const data = config.studioGeneration;
  if (!data) return null;
  return (
    <div className="mh-teacher-gen" data-figma-id={config.figmaId}>
      <div className="mh-teacher-page-head">
        <div>
          <div className="mh-teacher-page-head__row">
            <h1>{data.wizardTitle}</h1>
            {data.badge ? <span className={badgeClass("info")}>{data.badge}</span> : null}
          </div>
          <p className="mh-teacher-muted">{config.subtitle}</p>
        </div>
      </div>
      <section className="mh-teacher-card">
        <div className="mh-teacher-stepper">
          {data.steps.map((s, i) => (
            <div key={s.label} className={`mh-teacher-stepper__step is-${s.state}`}>
              <span className="mh-teacher-stepper__dot">
                {s.state === "done" ? "✓" : String(i + 1)}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mh-teacher-split">
        <aside className="mh-teacher-card mh-teacher-sources">
          <h2>Studio Progress</h2>
          <div className="mh-teacher-progress">
            <div className="mh-teacher-progress__meta">
              <strong>{data.progressLabel}</strong>
              <span>{data.progressPct}% Completed</span>
            </div>
            <div className="mh-teacher-progress__track">
              <div className="mh-teacher-progress__fill" style={{ width: `${data.progressPct}%` }} />
            </div>
          </div>
          <h3 className="mh-teacher-section__label">Active Sources</h3>
          {data.sources.map((s) => (
            <div key={s} className="mh-teacher-sources__row">
              <img src="/brand/icons/file-text.svg" alt="" width={14} height={14} />
              <span>{s}</span>
            </div>
          ))}
        </aside>
        <section className="mh-teacher-card mh-teacher-gen-cards">
          <div className="mh-teacher-card__head">
            <h2>Generated Syllabus Components</h2>
            <span className={badgeClass("info")}>Real-time Synthesis</span>
          </div>
          {data.cards.map((c) => (
            <article key={c.kind} className="mh-teacher-gen-card">
              <div className="mh-teacher-gen-card__top">
                <span className="mh-teacher-gen-card__kind">{c.kind}</span>
                {c.drafted ? <span className="mh-teacher-muted">{c.drafted}</span> : null}
              </div>
              {c.title ? <h3>{c.title}</h3> : null}
              {c.body ? <p>{c.body}</p> : null}
              <div className="mh-teacher-gen-card__cites">
                {c.citations.map((cite) => (
                  <div key={cite} className="mh-teacher-gen-card__cite">
                    <img src="/brand/icons/school.svg" alt="" width={14} height={14} />
                    <span>{cite}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

function OutcomeMappingView({ config }: { config: TeacherScreenConfig }) {
  const data = config.outcomeMapping;
  if (!data) return null;
  return (
    <div className="mh-teacher-outcomes" data-figma-id={config.figmaId}>
      <PageHead config={config} badge="Workspace" />
      <div className="mh-teacher-split">
        <aside className="mh-teacher-card">
          <h2>Syllabus Outcomes</h2>
          {data.clos.map((c) => (
            <div key={c.id} className="mh-teacher-outcomes__clo">
              <div className="mh-teacher-card__head">
                <strong className="mh-teacher-outcomes__id">{c.id}</strong>
                <span className="mh-teacher-muted">Coverage</span>
              </div>
              <p>{c.label}</p>
              <div className="mh-teacher-progress__track">
                <div className="mh-teacher-progress__fill" style={{ width: `${c.coverage}%` }} />
              </div>
              <span className="mh-teacher-muted mh-teacher-outcomes__pct">{c.coverage}% mapped</span>
            </div>
          ))}
        </aside>
        <section className="mh-teacher-card">
          <div className="mh-teacher-card__head">
            <h2>Bloom&apos;s Taxonomy Map</h2>
            <span className="mh-teacher-muted">Drag outcome tags into cognitive level cells below</span>
          </div>
          <div className="mh-teacher-outcomes__bloom">
            {data.bloomRows.map((row) => {
              const tags = row.tags ?? row.cells?.flatMap((cell) => cell.tags) ?? [];
              return (
                <div key={row.level} className="mh-teacher-outcomes__bloom-row">
                  <div className="mh-teacher-outcomes__bloom-label">
                    <strong>{row.level}</strong>
                    {row.verb ? <span className="mh-teacher-muted">{row.verb}</span> : null}
                  </div>
                  <div className="mh-teacher-dropzone mh-teacher-outcomes__drop">
                    {tags.length ? (
                      tags.map((tag) => (
                        <span key={tag} className="mh-teacher-chip">
                          {tag}
                          <span aria-hidden>×</span>
                        </span>
                      ))
                    ) : (
                      <span className="mh-teacher-muted">No mapped outcomes. Drop here.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function QuestionGeneratorView({ config }: { config: TeacherScreenConfig }) {
  const data = config.questionGenerator;
  const [selected, setSelected] = useState<string[]>(() => data?.questions.map((q) => q.id) || []);
  if (!data) return null;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="mh-teacher-questions" data-figma-id={config.figmaId}>
      <div className="mh-teacher-page-head">
        <div>
          <div className="mh-teacher-page-head__row">
            <h2>{config.title}</h2>
            <span className={badgeClass("info")}>Generator Module</span>
          </div>
          <p>{config.subtitle}</p>
        </div>
      </div>
      <div className="mh-teacher-split">
        <aside className="mh-teacher-card mh-teacher-questions__config">
          <h2>Configuration Parameters</h2>
          <label>
            <span>Assessment Topic</span>
            <div className="mh-teacher-field">{data.topic}</div>
          </label>
          <label>
            <span>Target Difficulty</span>
            <div className="mh-teacher-field mh-teacher-field--select">{data.difficulty}</div>
          </label>
          <label>
            <span>Question Format</span>
            <div className="mh-teacher-field mh-teacher-field--select">{data.type}</div>
          </label>
          <div className="mh-teacher-card__head">
            <span>Generate Count</span>
            <strong className="mh-teacher-outcomes__id">{data.count}</strong>
          </div>
          <ActionBtn label="Generate Questions" />
        </aside>
        <section className="mh-teacher-card">
          <div className="mh-teacher-card__head">
            <h2>Generated Output</h2>
            <div className="mh-teacher-actions">
              <span className="mh-teacher-muted">{selected.length} selected</span>
              <ActionBtn label="Add to Question Bank" href={config.secondaryActionHref} tone="secondary" />
            </div>
          </div>
          <div className="mh-teacher-questions__list">
            {data.questions.map((q) => {
              const isOn = selected.includes(q.id);
              return (
                <article key={q.id} className={`mh-teacher-questions__item${isOn ? " is-selected" : ""}`}>
                  <div className="mh-teacher-card__head">
                    <div className="mh-teacher-questions__badges">
                      <span className={badgeClass("info")}>MCQ</span>
                      <span className={badgeClass("active")}>MEDIUM</span>
                    </div>
                    <button
                      type="button"
                      className={`mh-teacher-questions__checkbtn${isOn ? " is-on" : ""}`}
                      aria-pressed={isOn}
                      onClick={() => toggle(q.id)}
                    >
                      {isOn ? "✓" : ""}
                    </button>
                  </div>
                  <p className="mh-teacher-questions__prompt">{q.prompt}</p>
                  {q.options.length > 1 ? (
                    <div className="mh-teacher-questions__options">
                      {q.options.map((o) => (
                        <div
                          key={o.key}
                          className={`mh-teacher-questions__option${o.correct ? " is-correct" : ""}`}
                        >
                          {o.key}. {o.text}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function RubricGeneratorView({ config }: { config: TeacherScreenConfig }) {
  const data = config.rubricGenerator;
  if (!data) return null;
  return (
    <div className="mh-teacher-rubric" data-figma-id={config.figmaId}>
      <PageHead config={config} badge="Rubric Tool" />
      <section className="mh-teacher-card">
        <h2>Rubric Dimensions matrix</h2>
        <div className="mh-teacher-rubric__grid">
          <div className="mh-teacher-rubric__head">
            <span>Criteria</span>
            <span>Excellent (4 pts)</span>
            <span>Proficient (3 pts)</span>
            <span>Developing (2 pts)</span>
            <span>Beginning (1 pt)</span>
          </div>
          {data.criteria.map((c) => (
            <div key={c.name} className="mh-teacher-rubric__row">
              <div>
                <strong>{c.name}</strong>
                <span className="mh-teacher-outcomes__id">Weight: {c.weight}</span>
              </div>
              <div className="mh-teacher-rubric__cell is-excellent">{c.excellent}</div>
              <div className="mh-teacher-rubric__cell">{c.proficient}</div>
              <div className="mh-teacher-rubric__cell">{c.developing}</div>
              <div className="mh-teacher-rubric__cell">{c.beginning}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MessagesView({ config }: { config: TeacherScreenConfig }) {
  const data = config.messages;
  const router = useRouter();
  const [activeId, setActiveId] = useState(data?.threads[0]?.id || "");
  if (!data) return null;
  const active = data.threads.find((t) => t.id === activeId) || data.threads[0];
  const ctx = data.context;

  return (
    <div className="mh-teacher-chat" data-figma-id={config.figmaId}>
      <aside className="mh-teacher-card mh-teacher-chat__threads">
        <h2>Inbox</h2>
        {data.threads.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mh-teacher-chat__thread${t.id === active.id ? " is-active" : ""}`}
            onClick={() => setActiveId(t.id)}
          >
            <div className="mh-teacher-chat__thread-top">
              <strong>{t.name}</strong>
              <span>{t.time}</span>
            </div>
            <span className="mh-teacher-muted">{t.role}</span>
            <p>{t.preview}</p>
            {t.unread ? <span className="mh-teacher-chat__unread">{t.unread}</span> : null}
          </button>
        ))}
      </aside>

      <section className="mh-teacher-card mh-teacher-chat__conversation">
        <div className="mh-teacher-card__head">
          <div>
            <h2>{active.name}</h2>
            <span className="mh-teacher-muted">{active.role}</span>
          </div>
        </div>
        <div className="mh-teacher-chat__messages">
          {data.chat.map((item, i) => {
            if (item.kind === "attachment") {
              return (
                <div key={i} className="mh-teacher-chat__attachment">
                  <img src="/brand/icons/file-text.svg" alt="" width={16} height={16} />
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.size} · {item.time}
                    </span>
                  </div>
                </div>
              );
            }
            if (item.kind === "system") {
              return (
                <div key={i} className="mh-teacher-chat__system">
                  {item.text}
                </div>
              );
            }
            return (
              <div key={i} className={`mh-teacher-chat__bubble is-${item.from}`}>
                <p>{item.text}</p>
                <span>{item.time}</span>
              </div>
            );
          })}
        </div>
        <div className="mh-teacher-chat__composer">
          <input type="text" placeholder="Write a secure reply…" aria-label="Message" />
          <ActionBtn label="Send" tone="secondary" />
        </div>
      </section>

      <aside className="mh-teacher-card mh-teacher-chat__context">
        <h2>Student Context</h2>
        <div className="mh-teacher-fields">
          <label>
            <span>Program</span>
            <div className="mh-teacher-field">{ctx.program}</div>
          </label>
          <label>
            <span>Current Grade</span>
            <div className="mh-teacher-field">
              {ctx.grade} · {ctx.gradePct}
            </div>
          </label>
          <label>
            <span>Attendance</span>
            <div className="mh-teacher-field">
              {ctx.attendance}{" "}
              <span className={badgeClass("warning")}>{ctx.attendanceTone}</span>
            </div>
          </label>
          <label>
            <span>Missing work</span>
            <div className="mh-teacher-field">{ctx.missing}</div>
          </label>
        </div>
        <h3>Shared files</h3>
        <div className="mh-teacher-list">
          {ctx.sharedFiles.map((f) => (
            <div key={f.name} className="mh-teacher-list__item">
              <div>
                <strong>{f.name}</strong>
                <span>{f.size}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mh-teacher-actions">
          <button
            type="button"
            className="mh-teacher-btn mh-teacher-btn--secondary"
            onClick={() => router.push("/instructor/f/t12-students-view")}
          >
            View Student Profile
          </button>
          <button type="button" className="mh-teacher-btn">
            Flag for Academic Advisor
          </button>
        </div>
      </aside>
    </div>
  );
}

function NotificationsView({ config }: { config: TeacherScreenConfig }) {
  const data = config.notifications;
  const filters = data?.filters ?? [{ label: "All Alerts" }, { label: "Unread" }];
  const [filter, setFilter] = useState(filters[0]?.label || "All Alerts");
  if (!data) return null;

  const items =
    filter === "All Alerts"
      ? data.items ?? []
      : filter === "Unread"
        ? (data.items ?? []).filter((i) => i.unread)
        : (data.items ?? []).filter((i) => i.category === filter.replace(/s$/, "") || i.category === filter);

  return (
    <div className="mh-teacher-notif" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-tabs">
        {filters.map((f) => (
          <button
            key={f.label}
            type="button"
            className={`mh-teacher-tabs__item${filter === f.label ? " is-active" : ""}`}
            onClick={() => setFilter(f.label)}
          >
            {f.label}
            {typeof f.count === "number" ? <span className="mh-teacher-notif__count">{f.count}</span> : null}
          </button>
        ))}
      </div>
      <div className="mh-teacher-notif__list">
        {items.map((n) => (
          <article key={n.title} className={`mh-teacher-card mh-teacher-notif__item${n.unread ? " is-unread" : ""}`}>
            <div className="mh-teacher-card__head">
              <strong>{n.title}</strong>
              <span className="mh-teacher-muted">{n.when}</span>
            </div>
            <p>{n.body}</p>
            <div className="mh-teacher-notif__meta">
              <span className={badgeClass(n.tone)}>{n.category}</span>
              {n.unread ? <span className="mh-teacher-notif__dot">Unread</span> : null}
            </div>
          </article>
        ))}
      </div>
      <p className="mh-teacher-muted mh-teacher-notif__pagination">{data.pagination}</p>
    </div>
  );
}

function TimetableView({ config }: { config: TeacherScreenConfig }) {
  const data = config.timetable;
  const views = data?.views ?? ["Week"];
  const filters = data?.filters ?? ["Show All"];
  const [view, setView] = useState(data?.activeView || views[0] || "Week");
  const [filter, setFilter] = useState(filters[0] || "Show All");
  if (!data) return null;

  return (
    <div className="mh-teacher-cal" data-figma-id={config.figmaId}>
      <div className="mh-teacher-page-head">
        <div>
          <div className="mh-teacher-section__label">{data.termLabel}</div>
          <h2>{data.rangeLabel}</h2>
          <p>{config.subtitle}</p>
        </div>
        <div className="mh-teacher-cal__views">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              className={`mh-teacher-tabs__item${view === v ? " is-active" : ""}`}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="mh-teacher-filters">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            className={`mh-teacher-chip${filter === f ? " is-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="mh-teacher-cal__grid">
        {(data.days ?? []).map((day) => (
          <div key={day.label} className="mh-teacher-cal__day">
            <div className="mh-teacher-cal__day-head">
              <strong>{day.label}</strong>
              <span>{day.date}</span>
            </div>
            {day.events
              .filter((e) => {
                if (filter === "Show All") return true;
                if (filter === "Classes") return e.tone === "blue" || e.tone === "purple";
                if (filter === "Office Hours") return e.tone === "green";
                if (filter === "Committees") return e.tone === "orange";
                return true;
              })
              .map((e) => (
                <div key={e.title + e.time} className={`mh-teacher-cal__event is-${e.tone}`}>
                  <strong>{e.title}</strong>
                  <span>{e.time}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FileManagerView({ config }: { config: TeacherScreenConfig }) {
  const data = config.fileManager;
  const files = data?.files ?? [];
  const tree = data?.tree ?? [];
  const breadcrumbs = data?.breadcrumbs ?? ["Files"];
  const [selected, setSelected] = useState<string[]>(() =>
    files.filter((f) => f.selected).map((f) => f.name) || [],
  );
  if (!data) return null;

  function toggle(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }

  return (
    <div className="mh-teacher-files" data-figma-id={config.figmaId}>
      <div className="mh-teacher-page-head">
        <div>
          <nav className="mh-teacher-files__crumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((b, i) => (
              <span key={b}>
                {i > 0 ? " › " : ""}
                {b}
              </span>
            ))}
          </nav>
          <h2>{data.courseTitle}</h2>
          <p>{config.subtitle}</p>
        </div>
        <PageActions config={config} />
      </div>

      <div className="mh-teacher-split">
        <aside className="mh-teacher-card mh-teacher-files__tree">
          <h2>Course directory</h2>
          {tree.map((node) => (
            <div key={node.name} className={`mh-teacher-files__node${node.active ? " is-active" : ""}`}>
              <strong>{node.name}</strong>
              {(node.children || []).map((c) => (
                <div key={c} className="mh-teacher-files__child">
                  {c}
                </div>
              ))}
            </div>
          ))}
        </aside>

        <section className="mh-teacher-card">
          <div className="mh-teacher-toolbar">
            <h2 style={{ margin: 0 }}>
              Files · {selected.length} selected
            </h2>
          </div>
          <div className="mh-teacher-files__table">
            <div className="mh-teacher-files__thead">
              <span />
              <span>Name</span>
              <span>Type</span>
              <span>Size</span>
              <span>Updated</span>
              <span>Visibility</span>
            </div>
            {files.map((f) => (
              <label key={f.name} className={`mh-teacher-files__row${selected.includes(f.name) ? " is-selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(f.name)}
                  onChange={() => toggle(f.name)}
                />
                <strong>{f.name}</strong>
                <span>{f.type}</span>
                <span>{f.size}</span>
                <span>{f.updated}</span>
                <span className={badgeClass(f.visibility === "Published" ? "active" : "muted")}>{f.visibility}</span>
              </label>
            ))}
          </div>
          <div className="mh-teacher-dropzone">
            <img src="/brand/icons/file-text.svg" alt="" width={18} height={18} />
            <p>Drag files here or use Upload Files to add resources</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function HelpSupportView({ config }: { config: TeacherScreenConfig }) {
  const data = config.helpSupport;
  const [query, setQuery] = useState("");
  if (!data) return null;

  return (
    <div className="mh-teacher-help" data-figma-id={config.figmaId}>
      <section className="mh-teacher-card mh-teacher-help__hero">
        <div className="mh-teacher-section__label">FACULTY SUPPORT CENTER</div>
        <h1>{config.title}</h1>
        <p>{config.subtitle}</p>
        <label className="mh-teacher__search mh-teacher-help__search">
          <img src="/brand/icons/search.svg" alt="" width={14} height={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Consult AI — ask about gradebook, studio, attendance…"
            aria-label="Consult AI"
          />
        </label>
        <PageActions config={config} />
      </section>

      <div className="mh-teacher-help__topics">
        {data.topics.map((t) => (
          <article key={t.title} className="mh-teacher-card mh-teacher-help__topic">
            {t.icon ? <img src={`/brand/icons/${t.icon}.svg`} alt="" width={18} height={18} /> : null}
            <h3>{t.title}</h3>
            <p>{t.detail}</p>
          </article>
        ))}
      </div>

      <div className="mh-teacher-split">
        <section className="mh-teacher-card">
          <h2>Active tickets</h2>
          <div className="mh-teacher-list">
            {data.tickets.map((t) => (
              <div key={t.id} className="mh-teacher-list__item">
                <div>
                  <strong>
                    {t.id} · {t.subject}
                  </strong>
                </div>
                <span className={badgeClass(t.tone)}>{t.status}</span>
              </div>
            ))}
          </div>
          <h3>Reference PDFs</h3>
          <div className="mh-teacher-list">
            {data.references.map((r) => (
              <div key={r.name} className="mh-teacher-list__item">
                <div>
                  <strong>{r.name}</strong>
                  <span>{r.meta}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="mh-teacher-card mh-teacher-help__form">
          <h2>Initiate Secure Ticket</h2>
          <div className="mh-teacher-fields">
            <label>
              <span>Category</span>
              <div className="mh-teacher-field">Gradebook & Publishing</div>
            </label>
            <label>
              <span>Subject</span>
              <div className="mh-teacher-field">Cannot publish midterm grades</div>
            </label>
            <label>
              <span>Details</span>
              <div className="mh-teacher-field mh-teacher-field--tall">
                FIN301 midterm grade submit fails at curriculum audit step.
              </div>
            </label>
          </div>
          <button type="button" className="mh-teacher-btn">
            Submit Ticket
          </button>
        </aside>
      </div>
    </div>
  );
}

function SyllabusDiffView({ config }: { config: TeacherScreenConfig }) {
  const d = config.syllabusDiff;
  if (!d) return null;
  return (
    <div className="mh-teacher-stack mh-teacher-syllabus" data-figma-id={config.figmaId}>
      <PageHead config={config} badge={d.badge} />
      <div className="mh-teacher-syllabus__grid">
        <div className="mh-teacher-syllabus__main">
          <section className="mh-teacher-card">
            <h2>{d.currentTitle}</h2>
            <div className="mh-teacher-syllabus__fields">
              {d.current.map((f) => (
                <div key={f.label}>
                  <strong>{f.label}</strong>
                  <p>{f.value}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="mh-teacher-card">
            <h2 className="mh-teacher-syllabus__proposed">{d.proposedTitle}</h2>
            <div className="mh-teacher-syllabus__fields">
              {d.proposed.map((f) => (
                <div key={f.label}>
                  <strong>{f.label}</strong>
                  {f.removed ? <p className="mh-teacher-diff-block is-removed">{f.removed}</p> : null}
                  {f.added ? <p className="mh-teacher-diff-block is-added">{f.added}</p> : null}
                  {f.value ? <p>{f.value}</p> : null}
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="mh-teacher-card mh-teacher-syllabus__comments">
          <h2>Review Comments ({d.comments.length})</h2>
          {d.comments.map((c) => (
            <article key={c.author + c.when} className="mh-teacher-comment">
              <div className="mh-teacher-comment__head">
                <strong>{c.author}</strong>
                <span>{c.when}</span>
              </div>
              <span className="mh-teacher-comment__role">{c.role}</span>
              <p>{c.body}</p>
            </article>
          ))}
          <label className="mh-teacher-comment__reply">
            <span className="sr-only">Reply</span>
            <input placeholder="Reply to thread..." aria-label="Reply to thread" />
          </label>
        </aside>
      </div>
    </div>
  );
}

function WorkshopsView({ config }: { config: TeacherScreenConfig }) {
  const router = useRouter();
  const w = config.workshops;
  if (!w) return null;
  const tabs = w.tabs ?? ["Available (0)"];
  const cards = w.cards ?? [];
  const registrations = w.registrations ?? [];
  return (
    <div className="mh-teacher-stack mh-teacher-workshops" data-figma-id={config.figmaId}>
      <div className="mh-teacher-workshops__top">
        <div className="mh-teacher-tabs">
          {tabs.map((tab) => (
            <button key={tab} type="button" className={`mh-teacher-tabs__item${tab === w.activeTab ? " is-active" : ""}`}>
              {tab}
            </button>
          ))}
        </div>
        <p className="mh-teacher-workshops__credits">{w.credits}</p>
      </div>
      <PageActions config={config} />
      <div className="mh-teacher-workshops__grid">
        <div className="mh-teacher-workshops__list">
          {cards.length === 0 ? <p className="mh-teacher-muted">No workshops available.</p> : null}
          {cards.map((card) => (
            <article key={card.title} className="mh-teacher-workshop-card">
              <div className="mh-teacher-workshop-card__top">
                <div className="mh-teacher-workshop-card__tags">
                  <span className={badgeClass("info")}>{card.tag}</span>
                  <span>{card.org}</span>
                </div>
                <span className={badgeClass("active")}>{card.seats}</span>
              </div>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
              <div className="mh-teacher-workshop-card__meta">
                <span>
                  <img src="/brand/icons/calendar.svg" alt="" width={14} height={14} />
                  {card.when}
                </span>
                <span>
                  <img src="/brand/icons/school.svg" alt="" width={14} height={14} />
                  {card.where}
                </span>
              </div>
              <div className="mh-teacher-workshop-card__foot">
                <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary">
                  Material PDF
                </button>
                <button
                  type="button"
                  className="mh-teacher-btn"
                  onClick={() => router.push(card.href || "/instructor/f/t24-workshop-detail")}
                >
                  Register Now
                </button>
              </div>
            </article>
          ))}
        </div>
        <aside className="mh-teacher-card">
          <h2>My Registrations</h2>
          <div className="mh-teacher-list">
            {registrations.map((r) => (
              <div key={r.title} className="mh-teacher-list__item">
                <div>
                  <strong>{r.title}</strong>
                  <span>{r.when}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function WorkshopDetailView({ config }: { config: TeacherScreenConfig }) {
  const d = config.workshopDetail;
  if (!d) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-split">
        <section className="mh-teacher-card">
          <div className="mh-teacher-page-head__row">
            <h2 style={{ margin: 0 }}>{d.title}</h2>
            <span className={badgeClass("active")}>{d.status}</span>
          </div>
          <div className="mh-teacher-workshop-card__meta" style={{ margin: "12px 0 16px" }}>
            <span>
              <img src="/brand/icons/calendar.svg" alt="" width={14} height={14} />
              {d.when}
            </span>
            <span>
              <img src="/brand/icons/school.svg" alt="" width={14} height={14} />
              {d.where}
            </span>
            <span>{d.seats}</span>
          </div>
          <p className="mh-teacher-muted">{d.description}</p>
          <h3>Agenda</h3>
          <ol className="mh-teacher-agenda">
            {d.agenda.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
        <aside className="mh-teacher-card">
          <h2>Materials</h2>
          <div className="mh-teacher-list">
            {d.materials.map((m) => (
              <div key={m.label} className="mh-teacher-list__item">
                <div>
                  <strong>{m.label}</strong>
                  <span>{m.meta}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StudentsDirectoryView({ config }: { config: TeacherScreenConfig }) {
  const router = useRouter();
  const d = config.studentsDirectory;
  const students = d?.students ?? [];
  const drawer = d?.drawer ?? {
    name: "Select a student",
    meta: "—",
    alert: "No student selected",
    body: "Choose a student from the roster to view details.",
    action: "Open messages",
  };
  const [selected, setSelected] = useState(students[0]?.id);
  if (!d) return null;
  return (
    <div className="mh-teacher-stack mh-teacher-students" data-figma-id={config.figmaId}>
      <div className="mh-teacher-students__filters">
        <button type="button" className="mh-teacher-chip">
          {d.rosterFilter ?? "All"} ▾
        </button>
        <button type="button" className="mh-teacher-chip">
          {d.riskFilter ?? "All risk"} ▾
        </button>
        <span className="mh-teacher-meta-note">{d.note}</span>
      </div>
      <div className="mh-teacher-students__grid">
        <section className="mh-teacher-card">
          <h2>Section Members</h2>
          {students.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`mh-teacher-student-row${selected === s.id ? " is-selected" : ""}`}
              onClick={() => setSelected(s.id)}
              onDoubleClick={() => router.push("/instructor/f/t22-student-detail-full-page")}
            >
              <span className="mh-teacher__avatar mh-teacher__avatar--sm" aria-hidden>
                {(s.name ?? "?")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span>
                <strong>{s.name}</strong>
                <span className="mh-teacher-muted">{s.program}</span>
              </span>
              <span className="mh-teacher-student-metric">
                <strong>{s.attendance}</strong>
                <span>ATTENDANCE</span>
              </span>
              <span className="mh-teacher-student-metric">
                <strong>{s.gpa}</strong>
                <span>CURR. GPA</span>
              </span>
              <span className="mh-teacher-student-metric">
                <strong className={s.missing !== "0" ? "is-warn" : undefined}>{s.missing}</strong>
                <span>MISSING SUBS</span>
              </span>
              <span className={badgeClass(s.riskTone)}>{s.risk}</span>
            </button>
          ))}
        </section>
        <aside className="mh-teacher-card mh-teacher-students__drawer">
          <div className="mh-teacher-students__drawer-profile">
            <span className="mh-teacher__avatar" aria-hidden>
              {drawer.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </span>
            <strong>{drawer.name}</strong>
            <span className="mh-teacher-comment__role">{drawer.meta}</span>
          </div>
          <div className="mh-teacher-students__alert">{drawer.alert}</div>
          <p>{drawer.body}</p>
          <button type="button" className="mh-teacher-btn" style={{ width: "100%" }} onClick={() => router.push("/instructor/f/t16-teacher-messages-chat")}>
            {drawer.action}
          </button>
        </aside>
      </div>
    </div>
  );
}

function StudentDetailView({ config }: { config: TeacherScreenConfig }) {
  const d = config.studentDetail;
  if (!d) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-split">
        <section className="mh-teacher-card">
          <div className="mh-teacher-students__drawer-profile" style={{ alignItems: "flex-start", textAlign: "left" }}>
            <span className="mh-teacher__avatar" aria-hidden>
              {d.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </span>
            <div>
              <strong style={{ fontSize: 22 }}>{d.name}</strong>
              <p className="mh-teacher-comment__role">{d.meta}</p>
            </div>
          </div>
          <div className="mh-teacher-tabs" style={{ marginTop: 16 }}>
            {d.tabs.map((tab, i) => (
              <button key={tab} type="button" className={`mh-teacher-tabs__item${i === 0 ? " is-active" : ""}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="mh-teacher-fields" style={{ marginTop: 16 }}>
            {d.fields.map((f) => (
              <label key={f.label}>
                <span>{f.label}</span>
                <div className="mh-teacher-field">{f.value}</div>
              </label>
            ))}
          </div>
        </section>
        <div className="mh-teacher-stack">
          {d.alerts.map((a) => (
            <section key={a.title} className="mh-teacher-card">
              <h2>{a.title}</h2>
              <p>{a.body}</p>
              <span className={badgeClass(a.tone)}>{a.tone}</span>
            </section>
          ))}
          <section className="mh-teacher-card">
            <h2>Current Courses</h2>
            <div className="mh-teacher-list">
              {d.courses.map((c) => (
                <div key={c.code} className="mh-teacher-list__item">
                  <div>
                    <strong>
                      {c.code} · {c.title}
                    </strong>
                    <span>
                      {c.grade} · {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function HubView({ config }: { config: TeacherScreenConfig }) {
  const router = useRouter();
  const hub = config.hub;
  if (!hub) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-hub-grid">
        {hub.cards.map((card) => (
          <button key={card.href} type="button" className="mh-teacher-card mh-teacher-hub-card" onClick={() => router.push(card.href)}>
            <div className="mh-teacher-page-head__row">
              <h2 style={{ margin: 0 }}>{card.title}</h2>
              {card.meta ? <span className={badgeClass("muted")}>{card.meta}</span> : null}
            </div>
            <p>{card.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function GradesQueueView({ config }: { config: TeacherScreenConfig }) {
  const grades = config.gradesQueue || [];
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <section className="mh-teacher-card">
        <div className="mh-teacher-table mh-teacher-grades-table">
          <div className="mh-teacher-table__head">
            <span>Course</span>
            <span>Instructor</span>
            <span>Submitted</span>
            <span>Enrolled</span>
            <span>Distribution</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {grades.map((g) => (
            <div key={g.code} className="mh-teacher-table__row">
              <span>
                <strong>{g.code}</strong>
                <span className="mh-teacher-muted">{g.title}</span>
              </span>
              <span>{g.instructor}</span>
              <span>{g.submitted}</span>
              <span>{g.enrolled}</span>
              <span>
                <span className="mh-teacher-muted">{g.distribution}</span>
                <span className="mh-teacher-dist-bar">
                  <i style={{ width: `${g.bars[0]}%`, background: "#1B7A3D" }} />
                  <i style={{ width: `${g.bars[1]}%`, background: "#849F38" }} />
                  <i style={{ width: `${g.bars[2]}%`, background: "#D97706" }} />
                  <i style={{ width: `${g.bars[3] || 0}%`, background: "#BA1A1A" }} />
                </span>
              </span>
              <span>
                <span className={badgeClass(g.status === "Ready" ? "active" : g.status === "Incomplete" ? "danger" : "review")}>
                  {g.status}
                </span>
              </span>
              <span className="mh-teacher-actions">
                <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary">
                  Open
                </button>
                <button type="button" className="mh-teacher-btn">
                  Submit
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AssessmentBuilderView({ config }: { config: TeacherScreenConfig }) {
  const data = config.assessmentBuilder;
  if (!data) return null;
  return (
    <div className="mh-teacher-assess" data-figma-id={config.figmaId}>
      <div className="mh-teacher-assess__main">
        <nav className="mh-teacher-assess__crumb" aria-label="Breadcrumb">
          {data.crumb.map((c, i) => (
            <span key={c}>
              {i > 0 ? <span className="mh-teacher-assess__crumb-sep">›</span> : null}
              <span className={i === data.crumb.length - 1 ? "is-active" : undefined}>{c}</span>
            </span>
          ))}
        </nav>
        <header className="mh-teacher-assess__intro">
          <h2>{data.heading}</h2>
          <p>{data.description}</p>
        </header>

        <section className="mh-teacher-card mh-teacher-assess__card">
          <h3>Basic Information</h3>
          <label className="mh-teacher-assess__field">
            <span>Assessment Title</span>
            <div className="mh-teacher-field">{data.title}</div>
          </label>
          <div className="mh-teacher-assess__row">
            <label className="mh-teacher-assess__field">
              <span>Assessment Type</span>
              <div className="mh-teacher-field mh-teacher-assess__select">
                {data.type}
                <span aria-hidden>▾</span>
              </div>
            </label>
            <label className="mh-teacher-assess__field">
              <span>Weighted Percentage</span>
              <div className="mh-teacher-field">{data.weight}</div>
            </label>
          </div>
        </section>

        <section className="mh-teacher-card mh-teacher-assess__card">
          <div className="mh-teacher-assess__card-head">
            <h3>Grade Matching Rubric Builder</h3>
            <button type="button" className="mh-teacher-assess__add-criterion">
              ADD CRITERION
            </button>
          </div>
          <div className="mh-teacher-assess__rubric">
            <div className="mh-teacher-assess__rubric-head">
              {data.rubricHeaders.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
            {data.rubricRows.map((row) => (
              <div key={row.criterion} className="mh-teacher-assess__rubric-row">
                <strong>{row.criterion}</strong>
                <span>{row.excellent}</span>
                <span>{row.good}</span>
                <span>{row.poor}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="mh-teacher-assess__upload">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 16V8M12 8l-3 3M12 8l3 3" stroke="#017f3f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 16.5a3.5 3.5 0 0 0-2.1-6.4A5.5 5.5 0 0 0 7.1 8.4 3.5 3.5 0 0 0 4 11.8" stroke="#017f3f" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M8 19h8" stroke="#017f3f" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <strong>{data.uploadHint}</strong>
          <span>{data.uploadFormats}</span>
        </div>
      </div>

      <aside className="mh-teacher-assess__preview">
        <p className="mh-teacher-assess__preview-label">STUDENT PORTAL PREVIEW</p>
        <div className="mh-teacher-assess__preview-card">
          <span className="mh-teacher-assess__preview-badge">{data.preview.badge}</span>
          <h3>{data.preview.title}</h3>
          <p>{data.preview.weight}</p>
          <hr />
          <div className="mh-teacher-assess__preview-meta">
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="#017f3f" strokeWidth="1.6" />
                <path d="M3 10h18M8 3v4M16 3v4" stroke="#017f3f" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {data.preview.openDate}
            </span>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 9v4M12 17h.01M10.3 4.3 2.8 17.3A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.7L13.7 4.3a2 2 0 0 0-3.4 0Z" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {data.preview.dueDate}
            </span>
          </div>
        </div>
        <div className="mh-teacher-assess__preview-actions">
          <ActionBtn label="Publish Assessment" />
          <ActionBtn label="Save Draft" tone="secondary" />
        </div>
      </aside>
    </div>
  );
}

function GradingSchemesView({ config }: { config: TeacherScreenConfig }) {
  const live = useOptionalTeacherLive();
  const data = config.gradingSchemes;
  if (!data) return null;
  return (
    <div className="mh-teacher-schemes" data-figma-id={config.figmaId}>
      <section className="mh-teacher-card mh-teacher-schemes__main">
        <div className="mh-teacher-schemes__head">
          <h2>{data.schemeLabel}</h2>
          <div className="mh-teacher-schemes__actions">
            <button type="button" className="mh-teacher-schemes__btn-outline" disabled={live?.busy} onClick={() => live?.runAction?.("Custom Standard Scheme")}>
              Custom Standard Scheme
            </button>
            <button type="button" className="mh-teacher-schemes__btn-solid" disabled={live?.busy} onClick={() => live?.runAction?.("+ New Scheme")}>
              + New Scheme
            </button>
          </div>
        </div>
        <div className="mh-teacher-schemes__table">
          <div className="mh-teacher-schemes__table-head">
            <span>LETTER GRADE</span>
            <span>MIN %</span>
            <span>MAX %</span>
            <span>GPA POINTS</span>
            <span>DESCRIPTION</span>
            <span>STATUS</span>
          </div>
          {data.rows.map((row) => (
            <div key={row.letter} className="mh-teacher-schemes__table-row">
              <strong className={`mh-teacher-schemes__letter is-${row.letterTone}`}>{row.letter}</strong>
              <span>{row.min}</span>
              <span>{row.max}</span>
              <span className="mh-teacher-schemes__gpa">{row.gpa}</span>
              <span className="mh-teacher-schemes__desc">{row.description}</span>
              <span>
                <span className={`mh-teacher-schemes__status is-${row.status === "PASS" ? "pass" : "fail"}`}>
                  {row.status}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <aside className="mh-teacher-card mh-teacher-schemes__side">
        <h3>Mock Distribution Preview</h3>
        <div className="mh-teacher-schemes__dist">
          {data.distribution.map((d) => (
            <div key={d.label} className="mh-teacher-schemes__dist-row">
              <div className="mh-teacher-schemes__dist-meta">
                <span>{d.label}</span>
                <span>{d.meta}</span>
              </div>
              <div className="mh-teacher-schemes__dist-track">
                <i className={`is-${d.tone}`} style={{ width: `${d.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mh-teacher-schemes__presets-label">SYSTEM PRESETS ACTIVE</p>
        <div className="mh-teacher-schemes__presets">
          {data.presets.map((p) => (
            <div key={p.label} className="mh-teacher-schemes__preset">
              <span>{p.label}</span>
              <strong className={`is-${p.tone}`}>{p.value}</strong>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function PendingGradesView({ config }: { config: TeacherScreenConfig }) {
  const data = config.pendingGrades;
  const [activeCode, setActiveCode] = useState(data?.rows.find((r) => r.active)?.code || data?.rows[0]?.code || "");
  if (!data) return null;

  const statusClass = (status: string) => {
    if (status === "SUBMITTED") return "is-submitted";
    if (status === "UNDER REVIEW") return "is-review";
    return "is-rejected";
  };

  return (
    <div className="mh-teacher-pending" data-figma-id={config.figmaId}>
      <div className="mh-teacher-pending__alert" role="status">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 9v4M12 17h.01M10.3 4.3 2.8 17.3A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.7L13.7 4.3a2 2 0 0 0-3.4 0Z" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{data.alert}</span>
      </div>

      <div className="mh-teacher-pending__layout">
        <section className="mh-teacher-card mh-teacher-pending__queue">
          <div className="mh-teacher-pending__queue-head">
            <h2>{data.queueTitle}</h2>
            <span className="mh-teacher-pending__action-badge">{data.actionBadge}</span>
          </div>
          <div className="mh-teacher-pending__table">
            <div className="mh-teacher-pending__table-head">
              <span>CODE / SECT</span>
              <span>COURSE TITLE</span>
              <span>TEACHER</span>
              <span>STUDENTS</span>
              <span>MISSING GRADES</span>
              <span>STATUS</span>
            </div>
            {data.rows.map((row) => (
              <button
                key={row.code}
                type="button"
                className={`mh-teacher-pending__table-row${activeCode === row.code ? " is-active" : ""}`}
                onClick={() => setActiveCode(row.code)}
              >
                <span className="mh-teacher-pending__code">{row.code}</span>
                <span className="mh-teacher-pending__title">{row.title}</span>
                <span>{row.teacher}</span>
                <span className="mh-teacher-pending__num">{row.students}</span>
                <span className={`mh-teacher-pending__num is-${row.missingTone}`}>{row.missing}</span>
                <span>
                  <span className={`mh-teacher-pending__status ${statusClass(row.status)}`}>{row.status}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="mh-teacher-card mh-teacher-pending__audit">
          <h3>{data.audit.title}</h3>
          <div className="mh-teacher-pending__stats">
            <div>
              <span>GRADEBOOK TOTAL</span>
              <strong>{data.audit.locked}</strong>
            </div>
            <div className="is-avg">
              <span>AVERAGE GRADE</span>
              <strong>{data.audit.average}</strong>
            </div>
          </div>
          <label className="mh-teacher-assess__field">
            <span>Reviewer Audit Notes</span>
            <div className="mh-teacher-field mh-teacher-field--tall">{data.audit.notes}</div>
          </label>
          <label className="mh-teacher-assess__field">
            <span>Reason for Rejection (Mandatory if Rejecting)</span>
            <div className="mh-teacher-field mh-teacher-pending__placeholder">{data.audit.rejectPlaceholder}</div>
          </label>
          <div className="mh-teacher-pending__actions">
            <ActionBtn label="Reject Submission" tone="secondary" className="mh-teacher-pending__reject" />
            <ActionBtn label="Audit & Approve" />
          </div>
        </aside>
      </div>

      <section className="mh-teacher-card" style={{ marginTop: 16 }}>
        <h2>Student file submissions</h2>
        {(data.fileQueue ?? []).length === 0 ? (
          <p className="mh-teacher-muted">No student files uploaded for your sections yet.</p>
        ) : (
          <div className="mh-teacher-list">
            {(data.fileQueue ?? []).map((packet) => (
              <div key={packet.id} className="mh-teacher-list__item" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <strong>
                    {packet.student} · {packet.assignment}
                  </strong>
                  <span>
                    {packet.course} · {packet.studentNumber} · {packet.status} · {packet.submittedAt}
                  </span>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {packet.files.map((f) => (
                      <li key={f.id}>
                        {f.name} ({f.version}, {f.size}, {f.mimeType})
                      </li>
                    ))}
                  </ul>
                </div>
                <span className={badgeClass(packet.status === "submitted" ? "active" : "muted")}>{packet.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SchedulerView({ config }: { config: TeacherScreenConfig }) {
  const s = config.scheduler;
  if (!s) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <section className="mh-teacher-card mh-teacher-scheduler">
        <div className="mh-teacher-scheduler__head">
          {s.days.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mh-teacher-scheduler__grid">
          {s.days.map((day, dayIdx) => (
            <div key={day} className="mh-teacher-scheduler__col">
              {s.slots
                .filter((slot) => slot.day === dayIdx)
                .map((slot) => (
                  <div key={slot.label + slot.start} className={`mh-teacher-scheduler__slot is-${slot.tone || "primary"}`}>
                    <strong>{slot.label}</strong>
                    <span>
                      {slot.start}–{slot.end}
                    </span>
                    <span>{slot.room}</span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CalendarBoardView({ config }: { config: TeacherScreenConfig }) {
  const c = config.calendarBoard;
  if (!c) return null;
  return (
    <div className="mh-teacher-stack" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-hub-grid">
        {c.months.map((month) => (
          <section key={month} className="mh-teacher-card">
            <h2>{month}</h2>
            <div className="mh-teacher-list">
              {c.events.map((e) => (
                <div key={e.date + e.label} className="mh-teacher-list__item">
                  <div>
                    <strong>{e.date}</strong>
                    <span>{e.label}</span>
                  </div>
                  <span className={badgeClass(e.tone)}>{e.tone || "event"}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function statusToneAtt(status: string): string {
  return status.toLowerCase();
}

function AttendanceSessionView({ config }: { config: TeacherScreenConfig }) {
  const data = config.attendanceSession;
  const [students, setStudents] = useState(data?.students || []);
  if (!data) return null;

  function markAllPresent() {
    setStudents((prev) => prev.map((s) => ({ ...s, status: "Present" as const })));
  }

  return (
    <div className="mh-teacher-attendance" data-figma-id={config.figmaId}>
      <div className="mh-teacher-attendance__alert" role="status">
        <strong>System Deviation Alert:</strong> {data.alert.replace(/^System Deviation Alert:\s*/i, "")}
      </div>

      <section className="mh-teacher-card mh-teacher-attendance__meta">
        <div className="mh-teacher-attendance__meta-item">
          <span className="mh-teacher-muted">CLASS_NODE</span>
          <strong>{data.classNode}</strong>
        </div>
        <div className="mh-teacher-attendance__meta-item">
          <span className="mh-teacher-muted">DATE</span>
          <strong>{data.dateLabel}</strong>
        </div>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--dark" onClick={markAllPresent}>
          Mark All Present
        </button>
      </section>

      <div className="mh-teacher-attendance__split">
        <section className="mh-teacher-card mh-teacher-attendance__roster">
          <div className="mh-teacher-card__head">
            <h2>{data.rosterTitle}</h2>
            <span className="mh-teacher-attendance__draft">{data.draftStatus}</span>
          </div>
          <div className="mh-teacher-attendance__list">
            {students.map((s) => (
              <div key={s.id} className="mh-teacher-attendance__row">
                <img
                  src={s.avatar || "/brand/teacher/avatar.png"}
                  alt=""
                  width={40}
                  height={40}
                  className="mh-teacher-attendance__avatar"
                />
                <div className="mh-teacher-attendance__who">
                  <strong>{s.name}</strong>
                  <span className="mh-teacher-muted">{s.id}</span>
                </div>
                <span className={`mh-teacher-att-pill mh-teacher-att-pill--${statusToneAtt(s.status)}`}>
                  {s.status}
                </span>
                <p className="mh-teacher-attendance__note">{s.note}</p>
                <div className={`mh-teacher-attendance__pct${s.atRisk ? " is-risk" : ""}`}>
                  <strong>{s.pct}</strong>
                  <span>LAST_FREQ</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="mh-teacher-card mh-teacher-attendance__stats">
          <h2>Session Stats</h2>
          {data.stats.map((st) => (
            <div key={st.label} className="mh-teacher-attendance__stat">
              <div className="mh-teacher-card__head">
                <span>{st.label}</span>
                <strong>
                  {st.count} <span className="mh-teacher-muted">({st.pct})</span>
                </strong>
              </div>
              <div className="mh-teacher-progress__track">
                <div
                  className={`mh-teacher-progress__fill mh-teacher-attendance__bar--${st.label.toLowerCase()}`}
                  style={{ width: st.pct }}
                />
              </div>
            </div>
          ))}
          <div className="mh-teacher-attendance__actions">
            {String(data.draftStatus || "").includes("FINALIZED") ? (
              <button type="button" className="mh-teacher-btn" disabled>
                Session finalized
              </button>
            ) : (
              <ActionBtn label={config.primaryAction || "Submit & Finalize Session"} />
            )}
            <ActionBtn label={config.secondaryAction || "Save Draft State"} tone="secondary" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function AttendanceReviewView({ config }: { config: TeacherScreenConfig }) {
  const data = config.attendanceReview;
  const [filter, setFilter] = useState(data?.filters.find((f) => f.active)?.label || data?.filters[0]?.label || "");
  const [resolved, setResolved] = useState<Record<string, "approved" | "rejected">>({});
  if (!data) return null;

  const visible = data.requests.filter((r) => {
    if (filter.startsWith("Pending")) return !resolved[r.id];
    if (filter.startsWith("Approved")) return resolved[r.id] === "approved";
    if (filter.startsWith("Rejected")) return resolved[r.id] === "rejected";
    return true;
  });

  return (
    <div className="mh-teacher-att-review" data-figma-id={config.figmaId}>
      <div className="mh-teacher-page-head">
        <div>
          <h2>Attendance Correction Requests</h2>
          <p>Process pending student attendance corrections and compliance overrides.</p>
        </div>
      </div>

      <div className="mh-teacher-att-review__layout">
        <div>
          <div className="mh-teacher-att-review__filters">
            {data.filters.map((f) => (
              <button
                key={f.label}
                type="button"
                className={`mh-teacher-att-review__filter${filter === f.label ? " is-active" : ""}`}
                onClick={() => setFilter(f.label)}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          <div className="mh-teacher-att-review__list">
            {visible.length === 0 ? (
              <p className="mh-teacher-muted">No requests in this queue.</p>
            ) : (
              visible.map((r) => (
                <article key={r.id} className="mh-teacher-card mh-teacher-att-review__card">
                  <div className="mh-teacher-card__head">
                    <div>
                      <strong>
                        {r.name} <span className="mh-teacher-muted">{r.id}</span>
                      </strong>
                      <div className="mh-teacher-muted">
                        {r.course} · {r.date}
                      </div>
                    </div>
                  </div>
                  <div className="mh-teacher-att-review__flow">
                    <div>
                      <span className="mh-teacher-muted">CURRENT STATUS</span>
                      <span className={`mh-teacher-att-pill mh-teacher-att-pill--${statusToneAtt(r.current)}`}>
                        {r.current}
                      </span>
                    </div>
                    <span className="mh-teacher-att-review__arrow" aria-hidden>
                      →
                    </span>
                    <div>
                      <span className="mh-teacher-muted">REQUESTED STATUS</span>
                      <span className={`mh-teacher-att-pill mh-teacher-att-pill--${statusToneAtt(r.requested)}`}>
                        {r.requested}
                      </span>
                    </div>
                  </div>
                  <p>{r.reason}</p>
                  <div className="mh-teacher-att-review__file">
                    <img src="/brand/icons/file-text.svg" alt="" width={14} height={14} />
                    <span>{r.attachment}</span>
                  </div>
                  <div className="mh-teacher-att-review__actions">
                    <button
                      type="button"
                      className="mh-teacher-btn mh-teacher-btn--danger-outline"
                      onClick={() => setResolved((prev) => ({ ...prev, [r.id]: "rejected" }))}
                    >
                      Reject Request
                    </button>
                    <button
                      type="button"
                      className="mh-teacher-btn mh-teacher-btn--success-outline"
                      onClick={() => setResolved((prev) => ({ ...prev, [r.id]: "approved" }))}
                    >
                      Approve Correction
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <aside className="mh-teacher-att-review__side">
          <section className="mh-teacher-card">
            <h3>Compliance Preview</h3>
            <p className="mh-teacher-muted">
              Approval of {data.compliance.student}&apos;s request will instantly restore status:
            </p>
            <div className="mh-teacher-att-review__score">
              <span className="is-risk">{data.compliance.fromPct}</span>
              <span aria-hidden>→</span>
              <span className="is-ok">{data.compliance.toPct}</span>
            </div>
            <span className={badgeClass("success")}>{data.compliance.badge}</span>
          </section>
          <section className="mh-teacher-card">
            <h3>System Overview Log</h3>
            <p className="mh-teacher-muted">{data.logNote}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function AuthGateView({ config }: { config: TeacherScreenConfig }) {
  const data = config.authGate;
  if (!data) return null;
  return (
    <div className="mh-teacher-auth" data-figma-id={config.figmaId}>
      <section className="mh-teacher-card mh-teacher-auth__card">
        <h2>{data.heading}</h2>
        <p className="mh-teacher-auth__desc">{data.description}</p>
        {(data.extraFields || []).map((field) => (
          <label key={field.label} className="mh-teacher-auth__field">
            <span>{field.label}</span>
            <div className="mh-teacher-field">{field.value || "—"}</div>
          </label>
        ))}
        <label className="mh-teacher-auth__field">
          <span>{data.fieldLabel}</span>
          <div className="mh-teacher-field">{data.fieldValue}</div>
        </label>
        <button type="button" className="mh-teacher-btn mh-teacher-btn--primary mh-teacher-auth__cta">
          {data.cta}
        </button>
        <p className="mh-teacher-auth__help">{data.help}</p>
      </section>
    </div>
  );
}

function AlertListView({ config }: { config: TeacherScreenConfig }) {
  const data = config.alertList;
  if (!data) return null;
  return (
    <div className="mh-teacher-alerts" data-figma-id={config.figmaId}>
      <PageHead config={config} badge={data.badge} />
      <div className="mh-teacher-alerts__list">
        {data.items.map((item) => (
          <article key={`${item.name}-${item.course}`} className="mh-teacher-card mh-teacher-alerts__item">
            <div className="mh-teacher-alerts__avatar" aria-hidden>
              {item.avatar || item.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="mh-teacher-alerts__body">
              <div className="mh-teacher-alerts__top">
                <strong>{item.name}</strong>
                <span className="mh-teacher-muted">{item.course}</span>
                <span className={badgeClass(item.tagTone)}>{item.tag}</span>
              </div>
              <p>{item.body}</p>
              <div className="mh-teacher-actions">
                <button type="button" className="mh-teacher-btn mh-teacher-btn--secondary">
                  Contact
                </button>
                <button type="button" className="mh-teacher-btn mh-teacher-btn--primary">
                  Resolve
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function GradebookView({ config }: { config: TeacherScreenConfig }) {
  const data = config.gradebook;
  if (!data) return null;
  const colCount = data.columns.length;
  return (
    <div className="mh-teacher-gradebook" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <p className="mh-teacher-muted mh-teacher-gradebook__course">{data.course}</p>
      <section className="mh-teacher-card">
        <div
          className="mh-teacher-table mh-teacher-gradebook__table"
          style={{ gridTemplateColumns: `minmax(140px,1.1fr) repeat(${Math.max(colCount - 1, 1)}, minmax(90px,1fr))` }}
        >
          <div className="mh-teacher-table__head">
            {data.columns.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          {data.rows.map((row) => (
            <div key={row.id} className="mh-teacher-table__row">
              <span>
                <strong>{row.name}</strong>
                <span className="mh-teacher-muted">{row.id}</span>
              </span>
              {row.assessments.map((a, i) => (
                <span key={`${row.id}-${i}`}>{a}</span>
              ))}
              <span>
                <strong>
                  {row.total} ({row.letter})
                </strong>
                <span className={badgeClass(row.status === "Draft" ? "draft" : "active")}>{row.status}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
      {data.legend?.length ? (
        <aside className="mh-teacher-card mh-teacher-gradebook__legend">
          {data.legend.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </aside>
      ) : null}
    </div>
  );
}

function StatusFilterView({ config }: { config: TeacherScreenConfig }) {
  const data = config.statusFilter;
  if (!data) return null;
  return (
    <div className="mh-teacher-status" data-figma-id={config.figmaId}>
      <PageHead config={config} />
      <div className="mh-teacher-status__filters">
        {data.filters.map((f) => (
          <button
            key={f.label}
            type="button"
            className={`mh-teacher-status__chip${f.active ? " is-active" : ""}`}
          >
            <strong>{f.label}</strong>
            <span>{f.count}</span>
          </button>
        ))}
      </div>
      <section className="mh-teacher-card">
        <div
          className="mh-teacher-table"
          style={{ gridTemplateColumns: `repeat(${data.columns.length}, minmax(100px, 1fr))` }}
        >
          <div className="mh-teacher-table__head">
            {data.columns.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          {data.rows.map((row, i) => (
            <div key={i} className="mh-teacher-table__row">
              {row.cells.map((cell, j) => (
                <span key={j}>
                  {j === row.cells.length - 1 && row.badge ? (
                    <span className={badgeClass(row.badgeTone)}>{row.badge}</span>
                  ) : (
                    cell
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function renderView(config: TeacherScreenConfig) {
  switch (config.archetype) {
    case "dashboard":
      return <DashboardView config={config} />;
    case "profileBio":
      return <ProfileBioView config={config} />;
    case "profileTopics":
      return <ProfileTopicsView config={config} />;
    case "availability":
      return <AvailabilityView config={config} />;
    case "compensation":
      return <CompensationView config={config} />;
    case "schedule":
      return <ScheduleView config={config} />;
    case "settings":
      return <SettingsView config={config} />;
    case "security":
      return <SecurityView config={config} />;
    case "accomplishments":
      return <AccomplishmentsView config={config} />;
    case "courseList":
    case "cards":
      return <CourseListView config={config} />;
    case "courseDetail":
      return <CourseDetailView config={config} />;
    case "courseMgmt":
      return <CourseMgmtView config={config} />;
    case "announcements":
      return <AnnouncementsView config={config} />;
    case "versionEditor":
      return <VersionEditorView config={config} />;
    case "evaluations":
      return <EvaluationsView config={config} />;
    case "repository":
      return <RepositoryView config={config} />;
    case "pendingSchedules":
      return <PendingSchedulesView config={config} />;
    case "courseHistory":
      return <CourseHistoryView config={config} />;
    case "table":
      return <TableBlock config={config} />;
    case "form":
      return <FormView config={config} />;
    case "splitPane":
      return <SplitPaneView config={config} />;
    case "lectures":
      return <LecturesView config={config} />;
    case "lectureReview":
      return <LectureReviewView config={config} />;
    case "labSession":
      return <LabSessionView config={config} />;
    case "approval":
      return <ApprovalView config={config} />;
    case "syllabusDiff":
      return <SyllabusDiffView config={config} />;
    case "workshops":
      return <WorkshopsView config={config} />;
    case "workshopDetail":
      return <WorkshopDetailView config={config} />;
    case "studentsDirectory":
      return <StudentsDirectoryView config={config} />;
    case "studentDetail":
      return <StudentDetailView config={config} />;
    case "hub":
      return <HubView config={config} />;
    case "grades":
      return <GradesQueueView config={config} />;
    case "assessmentBuilder":
      return <AssessmentBuilderView config={config} />;
    case "gradingSchemes":
      return <GradingSchemesView config={config} />;
    case "pendingGrades":
      return <PendingGradesView config={config} />;
    case "scheduler":
      return <SchedulerView config={config} />;
    case "calendar":
      return <CalendarBoardView config={config} />;
    case "modal":
      return <ModalView config={config} />;
    case "aiStudio":
      return <AiStudioView config={config} />;
    case "studioGeneration":
      return <StudioGenerationView config={config} />;
    case "outcomeMapping":
      return <OutcomeMappingView config={config} />;
    case "questionGenerator":
      return <QuestionGeneratorView config={config} />;
    case "rubricGenerator":
      return <RubricGeneratorView config={config} />;
    case "messages":
      return <MessagesView config={config} />;
    case "notifications":
      return <NotificationsView config={config} />;
    case "timetable":
      return <TimetableView config={config} />;
    case "fileManager":
      return <FileManagerView config={config} />;
    case "helpSupport":
      return <HelpSupportView config={config} />;
    case "attendanceSession":
      return <AttendanceSessionView config={config} />;
    case "attendanceReview":
      return <AttendanceReviewView config={config} />;
    case "authGate":
      return <AuthGateView config={config} />;
    case "alertList":
      return <AlertListView config={config} />;
    case "gradebook":
      return <GradebookView config={config} />;
    case "statusFilter":
      return <StatusFilterView config={config} />;
    default:
      return null;
  }
}

export function TeacherSisScreen({ path }: { path: string }) {
  const router = useRouter();
  const chrome = TEACHER_SCREENS[path];
  const [userName, setUserName] = useState("");
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    if (!s.roles.includes("instructor")) {
      if (s.roles.includes("admin") || s.roles.includes("registrar")) router.replace("/admin");
      else if (s.roles.includes("student")) router.replace("/student");
      else if (s.roles.includes("applicant")) router.replace("/applicant");
      else if (s.roles.includes("employer")) router.replace("/employer");
      else router.replace("/login");
      return;
    }
    setUserName(`${s.givenName} ${s.familyName}`.trim());
    setAllowed(true);
  }, [router]);

  if (!chrome || !allowed) return null;

  return (
    <TeacherLiveProvider path={path}>
      <TeacherSisScreenInner path={path} chrome={chrome} userName={userName} />
    </TeacherLiveProvider>
  );
}

function TeacherSisScreenInner({
  path,
  chrome,
  userName,
}: {
  path: string;
  chrome: TeacherScreenConfig;
  userName: string;
}) {
  const live = useTeacherLive();
  const { payload, loading } = useTeacherLivePayload();
  const config = mergeTeacherLive(chrome, payload, loading);
  const shell = config.shell || "campus";
  const isStudio = shell === "studio";
  const displayName = live.bootstrap?.displayName || userName || "Instructor";

  return (
    <TeacherSisShell
      activeHref={config.activeHref}
      title={isStudio ? undefined : config.title}
      subtitle={
        isStudio
          ? undefined
          : live.error
            ? `Live data error: ${live.error}`
            : config.subtitle
      }
      shell={shell}
      studioActive={isStudio ? path : undefined}
      userName={displayName}
      userRole="INSTRUCTOR"
      studentCount={live.bootstrap?.studentCount}
    >
      <TeacherLiveStatusBar />
      {loading ? (
        <div className="mh-teacher-stack">
          <p className="mh-teacher-muted">Loading live instructor data…</p>
        </div>
      ) : (
        renderView(config)
      )}
    </TeacherSisShell>
  );
}

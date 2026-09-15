"use client";

import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@myheritage/ui";

export const adminCardStyle: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E1E3DC",
  borderRadius: 8,
  boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
  boxSizing: "border-box",
  minWidth: 0,
};

/** Shared page stack — every admin screen uses this for vertical rhythm. */
export function AdminPageFrame({
  children,
  figmaId,
  className = "",
}: {
  children: ReactNode;
  figmaId?: string;
  className?: string;
}) {
  return (
    <div className={`mh-admin-page ${className}`.trim()} data-figma-id={figmaId || undefined}>
      {children}
    </div>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mh-admin-header">
      <div className="mh-admin-header__copy">
        <h1 className="mh-admin-header__title">{title}</h1>
        {subtitle ? <p className="mh-admin-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="mh-admin-header__actions">{actions}</div> : null}
    </div>
  );
}

export function AdminKpiCard({
  label,
  value,
  hint,
  urgent,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  urgent?: number;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp type={onClick ? "button" : undefined} onClick={onClick} className="mh-admin-kpi">
      <div className="mh-admin-kpi__top">
        <span className="mh-admin-kpi__label">{label}</span>
        {urgent && urgent > 0 ? <span className="mh-admin-kpi__urgent">{urgent} URGENT</span> : null}
      </div>
      <div className="mh-admin-kpi__value">{value}</div>
      {hint ? <div className="mh-admin-kpi__hint">{hint}</div> : null}
    </Comp>
  );
}

export function AdminQuickAction({
  label,
  href,
  tone = "brand",
  iconSrc,
}: {
  label: string;
  href: string;
  tone?: "brand" | "ai" | "olive" | "danger";
  iconSrc: string;
}) {
  const router = useRouter();
  return (
    <button type="button" className={`mh-admin-qa mh-admin-qa--${tone}`} onClick={() => router.push(href)}>
      <span className="mh-admin-qa__icon">
        <img src={iconSrc} alt="" width={18} height={18} />
      </span>
      <span className="mh-admin-qa__label">{label}</span>
      <img src="/brand/icons/chevron-right.svg" alt="" width={16} height={16} />
    </button>
  );
}

export function AdminFilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={`mh-admin-chip${active ? " is-active" : ""}`} onClick={onClick}>
      <span className="mh-admin-chip__label">{label}</span>
      <span className="mh-admin-chip__count">{count}</span>
    </button>
  );
}

export function AdminQueueRow({
  title,
  subtitle,
  meta,
  urgent,
  selected,
  onClick,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  urgent?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={`mh-admin-qrow${selected ? " is-selected" : ""}`} onClick={onClick}>
      <span className={`mh-admin-qrow__dot${urgent ? " is-urgent" : ""}`} />
      <span className="mh-admin-qrow__body">
        <span className="mh-admin-qrow__title">
          {title}
          {urgent ? <StatusPill tone="danger">URGENT</StatusPill> : null}
        </span>
        {subtitle ? <span className="mh-admin-qrow__sub">{subtitle}</span> : null}
      </span>
      <span className="mh-admin-qrow__meta">
        {meta ? <span>{meta}</span> : null}
        <img src="/brand/icons/chevron-right.svg" alt="" width={16} height={16} />
      </span>
    </button>
  );
}

export function AdminTableShell({
  columns,
  children,
  countLabel,
  columnTemplate,
}: {
  columns: string[];
  children: ReactNode;
  countLabel?: string;
  /** CSS grid-template-columns; defaults to equal fr tracks */
  columnTemplate?: string;
}) {
  const template = columnTemplate || `repeat(${columns.length}, minmax(0, 1fr))`;
  return (
    <div className="mh-admin-table">
      {countLabel ? <div className="mh-admin-table__count">{countLabel}</div> : null}
      <div className="mh-admin-table__scroll">
        <div className="mh-admin-table__grid" style={{ ["--mh-admin-cols" as string]: template }}>
          <div className="mh-admin-table__head" role="row">
            {columns.map((c) => (
              <div key={c} className="mh-admin-table__cell mh-admin-table__cell--head">
                {c}
              </div>
            ))}
          </div>
          <div className="mh-admin-table__body">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AdminTableRow({
  cells,
  onClick,
}: {
  cells: ReactNode[];
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp type={onClick ? "button" : undefined} className="mh-admin-table__row" onClick={onClick} role="row">
      {cells.map((cell, i) => (
        <div key={i} className="mh-admin-table__cell">
          {cell}
        </div>
      ))}
    </Comp>
  );
}

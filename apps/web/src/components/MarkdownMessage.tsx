"use client";

import { useMemo } from "react";
import { marked, Renderer } from "marked";

const renderer = new Renderer();
renderer.link = ({ href, title, text }) => {
  const safeHref = href?.startsWith("javascript:") ? "#" : href || "#";
  const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
  return `<a href="${escapeAttr(safeHref)}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
});

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Strip obvious XSS vectors from model/API markdown HTML. */
function sanitizeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1="#"');
}

export function renderMarkdownHtml(text: string): string {
  const parsed = marked.parse(text || "", { async: false });
  return sanitizeHtml(typeof parsed === "string" ? parsed : String(parsed));
}

export function MarkdownMessage({
  text,
  className = "mh-ask-md",
}: {
  text: string;
  className?: string;
}) {
  const html = useMemo(() => renderMarkdownHtml(text), [text]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

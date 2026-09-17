"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Metric, Panel } from "@myheritage/ui";
import { ScreenScaffold, ListPanel, MobileChrome } from "@/components/ScreenScaffold";
import { AdminFigmaParityScreen } from "@/components/AdminFigmaParityScreen";
import { TeacherSisScreen } from "@/components/TeacherSisScreen";
import { TEACHER_SCREENS } from "@/lib/teacherCatalog";
import { api, loadSession } from "@/lib/api";
import type { ShellRole } from "@/lib/nav";

export type PortalAction = {
  label: string;
  href?: string;
  action?: string;
  payload?: Record<string, unknown>;
  variant?: "primary" | "secondary" | "ai";
};

export type PortalView = {
  path: string;
  title: string;
  subtitle: string;
  role: ShellRole;
  active: string;
  breadcrumb: string[];
  metrics: Array<{ label: string; value: string; hint?: string }>;
  sections: Array<{
    title: string;
    rows: Array<{ primary: string; secondary?: string; meta?: string; href?: string }>;
  }>;
  actions: PortalAction[];
  live: true;
};

function mimeForFile(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    (
      {
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
      } as Record<string, string>
    )[extension ?? ""] ?? ""
  );
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export function LiveScreen({
  path,
  mobile = false,
  mobileTitle = "Heritage",
  mobileActive = "Home",
}: {
  path: string;
  mobile?: boolean;
  mobileTitle?: string;
  mobileActive?: "Home" | "Courses" | "Schedule" | "Grades" | "More";
}) {
  if (!mobile && path.startsWith("/admin")) {
    return <AdminFigmaParityScreen path={path} />;
  }
  if (!mobile && path.startsWith("/instructor") && TEACHER_SCREENS[path]) {
    return <TeacherSisScreen path={path} />;
  }
  return (
    <GenericLiveScreen path={path} mobile={mobile} mobileTitle={mobileTitle} mobileActive={mobileActive} />
  );
}

function GenericLiveScreen({
  path,
  mobile = false,
  mobileTitle = "Heritage",
  mobileActive = "Home",
}: {
  path: string;
  mobile?: boolean;
  mobileTitle?: string;
  mobileActive?: "Home" | "Courses" | "Schedule" | "Grades" | "More";
}) {
  const router = useRouter();
  const [view, setView] = useState<PortalView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<PortalAction | null>(null);

  const load = useCallback(() => {
    const s = loadSession();
    if (!s) {
      router.replace(mobile ? "/m/login" : "/login");
      return;
    }
    api<PortalView>(`/portal/view?path=${encodeURIComponent(path)}`, {}, s.accessToken)
      .then(setView)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [path, router, mobile]);

  useEffect(() => {
    load();
  }, [load]);

  async function postAction(a: PortalAction, payload?: Record<string, unknown>) {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    const endpoint = path.startsWith("/employer") ? "/employer/action" : path.startsWith("/applicant") ? "/applicant/action" : null;
    if (!endpoint) {
      if (a.href) router.push(a.href);
      return;
    }
    setBusyAction(a.label);
    setError(null);
    try {
      const res = await api<{ view?: PortalView }>(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify({ action: a.action, payload: payload ?? a.payload, path }),
        },
        s.accessToken,
      );
      if (res.view) setView(res.view);
      else load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function runAction(a: PortalAction) {
    if (a.href && !a.action) {
      router.push(a.href);
      return;
    }
    if (!a.action) return;
    if (a.action === "upload_document") {
      pendingUploadRef.current = a;
      fileInputRef.current?.click();
      return;
    }
    await postAction(a);
  }

  async function onUploadFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const pending = pendingUploadRef.current;
    event.target.value = "";
    pendingUploadRef.current = null;
    if (!file || !pending?.action) return;
    const mimeType = mimeForFile(file);
    const contentBase64 = toBase64(new Uint8Array(await file.arrayBuffer()));
    await postAction(pending, {
      ...(pending.payload ?? {}),
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
      contentBase64,
    });
  }

  if (error && !view) {
    const body = (
      <div style={{ color: "var(--mh-danger)", padding: "1rem 0" }}>
        {error}
        <div style={{ marginTop: 12 }}>
          <Button type="button" variant="secondary" onClick={() => router.push(mobile ? "/m/login" : "/login")}>
            Sign in again
          </Button>
        </div>
      </div>
    );
    return mobile ? <MobileChrome title={mobileTitle}>{body}</MobileChrome> : body;
  }

  if (!view) {
    const loading = <p style={{ color: "var(--mh-text-muted)" }}>Loading live data…</p>;
    return mobile ? <MobileChrome title={mobileTitle}>{loading}</MobileChrome> : loading;
  }

  const content = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        style={{ display: "none" }}
        onChange={(event) => void onUploadFileSelected(event)}
      />
      {error ? <p style={{ color: "var(--mh-danger)", marginBottom: 12 }}>{error}</p> : null}
      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        {view.metrics.map((m) => (
          <Metric key={m.label} label={m.label} value={m.value} hint={m.hint} />
        ))}
      </div>

      {view.actions.length ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {view.actions.map((a) => (
            <Button
              key={(a.action ?? a.href ?? "") + a.label}
              type="button"
              variant={a.variant ?? "primary"}
              disabled={busyAction === a.label}
              onClick={() => runAction(a)}
            >
              {busyAction === a.label ? "Working…" : a.label}
            </Button>
          ))}
        </div>
      ) : null}

      {view.sections.map((section) => (
        <Panel key={section.title} title={section.title}>
          {!section.rows.length ? (
            <p style={{ margin: 0, color: "var(--mh-text-muted)" }}>No records yet for your account.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.65rem" }}>
              {section.rows.map((row, i) => (
                <li
                  key={`${section.title}-${row.primary}-${row.secondary ?? ""}-${row.meta ?? ""}-${i}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                    paddingBottom: "0.65rem",
                    borderBottom: "1px solid var(--mh-border)",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{row.primary}</div>
                    {row.secondary ? (
                      <div style={{ color: "var(--mh-text-muted)", fontSize: "var(--mh-body-compact)" }}>{row.secondary}</div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {row.meta ? (
                      <span style={{ color: "var(--mh-text-muted)", fontSize: "var(--mh-body-compact)" }}>{row.meta}</span>
                    ) : null}
                    {row.href ? (
                      <Button
                        type="button"
                        variant="secondary"
                        style={{ padding: "6px 10px", fontSize: 13 }}
                        onClick={() => router.push(row.href!)}
                      >
                        Open
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ))}
    </>
  );

  if (mobile) {
    return (
      <MobileChrome title={mobileTitle} active={mobileActive}>
        <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>{view.title}</h1>
        <p style={{ margin: "0 0 16px", color: "var(--mh-text-muted)", fontSize: 13 }}>{view.subtitle}</p>
        {content}
      </MobileChrome>
    );
  }

  return (
    <ScreenScaffold
      role={view.role}
      title={view.title}
      subtitle={view.subtitle}
      breadcrumb={view.breadcrumb}
      active={view.active}
    >
      {content}
    </ScreenScaffold>
  );
}

export { ListPanel };

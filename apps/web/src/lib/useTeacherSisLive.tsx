"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, loadSession } from "@/lib/api";
import type { TeacherScreenConfig } from "@/lib/teacherCatalog";

type TeacherLiveResponse = {
  path: string;
  live: true;
  source: "domain";
  bootstrap?: {
    displayName: string;
    email: string;
    studentCount: number;
    sectionCount: number;
    draftGradeCount: number;
    unreadNotifications: number;
  };
  payload: Partial<TeacherScreenConfig> & Record<string, unknown>;
  ok?: boolean;
  action?: string;
  message?: string;
};

type TeacherLiveContextValue = {
  path: string;
  loading: boolean;
  error: string | null;
  source: string | null;
  busy: boolean;
  toast: string | null;
  bootstrap: TeacherLiveResponse["bootstrap"] | null;
  refresh: () => Promise<void>;
  runAction: (action: string, rowKey?: string) => Promise<void>;
};

const TeacherLiveContext = createContext<TeacherLiveContextValue | null>(null);

/**
 * Only layout/chrome from catalog is kept.
 * Every data field must come from `/instructor/sis/screen` — never catalog fixtures.
 */
const CHROME_KEYS = new Set([
  "path",
  "figmaId",
  "title",
  "subtitle",
  "breadcrumbs",
  "activeHref",
  "archetype",
  "shell",
  "primaryAction",
  "primaryActionHref",
  "secondaryAction",
  "secondaryActionHref",
  "searchPlaceholder",
  "filters",
  "columns",
  "columnTemplate",
]);

function chromeOnly(chrome: TeacherScreenConfig, loading: boolean): TeacherScreenConfig {
  const out: Record<string, unknown> = {
    rows: [],
    kpis: [],
    countLabel: loading ? "Loading…" : "0 records",
  };
  for (const key of CHROME_KEYS) {
    const value = (chrome as unknown as Record<string, unknown>)[key];
    if (value !== undefined) out[key] = value;
  }
  if (loading) out.subtitle = "Loading live data…";
  return out as unknown as TeacherScreenConfig;
}

export function mergeTeacherLive(
  chrome: TeacherScreenConfig,
  payload: Partial<TeacherScreenConfig> | null | undefined,
  loading: boolean,
): TeacherScreenConfig {
  const base = chromeOnly(chrome, loading);
  if (!payload) return base;

  const merged: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) };
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (CHROME_KEYS.has(key) && key !== "title" && key !== "subtitle" && key !== "primaryActionHref") {
      continue;
    }
    merged[key] = value;
  }
  return merged as unknown as TeacherScreenConfig;
}

export function TeacherLiveProvider({
  path,
  children,
}: {
  path: string;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [payload, setPayload] = useState<Partial<TeacherScreenConfig> | null>(null);
  const [bootstrap, setBootstrap] = useState<TeacherLiveResponse["bootstrap"] | null>(null);

  const refresh = useCallback(async () => {
    const session = loadSession();
    if (!session?.accessToken) {
      setError("Not signed in");
      setLoading(false);
      setPayload(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api<TeacherLiveResponse>(
        `/instructor/sis/screen?path=${encodeURIComponent(path)}`,
        {},
        session.accessToken,
      );
      setSource(res.source ?? "domain");
      setPayload(res.payload ?? null);
      setBootstrap(res.bootstrap ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load live data");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = useCallback(
    async (action: string, rowKey?: string) => {
      const session = loadSession();
      if (!session?.accessToken) {
        setToast("Sign in required");
        return;
      }
      setBusy(true);
      setToast(null);
      try {
        const res = await api<TeacherLiveResponse>(
          `/instructor/sis/action`,
          {
            method: "POST",
            body: JSON.stringify({ path, action, rowKey }),
          },
          session.accessToken,
        );
        setSource(res.source ?? "domain");
        if (res.payload) setPayload(res.payload);
        if (res.bootstrap) setBootstrap(res.bootstrap);
        setToast(res.message || `Saved · ${action}`);
        window.setTimeout(() => setToast(null), 2800);
      } catch (err) {
        setToast(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [path],
  );

  const value = useMemo(
    () => ({ path, loading, error, source, busy, toast, bootstrap, refresh, runAction }),
    [path, loading, error, source, busy, toast, bootstrap, refresh, runAction],
  );

  return (
    <TeacherLiveContext.Provider value={value}>
      <TeacherLivePayloadContext.Provider value={{ payload, loading }}>
        {children}
      </TeacherLivePayloadContext.Provider>
    </TeacherLiveContext.Provider>
  );
}

const TeacherLivePayloadContext = createContext<{
  payload: Partial<TeacherScreenConfig> | null;
  loading: boolean;
}>({ payload: null, loading: true });

export function useTeacherLive() {
  const ctx = useContext(TeacherLiveContext);
  if (!ctx) throw new Error("useTeacherLive requires TeacherLiveProvider");
  return ctx;
}

export function useTeacherLivePayload() {
  return useContext(TeacherLivePayloadContext);
}

export function useOptionalTeacherLive() {
  return useContext(TeacherLiveContext);
}

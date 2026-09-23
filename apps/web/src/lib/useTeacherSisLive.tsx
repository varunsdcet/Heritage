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
    workshopCounts?: {
    pending?: number;
    approved?: number;
    declined?: number;
    available?: number;
    completed?: number;
  };
  statusCounts?: Record<string, number>;
  flagCount?: number;
  alertCount?: number;
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
  runAction: (action: string, rowKey?: string) => Promise<boolean>;
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

type FileManagerState = NonNullable<TeacherScreenConfig["fileManager"]>;

function mergeFileManager(
  chromeFm: FileManagerState | undefined,
  liveFm: FileManagerState | undefined,
): FileManagerState | undefined {
  if (!chromeFm) return liveFm;
  if (!liveFm) return chromeFm;
  const filesByKey = new Map<string, FileManagerState["files"][number]>();
  for (const file of [...chromeFm.files, ...liveFm.files]) {
    filesByKey.set(`${file.folder ?? ""}::${file.name}`, file);
  }
  const treeByName = new Map<string, FileManagerState["tree"][number]>();
  for (const node of [...chromeFm.tree, ...liveFm.tree]) {
    const prev = treeByName.get(node.name);
    treeByName.set(node.name, {
      name: node.name,
      active: Boolean(node.active || prev?.active),
      children: [...new Set([...(prev?.children ?? []), ...(node.children ?? [])])],
    });
  }
  return {
    courseTitle: liveFm.courseTitle || chromeFm.courseTitle,
    breadcrumbs: liveFm.breadcrumbs?.length ? liveFm.breadcrumbs : chromeFm.breadcrumbs,
    tree: [...treeByName.values()],
    files: [...filesByKey.values()],
  };
}

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

function mergeForm(
  chromeForm: TeacherScreenConfig["form"] | undefined,
  liveForm: TeacherScreenConfig["form"] | undefined,
): TeacherScreenConfig["form"] | undefined {
  const liveHasFields = Boolean(liveForm?.groups?.some((g) => g.fields.length > 0));
  if (liveHasFields) return liveForm;
  return chromeForm ?? liveForm;
}

function mergeHelpSupport(
  chromeHelp: TeacherScreenConfig["helpSupport"] | undefined,
  liveHelp: TeacherScreenConfig["helpSupport"] | undefined,
): TeacherScreenConfig["helpSupport"] | undefined {
  if (!chromeHelp) return liveHelp;
  if (!liveHelp) return chromeHelp;
  return {
    ...chromeHelp,
    ...liveHelp,
    topics: liveHelp.topics?.length ? liveHelp.topics : chromeHelp.topics,
    references: liveHelp.references?.length ? liveHelp.references : chromeHelp.references,
    tickets: liveHelp.tickets ?? chromeHelp.tickets,
    contacts: liveHelp.contacts?.length ? liveHelp.contacts : chromeHelp.contacts,
    hours: liveHelp.hours || chromeHelp.hours,
    aiReply: liveHelp.aiReply ?? chromeHelp.aiReply ?? null,
  };
}

export function mergeTeacherLive(
  chrome: TeacherScreenConfig,
  payload: Partial<TeacherScreenConfig> | null | undefined,
  loading: boolean,
): TeacherScreenConfig {
  const base = chromeOnly(chrome, loading);
  if (!payload) {
    const fileManager = mergeFileManager(chrome.fileManager, undefined);
    if (fileManager) (base as TeacherScreenConfig).fileManager = fileManager;
    const form = mergeForm(chrome.form, undefined);
    if (form) (base as TeacherScreenConfig).form = form;
    if (chrome.studentsDirectory) (base as TeacherScreenConfig).studentsDirectory = chrome.studentsDirectory;
    if (chrome.courseMgmt) (base as TeacherScreenConfig).courseMgmt = chrome.courseMgmt;
    if (chrome.activeCourses) (base as TeacherScreenConfig).activeCourses = chrome.activeCourses;
    if (chrome.courseList) (base as TeacherScreenConfig).courseList = chrome.courseList;
    if (chrome.hub) (base as TeacherScreenConfig).hub = chrome.hub;
    if (chrome.programDirectory) (base as TeacherScreenConfig).programDirectory = chrome.programDirectory;
    if (chrome.facultiesPrograms) (base as TeacherScreenConfig).facultiesPrograms = chrome.facultiesPrograms;
    if (chrome.programSettings) (base as TeacherScreenConfig).programSettings = chrome.programSettings;
    if (chrome.courseConfigurations) (base as TeacherScreenConfig).courseConfigurations = chrome.courseConfigurations;
    if (chrome.courseHistory) (base as TeacherScreenConfig).courseHistory = chrome.courseHistory;
    if (chrome.gradingSchemes) (base as TeacherScreenConfig).gradingSchemes = chrome.gradingSchemes;
    if (chrome.programTypes) (base as TeacherScreenConfig).programTypes = chrome.programTypes;
    if (chrome.courseTypes) (base as TeacherScreenConfig).courseTypes = chrome.courseTypes;
    if (chrome.manageTerms) (base as TeacherScreenConfig).manageTerms = chrome.manageTerms;
    if (chrome.reviewTerm) (base as TeacherScreenConfig).reviewTerm = chrome.reviewTerm;
    if (chrome.scheduleManage) (base as TeacherScreenConfig).scheduleManage = chrome.scheduleManage;
    if (chrome.coursesSessions) (base as TeacherScreenConfig).coursesSessions = chrome.coursesSessions;
    if (chrome.courseAdmin) (base as TeacherScreenConfig).courseAdmin = chrome.courseAdmin;
    if (chrome.masterScheduling) (base as TeacherScreenConfig).masterScheduling = chrome.masterScheduling;
    if (chrome.academicCalendars) (base as TeacherScreenConfig).academicCalendars = chrome.academicCalendars;
    if (chrome.workshopEnrolments) (base as TeacherScreenConfig).workshopEnrolments = chrome.workshopEnrolments;
    if (chrome.workshopAttendance) (base as TeacherScreenConfig).workshopAttendance = chrome.workshopAttendance;
    if (chrome.workshops) (base as TeacherScreenConfig).workshops = chrome.workshops;
    if (chrome.courseDetail && !loading) (base as TeacherScreenConfig).courseDetail = chrome.courseDetail;
    if (chrome.courseTextbooks && !loading) (base as TeacherScreenConfig).courseTextbooks = chrome.courseTextbooks;
    if (chrome.contentRepository && !loading) (base as TeacherScreenConfig).contentRepository = chrome.contentRepository;
    if (loading) {
      base.title = "Loading section…";
      base.subtitle = "Loading live Heritage course data…";
    }
    const helpSupport = mergeHelpSupport(chrome.helpSupport, undefined);
    if (helpSupport) (base as TeacherScreenConfig).helpSupport = helpSupport;
    return base;
  }

  const merged: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) };
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    // Live domain may switch archetype (e.g. HCC My Courses / Students screens).
    if (
      CHROME_KEYS.has(key) &&
      key !== "title" &&
      key !== "subtitle" &&
      key !== "primaryAction" &&
      key !== "primaryActionHref" &&
      key !== "archetype" &&
      key !== "breadcrumbs"
    ) {
      continue;
    }
    merged[key] = value;
  }
  const fileManager = mergeFileManager(chrome.fileManager, merged.fileManager as FileManagerState | undefined);
  if (fileManager) merged.fileManager = fileManager;
  const form = mergeForm(chrome.form, merged.form as TeacherScreenConfig["form"] | undefined);
  if (form) merged.form = form;
  const liveStudents = merged.studentsDirectory as TeacherScreenConfig["studentsDirectory"] | undefined;
  if ((!liveStudents?.students?.length) && chrome.studentsDirectory) {
    merged.studentsDirectory = chrome.studentsDirectory;
  }
  // Navigation hubs are chrome structure; keep catalog cards/tools when live payload omitted them
  // (e.g. older API routed these paths to courseList / empty domain).
  if (!(merged as TeacherScreenConfig).courseMgmt && chrome.courseMgmt) {
    merged.courseMgmt = chrome.courseMgmt;
    if (chrome.archetype === "courseMgmt") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).activeCourses && chrome.activeCourses) {
    merged.activeCourses = chrome.activeCourses;
    if (chrome.archetype === "activeCourses") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).courseList && chrome.courseList) {
    merged.courseList = chrome.courseList;
    if (chrome.archetype === "courseList") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).hub && chrome.hub) {
    merged.hub = chrome.hub;
    if (chrome.archetype === "hub") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).programDirectory && chrome.programDirectory) {
    merged.programDirectory = chrome.programDirectory;
  }
  const liveFaculties = (merged as TeacherScreenConfig).facultiesPrograms;
  if (!liveFaculties?.faculties?.length && chrome.facultiesPrograms?.faculties?.length) {
    merged.facultiesPrograms = chrome.facultiesPrograms;
    if (chrome.archetype === "facultiesPrograms") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  const liveProgramSettings = (merged as TeacherScreenConfig).programSettings;
  if (!liveProgramSettings?.programId && chrome.programSettings) {
    merged.programSettings = {
      ...chrome.programSettings,
      ...liveProgramSettings,
      tabs: liveProgramSettings?.tabs?.length ? liveProgramSettings.tabs : chrome.programSettings.tabs,
      groups: liveProgramSettings?.groups?.length ? liveProgramSettings.groups : chrome.programSettings.groups,
      audits: liveProgramSettings?.audits ?? chrome.programSettings.audits,
    };
    if (chrome.archetype === "programSettings") {
      if (!merged.title || merged.title === "Instructor") merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  } else if (liveProgramSettings && chrome.archetype === "programSettings") {
    // Prefer live title (includes program name) when present.
    if (!merged.title) merged.title = chrome.title;
  }
  const liveCourseConfigs = (merged as TeacherScreenConfig).courseConfigurations;
  if (!liveCourseConfigs?.courses?.length && chrome.courseConfigurations?.courses?.length) {
    merged.courseConfigurations = chrome.courseConfigurations;
    if (chrome.archetype === "courseConfigurations") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).courseHistory && chrome.courseHistory) {
    merged.courseHistory = chrome.courseHistory;
    if (chrome.archetype === "courseHistory") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).gradingSchemes && chrome.gradingSchemes) {
    merged.gradingSchemes = chrome.gradingSchemes;
    if (chrome.archetype === "gradingSchemes") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).programTypes && chrome.programTypes) {
    merged.programTypes = chrome.programTypes;
    if (chrome.archetype === "programTypes") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).courseTypes && chrome.courseTypes) {
    merged.courseTypes = chrome.courseTypes;
    if (chrome.archetype === "courseTypes") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).manageTerms && chrome.manageTerms) {
    merged.manageTerms = chrome.manageTerms;
    if (chrome.archetype === "manageTerms") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).reviewTerm && chrome.reviewTerm) {
    merged.reviewTerm = chrome.reviewTerm;
    if (chrome.archetype === "reviewTerm") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).scheduleManage && chrome.scheduleManage) {
    merged.scheduleManage = chrome.scheduleManage;
    if (chrome.archetype === "scheduleManage") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).coursesSessions && chrome.coursesSessions) {
    merged.coursesSessions = chrome.coursesSessions;
    if (chrome.archetype === "coursesSessions") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).courseAdmin && chrome.courseAdmin) {
    merged.courseAdmin = chrome.courseAdmin;
    if (chrome.archetype === "courseAdmin") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  const liveMaster = merged.masterScheduling as TeacherScreenConfig["masterScheduling"] | undefined;
  if (chrome.masterScheduling) {
    merged.masterScheduling = {
      ...chrome.masterScheduling,
      ...liveMaster,
      programOptions: chrome.masterScheduling.programOptions ?? liveMaster?.programOptions,
      rows: liveMaster?.rows ?? chrome.masterScheduling.rows,
    };
    if (chrome.archetype === "masterScheduling") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  } else if (!liveMaster && chrome.masterScheduling) {
    merged.masterScheduling = chrome.masterScheduling;
  }
  const liveCal = merged.academicCalendars as TeacherScreenConfig["academicCalendars"] | undefined;
  if (chrome.academicCalendars) {
    merged.academicCalendars = {
      ...chrome.academicCalendars,
      ...liveCal,
      rows: liveCal?.rows ?? chrome.academicCalendars.rows,
    };
    if (chrome.archetype === "academicCalendars") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).courseTextbooks && chrome.courseTextbooks) {
    merged.courseTextbooks = chrome.courseTextbooks;
    if (chrome.archetype === "courseTextbooks") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  if (!(merged as TeacherScreenConfig).contentRepository && chrome.contentRepository) {
    merged.contentRepository = chrome.contentRepository;
    if (chrome.archetype === "contentRepository") {
      merged.title = chrome.title;
      if (!loading) merged.subtitle = chrome.subtitle;
    }
  }
  const helpSupport = mergeHelpSupport(chrome.helpSupport, merged.helpSupport as TeacherScreenConfig["helpSupport"] | undefined);
  if (helpSupport) {
    merged.helpSupport = helpSupport;
    if (chrome.archetype === "helpSupport") {
      const liveTitle = String(merged.title || "");
      if (!liveTitle || liveTitle === "Instructor") merged.title = chrome.title;
      if (!loading) {
        const liveSub = String(merged.subtitle || "");
        if (!liveSub || /· live$/i.test(liveSub)) merged.subtitle = chrome.subtitle;
      }
    }
  }
  return merged as unknown as TeacherScreenConfig;
}

export function TeacherLiveProvider({
  path,
  studentId,
  children,
}: {
  path: string;
  studentId?: string | null;
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
    // Drop stale rows immediately so filter changes never show the previous result set.
    setPayload(null);
    try {
      const qs = new URLSearchParams();
      qs.set("path", path);
      if (studentId) qs.set("studentId", studentId);
      const res = await api<TeacherLiveResponse>(
        `/instructor/sis/screen?${qs.toString()}`,
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
  }, [path, studentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = useCallback(
    async (action: string, rowKey?: string) => {
      const session = loadSession();
      if (!session?.accessToken) {
        setToast("Sign in required");
        return false;
      }
      setBusy(true);
      setToast(null);
      try {
        const res = await api<TeacherLiveResponse & { result?: { href?: string } }>(
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
        const nextHref =
          typeof res.result?.href === "string" && res.result.href.startsWith("/")
            ? res.result.href
            : null;
        if (nextHref) {
          window.location.assign(nextHref);
          return true;
        }
        setToast(res.message || `Saved · ${action}`);
        window.setTimeout(() => setToast(null), 2800);
        return res.ok !== false;
      } catch (err) {
        setToast(err instanceof Error ? err.message : "Action failed");
        return false;
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

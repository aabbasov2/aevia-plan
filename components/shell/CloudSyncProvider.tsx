"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Cloud, LoaderCircle, RefreshCw } from "lucide-react";
import { DEFAULT_PLANNER_PREFERENCES } from "@/lib/preferences";
import { hasLegacyStoreData, hasScopedStoreData, preserveLegacyStoreForAccount, setStoreAccountScope, useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

const LAST_ACCOUNT_KEY = "aevia-last-synced-account";
const pendingAccountKey = (userId: string) => `aevia-pending-sync:${userId}`;
type Workspace = {
  tasks: unknown[];
  events: unknown[];
  commitments: unknown[];
  plannerPreferences: Record<string, unknown>;
  todayBackground: string;
  focusSession: unknown | null;
  focusHistory: unknown[];
  capturedDistractions: unknown[];
  inboxItems: unknown[];
  assistantMessages: Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: number }>;
};
type LoadResult = { revision: number | string; has_workspace: boolean; state: Workspace | null };
type Phase = "loading" | "ready" | "import" | "error";
const AUTH_REQUEST_TIMEOUT_MS = 15_000;
const WORKSPACE_REQUEST_TIMEOUT_MS = 20_000;

function withTimeout<T>(request: PromiseLike<T>, timeoutMs: number, description: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(description)), timeoutMs);
    Promise.resolve(request).then(
      (value) => { window.clearTimeout(timeout); resolve(value); },
      (error) => { window.clearTimeout(timeout); reject(error); },
    );
  });
}

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/signin";
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadingMessage, setLoadingMessage] = useState("Checking your sign-in…");
  const [syncError, setSyncError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [importCandidate, setImportCandidate] = useState<Workspace | null>(null);
  const [cloudCandidate, setCloudCandidate] = useState<Workspace | null>(null);
  const [importMode, setImportMode] = useState<"local-import" | "first-device-merge" | "unsynced-conflict">("local-import");
  const revision = useRef(0);
  const subscription = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const pending = useRef(false);
  const blockedByConflict = useRef(false);
  const currentUserId = useRef("");
  const remoteReady = useRef(false);
  const authSubscription = useRef<{ unsubscribe: () => void } | null>(null);

  const disposeSync = useCallback(() => {
    subscription.current?.();
    subscription.current = null;
    authSubscription.current?.unsubscribe();
    authSubscription.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    remoteReady.current = false;
  }, []);

  const saveCurrentWorkspace = useCallback(async (retry = false) => {
    if (!remoteReady.current || !currentUserId.current) return;
    if (blockedByConflict.current && !retry) return;
    if (saving.current) { pending.current = true; return; }
    saving.current = true;
    pending.current = false;
    const state = useStore.getState();
    const taskIds = new Set(state.tasks.map((task) => task.id));
    const focusSessionIds = new Set([...state.focusHistory.map((session) => session.id), ...(state.focusSession ? [state.focusSession.id] : [])]);
    const cleanSessionTask = <T extends { taskId?: string }>(session: T | null): T | null => session
      ? { ...session, taskId: session.taskId && taskIds.has(session.taskId) ? session.taskId : undefined }
      : null;
    const payload: Workspace = {
      tasks: state.tasks,
      events: state.events,
      commitments: state.commitments,
      plannerPreferences: { ...state.plannerPreferences, timezone: state.plannerPreferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone },
      todayBackground: state.todayBackground,
      focusSession: cleanSessionTask(state.focusSession),
      focusHistory: state.focusHistory.map((session) => cleanSessionTask(session)!),
      capturedDistractions: state.capturedDistractions.map((thought) => ({
        ...thought,
        sessionId: thought.sessionId && focusSessionIds.has(thought.sessionId) ? thought.sessionId : undefined,
      })),
      inboxItems: state.inboxItems,
      assistantMessages: state.assistantMessages,
    };
    setSyncError("");
    try {
      const result = await createClient().rpc("save_aevia_workspace", { p_state: payload, p_expected_revision: revision.current });
      if (result.error) {
        if (result.error.code === "40001" || result.error.message.toLowerCase().includes("workspace conflict")) blockedByConflict.current = true;
        throw result.error;
      }
      revision.current = Number(result.data);
      if (state.assistantMessages.length) {
        const chatSave = await createClient().from("assistant_messages").upsert(
          state.assistantMessages.map((message) => ({
            user_id: currentUserId.current,
            id: message.id,
            role: message.role,
            content: message.content,
            created_at: new Date(message.createdAt).toISOString(),
          })),
          { onConflict: "user_id,id" },
        );
        if (chatSave.error && chatSave.error.code !== "42P01" && chatSave.error.code !== "PGRST205") throw chatSave.error;
      }
      localStorage.setItem(LAST_ACCOUNT_KEY, currentUserId.current);
      if (!pending.current) localStorage.removeItem(pendingAccountKey(currentUserId.current));
      setLastSavedAt(Date.now());
    } catch {
      setSyncError(blockedByConflict.current
        ? "This plan changed on another device. Reload the cloud copy before continuing here."
        : "Your changes are saved on this device, but haven’t reached the cloud yet.");
    } finally {
      saving.current = false;
      if (pending.current && !blockedByConflict.current) {
        timer.current = setTimeout(() => void saveCurrentWorkspace(), 250);
      }
    }
  }, []);

  const connectWorkspace = useCallback(async (userId: string) => {
    disposeSync();
    currentUserId.current = userId;
    setPhase("loading");
    setLoadingMessage("Loading your private plan…");
    setSyncError("");
    blockedByConflict.current = false;
    const lastAccount = localStorage.getItem(LAST_ACCOUNT_KEY);
    if (lastAccount && lastAccount !== userId) preserveLegacyStoreForAccount(lastAccount);
    setStoreAccountScope(userId, !lastAccount || lastAccount === userId);
    await useStore.persist.rehydrate();
    const local = snapshotLocalWorkspace();
    const hasAccountScopedLocal = hasScopedStoreData(userId);
    const { data, error } = await withTimeout(
      createClient().rpc("load_aevia_workspace"),
      WORKSPACE_REQUEST_TIMEOUT_MS,
      "Supabase took too long to load your plan. Check your connection and try again.",
    );
    if (error) {
      const message = error.message.toLowerCase();
      if (error.code === "PGRST202" || message.includes("could not find the function") || message.includes("schema cache")) {
        throw new Error("Aevia’s workspace database setup is missing. Apply the Aevia alpha migration in Supabase, then try again.");
      }
      if (error.code === "42501" || message.includes("permission denied")) {
        throw new Error("Supabase denied access to Aevia’s workspace. Check that the alpha migration completed successfully.");
      }
      throw error;
    }
    const loaded = data as LoadResult;
    if (loaded.state) {
      const { data: messages, error: messagesError } = await createClient()
        .from("assistant_messages")
        .select("id, role, content, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      const cloudMessages = messagesError ? [] : [...(messages ?? [])].reverse().map((message) => ({
        id: message.id,
        role: message.role as "user" | "assistant",
        content: message.content,
        createdAt: new Date(message.created_at).getTime(),
      }));
      loaded.state.assistantMessages = Array.from(new Map([...local.assistantMessages, ...cloudMessages].map((message) => [message.id, message])).values())
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(-100);
    }
    revision.current = Number(loaded.revision ?? 0);

    const pendingLocalChanges = localStorage.getItem(pendingAccountKey(userId)) === "true";
    if (loaded.has_workspace && loaded.state && pendingLocalChanges && hasLocalData(local)) {
      setImportCandidate(local);
      setCloudCandidate(loaded.state);
      setImportMode("unsynced-conflict");
      setPhase("import");
      return;
    } else if (hasLegacyStoreData() && (!lastAccount || lastAccount === userId) && hasLocalData(local)) {
      setImportCandidate(local);
      setCloudCandidate(loaded.has_workspace ? loaded.state : null);
      setImportMode(loaded.has_workspace ? "first-device-merge" : "local-import");
      setPhase("import");
      return;
    } else if (loaded.has_workspace && loaded.state) {
      applyWorkspace(loaded.state);
      localStorage.setItem(LAST_ACCOUNT_KEY, userId);
    } else if (hasAccountScopedLocal && hasLocalData(local)) {
      applyWorkspace(local);
      remoteReady.current = true;
      await saveCurrentWorkspace();
    } else {
      applyWorkspace(emptyWorkspace());
      remoteReady.current = true;
      await saveCurrentWorkspace();
    }

    remoteReady.current = true;
    subscription.current = useStore.subscribe(() => {
      if (!remoteReady.current) return;
      localStorage.setItem(pendingAccountKey(currentUserId.current), "true");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void saveCurrentWorkspace(), 650);
    });
    setPhase("ready");
  }, [disposeSync, saveCurrentWorkspace]);

  useEffect(() => {
    if (isPublicRoute) {
      disposeSync();
      setPhase("ready");
      return;
    }
    let cancelled = false;
    let active = false;
    async function start() {
      try {
        const supabase = createClient();
        setLoadingMessage("Checking your sign-in…");
        const { data, error } = await withTimeout(
          supabase.auth.getUser(),
          AUTH_REQUEST_TIMEOUT_MS,
          "Supabase sign-in is taking too long. Check your connection and try again.",
        );
        if (error || !data.user) throw new Error("Your session has expired. Sign in again to open your plan.");
        if (cancelled || active) return;
        active = true;
        await connectWorkspace(data.user.id);
        if (!cancelled) {
          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !session)) window.location.assign("/signin");
          });
          authSubscription.current = authListener.subscription;
        }
      } catch (error) {
        if (!cancelled) {
          setSyncError(error instanceof Error ? error.message : "We couldn’t load your private workspace.");
          setPhase("error");
        }
      }
    }
    void start();
    return () => { cancelled = true; disposeSync(); };
  }, [connectWorkspace, disposeSync, isPublicRoute]);

  async function chooseImport(importLocal: boolean) {
    if (!importCandidate) return;
    const shouldSave = importLocal || importMode === "local-import";
    if (importLocal && importMode === "first-device-merge" && cloudCandidate) applyWorkspace(mergeWorkspaces(cloudCandidate, importCandidate));
    else if (importLocal) applyWorkspace(importCandidate);
    else if (importMode === "unsynced-conflict" && cloudCandidate) applyWorkspace(cloudCandidate);
    else applyWorkspace(emptyWorkspace());
    setImportCandidate(null);
    setCloudCandidate(null);
    remoteReady.current = shouldSave;
    if (shouldSave) await saveCurrentWorkspace();
    else {
      localStorage.setItem(LAST_ACCOUNT_KEY, currentUserId.current);
      localStorage.removeItem(pendingAccountKey(currentUserId.current));
    }
    remoteReady.current = true;
    subscription.current = useStore.subscribe(() => {
      localStorage.setItem(pendingAccountKey(currentUserId.current), "true");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void saveCurrentWorkspace(), 650);
    });
    setPhase("ready");
  }

  async function reloadCloudCopy() {
    blockedByConflict.current = false;
    setPhase("loading");
    try {
      const { data, error } = await createClient().rpc("load_aevia_workspace");
      if (error) throw error;
      const loaded = data as LoadResult;
      if (loaded.state) applyWorkspace(loaded.state);
      revision.current = Number(loaded.revision ?? 0);
      setSyncError("");
      setPhase("ready");
    } catch {
      setSyncError("Couldn’t reload the cloud plan. Your local copy is still available.");
      setPhase("error");
    }
  }

  if (isPublicRoute) return <>{children}</>;
  if (phase === "loading" || phase === "error") return <main className="flex min-h-screen items-center justify-center px-6"><div className="card w-full max-w-md p-6 text-center">
    {phase === "loading" ? <><LoaderCircle className="mx-auto animate-spin text-gold" size={24} /><p className="mt-4 text-[14px] text-fg">Opening your private plan…</p><p className="mt-2 text-[11px] text-fg-muted">{loadingMessage}</p></> : <><AlertTriangle className="mx-auto text-[#e67b89]" size={24} /><p className="mt-4 text-[14px] text-fg">{syncError || "We couldn’t open your private plan."}</p><div className="mt-5 flex justify-center gap-2"><button type="button" className="btn" onClick={() => window.location.assign("/signin")}>Sign in again</button><button type="button" className="btn btn-gold" onClick={() => window.location.reload()}>Try again</button></div></>}
  </div></main>;
  if (phase === "import") return <main className="flex min-h-screen items-center justify-center px-6"><section className="card w-full max-w-lg p-6 sm:p-8"><Cloud className="text-gold" size={24} /><h1 className="mt-4 text-[20px] font-medium text-fg">{importMode === "unsynced-conflict" ? "Choose which plan to keep" : importMode === "first-device-merge" ? "Merge this browser with your plan?" : "Bring this browser’s plan?"}</h1><p className="mt-2 text-[13px] leading-6 text-fg-muted">{importMode === "unsynced-conflict" ? "This browser has changes that didn’t finish syncing. Keep those changes, or load the latest saved plan from your account." : importMode === "first-device-merge" ? `This browser has ${importCandidate?.tasks.length ?? 0} tasks, ${importCandidate?.events.length ?? 0} events, and ${importCandidate?.capturedDistractions.length ?? 0} thoughts saved locally. Your account already has a cloud plan. Merge only if the browser data belongs to this account.` : <>This browser has {importCandidate?.tasks.length ?? 0} tasks, {importCandidate?.events.length ?? 0} events, and {importCandidate?.capturedDistractions.length ?? 0} thoughts saved locally. That older data was not tied to an account. Import it only if it belongs to this account.</>}</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" className="btn btn-gold" onClick={() => void chooseImport(true)}>{importMode === "unsynced-conflict" ? "Keep browser changes" : importMode === "first-device-merge" ? "Merge both plans" : "Import this plan"}</button><button type="button" className="btn" onClick={() => void chooseImport(false)}>{importMode === "unsynced-conflict" || importMode === "first-device-merge" ? "Use cloud plan" : "Start with a clean plan"}</button></div></section></main>;

  return <>{syncError && <div role="status" className="fixed bottom-20 right-4 z-[80] flex max-w-[min(440px,calc(100vw-2rem))] items-start gap-2 rounded-xl border border-amber-300/25 bg-[var(--surface)] px-4 py-3 text-[12px] text-fg shadow-elev md:bottom-4"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#dfb45f]" /><span className="flex-1">{syncError}</span>{blockedByConflict.current ? <button className="btn h-7 shrink-0 px-2 text-[10px]" onClick={() => void reloadCloudCopy()}><RefreshCw size={12} />Reload</button> : <button className="btn h-7 shrink-0 px-2 text-[10px]" onClick={() => void saveCurrentWorkspace(true)}><RefreshCw size={12} />Retry</button>}</div>}
    {lastSavedAt && !syncError && <span aria-live="polite" className="fixed bottom-3 right-4 z-20 hidden items-center gap-1.5 text-[10px] text-fg-subtle xl:flex"><CheckCircle2 size={12} className="text-emerald-300" />Saved to your account</span>}
    {children}</>;
}

function emptyWorkspace(): Workspace {
  return { tasks: [], events: [], commitments: [], plannerPreferences: { ...DEFAULT_PLANNER_PREFERENCES, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }, todayBackground: "mountains", focusSession: null, focusHistory: [], capturedDistractions: [], inboxItems: [], assistantMessages: [] };
}

function snapshotLocalWorkspace(): Workspace {
  const state = useStore.getState();
  return { tasks: state.tasks, events: state.events, commitments: state.commitments, plannerPreferences: state.plannerPreferences, todayBackground: state.todayBackground, focusSession: state.focusSession, focusHistory: state.focusHistory, capturedDistractions: state.capturedDistractions, inboxItems: state.inboxItems, assistantMessages: state.assistantMessages };
}

function hasLocalData(state: Workspace) {
  return state.tasks.length > 0 || state.events.length > 0 || state.commitments.length > 0 || state.capturedDistractions.length > 0 || state.focusHistory.length > 0 || state.focusSession !== null || state.inboxItems.length > 0 || state.assistantMessages.length > 0 || state.todayBackground !== "mountains" || JSON.stringify(state.plannerPreferences) !== JSON.stringify(DEFAULT_PLANNER_PREFERENCES);
}

function mergeWorkspaces(cloud: Workspace, local: Workspace): Workspace {
  const mergeById = <T extends { id: string }>(fromCloud: T[], fromLocal: T[]) => Array.from(new Map([...fromCloud, ...fromLocal].map((item) => [item.id, item])).values());
  return {
    ...cloud,
    tasks: mergeById(cloud.tasks as Array<{ id: string }>, local.tasks as Array<{ id: string }>),
    events: mergeById(cloud.events as Array<{ id: string }>, local.events as Array<{ id: string }>),
    commitments: mergeById(cloud.commitments as Array<{ id: string }>, local.commitments as Array<{ id: string }>),
    focusHistory: mergeById(cloud.focusHistory as Array<{ id: string }>, local.focusHistory as Array<{ id: string }>),
    capturedDistractions: mergeById(cloud.capturedDistractions as Array<{ id: string }>, local.capturedDistractions as Array<{ id: string }>),
    inboxItems: mergeById(cloud.inboxItems as Array<{ id: string }>, local.inboxItems as Array<{ id: string }>),
    assistantMessages: mergeById(cloud.assistantMessages, local.assistantMessages),
    focusSession: cloud.focusSession ?? local.focusSession,
  };
}

function applyWorkspace(workspace: Workspace) {
  const plannerPreferences = { ...DEFAULT_PLANNER_PREFERENCES, ...workspace.plannerPreferences };
  useStore.setState({
    tasks: workspace.tasks as never[], events: workspace.events as never[], commitments: workspace.commitments as never[],
    plannerPreferences: plannerPreferences as never, todayBackground: workspace.todayBackground as never,
    focusSession: workspace.focusSession as never, focusHistory: workspace.focusHistory as never[],
    capturedDistractions: workspace.capturedDistractions as never[], inboxItems: workspace.inboxItems as never[],
    assistantMessages: workspace.assistantMessages as never[],
    recoveryUndoEvents: null,
  });
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleHelp, Pause, Play, RotateCcw, Sparkles, Timer, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { remainingMilliseconds } from "@/lib/focus-time";

const PRESETS = [5, 15, 25, 45];
const LOCK_NAME = "aevia-focus-session";

export function FocusWidget({ requestedTaskId }: { requestedTaskId?: string }) {
  const tasks = useStore((state) => state.tasks);
  const session = useStore((state) => state.focusSession);
  const startSession = useStore((state) => state.startFocusSession);
  const pause = useStore((state) => state.pauseFocus);
  const resume = useStore((state) => state.resumeFocus);
  const complete = useStore((state) => state.completeFocus);
  const end = useStore((state) => state.endFocus);
  const capture = useStore((state) => state.captureDistraction);
  const openTasks = useMemo(() => tasks.filter((task) => !task.completed), [tasks]);
  const [selectedTaskId, setSelectedTaskId] = useState(requestedTaskId ?? "");
  const [duration, setDuration] = useState(15);
  const [customDuration, setCustomDuration] = useState(30);
  const [isCustom, setIsCustom] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [captureOpen, setCaptureOpen] = useState(false);
  const [thought, setThought] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockWarning, setLockWarning] = useState(false);
  const [finishedSessionId, setFinishedSessionId] = useState<string | null>(null);
  const [starterStep, setStarterStep] = useState<string | null>(null);
  const [starterError, setStarterError] = useState<string | null>(null);
  const [starterLoading, setStarterLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const releaseLockRef = useRef<(() => void) | null>(null);
  const lockPendingRef = useRef<Promise<boolean> | null>(null);
  const activeSessionId = session && (session.status === "running" || session.status === "paused") ? session.id : null;

  const acquireSessionLock = useCallback((): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.locks) return Promise.resolve(true);
    if (releaseLockRef.current) return Promise.resolve(true);
    if (lockPendingRef.current) return lockPendingRef.current;
    const pending = new Promise<boolean>((resolve) => {
      navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          resolve(false);
          return;
        }
        await new Promise<void>((release) => {
          releaseLockRef.current = release;
          resolve(true);
        });
        releaseLockRef.current = null;
      }).catch(() => resolve(false));
    }).finally(() => {
      lockPendingRef.current = null;
    });
    lockPendingRef.current = pending;
    return pending;
  }, []);

  const releaseSessionLock = useCallback(() => {
    releaseLockRef.current?.();
  }, []);

  useEffect(() => {
    if (!requestedTaskId) return;
    setSelectedTaskId(requestedTaskId);
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [requestedTaskId]);

  useEffect(() => {
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key === "aevia-plan-store") void Promise.resolve(useStore.persist.rehydrate()).catch(() => setSessionError("This tab couldn't sync the saved focus session."));
    };
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    let alive = true;
    void acquireSessionLock().then((acquired) => {
      if (!alive) {
        if (acquired) releaseSessionLock();
        return;
      }
      setLockWarning(!acquired);
    });
    return () => {
      alive = false;
      releaseSessionLock();
    };
  }, [activeSessionId, acquireSessionLock, releaseSessionLock]);

  useEffect(() => {
    if (!session || session.status !== "running") return;
    const tick = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (remainingMilliseconds(session, timestamp) === 0) complete();
    };
    tick();
    const interval = window.setInterval(tick, 500);
    const onVisibility = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session, complete]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const currentTask = session?.taskId ? tasks.find((task) => task.id === session.taskId) : undefined;
  const selectedTask = openTasks.find((task) => task.id === selectedTaskId);
  const active = session?.status === "running" || session?.status === "paused";
  const isBreak = session?.kind === "break";
  const totalMs = (session?.durationMinutes ?? duration) * 60_000;
  const remaining = session ? remainingMilliseconds(session, now) : totalMs;
  const progress = session && totalMs > 0 ? Math.max(0, Math.min(1, 1 - remaining / totalMs)) : 0;
  const displayTask = currentTask?.title ?? session?.taskTitle;
  const contextTask = currentTask ?? selectedTask;
  const min = Math.floor(remaining / 60_000);
  const sec = Math.floor((remaining % 60_000) / 1_000);
  const timerLabel = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  const circumference = 2 * Math.PI * 48;

  async function beginSession(kind: "focus" | "break" = "focus", minutes = (isCustom ? customDuration : duration)) {
    setSessionError(null);
    try {
      const acquired = await acquireSessionLock();
      if (!acquired) {
        setLockWarning(true);
        return;
      }
      const started = startSession(kind === "focus" ? selectedTask?.id : undefined, minutes, kind);
      if (!started) {
        releaseSessionLock();
        setLockWarning(true);
      } else {
        setLockWarning(false);
        setNotice(null);
      }
    } catch {
      setSessionError("Aevia couldn't save this session. Check your browser storage and try again.");
    }
  }

  async function getStarterStep() {
    if (!contextTask || starterLoading) return;
    setStarterLoading(true);
    setStarterError(null);
    setStarterStep(null);
    try {
      const response = await fetch("/api/ai/focus-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskTitle: contextTask.title, taskNotes: contextTask.notes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Aevia couldn't suggest a first step.");
      setStarterStep(data.step);
    } catch (requestError) {
      setStarterError(requestError instanceof Error ? requestError.message : "Aevia couldn't connect right now.");
    } finally {
      setStarterLoading(false);
    }
  }

  async function runSessionControl(control: () => void) {
    setSessionError(null);
    try {
      const acquired = await acquireSessionLock();
      if (!acquired) {
        setLockWarning(true);
        return;
      }
      setLockWarning(false);
      control();
    } catch {
      setSessionError("Aevia couldn't save that change. Check your browser storage and try again.");
    }
  }

  function saveThought(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!thought.trim()) return;
    setError(null);
    try {
      const id = capture(thought);
      if (!id) throw new Error("That thought could not be saved yet. Try again.");
      setThought("");
      setCaptureOpen(false);
      setNotice("Thought captured. You can return to your focus.");
      timerRef.current?.focus();
    } catch {
      setError("That thought could not be saved. Your text is still here; try again.");
    }
  }

  return (
    <section ref={panelRef} id="today-focus" className="today-card overflow-hidden rounded-2xl" aria-labelledby="focus-heading">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <div>
          <h2 id="focus-heading" className="text-[18px] font-medium leading-6 text-fg">Focus</h2>
          <p className="mt-0.5 text-[11px] text-fg-muted">One small step at a time.</p>
        </div>
        {active && <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/25 bg-[var(--gold-soft)] px-2.5 py-1 text-[10px] text-gold"><span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] motion-safe:animate-pulse motion-reduce:animate-none" />{isBreak ? "On a break" : session?.status === "paused" ? "Paused" : "In focus"}</span>}
      </div>

      <div className="p-4 sm:p-5">
        {!active && session?.status === "completed" && session.kind === "focus" && session.id !== finishedSessionId ? (
          <div className="text-center" role="status">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold)]/30 bg-[var(--gold-soft)] text-gold"><Check size={19} /></div>
            <p className="mt-3 text-[14px] font-medium text-fg">Nice work. Your session is complete.</p>
            <p className="mt-1 text-[11px] text-fg-muted">You focused for {Math.max(1, Math.round(session.focusedMs / 60_000))} minutes. Want to continue or take a break?</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-gold h-9" onClick={() => void beginSession("focus")}><RotateCcw size={13} /> Continue</button>
              <button type="button" className="btn h-9" onClick={() => void beginSession("break", 5)}><Timer size={13} /> 5-minute break</button>
              <button type="button" className="btn h-9" onClick={() => setFinishedSessionId(session.id)}>Finish for now</button>
            </div>
          </div>
        ) : !active && session?.status === "completed" && session.kind === "break" && session.id !== finishedSessionId ? (
          <div className="text-center" role="status">
            <p className="text-[14px] font-medium text-fg">Your break is over whenever you’re ready.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2"><button type="button" className="btn btn-gold h-9" onClick={() => void beginSession("focus")}><Play size={13} /> Back to focus</button><button type="button" className="btn h-9" onClick={() => setFinishedSessionId(session.id)}>Finish for now</button></div>
          </div>
        ) : !active && session?.status === "ended" && session.id !== finishedSessionId ? (
          <div className="text-center" role="status">
            <p className="text-[14px] font-medium text-fg">{session.kind === "break" ? "Break ended. Return to focus whenever you’re ready." : "Session saved. You can pick it up again later."}</p>
            {session.kind === "focus" && <p className="mt-1 text-[11px] text-fg-muted">Recorded {Math.floor(session.focusedMs / 60_000)} focused minutes.</p>}
            <div className="mt-3 flex justify-center gap-2"><button type="button" className="btn btn-gold h-9" onClick={() => void beginSession("focus")}><Play size={13} /> {session.kind === "break" ? "Back to focus" : "Start another"}</button><button type="button" className="btn h-9" onClick={() => setFinishedSessionId(session.id)}>Finish for now</button></div>
          </div>
        ) : !active ? (
          <>
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-fg-subtle" htmlFor="focus-task-select">Choose a task (optional)</label>
            <select id="focus-task-select" className="input h-10 w-full" value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}>
              <option value="">Open focus · no task</option>
              {openTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
            {openTasks.length === 0 && <p className="mt-1.5 text-[10px] text-fg-subtle">No open tasks yet. You can still start an unstructured focus session.</p>}

            <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Focus duration">
              {PRESETS.map((minutes) => <button key={minutes} type="button" aria-pressed={!isCustom && duration === minutes} onClick={() => { setDuration(minutes); setIsCustom(false); }} className={`min-h-9 rounded-lg border px-3 text-[11px] transition ${!isCustom && duration === minutes ? "border-[var(--gold)]/50 bg-[var(--gold-soft)] text-fg" : "border-[var(--border)] text-fg-muted hover:text-fg"}`}>{minutes} min</button>)}
              <button type="button" aria-pressed={isCustom} onClick={() => setIsCustom(true)} className={`min-h-9 rounded-lg border px-3 text-[11px] transition ${isCustom ? "border-[var(--gold)]/50 bg-[var(--gold-soft)] text-fg" : "border-[var(--border)] text-fg-muted hover:text-fg"}`}>Custom</button>
              {isCustom && <div className="flex items-center gap-1"><input aria-label="Custom focus duration in minutes" className="input h-9 w-[72px] px-2 text-center" type="number" min={1} max={180} value={customDuration} onChange={(event) => setCustomDuration(Math.max(1, Math.min(180, Number(event.target.value) || 1)))} /><span className="text-[10px] text-fg-muted">min</span></div>}
            </div>

            <div className="mt-4 flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/35 p-3">
              <div ref={timerRef} tabIndex={-1} className="relative flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-full outline-none" aria-label={`${isCustom ? customDuration : duration} minute focus session`}>
                <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90" aria-hidden="true"><circle cx="56" cy="56" r="48" fill="none" stroke="var(--border-strong)" strokeWidth="5" /><circle cx="56" cy="56" r="48" fill="none" stroke="var(--gold)" strokeLinecap="round" strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={circumference} /></svg>
                <span className="absolute text-[18px] font-medium tabular-nums text-fg">{String(isCustom ? customDuration : duration).padStart(2, "0")}:00</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-fg">{selectedTask?.title ?? "A little room to think"}</p>
                <p className="mt-0.5 text-[10px] leading-4 text-fg-muted">No pressure to finish everything. Just begin.</p>
                <button type="button" onClick={() => { setCaptureOpen(true); setError(null); }} className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-[10px] text-gold hover:text-[var(--gold-strong)]"><CircleHelp size={12} /> Capture a distraction</button>
              </div>
            </div>
            <button type="button" onClick={() => void beginSession()} className="btn btn-gold mt-3 flex h-11 w-full justify-center"><Play size={14} fill="currentColor" /> Start focus</button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div ref={timerRef} tabIndex={-1} className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full outline-none" role="timer" aria-label={`${timerLabel} remaining`}>
                <svg viewBox="0 0 112 112" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="56" cy="56" r="48" fill="none" stroke="var(--border-strong)" strokeWidth="5" />
                  <circle cx="56" cy="56" r="48" fill="none" stroke="var(--gold)" strokeLinecap="round" strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} className="transition-[stroke-dashoffset] duration-500" />
                </svg>
                <span className="text-[23px] font-medium tabular-nums text-fg">{timerLabel}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-fg">{isBreak ? "Take a breath" : displayTask ?? "Open focus"}</p>
                <p className="mt-1 text-[10px] text-fg-muted">{session?.status === "paused" ? "Paused · your time is saved." : isBreak ? "Optional break. Your focus time is safe." : `${session?.durationMinutes} minute session · you’re doing fine.`}</p>
                <button type="button" onClick={() => { setCaptureOpen(true); setError(null); }} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg text-[10px] text-gold hover:text-[var(--gold-strong)]"><CircleHelp size={12} /> Capture a distraction</button>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {session?.status === "paused" ? <button type="button" className="btn btn-gold h-10 flex-1 justify-center" onClick={() => void runSessionControl(resume)}><Play size={13} fill="currentColor" /> Resume</button> : <button type="button" className="btn h-10 flex-1 justify-center" onClick={() => void runSessionControl(pause)}><Pause size={13} /> Pause</button>}
              <button type="button" className="btn h-10 flex-1 justify-center" onClick={() => void runSessionControl(end)}><X size={13} /> End session</button>
            </div>
            {lockWarning && <p role="status" className="mt-2 text-[10px] text-[#d39a76]">This focus session is open in another tab. You can follow it here, but start a new one there.</p>}
          </>
        )}

        {starterStep && <div className="mt-3 rounded-xl border border-[var(--gold)]/20 bg-[var(--gold-soft)]/35 p-3"><label htmlFor="focus-first-step" className="text-[9px] font-semibold uppercase tracking-[0.12em] text-gold">A small first step · editable</label><textarea id="focus-first-step" rows={2} maxLength={500} className="mt-1 w-full resize-y bg-transparent text-[11px] leading-5 text-fg outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)]" value={starterStep} onChange={(event) => setStarterStep(event.target.value)} /><button type="button" className="mt-1 min-h-8 text-[10px] text-fg-muted underline-offset-2 hover:text-fg hover:underline" onClick={() => setStarterStep(null)}>Dismiss</button></div>}
        {starterError && <p role="alert" className="mt-2 text-[10px] text-[#d39a76]">{starterError}</p>}
        <button type="button" disabled={!contextTask || starterLoading} onClick={() => void getStarterStep()} className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-[10px] text-fg-subtle transition hover:text-fg disabled:cursor-not-allowed disabled:opacity-45"><Sparkles size={12} />{starterLoading ? "Finding a small first step…" : "Help me get started"}</button>

        {captureOpen && <form onSubmit={saveThought} className="mt-3 rounded-xl border border-[var(--gold)]/20 bg-[var(--surface)]/65 p-3" aria-label="Capture a distraction">
          <label htmlFor="focus-distraction" className="block text-[11px] font-medium text-fg">What’s on your mind?</label>
          <input id="focus-distraction" className="input mt-2 h-10 w-full" autoFocus maxLength={500} placeholder="Remember to reply to my manager…" value={thought} onChange={(event) => setThought(event.target.value)} />
          {error && <p role="alert" className="mt-2 text-[10px] text-[#d39a76]">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn h-9" onClick={() => { setCaptureOpen(false); setThought(""); setError(null); timerRef.current?.focus(); }}>Cancel</button>
            <button type="submit" className="btn btn-gold h-9" disabled={!thought.trim()}>Save thought</button>
          </div>
        </form>}
        {notice && <p role="status" className="mt-2 text-[10px] text-[var(--gold-strong)]">{notice}</p>}
        {sessionError && <p role="alert" className="mt-2 text-[10px] text-[#d39a76]">{sessionError}</p>}
        {lockWarning && !active && <p role="status" className="mt-2 text-[10px] text-[#d39a76]">Another tab has an active focus session. It will appear here when that tab syncs.</p>}
      </div>
    </section>
  );
}

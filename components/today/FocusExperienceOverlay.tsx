"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, ChevronRight, Minimize2 } from "lucide-react";
import { format } from "date-fns";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { useStore } from "@/lib/store";
import { FocusWidget } from "./FocusWidget";
import { FocusProgressCard } from "./FocusArtifact";
import { FocusLandscape } from "./FocusLandscape";

export function FocusExperienceOverlay() {
  const open = useStore((state) => state.focusModeOpen);
  const setOpen = useStore((state) => state.setFocusModeOpen);
  const session = useStore((state) => state.focusSession);
  const events = useStore((state) => state.events);
  const tasks = useStore((state) => state.tasks);
  const history = useStore((state) => state.focusHistory);
  const artifactStyle = useStore((state) => state.focusArtifact);
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => new Date());
  const nextEvent = useMemo(() => events.filter((event) => !event.cancelled && new Date(event.start).getTime() >= now.getTime()).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0], [events, now]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.getElementById("focus-distraction")) {
          window.dispatchEvent(new Event("aevia:focus-capture-close"));
          return;
        }
        setOpen(false);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        document.querySelector<HTMLButtonElement>('[aria-keyshortcuts="Control+J Meta+J"]')?.click();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  const sessions = session ? [...history, session] : history;
  const startsIn = nextEvent ? Math.max(0, Math.ceil((new Date(nextEvent.start).getTime() - now.getTime()) / 60_000)) : null;
  const eventCountdown = startsIn === null ? "" : startsIn === 0 ? "Starting now" : startsIn === 1 ? "In 1 minute" : `In ${startsIn} minutes`;

  return <AnimatePresence initial={false}>
    {open && <motion.div
      key="aevia-focus-experience"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.58, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] overflow-x-hidden overflow-y-auto text-fg"
      style={{ backgroundColor: "#0b0b0d", backgroundImage: "radial-gradient(ellipse at 50% 43%, rgba(140, 91, 39, 0.08), transparent 56%)" }}
      aria-label="Focus mode"
    >
      <motion.div initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0.1 : 0.9, delay: reduceMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}>
        <FocusLandscape style={artifactStyle} />
      </motion.div>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.995 }}
        transition={{ duration: reduceMotion ? 0.1 : 0.72, delay: reduceMotion ? 0 : 0.04, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto flex min-h-dvh w-full flex-col px-5 pb-3 pt-5 sm:px-8 sm:pb-5 sm:pt-7 lg:px-12"
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 pt-1"><AeviaArc size={34} /><span className="font-serif text-[25px] leading-none tracking-[-0.03em] text-[#eee2d2]">aevia</span></div>
          <div className="flex items-start gap-3 sm:gap-5">
            <div className="hidden pt-1 sm:block"><button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[11px] text-white/50 transition hover:bg-white/[0.045] hover:text-white/85"><Minimize2 size={13}/> Exit focus</button></div>
            <div className="text-right">
              <p className="font-sans text-[27px] font-light leading-none tabular-nums tracking-[-0.035em] text-[#eee2d2] sm:text-[35px]">{format(now, "HH:mm")}</p>
              <p className="mt-1.5 text-[11px] text-white/55 sm:text-[13px]">{format(now, "EEE, d MMM")}</p>
              <div className="mt-4 flex min-h-[58px] w-[min(80vw,330px)] items-center gap-3 rounded-2xl border border-white/[0.11] bg-black/20 px-3.5 py-2.5 text-left backdrop-blur-sm sm:mt-5 sm:px-4">
                <CalendarDays size={22} strokeWidth={1.5} className="shrink-0 text-[#dfa657]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-white/90">{nextEvent ? `Next: ${nextEvent.title}` : "No upcoming events"}</p>
                  <p className="mt-1 text-[10px] text-white/55">{nextEvent ? `Starts at ${format(new Date(nextEvent.start), "HH:mm")} · ${eventCountdown}` : "Your calendar is clear"}</p>
                </div>
                {nextEvent && <ChevronRight size={17} className="shrink-0 text-white/50" />}
              </div>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col justify-center py-4 sm:py-1">
          <FocusWidget immersive />
          {session?.status === "completed" && session.kind === "focus" && <motion.div initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0.12 : 0.65, delay: reduceMotion ? 0 : 0.14 }} className="mx-auto mt-1 w-full max-w-xl"><FocusProgressCard sessions={sessions} tasks={tasks}/></motion.div>}
        </main>
      </motion.div>
    </motion.div>}
  </AnimatePresence>;
}

"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Download, X } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import type { FocusSession } from "@/lib/focus-time";
import type { FocusArtifactStyle, Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { artifactMask, artifactReveal, FOCUS_ARTIFACT_MILESTONES } from "@/lib/focus-artifact-progress";

const ARTWORK_WIDTH = 1774;
const ARTWORK_HEIGHT = 887;

const ARTIFACTS: Array<{ id: FocusArtifactStyle; name: string; description: string; motto: string }> = [
  { id: "arc", name: "Arc", description: "Flowing ribbons shaped by your focus time.", motto: "Make time mean something." },
  { id: "skyline", name: "Skyline", description: "A personal city built one session at a time.", motto: "Consistent steps create big places." },
  { id: "terrain", name: "Terrain", description: "A topographic landscape shaped by your focus patterns.", motto: "Discipline shapes a brighter tomorrow." },
  { id: "orbit", name: "Orbit", description: "A planetary system where every session finds its place.", motto: "Small sessions. A bigger universe." },
];

function uniqueCompleted(sessions: FocusSession[]) {
  const byId = new Map<string, FocusSession>();
  sessions.forEach((session) => {
    if (session.kind === "focus" && session.status === "completed") byId.set(session.id, session);
  });
  return [...byId.values()].sort((a, b) => a.startedAt - b.startedAt);
}

function ArtifactVisual({ style, label, reveal, thumbnail = false }: { style: FocusArtifactStyle; label: string; reveal?: number; thumbnail?: boolean }) {
  const src = `/focus-artifacts/${style}-scene-${thumbnail ? "thumb" : "hq"}.webp`;
  const width = thumbnail ? 320 : ARTWORK_WIDTH;
  const height = thumbnail ? 160 : ARTWORK_HEIGHT;
  return <div className="relative aspect-[2/1] w-full overflow-hidden bg-[#060606]">
    {reveal !== undefined && reveal < 1 && <Image src={src} alt="" aria-hidden="true" width={width} height={height} unoptimized className="absolute inset-0 h-full w-full object-cover opacity-[.22]" />}
    <Image src={src} alt={label} width={width} height={height} unoptimized className="relative block h-full w-full object-cover" style={reveal === undefined ? undefined : { maskImage: artifactMask(reveal) }} />
  </div>;
}

function downloadRecap(style: FocusArtifactStyle, month: Date, sessions: FocusSession[], focusedHours: string, tasksDone: number, layout: "square" | "portrait") {
  const artifact = ARTIFACTS.find((item) => item.id === style)!;
  const image = new window.Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2160;
    canvas.height = layout === "square" ? 2160 : 2700;
    const context = canvas.getContext("2d"); if (!context) return;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#080808";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(221,174,107,0.16)";
    context.lineWidth = 2;
    context.strokeRect(44, 44, canvas.width - 88, canvas.height - 88);

    const artY = layout === "square" ? 530 : 750;
    const reveal = artifactReveal(sessions.length);
    context.globalAlpha = reveal >= 1 ? 1 : 0.27;
    context.drawImage(image, 80, artY, 2000, 1000);
    context.globalAlpha = 1;
    if (reveal < 1) {
      const revealed = document.createElement("canvas");
      revealed.width = 2000;
      revealed.height = 1000;
      const revealContext = revealed.getContext("2d");
      if (revealContext) {
        revealContext.drawImage(image, 0, 0, 2000, 1000);
        revealContext.globalCompositeOperation = "destination-in";
        const mask = revealContext.createLinearGradient(0, 0, 2000, 0);
        mask.addColorStop(0, "black");
        mask.addColorStop(Math.max(0, reveal - 0.08), "black");
        mask.addColorStop(reveal, "transparent");
        mask.addColorStop(1, "transparent");
        revealContext.fillStyle = mask;
        revealContext.fillRect(0, 0, 2000, 1000);
        context.drawImage(revealed, 80, artY);
      }
    }
    const fade = context.createLinearGradient(0, artY + 700, 0, artY + 1020);
    fade.addColorStop(0, "rgba(8,8,8,0)");
    fade.addColorStop(1, "#080808");
    context.fillStyle = fade;
    context.fillRect(80, artY + 700, 2000, 320);

    context.fillStyle = "#f0dfc4";
    context.font = "76px Georgia, serif";
    context.fillText("aevia", 120, 175);
    context.fillStyle = "#bba98f";
    context.font = "34px Arial, sans-serif";
    context.textAlign = "right";
    context.fillText(format(month, "MMMM yyyy"), 2040, 160);
    context.textAlign = "left";
    context.fillStyle = "#cda56d";
    context.font = "27px Arial, sans-serif";
    context.fillText("FOCUS WORLD  ·  MONTHLY RECAP", 120, layout === "square" ? 300 : 400);
    context.fillStyle = "#f0e6d9";
    context.font = "142px Georgia, serif";
    context.fillText(artifact.name, 120, layout === "square" ? 460 : 610);

    const railY = artY + 1040;
    context.fillStyle = "#3b3023";
    context.fillRect(120, railY, 1920, 6);
    context.fillStyle = "#e8b974";
    context.fillRect(120, railY, 1920 * reveal, 6);

    const metricY = layout === "square" ? 1760 : 2190;
    const metrics = [
      { x: 120, value: `${focusedHours}h`, label: "FOCUSED" },
      { x: 820, value: `${sessions.length}`, label: "SESSIONS" },
      { x: 1520, value: `${tasksDone}`, label: "TASKS COMPLETED" },
    ];
    metrics.forEach(({ x, value, label }) => {
      context.fillStyle = "#f5c77d";
      context.font = "102px Georgia, serif";
      context.fillText(value, x, metricY);
      context.fillStyle = "#c7beb1";
      context.font = "27px Arial, sans-serif";
      context.fillText(label, x, metricY + 64);
    });
    context.fillStyle = "#746652";
    context.textAlign = "center";
    context.font = "27px Arial, sans-serif";
    context.fillText(artifact.motto.toUpperCase(), 1080, canvas.height - 118);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `aevia-${style}-${format(month, "yyyy-MM")}-${layout}.png`;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }, "image/png");
  };
  image.src = `/focus-artifacts/${style}-scene-hq.png`;
}

export function FocusProgressCard({ sessions, tasks }: { sessions: FocusSession[]; tasks: Task[] }) {
  const [open, setOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const style = useStore((state) => state.focusArtifact);
  const setStyle = useStore((state) => state.setFocusArtifact);
  const completed = useMemo(() => uniqueCompleted(sessions), [sessions]);
  const month = useMemo(() => { const date = new Date(); date.setDate(1); date.setHours(0, 0, 0, 0); date.setMonth(date.getMonth() + monthOffset); return date; }, [monthOffset]);
  const monthSessions = completed.filter((session) => { const date = new Date(session.startedAt); return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth(); });
  const focusMs = monthSessions.reduce((sum, session) => sum + session.focusedMs, 0);
  const focusedHours = (focusMs / 3_600_000).toFixed(1);
  const tasksDone = tasks.filter((task) => task.completed && task.completedAt && new Date(task.completedAt).getFullYear() === month.getFullYear() && new Date(task.completedAt).getMonth() === month.getMonth()).length;
  const latest = completed.at(-1);
  const nextMilestone = FOCUS_ARTIFACT_MILESTONES.find((stage) => stage > monthSessions.length);
  const selected = ARTIFACTS.find((item) => item.id === style) ?? ARTIFACTS[0];
  return <>
    <div className="overflow-hidden rounded-2xl border border-[var(--gold)]/20 bg-[#0a0909] shadow-[0_12px_40px_rgba(0,0,0,.14)]">
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4"><div><p className="text-[9px] uppercase tracking-[0.22em] text-gold">Your focus world</p><h3 className="mt-1 font-serif text-[25px] leading-none text-[#f1e4d1]">{selected.name}</h3></div><button type="button" onClick={() => { setMonthOffset(0); setOpen(true); }} className="rounded-full border border-[var(--gold)]/25 px-3 py-2 text-[10px] text-[#d8bb91] transition hover:border-[var(--gold)]/60 hover:bg-[var(--gold-soft)]/25">Change artifact</button></div>
      <button type="button" onClick={() => { setMonthOffset(0); setOpen(true); }} className="relative block w-full text-left"><ArtifactVisual style={style} label={`${selected.name} artwork, ${completed.length} completed focus sessions`} reveal={completed.length ? artifactReveal(completed.length) : undefined} />{!completed.length && <span className="absolute right-4 top-3 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[9px] uppercase tracking-widest text-white/45">Preview</span>}</button>
      <div className="flex justify-between gap-3 border-t border-white/[0.07] px-5 py-3 text-[10px] text-[#b9aa97]"><span>{completed.length} completed sessions</span><span>{latest ? `Last session · ${format(latest.startedAt, "MMM d")}` : "Your first session will begin this world"}</span></div>
    </div>
    {open && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="focus-recap-title" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-7"><div><p className="text-[9px] uppercase tracking-[0.2em] text-gold">Your focus artifact</p><h2 id="focus-recap-title" className="mt-1 font-serif text-2xl text-fg">Choose your world</h2><p className="mt-1 text-[11px] text-fg-muted">Change it whenever you like. Each world tracks your focus progress.</p></div><button type="button" aria-label="Close artifact choices" className="btn h-9 w-9 justify-center" onClick={() => setOpen(false)}><X size={16}/></button></header>
        <div className="px-4 pb-6 pt-4 sm:px-7">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ARTIFACTS.map((artifact, index) => <button key={artifact.id} type="button" aria-pressed={style === artifact.id} onClick={() => setStyle(artifact.id)} className={`overflow-hidden rounded-2xl border text-left transition ${style === artifact.id ? "border-[var(--gold)]/70 bg-[var(--gold-soft)]/30 shadow-[0_0_24px_rgba(216,178,106,.08)]" : "border-[var(--border)] bg-black/20 hover:border-[var(--gold)]/35"}`}>
              <div className="relative border-b border-white/[0.06] bg-[#09090a]"><ArtifactVisual style={artifact.id} label={`${artifact.name} artwork`} /><span className="absolute left-3 top-2 font-serif text-[18px] text-[#f0dfc4]">{index + 1}.</span></div>
              <div className="p-3"><span className="flex items-center justify-between gap-2 font-serif text-[18px] text-fg">{artifact.name}{style === artifact.id && <span className="font-sans text-[9px] uppercase tracking-wider text-gold">Selected</span>}</span><span className="mt-1.5 block min-h-9 text-[10px] leading-4 text-fg-muted">{artifact.description}</span></div>
            </button>)}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.2em] text-gold">Monthly recap</p><h3 className="mt-1 font-serif text-xl text-fg">{selected.name} · {format(month, "MMMM yyyy")}</h3></div><div className="flex items-center gap-2"><button type="button" aria-label="Previous month" disabled={monthOffset <= -24} onClick={() => setMonthOffset((n) => n - 1)} className="btn h-9 w-9 justify-center disabled:opacity-40"><ArrowLeft size={15}/></button><button type="button" aria-label="Next month" disabled={monthOffset >= 0} onClick={() => setMonthOffset((n) => n + 1)} className="btn h-9 w-9 justify-center disabled:opacity-40"><ArrowRight size={15}/></button></div></div>
          <div className="relative mx-auto mt-3 max-w-[720px] overflow-hidden rounded-2xl border border-[var(--gold)]/15 bg-[#080808]"><ArtifactVisual style={style} label={`${selected.name} artwork for ${format(month, "MMMM yyyy")}`} reveal={monthSessions.length ? artifactReveal(monthSessions.length) : undefined} />{!monthSessions.length && <span className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[9px] uppercase tracking-widest text-white/45">Preview</span>}</div>
          <div className="mx-auto mt-4 max-w-[720px]"><div className="flex items-center justify-between gap-3"><p className="text-[9px] uppercase tracking-[0.18em] text-gold">World progression</p><p className="text-[10px] text-fg-muted">{nextMilestone ? `${nextMilestone - monthSessions.length} ${nextMilestone - monthSessions.length === 1 ? "session" : "sessions"} to next milestone` : "All 12 milestones reached"}</p></div>
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label="Focus artwork progression">
              {FOCUS_ARTIFACT_MILESTONES.map((stage) => <div key={stage} className="min-w-0 text-center"><div className={`overflow-hidden rounded-lg border ${monthSessions.length >= stage ? "border-[var(--gold)]/65" : "border-white/10 opacity-[.55]"}`}><ArtifactVisual style={style} label={`${selected.name} artwork at session ${stage}`} reveal={artifactReveal(stage)} thumbnail /></div><span className={`mt-1 block text-[9px] ${monthSessions.length >= stage ? "text-gold" : "text-fg-subtle"}`}>{stage} {stage === 1 ? "session" : "sessions"}</span></div>)}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--border)] rounded-xl border border-[var(--border)] py-3 text-center"><div><p className="font-serif text-2xl text-gold">{focusedHours}h</p><p className="text-[9px] text-fg-muted">Focused</p></div><div><p className="font-serif text-2xl text-gold">{monthSessions.length}</p><p className="text-[9px] text-fg-muted">Sessions</p></div><div><p className="font-serif text-2xl text-gold">{tasksDone}</p><p className="text-[9px] text-fg-muted">Tasks completed</p></div></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] text-fg-subtle">{selected.motto}</p><div className="flex flex-wrap gap-2"><a className="btn h-9" href={`/focus-artifacts/${style}-scene-hq.png`} download={`aevia-${style}-artwork.png`}><Download size={14}/> Artwork only</a><button type="button" className="btn h-9 disabled:opacity-40" disabled={!monthSessions.length} onClick={() => downloadRecap(style, month, monthSessions, focusedHours, tasksDone, "square")}><Download size={14}/> Square PNG · 2160px</button><button type="button" className="btn btn-gold h-9 disabled:opacity-40" disabled={!monthSessions.length} onClick={() => downloadRecap(style, month, monthSessions, focusedHours, tasksDone, "portrait")}><Download size={14}/> Portrait PNG · 2700px</button></div></div>
        </div>
      </section>
    </div>}
  </>;
}

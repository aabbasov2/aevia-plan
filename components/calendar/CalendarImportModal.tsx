"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, FileImage, ImagePlus, LoaderCircle, Sparkles, Upload, X } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";

type ImportKind = Extract<CalendarEvent["kind"], "meeting" | "task" | "focus">;
type ExtractedEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  kind: ImportKind;
  confidence: number;
  needsReview: boolean;
  selected: boolean;
};
type Step = "upload" | "review" | "preview" | "success";

const KIND_LABELS: Record<ImportKind, string> = { meeting: "Meeting", task: "Task", focus: "Focus" };
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 8 * 1024 * 1024;

export function CalendarImportModal({ open, onClose, events, onImport }: {
  open: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onImport: (events: Array<Omit<CalendarEvent, "id">>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [items, setItems] = useState<ExtractedEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const selectedItems = useMemo(() => items.filter((item) => item.selected), [items]);
  const missingDetails = selectedItems.some((item) => !item.startTime || item.durationMinutes < 5);
  const overlaps = useMemo(() => {
    const collisions = new Map<string, string[]>();
    for (const item of selectedItems) {
      if (!item.startTime || item.durationMinutes < 5) continue;
      const start = new Date(`${item.date}T${item.startTime}`).getTime();
      const end = start + item.durationMinutes * 60_000;
      const found = events.filter((event) => !event.cancelled && start < new Date(event.start).getTime() + event.durationMinutes * 60_000 && end > new Date(event.start).getTime());
      const importedOverlaps = selectedItems.filter((other) => {
        if (other.id === item.id || !other.startTime || other.durationMinutes < 5) return false;
        const otherStart = new Date(`${other.date}T${other.startTime}`).getTime();
        const otherEnd = otherStart + other.durationMinutes * 60_000;
        return start < otherEnd && end > otherStart;
      });
      const titles = [...found.map((event) => event.title), ...importedOverlaps.map((other) => other.title)];
      if (titles.length) collisions.set(item.id, titles);
    }
    return collisions;
  }, [events, selectedItems]);

  if (!open) return null;

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStep("upload"); setFile(null); setPreviewUrl(""); setItems([]); setBusy(false); setError("");
  }
  function close() { reset(); onClose(); }

  async function analyze(nextFile: File) {
    setError("");
    if (!ACCEPTED_TYPES.includes(nextFile.type)) { setError("Choose a PNG, JPG, or WebP screenshot."); return; }
    if (nextFile.size > MAX_FILE_SIZE) { setError("This screenshot is larger than 8 MB. Choose a smaller image."); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    const localUrl = URL.createObjectURL(nextFile);
    setPreviewUrl(localUrl);
    setBusy(true);
    try {
      const image = await readAsDataUrl(nextFile);
      const localDate = new Intl.DateTimeFormat("en-CA").format(new Date());
      const response = await fetch("/api/ai/import-calendar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mimeType: nextFile.type, today: localDate, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Calendar analysis failed.");
      const extracted = Array.isArray(payload.events) ? payload.events as Omit<ExtractedEvent, "id" | "selected">[] : [];
      if (!extracted.length) throw new Error("No timed events were readable. Try a sharper screenshot with the dates and times visible.");
      setItems(extracted.map((item, index) => ({ ...item, id: `import-${index}`, selected: true })));
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calendar analysis failed. Please try another screenshot.");
    } finally { setBusy(false); }
  }

  function updateItem(id: string, updates: Partial<ExtractedEvent>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...updates, needsReview: updates.date || updates.startTime || updates.durationMinutes ? false : item.needsReview } : item));
  }

  function commitImport() {
    const ready = selectedItems.filter((item) => item.startTime && item.durationMinutes >= 5);
    onImport(ready.map((item) => ({
      title: item.title.trim(),
      start: new Date(`${item.date}T${item.startTime}`).toISOString(),
      durationMinutes: item.durationMinutes,
      kind: item.kind,
      origin: "user" as const,
      locked: true,
      project: "personal" as const,
    })));
    setStep("success");
  }

  const range = selectedItems.length ? selectedItems.map((item) => item.date).sort() : [];
  const stepTitle = step === "upload" ? "Import your calendar" : step === "review" ? "Review imported items" : step === "preview" ? "Calendar preview" : "Calendar updated";

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="calendar-import-title" className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <div><div className="wordmark text-[10px] text-gold">CALENDAR IMPORT</div><h2 id="calendar-import-title" className="display mt-1 text-xl text-fg">{stepTitle}</h2></div>
        <button className="btn h-9 w-9 p-0" onClick={close} aria-label="Close import"><X size={15} /></button>
      </header>

      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3 sm:px-6">
        {["upload", "review", "preview"].map((name, index) => {
          const current = ["upload", "review", "preview", "success"].indexOf(step);
          return <div key={name} className="flex flex-1 items-center gap-2">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] ${current > index ? "border-gold bg-gold text-black" : current === index ? "border-gold text-gold" : "border-[var(--border)] text-fg-subtle"}`}>{current > index ? <Check size={12} /> : index + 1}</span>
            <span className={`hidden text-[11px] sm:inline ${current === index ? "text-fg" : "text-fg-subtle"}`}>{name === "upload" ? "Upload" : name === "review" ? "Review" : "Preview"}</span>
            {index < 2 && <span className="h-px flex-1 bg-[var(--border)]" />}
          </div>;
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        {step === "upload" && <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 text-gold"><CalendarDays size={22} /></div>
          <p className="mt-4 text-sm text-fg">Upload a screenshot of your calendar</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-fg-muted">Aevia will find visible timed events. You can review and correct every detail before adding anything.</p>
          {previewUrl && <img src={previewUrl} alt="Selected calendar screenshot" className="mx-auto mt-5 max-h-40 max-w-full rounded-lg border border-[var(--border)] object-contain" />}
          <button type="button" onClick={() => inputRef.current?.click()} onDragEnter={(e) => { e.preventDefault(); setDragging(true); }} onDragOver={(e) => e.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); const dropped = e.dataTransfer.files[0]; if (dropped) void analyze(dropped); }} className={`mt-5 flex min-h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 transition ${dragging ? "border-gold bg-[var(--gold)]/10" : "border-[var(--border-strong)] bg-[var(--surface-2)]/40 hover:border-gold/50"}`}>
            {busy ? <><LoaderCircle size={25} className="animate-spin text-gold" /><span className="mt-3 text-sm text-fg">Finding events and times</span><span className="mt-1 text-xs text-fg-muted">This may take a few seconds…</span></> : <><ImagePlus size={24} className="text-gold" /><span className="mt-3 text-sm text-fg">Drop an image here</span><span className="mt-1 text-xs text-fg-muted">or choose a screenshot from your device</span><span className="btn btn-gold mt-4 h-9 px-4"><Upload size={13} />Choose screenshot</span><span className="mt-3 text-[10px] text-fg-subtle">PNG, JPG, or WebP · Up to 8 MB</span></>}
          </button>
          <input ref={inputRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const picked = e.target.files?.[0]; if (picked) void analyze(picked); e.currentTarget.value = ""; }} />
          {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-left text-xs text-red-300">{error}</p>}
        </div>}

        {step === "review" && <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-fg-muted"><FileImage size={14} className="text-gold" />{file?.name}<span>·</span>{items.length} items found</div>
            <button className="btn h-8 px-3 text-[11px]" onClick={() => { setStep("upload"); setError(""); }}>Choose another image</button>
          </div>
          <div className="mb-3 flex items-center justify-between text-[11px] text-fg-subtle"><span>Confirm dates, times, and event types</span><button className="text-gold hover:underline" onClick={() => setItems((current) => current.map((item) => ({ ...item, selected: !current.every((row) => row.selected) })))}>{items.every((item) => item.selected) ? "Deselect all" : "Select all"}</button></div>
          <div className="space-y-2">
            {items.map((item) => <div key={item.id} className={`rounded-xl border p-3 transition ${item.selected ? "border-[var(--border)] bg-[var(--surface-2)]/45" : "border-[var(--border)]/50 opacity-55"}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-2 accent-[var(--gold)]" checked={item.selected} onChange={(e) => updateItem(item.id, { selected: e.target.checked })} aria-label={`Import ${item.title}`} />
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(130px,1.3fr)_minmax(125px,1fr)_100px_110px_110px]">
                  <label className="min-w-0 text-[10px] text-fg-subtle">Title<input value={item.title} onChange={(e) => updateItem(item.id, { title: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-fg outline-none focus:border-gold" /></label>
                  <label className="text-[10px] text-fg-subtle">Date<input type="date" value={item.date} onChange={(e) => updateItem(item.id, { date: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-fg outline-none focus:border-gold" /></label>
                  <label className="text-[10px] text-fg-subtle">Start<input type="time" value={item.startTime} onChange={(e) => updateItem(item.id, { startTime: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-fg outline-none focus:border-gold" /></label>
                  <label className="text-[10px] text-fg-subtle">Duration (min)<input type="number" min={5} max={1440} step={5} value={item.durationMinutes || ""} onChange={(e) => updateItem(item.id, { durationMinutes: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-fg outline-none focus:border-gold" /></label>
                  <label className="text-[10px] text-fg-subtle">Type<select value={item.kind} onChange={(e) => updateItem(item.id, { kind: e.target.value as ImportKind })} className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-fg outline-none focus:border-gold">{Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                </div>
              </div>
              {item.selected && item.needsReview && <p className="ml-7 mt-2 text-[10px] text-amber-200">Please check the highlighted time details; the screenshot was unclear.</p>}
              {item.selected && overlaps.has(item.id) && <p className="ml-7 mt-2 text-[10px] text-amber-200">Overlaps with {overlaps.get(item.id)?.join(", ")} already on your calendar.</p>}
            </div>)}
          </div>
          <p className="mt-4 flex items-center gap-2 text-[10px] leading-4 text-fg-subtle"><Sparkles size={12} className="shrink-0 text-gold" />Extracted items stay in this preview until you confirm. Existing events will not be changed.</p>
        </div>}

        {step === "preview" && <div className="mx-auto max-w-2xl">
          <div className="mb-4 grid grid-cols-3 gap-2">
            <SummaryCard label="Selected" value={String(selectedItems.length)} />
            <SummaryCard label="Meetings" value={String(selectedItems.filter((item) => item.kind === "meeting").length)} />
            <SummaryCard label="Scheduled tasks" value={String(selectedItems.filter((item) => item.kind === "task").length)} />
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/35 p-4">
            <div className="mb-3 flex items-center justify-between"><span className="text-xs text-fg">Review these calendar blocks</span><span className="text-[10px] text-fg-subtle">{range.length ? `${formatDate(range[0])} – ${formatDate(range[range.length - 1])}` : "No dates selected"}</span></div>
            <div className="max-h-[38vh] space-y-2 overflow-y-auto">
              {selectedItems.sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)).map((item) => <div key={item.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                <span className="h-8 w-1 rounded-full bg-gold" />
                <div className="min-w-0 flex-1"><p className="truncate text-xs text-fg">{item.title}</p><p className="mt-1 text-[10px] text-fg-subtle">{formatDate(item.date)} · {formatTime(item.startTime)} · {item.durationMinutes} min</p></div>
                <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[9px] text-fg-muted">{KIND_LABELS[item.kind]}</span>
              </div>)}
            </div>
          </div>
          {missingDetails && <p className="mt-3 rounded-lg border border-red-300/20 bg-red-300/5 px-3 py-2 text-xs text-red-200">Some selected items still need a start time and duration. Go back to review them.</p>}
          {overlaps.size > 0 && <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-100">{overlaps.size} imported item{overlaps.size === 1 ? " overlaps" : "s overlap"} with the existing calendar. Review these before importing.</p>}
          {selectedItems.length === 0 && <p className="mt-3 text-xs text-fg-muted">No items selected. Go back and select at least one.</p>}
        </div>}

        {step === "success" && <div className="mx-auto max-w-md py-10 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-300"><Check size={25} /></span><h3 className="display mt-5 text-2xl text-fg">Your calendar has been updated</h3><p className="mt-2 text-sm text-fg-muted">{selectedItems.filter((item) => item.startTime && item.durationMinutes >= 5).length} calendar items added, including {selectedItems.filter((item) => item.kind === "task" && item.startTime && item.durationMinutes >= 5).length} tasks in your task list.</p></div>}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4 sm:px-6">
        <button className="btn h-9 px-3" onClick={step === "upload" || step === "success" ? close : () => setStep(step === "review" ? "upload" : "review")}>{step === "upload" || step === "success" ? "Close" : <><ChevronLeft size={13} />Back</>}</button>
        {step === "review" && <button className="btn btn-gold h-9 px-4" disabled={!selectedItems.length} onClick={() => setStep("preview")}>Continue to preview<ChevronRight size={13} /></button>}
        {step === "preview" && <button className="btn btn-gold h-9 px-4" disabled={selectedItems.length === 0 || missingDetails} onClick={commitImport}>Import {selectedItems.length} item{selectedItems.length === 1 ? "" : "s"}</button>}
      </footer>
    </section>
  </div>;
}

function SummaryCard({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/35 p-3 text-center"><p className="text-lg text-fg">{value}</p><p className="mt-0.5 text-[10px] text-fg-subtle">{label}</p></div>; }
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function formatTime(value: string) { return value ? new Date(`2000-01-01T${value}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Time missing"; }
function readAsDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Could not read that image file.")); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read that image file.")); reader.readAsDataURL(file); }); }

"use client";

import { useState, type FormEvent } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Brain, Check, CheckSquare2, Clock3, Lightbulb, MoreHorizontal, Plus, StickyNote, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { CapturedDistraction } from "@/lib/focus-time";

type ThoughtCategory = NonNullable<CapturedDistraction["category"]>;

const categoryOptions: Array<{ id: ThoughtCategory; label: string; icon: typeof CheckSquare2 }> = [
  { id: "task", label: "Task", icon: CheckSquare2 },
  { id: "note", label: "Note", icon: StickyNote },
  { id: "idea", label: "Idea", icon: Lightbulb },
];

export default function ThoughtsPage() {
  const captured = useStore((state) => state.capturedDistractions);
  const captureThought = useStore((state) => state.captureDistraction);
  const updateStatus = useStore((state) => state.updateDistractionStatus);
  const convertToTask = useStore((state) => state.convertDistractionToTask);
  const scheduleUnscheduledTask = useStore((state) => state.scheduleUnscheduledTask);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<ThoughtCategory>("thought");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const toProcess = captured.filter((item) => item.status === "unprocessed");
  const savedForLater = captured.filter((item) => item.status === "later");

  function submitThought(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;
    captureThought(text, category);
    setText("");
    setCategory("thought");
    setNotice("Thought captured.");
  }

  function beginTask(item: CapturedDistraction) {
    setEditingId(item.id);
    setTaskTitle(item.text);
  }

  function saveAsTask(id: string, schedule = false) {
    const originalText = useStore.getState().capturedDistractions.find((item) => item.id === id)?.text ?? "";
    const title = taskTitle.trim() || originalText.trim();
    if (!title) return;
    const taskId = convertToTask(id, title);
    if (!taskId) {
      setNotice("The task could not be created. Your thought is still saved.");
      return;
    }
    setEditingId(null);
    setTaskTitle("");
    if (!schedule) {
      setNotice("Added to Tasks.");
      return;
    }
    const result = scheduleUnscheduledTask(taskId);
    if (!result.scheduled) {
      setNotice("Task created, but Aevia could not find an open time to schedule it.");
      return;
    }
    const events = useStore.getState().events
      .filter((event) => event.taskId === taskId && !event.cancelled)
      .sort((a, b) => a.start.localeCompare(b.start));
    const first = events[0];
    setNotice(first ? `Task scheduled for ${format(new Date(first.start), "EEE, MMM d · HH:mm")}.` : "Task scheduled.");
  }

  return <div className="mx-auto max-w-[940px] px-5 py-8 fade-in sm:px-8 sm:py-12">
    <header className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-gold"><Lightbulb size={20} /></div>
        <div><h1 className="text-[27px] font-medium leading-8 tracking-[-0.025em] text-fg sm:text-[31px]">Thoughts</h1><p className="mt-1 text-[13px] text-fg-muted">Everything on your mind, in one place.</p></div>
      </div>
      <span className="mt-1 shrink-0 rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[11px] text-fg-muted">{toProcess.length} to process</span>
    </header>

    <form onSubmit={submitThought} className="card mt-6 p-4 sm:p-5">
      <label htmlFor="thought-capture" className="flex items-center gap-2 text-[14px] font-medium text-fg"><Plus size={16} className="text-gold" />Capture a thought...</label>
      <textarea id="thought-capture" rows={2} maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} placeholder="A task, an idea, a note, anything." className="input mt-2 min-h-[54px] border-transparent bg-transparent px-0 text-[14px] placeholder:text-fg-subtle focus:border-transparent" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" aria-label="Thought type">
          {categoryOptions.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)} className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[12px] transition ${category === id ? "border-[var(--gold)]/50 bg-[var(--gold)]/10 text-fg" : "border-[var(--border)] bg-[var(--surface-2)] text-fg-muted hover:text-fg"}`}><Icon size={13} className="text-gold" />{label}</button>)}
        </div>
        <button type="submit" disabled={!text.trim()} className="btn btn-gold h-9"><Plus size={14} />Capture</button>
      </div>
    </form>

    {notice && <div role="status" className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[12px] text-fg-muted"><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)} className="text-fg-subtle hover:text-fg"><X size={14} /></button></div>}

    <section className="mt-7" aria-labelledby="thoughts-process-heading">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 id="thoughts-process-heading" className="text-[15px] font-semibold text-fg">To process</h2><span className="text-[11px] text-fg-subtle">Clear when ready</span></div>
      {toProcess.length === 0 ? <div className="card px-5 py-8 text-center"><p className="text-[14px] text-fg">Nothing waiting here.</p><p className="mt-1 text-[12px] text-fg-muted">Capture a thought above or save one during Focus.</p></div> : <div className="space-y-2.5">
        {toProcess.map((item) => <ThoughtCard key={item.id} item={item} editing={editingId === item.id} taskTitle={taskTitle} onTaskTitleChange={setTaskTitle} onBeginTask={() => beginTask(item)} onSaveTask={(schedule) => saveAsTask(item.id, schedule)} onCancelTask={() => { setEditingId(null); setTaskTitle(""); }} onLater={() => updateStatus(item.id, "later")} onDismiss={() => updateStatus(item.id, "dismissed")} />)}
      </div>}
    </section>

    {savedForLater.length > 0 && <section className="mt-7" aria-labelledby="thoughts-later-heading">
      <div className="mb-3 flex items-center justify-between"><h2 id="thoughts-later-heading" className="text-[15px] font-semibold text-fg">Later</h2><span className="text-[11px] text-fg-subtle">{savedForLater.length} saved</span></div>
      <div className="space-y-2.5">{savedForLater.map((item) => <ThoughtCard key={item.id} item={item} editing={editingId === item.id} taskTitle={taskTitle} onTaskTitleChange={setTaskTitle} onBeginTask={() => beginTask(item)} onSaveTask={(schedule) => saveAsTask(item.id, schedule)} onCancelTask={() => { setEditingId(null); setTaskTitle(""); }} onLater={() => updateStatus(item.id, "unprocessed")} onDismiss={() => updateStatus(item.id, "dismissed")} later />)}</div>
    </section>}

    {toProcess.filter((item) => item.category === "task" || item.category === "idea").length > 0 && <div className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/75 px-4 py-3.5 text-[12px] text-fg-muted"><Lightbulb size={16} className="mt-0.5 shrink-0 text-gold" /><div><p className="font-medium text-fg">Aevia suggestion</p><p className="mt-1">You have {toProcess.filter((item) => item.category === "task" || item.category === "idea").length} item{toProcess.filter((item) => item.category === "task" || item.category === "idea").length === 1 ? "" : "s"} that might become tasks. Want to review them?</p></div></div>}
  </div>;
}

function ThoughtCard({ item, editing, taskTitle, onTaskTitleChange, onBeginTask, onSaveTask, onCancelTask, onLater, onDismiss, later = false }: {
  item: CapturedDistraction;
  editing: boolean;
  taskTitle: string;
  onTaskTitleChange: (title: string) => void;
  onBeginTask: () => void;
  onSaveTask: (schedule: boolean) => void;
  onCancelTask: () => void;
  onLater: () => void;
  onDismiss: () => void;
  later?: boolean;
}) {
  const category = item.category ?? "thought";
  const Icon = category === "task" ? CheckSquare2 : category === "note" ? StickyNote : category === "idea" ? Lightbulb : Brain;
  const capturedLabel = isToday(item.createdAt) ? `Captured ${format(item.createdAt, "HH:mm")}` : isYesterday(item.createdAt) ? "Captured yesterday" : `Captured ${format(item.createdAt, "MMM d · HH:mm")}`;
  return <article className="card p-3.5 sm:p-4">
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${category === "task" ? "bg-[var(--gold)]/10 text-gold" : category === "idea" ? "bg-emerald-400/10 text-emerald-200" : category === "note" ? "bg-sky-400/10 text-sky-200" : "bg-rose-300/10 text-rose-200"}`}><Icon size={17} /></div>
      <div className="min-w-0 flex-1">
        {editing ? <div className="flex flex-wrap gap-2"><input autoFocus maxLength={300} aria-label="Task title" className="input h-9 min-w-[180px] flex-1" value={taskTitle} onChange={(event) => onTaskTitleChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onSaveTask(false); } }} /><button type="button" className="btn btn-gold h-9" disabled={!taskTitle.trim()} onClick={() => onSaveTask(false)}><Check size={13} />Make task</button><button type="button" className="btn h-9" onClick={onCancelTask}>Cancel</button></div> : <p className="whitespace-pre-wrap text-[14px] leading-5 text-fg">{item.text}</p>}
        <p className="mt-1.5 text-[11px] text-fg-subtle">{category[0].toUpperCase() + category.slice(1)} · {capturedLabel}{later ? " · Saved for later" : ""}</p>
      </div>
      {!editing && <button type="button" aria-label="More thought actions" title="More actions" className="-mr-1 -mt-1 rounded-lg p-1.5 text-fg-subtle hover:bg-[var(--surface-2)] hover:text-fg" onClick={onLater}><MoreHorizontal size={16} /></button>}
    </div>
    {!editing && <div className="mt-3 flex flex-wrap gap-2">
      {category === "task" ? <><button type="button" className="btn btn-gold h-8 px-2.5 text-[11px]" onClick={onBeginTask}>Make a task</button><button type="button" className="btn h-8 px-2.5 text-[11px]" onClick={() => onSaveTask(true)}>Schedule</button></> : <><button type="button" className="btn h-8 px-2.5 text-[11px]" onClick={category === "note" || category === "idea" ? onLater : onBeginTask}>{category === "note" ? "Keep as note" : category === "idea" ? "Keep for later" : "Make a task"}</button>{category !== "note" && category !== "idea" && <button type="button" className="btn h-8 px-2.5 text-[11px]" onClick={onLater}>Later</button>}{category === "idea" && <button type="button" className="btn h-8 px-2.5 text-[11px]" onClick={onBeginTask}>Create task</button>}</>}
      {later ? <button type="button" className="btn h-8 px-2.5 text-[11px]" onClick={onLater}>To process</button> : <button type="button" className="btn h-8 px-2.5 text-[11px]" onClick={onDismiss}>Dismiss</button>}
    </div>}
  </article>;
}

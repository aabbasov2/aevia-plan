"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { AlertTriangle, Ban, Clipboard, ClipboardPaste, RotateCcw, Scissors, Trash2, X } from "lucide-react";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarHeader } from "./CalendarHeader";
import { CreateEventModal } from "./CreateEventModal";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { CalendarPreferencesModal } from "./CalendarPreferencesModal";
import { useStore } from "@/lib/store";
import { weekStart } from "@/lib/time";
import { planningWeekStart } from "@/lib/planner";
import { CALENDAR_DROP_SLOT_MINUTES, type CalendarView } from "@/lib/calendar-layout";
import type { CalendarEvent } from "@/lib/types";
import { EventEditorModal } from "./EventEditorModal";
import { CalendarImportModal } from "./CalendarImportModal";
import { ConflictReplanPanel } from "./ConflictReplanPanel";
import { findCalendarOverlaps, findCalendarTransitionWarnings } from "@/lib/calendar-conflicts";
import type { ConflictReplanProposal } from "@/lib/store";

type ClipboardEvent = Omit<CalendarEvent, "id">;

export function WeeklyCalendar() {
  const [anchorDate, setAnchorDate] = useState(() => planningWeekStart(new Date()));
  const [view, setView] = useState<CalendarView>("week");
  const [eventOpen, setEventOpen] = useState(false);
  const [eventStart, setEventStart] = useState<Date | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [overlapReviewOpen, setOverlapReviewOpen] = useState(false);
  const [overlapProposal, setOverlapProposal] = useState<ConflictReplanProposal | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [clipboardEvents, setClipboardEvents] = useState<ClipboardEvent[]>([]);
  const [pasteTarget, setPasteTarget] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const events = useStore((state) => state.events);
  const plannerPreferences = useStore((state) => state.plannerPreferences);
  const ensureLunchEvents = useStore((state) => state.ensureLunchEvents);
  const planWeek = useStore((state) => state.planWeek);
  const addEvents = useStore((state) => state.addEvents);
  const createTask = useStore((state) => state.createTask);
  const updateEvent = useStore((state) => state.updateEvent);
  const deleteEvents = useStore((state) => state.deleteEvents);
  const setEventsCancelled = useStore((state) => state.setEventsCancelled);
  const previewConflictReplan = useStore((state) => state.previewConflictReplan);
  const applyConflictReplan = useStore((state) => state.applyConflictReplan);
  const visibleWeek = useMemo(() => weekStart(anchorDate), [anchorDate]);
  const selectedEventSet = useMemo(
    () => new Set(selectedEventIds),
    [selectedEventIds]
  );
  const selectedEvents = useMemo(
    () => events.filter((event) => selectedEventSet.has(event.id)),
    [events, selectedEventSet]
  );
  const allSelectedCancelled =
    selectedEvents.length > 0 && selectedEvents.every((event) => event.cancelled);
  const visibleRange = useMemo(() => {
    if (view === "day") {
      const start = new Date(anchorDate);
      start.setHours(0, 0, 0, 0);
      return { start: start.getTime(), end: addDays(start, 1).getTime() };
    }
    if (view === "month") return {
      start: startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 }).getTime(),
      end: addDays(endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 }), 1).getTime(),
    };
    return { start: visibleWeek.getTime(), end: addDays(visibleWeek, 7).getTime() };
  }, [anchorDate, view, visibleWeek]);
  const weekOverlaps = useMemo(
    () => findCalendarOverlaps(events, visibleRange.start, visibleRange.end),
    [events, visibleRange]
  );
  const transitionWarnings = useMemo(
    () => findCalendarTransitionWarnings(events, plannerPreferences.bufferMinutes, visibleRange.start, visibleRange.end),
    [events, plannerPreferences.bufferMinutes, visibleRange]
  );

  const copySelected = useCallback((cut = false) => {
    const copied = events
      .filter((event) => selectedEventIds.includes(event.id))
      .map(toClipboardEvent);
    if (copied.length === 0) return;
    setClipboardEvents(copied);
    if (cut) {
      deleteEvents(selectedEventIds);
      setSelectedEventIds([]);
    }
  }, [deleteEvents, events, selectedEventIds]);

  const pasteCopied = useCallback(() => {
    if (clipboardEvents.length === 0) return;
    const earliestStart = Math.min(
      ...clipboardEvents.map((event) => new Date(event.start).getTime())
    );
    const targetStart = pasteTarget?.getTime() ?? earliestStart;
    const offset = targetStart - earliestStart;
    const createdIds = addEvents(
      clipboardEvents.map((event) => ({
        ...event,
        start: new Date(new Date(event.start).getTime() + offset).toISOString(),
        origin: "user",
      }))
    );
    setSelectedEventIds(createdIds);
    setPasteTarget(null);
  }, [addEvents, clipboardEvents, pasteTarget]);

  const deleteSelected = useCallback(() => {
    if (selectedEventIds.length === 0) return;
    deleteEvents(selectedEventIds);
    setSelectedEventIds([]);
  }, [deleteEvents, selectedEventIds]);

  const toggleSelectedCancellation = useCallback(() => {
    if (selectedEventIds.length === 0) return;
    const shouldRestore = selectedEvents.every((event) => event.cancelled);
    setEventsCancelled(selectedEventIds, !shouldRestore);
  }, [selectedEventIds, selectedEvents, setEventsCancelled]);

  useEffect(() => {
    const addedLunch = ensureLunchEvents(visibleWeek.getTime());
    if (addedLunch && visibleWeek.getTime() === planningWeekStart(new Date()).getTime()) {
      planWeek(visibleWeek.getTime());
    }
  }, [ensureLunchEvents, planWeek, visibleWeek]);

  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;

    let lastZoomAt = 0;
    const handleZoom = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (Math.abs(event.deltaY) < 1) return;

      const now = Date.now();
      if (now - lastZoomAt < 350) return;
      lastZoomAt = now;

      setView((currentView) => {
        const levels: CalendarView[] = ["month", "week", "day"];
        const direction = event.deltaY < 0 ? 1 : -1;
        const nextIndex = Math.max(
          0,
          Math.min(levels.length - 1, levels.indexOf(currentView) + direction)
        );
        return levels[nextIndex];
      });
    };

    calendar.addEventListener("wheel", handleZoom, { passive: false });
    return () => calendar.removeEventListener("wheel", handleZoom);
  }, []);

  useEffect(() => {
    const existingIds = new Set(events.map((event) => event.id));
    setSelectedEventIds((current) => {
      const next = current.filter((id) => existingIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [events]);

  useEffect(() => {
    const handleShortcuts = (keyboardEvent: KeyboardEvent) => {
      if (
        isEditableTarget(keyboardEvent.target) ||
        eventOpen ||
        preferencesOpen ||
        selectedEventId
      ) {
        return;
      }

      const focusedEventId =
        document.activeElement instanceof HTMLElement
          ? document.activeElement.closest<HTMLElement>("[data-calendar-event-id]")?.dataset
              .calendarEventId
          : undefined;
      const modifier = keyboardEvent.ctrlKey || keyboardEvent.metaKey;
      const key = keyboardEvent.key.toLowerCase();
      if (modifier && key === "c" && selectedEventIds.length > 0) {
        keyboardEvent.preventDefault();
        copySelected(false);
      } else if (modifier && key === "x" && selectedEventIds.length > 0) {
        keyboardEvent.preventDefault();
        copySelected(true);
      } else if (modifier && key === "v" && clipboardEvents.length > 0) {
        keyboardEvent.preventDefault();
        pasteCopied();
      } else if (
        selectedEventIds.length > 0 &&
        (keyboardEvent.key === "Delete" ||
          (keyboardEvent.metaKey && keyboardEvent.key === "Backspace") ||
          (selectedEventIds.length === 1 &&
            focusedEventId === selectedEventIds[0] &&
            keyboardEvent.key === "Backspace"))
      ) {
        keyboardEvent.preventDefault();
        deleteSelected();
      } else if (
        selectedEventIds.length === 1 &&
        focusedEventId === selectedEventIds[0] &&
        !keyboardEvent.ctrlKey &&
        !keyboardEvent.metaKey &&
        !keyboardEvent.altKey &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(keyboardEvent.key)
      ) {
        const selectedEvent = events.find((event) => event.id === selectedEventIds[0]);
        if (!selectedEvent) return;

        keyboardEvent.preventDefault();
        const nextStart = new Date(selectedEvent.start);
        if (keyboardEvent.key === "ArrowUp") {
          nextStart.setMinutes(nextStart.getMinutes() - CALENDAR_DROP_SLOT_MINUTES);
        } else if (keyboardEvent.key === "ArrowDown") {
          nextStart.setMinutes(nextStart.getMinutes() + CALENDAR_DROP_SLOT_MINUTES);
        } else if (keyboardEvent.key === "ArrowLeft") {
          nextStart.setDate(nextStart.getDate() - 1);
        } else {
          nextStart.setDate(nextStart.getDate() + 1);
        }

        updateEvent(selectedEvent.id, {
          title: selectedEvent.title,
          start: nextStart.toISOString(),
          durationMinutes: selectedEvent.durationMinutes,
          kind: selectedEvent.kind,
          project: selectedEvent.project,
          colorIndex: selectedEvent.colorIndex,
        });
      }
    };

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [
    clipboardEvents.length,
    copySelected,
    deleteSelected,
    eventOpen,
    events,
    pasteCopied,
    preferencesOpen,
    selectedEventId,
    selectedEventIds,
    updateEvent,
  ]);

  function selectEvent(eventId: string, additive: boolean) {
    setPasteTarget(null);
    setSelectedEventIds((current) => {
      if (!additive) return [eventId];
      return current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId];
    });
  }

  return (
    <>
      <div ref={calendarRef} className="min-w-0 fade-in">
        <CalendarHeader
          anchorDate={anchorDate}
          view={view}
          onAnchorChange={setAnchorDate}
          onViewChange={setView}
          onAddEvent={() => {
            setEventStart(null);
            setEventOpen(true);
          }}
          onImportScreenshot={() => setImportOpen(true)}
          onPreferences={() => setPreferencesOpen(true)}
        />
        {(weekOverlaps.length > 0 || transitionWarnings.length > 0) && <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] px-3.5 py-3">
          <AlertTriangle size={16} className="shrink-0 text-amber-200" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-fg">{weekOverlaps.length ? `Aevia flagged ${weekOverlaps.length} calendar overlap${weekOverlaps.length === 1 ? "" : "s"}` : "Aevia found tight transitions between calendar blocks"}</p>
            <p className="mt-0.5 text-[10px] text-fg-muted">{transitionWarnings.length ? `${transitionWarnings.length} block pair${transitionWarnings.length === 1 ? " has" : "s have"} less than your ${plannerPreferences.bufferMinutes}-minute transition buffer.` : "Review the shared times and decide which event to adjust."}</p>
          </div>
          <button type="button" className="btn h-8 px-3 text-[11px]" onClick={() => setOverlapReviewOpen(true)}>Review overlaps</button>
        </div>}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-fg-subtle">
          <div className="flex items-center gap-3 sm:hidden">
            <span>Swipe across the calendar</span>
            <span>Lunch is movable</span>
          </div>
          <span className="hidden sm:inline">
            Click selects · ←/→ moves a day · ↑/↓ moves 15 min · Backspace deletes · Double-click edits
          </span>
          <div className="ml-auto flex items-center gap-3" aria-label="Calendar event legend">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--fg)] opacity-75" />
              Placed by you
            </span>
            <span className="flex items-center gap-1.5 text-[var(--gold-strong)]">
              <AeviaArc size={11} />
              Placed by Aevia
            </span>
          </div>
        </div>
        {(selectedEventIds.length > 0 || clipboardEvents.length > 0 || pasteTarget) && (
          <div className="mb-2 flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5">
            <span className="mr-auto text-[11px] text-fg-muted">
              {selectedEventIds.length > 0
                ? `${selectedEventIds.length} event${selectedEventIds.length === 1 ? "" : "s"} selected`
                : pasteTarget
                  ? `Paste target · ${pasteTarget.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}`
                  : `${clipboardEvents.length} event${clipboardEvents.length === 1 ? "" : "s"} copied`}
            </span>
            <button className="btn h-7 px-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-30" disabled={selectedEventIds.length === 0} onClick={() => copySelected(false)} title="Copy · Ctrl/⌘ C">
              <Clipboard size={12} /> Copy
            </button>
            <button className="btn h-7 px-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-30" disabled={selectedEventIds.length === 0} onClick={() => copySelected(true)} title="Cut · Ctrl/⌘ X">
              <Scissors size={12} /> Cut
            </button>
            <button className="btn h-7 px-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-30" disabled={clipboardEvents.length === 0} onClick={pasteCopied} title="Paste · Ctrl/⌘ V">
              <ClipboardPaste size={12} /> Paste
            </button>
            <button className="btn h-7 px-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-30" disabled={selectedEventIds.length === 0} onClick={toggleSelectedCancellation}>
              {allSelectedCancelled ? <RotateCcw size={12} /> : <Ban size={12} />}
              {allSelectedCancelled
                ? "Restore"
                : `Cancel event${selectedEventIds.length === 1 ? "" : "s"}`}
            </button>
            <button className="btn btn-ghost h-7 px-2 text-[11px] text-fg-muted hover:text-[#d39a76] disabled:cursor-not-allowed disabled:opacity-30" disabled={selectedEventIds.length === 0} onClick={deleteSelected} title="Delete permanently · Delete">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}
        <CalendarGrid
          anchorDate={anchorDate}
          view={view}
          onEventOpen={setSelectedEventId}
          selectedEventIds={selectedEventSet}
          onEventSelect={selectEvent}
          onCreateEvent={(start) => {
            setEventStart(start);
            setEventOpen(true);
          }}
          pasteTargetMs={pasteTarget?.getTime() ?? null}
          onSelectSlot={(start) => {
            setSelectedEventIds([]);
            setPasteTarget(start);
          }}
        />
      </div>
      <CreateEventModal
        open={eventOpen}
        initialStart={eventStart}
        onOpenChange={(open) => {
          setEventOpen(open);
          if (!open) setEventStart(null);
        }}
      />
      <CalendarPreferencesModal
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
        weekStartMs={visibleWeek.getTime()}
      />
      <CalendarImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        events={events}
        onImport={(importedEvents) => {
          const linkedEvents = importedEvents.map((event) => {
            if (event.kind !== "task") return event;
            const taskId = createTask({
              title: event.title,
              durationMinutes: event.durationMinutes,
              deadline: event.start,
              recurrence: { kind: "none" },
              project: event.project ?? "personal",
              colorIndex: event.colorIndex,
            }, { autoSchedule: false });
            return { ...event, taskId };
          });
          addEvents(linkedEvents);
          const importedWeeks = new Set(linkedEvents.map((event) => weekStart(new Date(event.start)).getTime()));
          for (const weekMs of importedWeeks) ensureLunchEvents(weekMs);
        }}
      />
      <EventEditorModal eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
      {overlapReviewOpen && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--overlay)] p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOverlapReviewOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="calendar-overlap-title" className="card-raised max-h-[80vh] w-full max-w-xl overflow-y-auto p-5 sm:p-6">
          {overlapProposal ? <ConflictReplanPanel
            proposal={overlapProposal}
            onDismiss={() => setOverlapProposal(null)}
            onApply={() => { const applied = applyConflictReplan(overlapProposal); if (applied) setOverlapProposal(null); return applied; }}
          /> : <>
            <div className="flex items-start justify-between gap-4">
              <div><div className="wordmark text-[10px] text-amber-200">AEVIA SCHEDULE CHECK</div><h2 id="calendar-overlap-title" className="display mt-1 text-xl text-fg">Overlapping events</h2><p className="mt-1 text-xs leading-5 text-fg-muted">Aevia detected these shared time ranges. It can reflow flexible Aevia task blocks; fixed events stay where you placed them.</p></div>
              <button type="button" className="btn h-8 w-8 shrink-0 p-0" onClick={() => setOverlapReviewOpen(false)} aria-label="Close overlap review"><X size={14} /></button>
            </div>
            <ul className="mt-4 space-y-2">
              {weekOverlaps.map((overlap) => {
                const flexibleTask = [overlap.first, overlap.second].find((event) => event.origin === "aevia" && event.kind === "task" && Boolean(event.taskId) && !event.locked);
                const fixedEvent = flexibleTask?.id === overlap.first.id ? overlap.second : overlap.first;
                return <li key={overlap.key} className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3">
                  <p className="text-[10px] text-amber-100">{format(new Date(overlap.start), "EEE, MMM d · h:mm a")}–{format(new Date(overlap.end), "h:mm a")}</p>
                  <p className="mt-1 text-xs text-fg">{overlap.first.title} <span className="text-fg-subtle">overlaps</span> {overlap.second.title} <span className="ml-1 text-[9px] uppercase tracking-wide text-amber-100">{overlap.severity} · {overlap.type.replaceAll("-", " ")}</span></p>
                  <p className="mt-1 text-[10px] text-fg-muted">{overlap.recommendation}</p>
                  <div className="mt-2 flex flex-wrap gap-2"><button type="button" className="btn h-7 px-2 text-[10px]" onClick={() => { setOverlapReviewOpen(false); setSelectedEventId(overlap.first.id); }}>Edit {overlap.first.title}</button><button type="button" className="btn h-7 px-2 text-[10px]" onClick={() => { setOverlapReviewOpen(false); setSelectedEventId(overlap.second.id); }}>Edit {overlap.second.title}</button>{flexibleTask && <button type="button" className="btn btn-gold h-7 px-2 text-[10px]" onClick={() => { const fixedOccurrence = fixedEvent.id === overlap.first.id ? overlap.firstOccurrenceStart : overlap.secondOccurrenceStart; const proposal = previewConflictReplan(fixedEvent.id, fixedOccurrence); if (proposal) setOverlapProposal(proposal); }}>Ask Aevia to replan</button>}</div>
                </li>;
              })}
            </ul>
            {transitionWarnings.length > 0 && <div className="mt-3 border-t border-[var(--border)] pt-3"><p className="wordmark text-[9px] text-fg-subtle">SHORT TRANSITIONS · NOT OVERLAPS</p><ul className="mt-2 space-y-1.5">{transitionWarnings.map((warning) => <li key={warning.key} className="text-[10px] text-fg-muted">{warning.first.title} → {warning.second.title}: {warning.gapMinutes} min between blocks</li>)}</ul></div>}
          </>}
        </section>
      </div>}
    </>
  );
}

function toClipboardEvent(event: CalendarEvent): ClipboardEvent {
  return {
    title: event.title,
    start: event.start,
    durationMinutes: event.durationMinutes,
    taskId: event.taskId,
    kind: event.kind,
    origin: event.origin,
    project: event.project,
    colorIndex: event.colorIndex,
    locked: event.locked,
    cancelled: event.cancelled,
    allDay: event.allDay,
    availability: event.availability,
    responseStatus: event.responseStatus,
    recurrence: event.recurrence,
  };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

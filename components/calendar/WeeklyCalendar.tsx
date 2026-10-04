"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ban, Clipboard, ClipboardPaste, RotateCcw, Scissors, Trash2 } from "lucide-react";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarHeader } from "./CalendarHeader";
import { CreateEventModal } from "./CreateEventModal";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { CalendarPreferencesModal } from "./CalendarPreferencesModal";
import { useStore } from "@/lib/store";
import { weekStart } from "@/lib/time";
import { planningWeekStart } from "@/lib/planner";
import type { CalendarView } from "@/lib/calendar-layout";
import type { CalendarEvent } from "@/lib/types";
import { EventEditorModal } from "./EventEditorModal";

type ClipboardEvent = Omit<CalendarEvent, "id">;

export function WeeklyCalendar() {
  const [anchorDate, setAnchorDate] = useState(() => planningWeekStart(new Date()));
  const [view, setView] = useState<CalendarView>("week");
  const [eventOpen, setEventOpen] = useState(false);
  const [eventStart, setEventStart] = useState<Date | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [clipboardEvents, setClipboardEvents] = useState<ClipboardEvent[]>([]);
  const [pasteTarget, setPasteTarget] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const events = useStore((state) => state.events);
  const ensureLunchEvents = useStore((state) => state.ensureLunchEvents);
  const planWeek = useStore((state) => state.planWeek);
  const addEvents = useStore((state) => state.addEvents);
  const deleteEvents = useStore((state) => state.deleteEvents);
  const setEventsCancelled = useStore((state) => state.setEventsCancelled);
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
          (keyboardEvent.metaKey && keyboardEvent.key === "Backspace"))
      ) {
        keyboardEvent.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [
    clipboardEvents.length,
    copySelected,
    deleteSelected,
    eventOpen,
    pasteCopied,
    preferencesOpen,
    selectedEventId,
    selectedEventIds.length,
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
          onPreferences={() => setPreferencesOpen(true)}
        />
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-fg-subtle">
          <div className="flex items-center gap-3 sm:hidden">
            <span>Swipe across the calendar</span>
            <span>Lunch is movable</span>
          </div>
          <span className="hidden sm:inline">
            Click selects · Ctrl/⌘-click selects multiple · Double-click edits
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
      <EventEditorModal eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
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

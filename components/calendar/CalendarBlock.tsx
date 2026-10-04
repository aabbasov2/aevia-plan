"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { blockColor } from "@/lib/projects";
import { formatHm, formatRange } from "@/lib/time";
import type { CalendarEvent } from "@/lib/types";
import { cn } from "@/lib/cn";
import {
  calendarEventHeight,
  CALENDAR_DROP_SLOT_MINUTES,
} from "@/lib/calendar-layout";
import { useStore } from "@/lib/store";
import { AeviaArc } from "@/components/brand/AeviaArc";

type ResizeEdge = "start" | "end";
type ResizePreview = { startMinutes: number; durationMinutes: number };
type ResizeSession = {
  edge: ResizeEdge;
  pointerId: number;
  initialPointerY: number;
  initialStartMinutes: number;
  initialDurationMinutes: number;
};

const MIN_EVENT_DURATION_MINUTES = 5;

export function CalendarBlock({
  event,
  startMinutesInDay,
  calendarStartMinutes,
  lane,
  laneCount,
  hourHeight,
  selected,
  onSelect,
  onOpen,
}: {
  event: CalendarEvent;
  startMinutesInDay: number;
  calendarStartMinutes: number;
  lane: number;
  laneCount: number;
  hourHeight: number;
  selected: boolean;
  onSelect: (eventId: string, additive: boolean) => void;
  onOpen: (eventId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event-${event.id}`,
  });
  const updateEvent = useStore((state) => state.updateEvent);
  const resizeSession = useRef<ResizeSession | null>(null);
  const resizePreviewRef = useRef<ResizePreview | null>(null);
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null);

  const displayedStartMinutes = resizePreview?.startMinutes ?? startMinutesInDay;
  const displayedDurationMinutes = resizePreview?.durationMinutes ?? event.durationMinutes;
  const top = ((displayedStartMinutes - calendarStartMinutes) / 60) * hourHeight;
  const renderedHeight = calendarEventHeight(displayedDurationMinutes, hourHeight);
  const usesDenseLayout = renderedHeight < 48 || laneCount > 1;
  const usesCompactRow = renderedHeight < 36;
  const usesVerticalTime = laneCount > 1;
  const startLabel = formatHm(displayedStartMinutes);
  const endLabel = formatHm(displayedStartMinutes + displayedDurationMinutes);
  const displayTitle =
    laneCount > 1 || usesCompactRow
      ? abbreviateEventTitle(event.title)
      : event.title;
  const timeHeight = usesVerticalTime ? 20 : 14;
  const verticalPadding = usesDenseLayout ? 4 : 12;
  const titleLineCount = Math.max(
    1,
    Math.min(4, Math.floor((renderedHeight - timeHeight - verticalPadding) / 13))
  );
  const canResize =
    calendarEventHeight(event.durationMinutes, hourHeight) >= 24 || Boolean(resizePreview);
  const laneWidth = 100 / laneCount;
  const laneGap = laneCount > 1 ? 3 : 6;
  // Persisted events created before origin tracking can still be identified reliably enough:
  // scheduled task blocks came from Aevia, while calendar events came from the user.
  const origin = event.origin ?? (event.kind === "task" ? "aevia" : "user");
  const isAevia = origin === "aevia";

  function setResize(next: ResizePreview | null) {
    resizePreviewRef.current = next;
    setResizePreview(next);
  }

  function startResize(edge: ResizeEdge, pointerEvent: ReactPointerEvent<HTMLDivElement>) {
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
    resizeSession.current = {
      edge,
      pointerId: pointerEvent.pointerId,
      initialPointerY: pointerEvent.clientY,
      initialStartMinutes: startMinutesInDay,
      initialDurationMinutes: event.durationMinutes,
    };
    setResize({
      startMinutes: startMinutesInDay,
      durationMinutes: event.durationMinutes,
    });
  }

  function moveResize(pointerEvent: ReactPointerEvent<HTMLDivElement>) {
    const session = resizeSession.current;
    if (!session || session.pointerId !== pointerEvent.pointerId) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();

    const rawDeltaMinutes =
      ((pointerEvent.clientY - session.initialPointerY) / hourHeight) * 60;
    const snappedDeltaMinutes =
      Math.round(rawDeltaMinutes / CALENDAR_DROP_SLOT_MINUTES) *
      CALENDAR_DROP_SLOT_MINUTES;

    if (session.edge === "start") {
      const delta = Math.max(
        -session.initialStartMinutes,
        Math.min(
          session.initialDurationMinutes - MIN_EVENT_DURATION_MINUTES,
          snappedDeltaMinutes
        )
      );
      setResize({
        startMinutes: session.initialStartMinutes + delta,
        durationMinutes: session.initialDurationMinutes - delta,
      });
      return;
    }

    const delta = Math.max(
      MIN_EVENT_DURATION_MINUTES - session.initialDurationMinutes,
      Math.min(
        24 * 60 - session.initialStartMinutes - session.initialDurationMinutes,
        snappedDeltaMinutes
      )
    );
    setResize({
      startMinutes: session.initialStartMinutes,
      durationMinutes: session.initialDurationMinutes + delta,
    });
  }

  function finishResize(
    pointerEvent: ReactPointerEvent<HTMLDivElement>,
    commit: boolean
  ) {
    const session = resizeSession.current;
    if (!session || session.pointerId !== pointerEvent.pointerId) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }

    const next = resizePreviewRef.current;
    resizeSession.current = null;
    setResize(null);
    if (!commit || !next) return;

    const startDeltaMinutes = next.startMinutes - startMinutesInDay;
    const nextStart = new Date(
      new Date(event.start).getTime() + startDeltaMinutes * 60_000
    );
    updateEvent(event.id, {
      title: event.title,
      start: nextStart.toISOString(),
      durationMinutes: next.durationMinutes,
      kind: event.kind,
      project: event.project,
      colorIndex: event.colorIndex,
    });
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(mouseEvent: ReactMouseEvent<HTMLDivElement>) => {
        if (!isDragging) {
          onSelect(
            event.id,
            mouseEvent.ctrlKey || mouseEvent.metaKey || mouseEvent.shiftKey
          );
        }
      }}
      onDoubleClick={(mouseEvent) => {
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();
        if (!isDragging) onOpen(event.id);
      }}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === "Enter") {
          keyboardEvent.preventDefault();
          onOpen(event.id);
        } else if (keyboardEvent.key === " ") {
          keyboardEvent.preventDefault();
          onSelect(
            event.id,
            keyboardEvent.ctrlKey || keyboardEvent.metaKey || keyboardEvent.shiftKey
          );
        }
      }}
      aria-label={`${selected ? "Selected, " : ""}${event.cancelled ? "Cancelled, " : ""}${event.title}, ${formatRange(displayedStartMinutes, displayedDurationMinutes)}. Double-click to edit.`}
      aria-selected={selected}
      title={`${event.cancelled ? "Cancelled · " : ""}${event.title} · ${formatRange(displayedStartMinutes, displayedDurationMinutes)} · Double-click to edit`}
      className={cn(
        "calendar-event group absolute z-10 cursor-grab overflow-hidden border border-l-2 text-left transition-all active:cursor-grabbing hover:shadow-elev",
        usesDenseLayout
          ? "rounded-[4px] px-1 py-0.5"
          : "rounded-lg px-2.5 py-1.5 hover:-translate-y-px",
        isAevia && "ring-1 ring-inset ring-[var(--gold-soft)]",
        selected && "z-[14] outline outline-2 outline-offset-1 outline-[var(--gold)]",
        event.cancelled && "opacity-60 saturate-50",
        resizePreview && "ring-1 ring-inset ring-[var(--gold)]",
        isDragging ? "opacity-40" : ""
      )}
      style={{
        top,
        height: renderedHeight,
        left: `calc(${lane * laneWidth}% + ${laneGap}px)`,
        right: `calc(${(laneCount - lane - 1) * laneWidth}% + ${laneGap}px)`,
        background: blockColor(event.colorIndex),
        borderLeftColor: isAevia ? "var(--gold)" : "var(--event-user-accent)",
      }}
    >
      {!usesDenseLayout && (
        <div
          className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--event-marker-bg)]"
          aria-label={isAevia ? "Placed by Aevia" : "Placed by you"}
          title={isAevia ? "Placed by Aevia" : "Placed by you"}
        >
          {isAevia ? (
            <AeviaArc size={10} />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--fg)] opacity-75" />
          )}
        </div>
      )}
      {usesCompactRow ? (
        <div className="flex h-full min-h-0 items-center justify-between gap-1">
          <div className={cn(
            "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[8px] font-semibold uppercase leading-[9px] text-fg",
            event.cancelled && "line-through decoration-2"
          )}>
            {displayTitle}
          </div>
          <EventTime
            start={startLabel}
            end={endLabel}
            vertical={usesVerticalTime}
            compact
          />
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div
            className={cn(
              "min-h-0 overflow-hidden whitespace-normal break-words font-medium text-fg",
              usesDenseLayout ? "text-[9px] leading-[11px]" : "pr-5 text-[12px] leading-[14px]",
              event.cancelled && "line-through decoration-2"
            )}
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: titleLineCount,
            }}
          >
            {displayTitle}
          </div>
          <EventTime
            start={startLabel}
            end={endLabel}
            vertical={usesVerticalTime}
          />
        </div>
      )}
      {canResize && (
        <>
          <ResizeHandle
            edge="start"
            active={Boolean(resizePreview)}
            onPointerDown={(pointerEvent) => startResize("start", pointerEvent)}
            onPointerMove={moveResize}
            onPointerUp={(pointerEvent) => finishResize(pointerEvent, true)}
            onPointerCancel={(pointerEvent) => finishResize(pointerEvent, false)}
          />
          <ResizeHandle
            edge="end"
            active={Boolean(resizePreview)}
            onPointerDown={(pointerEvent) => startResize("end", pointerEvent)}
            onPointerMove={moveResize}
            onPointerUp={(pointerEvent) => finishResize(pointerEvent, true)}
            onPointerCancel={(pointerEvent) => finishResize(pointerEvent, false)}
          />
        </>
      )}
    </div>
  );
}

function EventTime({
  start,
  end,
  vertical,
  compact = false,
}: {
  start: string;
  end: string;
  vertical: boolean;
  compact?: boolean;
}) {
  if (vertical) {
    return (
      <div
        className={cn(
          "mt-auto shrink-0 whitespace-nowrap text-fg-muted",
          compact ? "text-[7px] leading-[7px]" : "text-[9px] leading-[10px]"
        )}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <div>{start}</div>
        <div>{end}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-auto shrink-0 whitespace-nowrap text-fg-muted",
        compact ? "text-[8px] leading-[9px]" : "text-[10.5px] leading-[14px]"
      )}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {start}–{end}
    </div>
  );
}

function abbreviateEventTitle(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return (words[0] ?? "").slice(0, 3);
  return words.map((word) => word[0]).join("").toUpperCase();
}

function ResizeHandle({
  edge,
  active,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  edge: ResizeEdge;
  active: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 z-20 h-2.5 touch-none cursor-ns-resize opacity-0 transition-opacity group-hover:opacity-100",
        edge === "start" ? "top-0" : "bottom-0",
        active && "opacity-100"
      )}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      aria-hidden="true"
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-x-3 h-0.5 rounded-full bg-[var(--gold)]",
          edge === "start" ? "top-0.5" : "bottom-0.5"
        )}
      />
    </div>
  );
}

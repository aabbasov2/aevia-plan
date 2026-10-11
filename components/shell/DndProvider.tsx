"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import type { ConflictReplanProposal } from "@/lib/store";
import { blockColor } from "@/lib/projects";
import { humanDuration } from "@/lib/time";
import { calendarEventHeight } from "@/lib/calendar-layout";
import { ConflictReplanPanel } from "@/components/calendar/ConflictReplanPanel";

type ActiveDragKind = "task" | "event" | null;

const snapToEventTopBorder: CollisionDetection = ({
  collisionRect,
  droppableContainers,
  droppableRects,
}) => {
  const horizontalCenter = collisionRect.left + collisionRect.width / 2;
  let closest: { id: string | number; distance: number } | null = null;

  for (const container of droppableContainers) {
    if (container.disabled) continue;
    const rect = droppableRects.get(container.id);
    if (!rect || horizontalCenter < rect.left || horizontalCenter > rect.right) continue;

    const distance = Math.abs(rect.top - collisionRect.top);
    if (!closest || distance < closest.distance) {
      closest = { id: container.id, distance };
    }
  }

  return closest ? [{ id: closest.id }] : [];
};

/**
 * Drop targets encode "slot-<dayIndex>-<startMinutes>-<weekStartMs>" as their id.
 * Draggables encode "task-<taskId>" or "event-<eventId>".
 */
export function DndProvider({ children }: { children: ReactNode }) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState<string>("var(--block-3)");
  const [activeDuration, setActiveDuration] = useState<number>(60);
  const [activeKind, setActiveKind] = useState<ActiveDragKind>(null);
  const [conflictProposal, setConflictProposal] = useState<ConflictReplanProposal | null>(null);

  const scheduleTask = useStore((s) => s.scheduleTask);
  const moveEvent = useStore((s) => s.moveEvent);
  const tasks = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);
  const previewConflictReplan = useStore((s) => s.previewConflictReplan);
  const applyConflictReplan = useStore((s) => s.applyConflictReplan);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  );

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("task-")) {
      const t = tasks.find((x) => `task-${x.id}` === id);
      if (t) {
        setActiveKind("task");
        setActiveLabel(t.title);
        setActiveColor(blockColor(t.colorIndex));
        setActiveDuration(t.durationMinutes);
      }
    } else if (id.startsWith("event-")) {
      const ev = events.find((x) => `event-${x.id}` === id);
      if (ev) {
        setActiveKind("event");
        setActiveLabel(ev.title);
        setActiveColor(blockColor(ev.colorIndex));
        setActiveDuration(ev.durationMinutes);
      }
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveLabel(null);
    setActiveKind(null);
    const overId = e.over?.id ? String(e.over.id) : null;
    const activeId = String(e.active.id);
    if (!overId?.startsWith("slot-")) return;
    const parts = overId.split("-");
    // slot-<day>-<startMinutes>
    const day = Number(parts[1]);
    const startMin = Number(parts[2]);
    const weekStartMs = Number(parts[3]);
    if (activeId.startsWith("task-")) {
      const taskId = activeId.slice("task-".length);
      const eventId = scheduleTask(taskId, day, startMin, weekStartMs);
      const proposal = eventId ? previewConflictReplan(eventId) : null;
      if (proposal) setConflictProposal(proposal);
    } else if (activeId.startsWith("event-")) {
      const eventId = activeId.slice("event-".length);
      moveEvent(eventId, day, startMin, weekStartMs);
      const proposal = previewConflictReplan(eventId);
      if (proposal) setConflictProposal(proposal);
    }
  }

  function onDragCancel() {
    setActiveLabel(null);
    setActiveKind(null);
  }

  const previewDuration = activeKind === "task"
    ? Math.min(activeDuration, 60)
    : activeDuration;
  const previewHeight = Math.max(
    18,
    Math.min(72, calendarEventHeight(previewDuration))
  );

  return (
    <DndContext
      id="aevia-calendar-dnd"
      sensors={sensors}
      collisionDetection={snapToEventTopBorder}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {children}
      {conflictProposal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--overlay)] p-4" onClick={() => setConflictProposal(null)}>
          <div className="card-raised w-full max-w-lg p-5 sm:p-6" onClick={(event) => event.stopPropagation()}>
            <ConflictReplanPanel
              proposal={conflictProposal}
              onDismiss={() => setConflictProposal(null)}
              onApply={() => {
                applyConflictReplan(conflictProposal);
                setConflictProposal(null);
              }}
            />
          </div>
        </div>
      )}
      <DragOverlay dropAnimation={null}>
        {activeLabel ? (
          <div
            className="pointer-events-none overflow-hidden rounded-md border border-[var(--border-strong)] px-2 py-1.5 text-[11px] text-fg shadow-elev"
            style={{
              background: activeColor,
              width: 132,
              height: previewHeight,
              opacity: 0.9,
            }}
          >
            <div className="truncate">{activeLabel}</div>
            {previewHeight >= 38 && (
              <div className="mt-0.5 text-fg-muted text-[10px]">
                {humanDuration(previewDuration)}
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { blockColor } from "@/lib/projects";
import { humanDuration } from "@/lib/time";

/**
 * Drop targets encode "day-<dayIndex>-<startMinutes>" as their id.
 * Draggables encode "task-<taskId>" or "event-<eventId>".
 */
export function DndProvider({ children }: { children: ReactNode }) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState<string>("var(--block-3)");
  const [activeDuration, setActiveDuration] = useState<number>(60);

  const scheduleTask = useStore((s) => s.scheduleTask);
  const moveEvent = useStore((s) => s.moveEvent);
  const tasks = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  );

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("task-")) {
      const t = tasks.find((x) => `task-${x.id}` === id);
      if (t) {
        setActiveLabel(t.title);
        setActiveColor(blockColor(t.colorIndex));
        setActiveDuration(t.durationMinutes);
      }
    } else if (id.startsWith("event-")) {
      const ev = events.find((x) => `event-${x.id}` === id);
      if (ev) {
        setActiveLabel(ev.title);
        setActiveColor(blockColor(ev.colorIndex));
        setActiveDuration(ev.durationMinutes);
      }
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveLabel(null);
    const overId = e.over?.id ? String(e.over.id) : null;
    const activeId = String(e.active.id);
    if (!overId?.startsWith("slot-")) return;
    const parts = overId.split("-");
    // slot-<day>-<startMinutes>
    const day = Number(parts[1]);
    const startMin = Number(parts[2]);
    if (activeId.startsWith("task-")) {
      const taskId = activeId.slice("task-".length);
      scheduleTask(taskId, day, startMin);
    } else if (activeId.startsWith("event-")) {
      const eventId = activeId.slice("event-".length);
      moveEvent(eventId, day, startMin);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {children}
      <DragOverlay dropAnimation={null}>
        {activeLabel ? (
          <div
            className="pointer-events-none rounded-md border border-[var(--border-strong)] px-3 py-2 text-[12px] text-fg shadow-elev"
            style={{
              background: activeColor,
              width: 200,
              opacity: 0.85,
            }}
          >
            <div className="truncate">{activeLabel}</div>
            <div className="mt-0.5 text-fg-muted text-[11px]">
              {humanDuration(activeDuration)}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

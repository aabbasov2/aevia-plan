"use client";

import { useState } from "react";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarHeader } from "./CalendarHeader";
import { CreateEventModal } from "./CreateEventModal";

export function WeeklyCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [eventOpen, setEventOpen] = useState(false);
  return (
    <>
      <div className="min-w-0 fade-in">
        <CalendarHeader weekOffset={weekOffset} onChange={setWeekOffset} onAddEvent={() => setEventOpen(true)} />
        <div className="mb-2 flex items-center justify-between text-[11px] text-fg-subtle sm:hidden">
          <span>Swipe to move across the week</span>
          <span>Lunch protected · 13:00–14:00</span>
        </div>
        <CalendarGrid weekOffset={weekOffset} />
      </div>
      <CreateEventModal open={eventOpen} onOpenChange={setEventOpen} />
    </>
  );
}

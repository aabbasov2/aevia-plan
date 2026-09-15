"use client";

import { useState } from "react";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarHeader } from "./CalendarHeader";

export function WeeklyCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  return (
    <div className="fade-in">
      <CalendarHeader weekOffset={weekOffset} onChange={setWeekOffset} />
      <CalendarGrid weekOffset={weekOffset} />
    </div>
  );
}

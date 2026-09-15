"use client";

import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { AeviaPanel } from "@/components/aevia/AeviaPanel";

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-[1560px] px-10 py-14">
      <div className="grid grid-cols-[1fr_320px] gap-10">
        <WeeklyCalendar />
        <aside className="space-y-6">
          <AeviaPanel />
          <UnscheduledTasksRail />
        </aside>
      </div>
    </div>
  );
}

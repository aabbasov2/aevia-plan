"use client";

import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { AeviaPanel } from "@/components/aevia/AeviaPanel";

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_320px] xl:gap-10">
        <WeeklyCalendar />
        <aside className="min-w-0 space-y-6 xl:sticky xl:top-8 xl:self-start">
          <AeviaPanel />
          <UnscheduledTasksRail />
        </aside>
      </div>
    </div>
  );
}

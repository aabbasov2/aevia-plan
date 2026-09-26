"use client";

import { useStore } from "@/lib/store";
import { deriveMetrics } from "@/lib/plan-health";
import { Greeting } from "@/components/today/Greeting";
import { MetricCard } from "@/components/today/MetricCard";
import { TodayTimeline } from "@/components/today/TodayTimeline";
import { AeviaPanel } from "@/components/aevia/AeviaPanel";
import { PlanHealthCard } from "@/components/aevia/PlanHealthCard";

export default function TodayPage() {
  const tasks = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);
  const m = deriveMetrics(tasks, events);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px] lg:gap-10">
        <div className="min-w-0 fade-in">
          <Greeting name="Aziz" />

          <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
            <MetricCard
              label="Available"
              value={m.availableHours}
              unit="h"
              caption="Free work time this week"
            />
            <MetricCard
              label="Scheduled"
              value={m.scheduledHours}
              unit="h"
              caption="On the calendar"
            />
            <MetricCard
              label="Remaining"
              value={m.remainingHours}
              unit="h"
              caption="Left to schedule"
            />
          </div>

          <div className="mt-10">
            <TodayTimeline />
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <AeviaPanel />
          <PlanHealthCard />
        </aside>
      </div>
    </div>
  );
}

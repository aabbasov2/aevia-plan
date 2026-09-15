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
    <div className="mx-auto max-w-[1240px] px-10 py-14">
      <div className="grid grid-cols-[1fr_320px] gap-10">
        <div className="fade-in">
          <Greeting name="Aziz" />

          <div className="mt-10 grid grid-cols-3 gap-4">
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

        <aside className="space-y-4">
          <AeviaPanel />
          <PlanHealthCard />
        </aside>
      </div>
    </div>
  );
}

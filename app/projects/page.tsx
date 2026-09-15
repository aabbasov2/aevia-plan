"use client";

import { useStore } from "@/lib/store";
import { projectList, PROJECTS } from "@/lib/projects";
import type { ProjectKey } from "@/lib/types";
import { Plus } from "lucide-react";
import { humanDuration } from "@/lib/time";

export default function ProjectsPage() {
  const tasks = useStore((s) => s.tasks);

  const byProject = projectList.map(([key]) => {
    const items = tasks.filter((t) => t.project === key);
    const totalMin = items
      .filter((t) => !t.completed)
      .reduce((s, t) => s + t.durationMinutes, 0);
    const openCount = items.filter((t) => !t.completed).length;
    return { key, items, totalMin, openCount };
  });

  return (
    <div className="mx-auto max-w-[1240px] px-10 py-14 fade-in">
      <div className="flex items-end justify-between">
        <div>
          <div className="wordmark text-[11px] text-fg-muted">PROJECTS</div>
          <h1 className="display mt-2 text-fg">Where your time goes.</h1>
        </div>
        <button className="btn">
          <Plus size={14} /> New project
        </button>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4">
        {byProject.map(({ key, items, totalMin, openCount }) => {
          const p = PROJECTS[key as ProjectKey];
          return (
            <div key={key} className="card p-6">
              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: p.dot }}
                />
                <h2 className="h2 text-fg">{p.label}</h2>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-6">
                <Stat label="Open tasks" value={String(openCount)} />
                <Stat label="Time to plan" value={humanDuration(totalMin)} />
              </div>
              <div className="mt-5 divider" />
              <ul className="mt-4 space-y-1.5">
                {items.slice(0, 4).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between text-[13px]"
                  >
                    <span className={t.completed ? "text-fg-subtle line-through" : "text-fg"}>
                      {t.title}
                    </span>
                    <span className="text-fg-subtle text-[11px]">
                      {humanDuration(t.durationMinutes)}
                    </span>
                  </li>
                ))}
                {items.length === 0 && (
                  <li className="meta">No tasks yet in this project.</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-fg-subtle text-[10px] uppercase tracking-wider">{label}</div>
      <div
        className="mt-0.5 text-fg text-[20px]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
    </div>
  );
}

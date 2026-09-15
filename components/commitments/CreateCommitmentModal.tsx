"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { projectList } from "@/lib/projects";
import type { CommitmentCadence, ProjectKey } from "@/lib/types";
import { cn } from "@/lib/cn";
import { cadenceLabel } from "@/lib/commitments";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type CadenceKind =
  | "daily"
  | "weekly"
  | "monthly"
  | "monthly-first-week"
  | "quarterly"
  | "yearly";

const CADENCE_TABS: { value: CadenceKind; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "monthly-first-week", label: "First week / month" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const DURATIONS = [
  { label: "15m", min: 15 },
  { label: "30m", min: 30 },
  { label: "1h", min: 60 },
  { label: "2h", min: 120 },
  { label: "3h", min: 180 },
];

export function CreateCommitmentModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createCommitment = useStore((s) => s.createCommitment);

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<CadenceKind>("monthly");
  const [weeklyDay, setWeeklyDay] = useState(4);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [quarterlyMonth, setQuarterlyMonth] = useState(2);
  const [quarterlyDay, setQuarterlyDay] = useState(15);
  const [yearlyMonth, setYearlyMonth] = useState(0);
  const [yearlyDay, setYearlyDay] = useState(1);
  const [duration, setDuration] = useState(30);
  const [project, setProject] = useState<ProjectKey>("work");
  const [notes, setNotes] = useState("");

  const cadence: CommitmentCadence = useMemo(() => {
    switch (kind) {
      case "daily":
        return { kind: "daily" };
      case "weekly":
        return { kind: "weekly", day: weeklyDay };
      case "monthly":
        return { kind: "monthly", dayOfMonth: monthlyDay };
      case "monthly-first-week":
        return { kind: "monthly-first-week" };
      case "quarterly":
        return { kind: "quarterly", month: quarterlyMonth, day: quarterlyDay };
      case "yearly":
        return { kind: "yearly", month: yearlyMonth, day: yearlyDay };
    }
  }, [kind, weeklyDay, monthlyDay, quarterlyMonth, quarterlyDay, yearlyMonth, yearlyDay]);

  if (!open) return null;

  function submit() {
    if (!title.trim()) return;
    createCommitment({
      title: title.trim(),
      cadence,
      estimatedMinutes: duration || undefined,
      project,
      notes: notes.trim() || undefined,
      colorIndex: colorForProject(project),
    });
    reset();
    onOpenChange(false);
  }

  function reset() {
    setTitle("");
    setKind("monthly");
    setWeeklyDay(4);
    setMonthlyDay(1);
    setQuarterlyMonth(2);
    setQuarterlyDay(15);
    setYearlyMonth(0);
    setYearlyDay(1);
    setDuration(30);
    setProject("work");
    setNotes("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="card-raised w-full max-w-lg p-6 fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="h2 text-fg">New commitment</h2>
          <button className="btn-ghost btn h-8 w-8 p-0" onClick={() => onOpenChange(false)}>
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Commitment">
            <input
              className="input"
              placeholder="e.g. Pay rent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="Usually due">
            <div className="flex flex-wrap gap-1.5">
              {CADENCE_TABS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setKind(c.value)}
                  className={cn(
                    "chip cursor-pointer",
                    kind === c.value
                      ? "border-[var(--gold)] bg-[var(--gold-soft)] text-fg"
                      : "hover:text-fg"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          {kind === "weekly" && (
            <Field label="Day of week">
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((d, idx) => (
                  <button
                    key={idx}
                    onClick={() => setWeeklyDay(idx)}
                    className={cn(
                      "chip cursor-pointer",
                      weeklyDay === idx
                        ? "border-[var(--gold)] bg-[var(--gold-soft)] text-fg"
                        : "hover:text-fg"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {kind === "monthly" && (
            <Field label="Day of month">
              <input
                type="number"
                min={1}
                max={28}
                className="input w-28"
                value={monthlyDay}
                onChange={(e) =>
                  setMonthlyDay(Math.max(1, Math.min(28, Number(e.target.value) || 1)))
                }
              />
            </Field>
          )}

          {kind === "quarterly" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Month in quarter">
                <select
                  className="input"
                  value={quarterlyMonth}
                  onChange={(e) => setQuarterlyMonth(Number(e.target.value))}
                >
                  <option value={0}>1st month</option>
                  <option value={1}>2nd month</option>
                  <option value={2}>3rd month</option>
                </select>
              </Field>
              <Field label="Day">
                <input
                  type="number"
                  min={1}
                  max={28}
                  className="input"
                  value={quarterlyDay}
                  onChange={(e) =>
                    setQuarterlyDay(Math.max(1, Math.min(28, Number(e.target.value) || 1)))
                  }
                />
              </Field>
            </div>
          )}

          {kind === "yearly" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Month">
                <select
                  className="input"
                  value={yearlyMonth}
                  onChange={(e) => setYearlyMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Day">
                <input
                  type="number"
                  min={1}
                  max={28}
                  className="input"
                  value={yearlyDay}
                  onChange={(e) =>
                    setYearlyDay(Math.max(1, Math.min(28, Number(e.target.value) || 1)))
                  }
                />
              </Field>
            </div>
          )}

          <div className="text-fg-muted text-[12px]">
            → {cadenceLabel(cadence)}
          </div>

          <div className="divider" />

          <Field label="Time it usually takes">
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d.min}
                  onClick={() => setDuration(d.min)}
                  className={cn(
                    "chip cursor-pointer",
                    duration === d.min
                      ? "border-[var(--gold)] bg-[var(--gold-soft)] text-fg"
                      : "hover:text-fg"
                  )}
                >
                  {d.label}
                </button>
              ))}
              <input
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 0)}
                className="input h-7 w-24 text-[12px]"
                aria-label="Custom minutes"
              />
              <span className="meta self-center">min</span>
            </div>
          </Field>

          <Field label="Project">
            <select
              className="input"
              value={project}
              onChange={(e) => setProject(e.target.value as ProjectKey)}
            >
              {projectList.map(([key, p]) => (
                <option key={key} value={key}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Notes">
            <textarea
              className="input"
              rows={2}
              placeholder="Optional context"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button className="btn" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button className="btn btn-gold" onClick={submit}>
            Save commitment
          </button>
        </div>
      </div>
    </div>
  );
}

function colorForProject(p: ProjectKey): number {
  const map: Record<ProjectKey, number> = {
    personal: 1,
    university: 2,
    travel: 3,
    work: 4,
    aevia: 5,
  };
  return map[p];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 wordmark text-[10px] text-fg-muted">{label}</div>
      {children}
    </label>
  );
}

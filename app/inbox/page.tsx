"use client";

import { useState } from "react";
import { Mail, MessageSquare, StickyNote, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { addDays } from "date-fns";
import { weekStart } from "@/lib/time";

type InboxItem = {
  id: string;
  source: "email" | "slack" | "note";
  from: string;
  title: string;
  snippet: string;
  suggestedMinutes: number;
};

const INITIAL: InboxItem[] = [
  {
    id: "i1",
    source: "email",
    from: "Léa · Design Lead",
    title: "Feedback on onboarding wireframes",
    snippet:
      "Could you take a look at v4 before Thursday's review? Focus on the empty states.",
    suggestedMinutes: 45,
  },
  {
    id: "i2",
    source: "slack",
    from: "#ops",
    title: "Quarterly compliance filing",
    snippet: "Reminder: filings due first week of every month.",
    suggestedMinutes: 120,
  },
  {
    id: "i3",
    source: "note",
    from: "Voice note · Yesterday",
    title: "Draft parents' visit plan",
    snippet: "Book restaurant, plan Saturday walk, pick up flowers.",
    suggestedMinutes: 30,
  },
];

const ICONS = {
  email: Mail,
  slack: MessageSquare,
  note: StickyNote,
};

export default function InboxPage() {
  const [items, setItems] = useState(INITIAL);
  const createTask = useStore((s) => s.createTask);

  function turnIntoTask(item: InboxItem) {
    createTask({
      title: item.title,
      durationMinutes: item.suggestedMinutes,
      deadline: addDays(weekStart(), 4).toISOString(),
      recurrence: { kind: "none" },
      project: "work",
      colorIndex: 4,
      notes: item.snippet,
    });
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  return (
    <div className="mx-auto max-w-[900px] px-10 py-14 fade-in">
      <div className="wordmark text-[11px] text-fg-muted">INBOX</div>
      <h1 className="display mt-2 text-fg">Captured, waiting for a home.</h1>
      <p className="mt-2 text-fg-muted text-[15px]">
        Things brought in from mail, chat, and quick notes. Turn what matters into tasks.
      </p>

      <div className="mt-10 space-y-2">
        {items.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-fg text-[15px]">Inbox zero.</div>
            <p className="mt-1 meta">Aevia will pull in new items as they arrive.</p>
          </div>
        ) : (
          items.map((it) => {
            const Icon = ICONS[it.source];
            return (
              <div key={it.id} className="card p-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-[var(--surface-2)] text-fg-muted">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-fg text-[14px]">{it.title}</div>
                    <div className="mt-0.5 meta">
                      {it.from} · suggested {it.suggestedMinutes}m
                    </div>
                    <p className="mt-2 text-fg-muted text-[13px] leading-5">{it.snippet}</p>
                  </div>
                  <button
                    className="btn btn-gold shrink-0"
                    onClick={() => turnIntoTask(it)}
                  >
                    Turn into task
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

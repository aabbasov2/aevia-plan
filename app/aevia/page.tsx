"use client";

import { AeviaPanel } from "@/components/aevia/AeviaPanel";
import { PlanHealthCard } from "@/components/aevia/PlanHealthCard";
import { AeviaArc } from "@/components/brand/AeviaArc";

export default function AeviaPage() {
  return (
    <div className="mx-auto max-w-[900px] px-10 py-20 fade-in">
      <div className="flex flex-col items-center text-center">
        <AeviaArc size={64} />
        <div className="mt-6 wordmark text-[12px] text-fg-muted">AEVIA · PLAN</div>
        <h1 className="display mt-3 text-fg max-w-[560px]">
          Everything gets done. It&apos;s a matter of when.
        </h1>
        <p className="mt-3 max-w-[520px] text-fg-muted text-[15px] leading-6">
          Tell Aevia what needs to happen. It will find time for it in your week.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-2 gap-4">
        <AeviaPanel variant="hero" />
        <PlanHealthCard />
      </div>

      <div className="mt-10 card p-6">
        <div className="wordmark text-[11px] text-fg-muted">PRINCIPLES</div>
        <div className="mt-4 grid grid-cols-3 gap-6">
          <Principle
            title="Not a to-do list"
            body="A to-do list ignores time. Aevia respects it."
          />
          <Principle
            title="Not a chatbot"
            body="Aevia works in the background — it plans, it doesn't chat."
          />
          <Principle
            title="Built around time"
            body="Every task has a duration and a home on the calendar."
          />
        </div>
      </div>
    </div>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="text-fg text-[15px]">{title}</div>
      <p className="mt-1 text-fg-muted text-[13px] leading-5">{body}</p>
    </div>
  );
}

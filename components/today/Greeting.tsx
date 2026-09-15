"use client";

import { useEffect, useState } from "react";
import { greetingFor, longDate } from "@/lib/time";

export function Greeting({ name = "Aziz" }: { name?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const greeting = now ? greetingFor(now) : "Good morning";
  const date = now ? longDate(now) : "";
  return (
    <div>
      <h1 className="display text-fg">
        {greeting}, {name}.
      </h1>
      <p className="mt-2 text-fg-muted text-[15px]">{date}</p>
    </div>
  );
}

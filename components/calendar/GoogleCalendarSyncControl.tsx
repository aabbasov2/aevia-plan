"use client";

import { useEffect, useState } from "react";
import { CalendarSync, LoaderCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import type { CalendarEvent } from "@/lib/types";

type SyncStatus = { configured: boolean; connected: boolean; email?: string | null };
type RemoteEvent = Partial<CalendarEvent> & { googleEventId: string; googleCalendarId: string };

export function GoogleCalendarSyncControl() {
  const events = useStore((state) => state.events);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/google-calendar/status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<SyncStatus> : null)
      .then((result) => { if (active && result) setStatus(result); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function synchronize() {
    if (busy) return;
    if (!status?.configured) {
      setMessage("Google Calendar setup is incomplete. Check Account settings.");
      return;
    }
    if (!status.connected) {
      window.location.assign("/api/google-calendar/connect");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/google-calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 && String(data?.error).includes("Reconnect")) setStatus((current) => current ? { ...current, connected: false } : current);
        throw new Error(data?.error || "Google Calendar sync failed.");
      }

      const current = useStore.getState().events;
      const next = new Map(current.map((event) => [event.id, event]));
      const idByGoogleId = new Map(current.filter((event) => event.googleEventId).map((event) => [event.googleEventId!, event.id]));
      for (const link of data.linked as Array<{ aeviaEventId: string; googleEventId: string }>) {
        const event = next.get(link.aeviaEventId);
        if (event) {
          next.set(event.id, { ...event, googleEventId: link.googleEventId, googleCalendarId: "primary" });
          idByGoogleId.set(link.googleEventId, event.id);
        }
      }
      let imported = 0;
      for (const remote of data.events as RemoteEvent[]) {
        const localId = (remote.id && next.has(remote.id) ? remote.id : undefined) ?? idByGoogleId.get(remote.googleEventId);
        if (remote.cancelled) {
          if (localId) {
            const existing = next.get(localId)!;
            next.set(localId, { ...existing, cancelled: true, googleEventId: remote.googleEventId, googleCalendarId: remote.googleCalendarId });
          }
          continue;
        }
        if (!remote.start || !remote.title || !remote.durationMinutes) continue;
        if (localId) {
          const existing = next.get(localId)!;
          next.set(localId, {
            ...existing,
            title: remote.title,
            start: remote.start,
            durationMinutes: remote.durationMinutes,
            allDay: remote.allDay,
            cancelled: false,
            googleEventId: remote.googleEventId,
            googleCalendarId: remote.googleCalendarId,
          });
        } else {
          const id = crypto.randomUUID();
          next.set(id, {
            id,
            title: remote.title,
            start: remote.start,
            durationMinutes: remote.durationMinutes,
            allDay: remote.allDay,
            kind: "meeting",
            origin: "user",
            locked: true,
            googleEventId: remote.googleEventId,
            googleCalendarId: remote.googleCalendarId,
          });
          idByGoogleId.set(remote.googleEventId, id);
          imported++;
        }
      }
      useStore.setState({ events: [...next.values()] });
      setMessage(`Calendar synced. ${imported} new event${imported === 1 ? "" : "s"} imported.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google Calendar sync failed.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="relative">
    <button type="button" className="btn h-9 px-3" onClick={synchronize} disabled={busy} title={status?.connected ? `Sync Google Calendar${status.email ? ` (${status.email})` : ""}` : "Connect Google Calendar"}>
      {busy ? <LoaderCircle size={13} className="animate-spin" /> : <CalendarSync size={13} />}
      {busy ? "Syncing…" : status?.connected ? "Sync Google" : "Google Calendar"}
    </button>
    {message && <p role="status" className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[11px] leading-4 text-fg-muted shadow-xl">{message}</p>}
  </div>;
}

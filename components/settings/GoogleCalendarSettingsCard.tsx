"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, ExternalLink, LoaderCircle, Unlink } from "lucide-react";

type Status = { configured: boolean; connected: boolean; email?: string | null };

export function GoogleCalendarSettingsCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/google-calendar/status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Google Calendar status is unavailable.");
        return response.json() as Promise<Status>;
      })
      .then((result) => { if (active) setStatus(result); })
      .catch(() => { if (active) setStatus({ configured: false, connected: false }); });

    const result = new URLSearchParams(window.location.search).get("googleCalendar");
    if (result === "connected") setNotice({ kind: "success", text: "Google Calendar is connected with event read and write access." });
    if (result === "denied") setNotice({ kind: "error", text: "Google authorization was cancelled." });
    if (result === "not_configured") setNotice({ kind: "error", text: "Google Calendar setup is incomplete. Add the server credentials and database migration first." });
    if (result === "error") setNotice({ kind: "error", text: "Google Calendar could not be connected. Check the OAuth redirect URI and consent screen setup." });
    if (result) window.history.replaceState({}, "", window.location.pathname);
    return () => { active = false; };
  }, []);

  async function disconnect() {
    if (!window.confirm("Disconnect Google Calendar from Aevia? Your Aevia calendar items will stay in Aevia.")) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/google-calendar/disconnect", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Google Calendar could not be disconnected.");
      setStatus((current) => current ? { ...current, connected: false, email: null } : current);
      setNotice({ kind: "success", text: "Google Calendar disconnected." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Google Calendar could not be disconnected." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 sm:p-6">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-gold"><CalendarDays size={18} /></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[16px] font-medium text-fg">Google Calendar</h2>
        <p className="mt-1 text-[12px] leading-5 text-fg-muted">Connect your account to read events and write Aevia events to your primary calendar. Sync is started manually from Calendar.</p>
        {status?.connected && <p className="mt-3 flex items-center gap-1.5 text-[12px] text-emerald-200"><Check size={13} />Connected as {status.email}</p>}
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {!status ? <button type="button" disabled className="btn h-9 px-3"><LoaderCircle size={13} className="animate-spin" />Checking…</button> : status.connected ? <button type="button" disabled={busy} onClick={disconnect} className="btn h-9 px-3">{busy ? <LoaderCircle size={13} className="animate-spin" /> : <Unlink size={13} />}{busy ? "Disconnecting…" : "Disconnect"}</button> : <a href="/api/google-calendar/connect" aria-disabled={!status.configured} onClick={(event) => { if (!status.configured) { event.preventDefault(); setNotice({ kind: "error", text: "Google Calendar setup is incomplete. Add the server credentials and database migration first." }); } }} className={`btn btn-gold h-9 px-3 ${!status.configured ? "pointer-events-auto opacity-60" : ""}`}><ExternalLink size={13} />Connect Google Calendar</a>}
    </div>
    {notice && <p role="status" className={`mt-3 rounded-lg border px-3 py-2.5 text-[12px] ${notice.kind === "success" ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-200" : "border-rose-300/20 bg-rose-300/5 text-[#efa2ab]"}`}>{notice.text}</p>}
  </section>;
}

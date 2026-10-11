"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { AeviaWordmark } from "@/components/brand/AeviaWordmark";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (newPassword.length < 12) {
      setMessage({ kind: "error", text: "Choose a password with at least 12 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ kind: "error", text: "The new passwords don’t match." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword, current_password: currentPassword });
      if (error) {
        setMessage({ kind: "error", text: "We couldn’t change the password. Check your current password and new password requirements, then try again." });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ kind: "success", text: "Password updated. You’re still signed in." });
    } catch {
      setMessage({ kind: "error", text: "Password change is unavailable right now. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-10">
    <div className="mx-auto max-w-[620px]"><Link href="/today" className="inline-flex items-center gap-2 text-[12px] text-fg-muted hover:text-fg"><ArrowLeft size={14} />Back to Today</Link>
      <section className="card mt-6 p-6 sm:p-8"><AeviaWordmark size="md" /><div className="mt-8 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-gold"><LockKeyhole size={18} /></span><div><h1 className="text-[22px] font-medium text-fg">Change password</h1><p className="mt-0.5 text-[12px] text-fg-muted">Verify your current password to continue.</p></div></div>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <PasswordField label="Current password" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} visible={visible} />
          <PasswordField label="New password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} visible={visible} />
          <PasswordField label="Confirm new password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} visible={visible} />
          <button type="button" onClick={() => setVisible((value) => !value)} className="inline-flex items-center gap-2 text-[11px] text-fg-muted hover:text-fg">{visible ? <EyeOff size={13} /> : <Eye size={13} />}{visible ? "Hide passwords" : "Show passwords"}</button>
          {message && <p role="status" className={`rounded-lg border px-3 py-2.5 text-[12px] ${message.kind === "success" ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-200" : "border-rose-300/20 bg-rose-300/5 text-[#efa2ab]"}`}>{message.text}</p>}
          <button type="submit" disabled={busy} className="btn btn-gold h-11 w-full justify-center">{busy ? "Saving…" : "Save password"}</button>
        </form>
      </section>
    </div>
  </main>;
}

function PasswordField({ label, autoComplete, value, onChange, visible }: { label: string; autoComplete: string; value: string; onChange: (value: string) => void; visible: boolean }) {
  return <label className="block text-[12px] font-medium text-fg-muted">{label}<input className="input mt-1.5" type={visible ? "text" : "password"} autoComplete={autoComplete} required value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

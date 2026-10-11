"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { AeviaWordmark } from "@/components/brand/AeviaWordmark";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [configurationMissing, setConfigurationMissing] = useState(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") ?? "");
    if (params.get("configuration") === "missing") setConfigurationMissing(true);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || configurationMissing) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) {
        setError("We couldn’t sign you in with those details. Check them and try again.");
        return;
      }
      router.replace(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/today");
      router.refresh();
    } catch {
      setError("Sign-in is unavailable right now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center px-5 py-12">
    <section className="card w-full max-w-[420px] p-6 sm:p-8">
      <AeviaWordmark size="md" />
      <div className="mt-8 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-gold"><LockKeyhole size={18} /></span><div><h1 className="text-[22px] font-medium text-fg">Sign in</h1><p className="mt-0.5 text-[12px] text-fg-muted">Continue to your Aevia plan.</p></div></div>
      {configurationMissing ? <p role="alert" className="mt-6 rounded-xl border border-rose-300/20 bg-rose-300/5 p-3.5 text-[13px] leading-5 text-fg-muted">Aevia authentication is not configured yet. Add the Supabase project URL and publishable key to the deployment environment.</p> : <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-[12px] font-medium text-fg-muted">Email address<input className="input mt-1.5" type="email" name="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="block text-[12px] font-medium text-fg-muted">Password<span className="relative mt-1.5 block"><input className="input pr-11" type={visible ? "text" : "password"} name="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-fg-subtle hover:text-fg" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff size={15} /> : <Eye size={15} />}</button></span></label>
        {error && <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/5 px-3 py-2.5 text-[12px] text-[#efa2ab]">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-gold h-11 w-full justify-center">{busy ? "Signing in…" : "Sign in"}</button>
      </form>}
    </section>
  </main>;
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AeviaArc } from "@/components/brand/AeviaArc";

export function ComingSoon() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center fade-in">
        <AeviaArc size={52} />
        <div className="mt-6 wordmark text-[11px] text-fg-muted">AEVIA · MVP</div>
        <h1 className="display mt-3 text-fg">Coming soon.</h1>
        <p className="mt-3 text-[15px] leading-6 text-fg-muted">
          We&apos;re keeping the first version focused on Today, Tasks, and Calendar.
        </p>
        <Link href="/today" className="btn btn-gold mt-7">
          <ArrowLeft size={14} /> Back to Today
        </Link>
      </div>
    </main>
  );
}

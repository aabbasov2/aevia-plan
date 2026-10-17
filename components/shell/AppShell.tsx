"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { DndProvider } from "./DndProvider";
import { ComingSoon } from "./ComingSoon";
import { useEffect, useState, type ReactNode } from "react";
import { FocusExperienceOverlay } from "@/components/today/FocusExperienceOverlay";
import { useStore } from "@/lib/store";
import { Focus } from "lucide-react";

const SIDEBAR_VISIBILITY_KEY = "aevia-sidebar-hidden";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const isMvpRoute = pathname === "/today" || pathname === "/tasks" || pathname === "/calendar" || pathname === "/aevia" || pathname === "/thoughts";

  useEffect(() => {
    setSidebarHidden(window.localStorage.getItem(SIDEBAR_VISIBILITY_KEY) === "true");
  }, []);

  function updateSidebarVisibility(hidden: boolean) {
    setSidebarHidden(hidden);
    window.localStorage.setItem(SIDEBAR_VISIBILITY_KEY, String(hidden));
  }

  if (pathname === "/pitch" || pathname === "/signin" || pathname === "/settings/password") return <>{children}</>;
  if (!isMvpRoute) return <ComingSoon />;

  return (
    <DndProvider>
      <div
        className="min-h-screen"
        data-sidebar-hidden={sidebarHidden ? "true" : "false"}
      >
        <Sidebar
          hidden={sidebarHidden}
          onVisibilityChange={updateSidebarVisibility}
        />
        <main
          className={`min-h-screen min-w-0 overflow-x-hidden pb-20 pt-14 transition-[margin] duration-200 md:pb-0 md:pt-0 ${
            sidebarHidden ? "md:ml-0" : "md:ml-[240px]"
          }`}
        >
          {children}
        </main>
        <FocusExperienceOverlay />
        <FocusReopenButton />
      </div>
    </DndProvider>
  );
}

function FocusReopenButton() {
  const session = useStore((state) => state.focusSession);
  const open = useStore((state) => state.focusModeOpen);
  const setOpen = useStore((state) => state.setFocusModeOpen);
  if (!session || open || (session.status !== "running" && session.status !== "paused")) return null;
  return <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--surface)] px-4 text-[12px] text-fg shadow-xl hover:bg-[var(--surface-2)]"><Focus size={15} className="text-gold"/>Return to focus</button>;
}

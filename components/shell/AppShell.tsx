"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { DndProvider } from "./DndProvider";
import { ComingSoon } from "./ComingSoon";
import { useEffect, useState, type ReactNode } from "react";

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
      </div>
    </DndProvider>
  );
}

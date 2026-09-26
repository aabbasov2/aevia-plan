"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { DndProvider } from "./DndProvider";
import { ComingSoon } from "./ComingSoon";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMvpRoute = pathname === "/today" || pathname === "/tasks" || pathname === "/calendar";

  if (!isMvpRoute) return <ComingSoon />;

  return (
    <DndProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="min-h-screen min-w-0 overflow-x-hidden pb-20 pt-14 md:ml-[240px] md:pb-0 md:pt-0">{children}</main>
      </div>
    </DndProvider>
  );
}

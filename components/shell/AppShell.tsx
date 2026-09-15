"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { DndProvider } from "./DndProvider";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPresentation = pathname?.startsWith("/pitch");

  if (isPresentation) {
    return <>{children}</>;
  }

  return (
    <DndProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="ml-[240px] min-h-screen">{children}</main>
      </div>
    </DndProvider>
  );
}

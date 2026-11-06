import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

export function AppLayout({ children, fullBleed = false }: { children: ReactNode; fullBleed?: boolean }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <div role="note" className="px-4 py-2 text-center text-xs font-semibold bg-amber-100 text-amber-950 border-b border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800">
          PUBLIC DEMO ONLY · Example data stays in this browser. No real payments or shared database. Do not enter personal or financial information.
        </div>
        {fullBleed ? children : <div className="flex-1 p-6 md:p-8 overflow-auto">{children}</div>}
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

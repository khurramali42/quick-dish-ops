import type { ReactNode } from "react";
import { AppSidebar, MobileNavigation } from "./AppSidebar";

export function AppLayout({ children, fullBleed = false }: { children: ReactNode; fullBleed?: boolean }) {
  return (
    <div className={fullBleed ? "flex h-dvh min-h-0 w-full overflow-hidden bg-background" : "flex min-h-dvh w-full bg-background"}>
      <AppSidebar />
      <main className={fullBleed ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : "flex min-w-0 flex-1 flex-col"}>
        <MobileNavigation />
        <div role="note" className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-center text-[11px] font-medium leading-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          PUBLIC DEMO ONLY · Example data stays in this browser. No real payments or shared database. Do not enter personal or financial information.
        </div>
        {fullBleed ? children : <div className="min-w-0 flex-1 p-4 sm:p-6 xl:p-8">{children}</div>}
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChefHat, ChevronDown, CircleUserRound, ClipboardList } from "lucide-react";
import { useStore } from "@/lib/store";
import { AppSidebar, MobileNavigation } from "./AppSidebar";

export function AppLayout({ children, fullBleed = false }: { children: ReactNode; fullBleed?: boolean }) {
  const { settings, currentCashier } = useStore();
  return (
    <div className={fullBleed ? "flex h-dvh min-h-0 w-full overflow-hidden bg-background" : "flex min-h-dvh w-full bg-background"}>
      <AppSidebar />
      <main className={fullBleed ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : "flex min-w-0 flex-1 flex-col"}>
        <MobileNavigation />
        <header className="hidden h-[68px] shrink-0 items-center justify-between gap-5 border-b bg-card px-5 shadow-[0_2px_12px_rgba(52,26,12,0.03)] md:flex xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-brand">
              <ChefHat className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{settings.businessName}</p>
              <p className="truncate text-xs text-muted-foreground">{settings.branchName}</p>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground lg:block" />
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Link to="/orders" title="View orders" aria-label="View orders" className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:border-border hover:bg-accent hover:text-brand">
              <ClipboardList className="h-5 w-5" />
            </Link>
            <div className="h-7 w-px bg-border" />
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-brand"><CircleUserRound className="h-5 w-5" /></span>
              <div className="hidden text-right lg:block">
                <p className="text-xs font-bold">{currentCashier}</p>
                <p className="text-[11px] text-muted-foreground">Demo operator</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </header>
        <div role="note" className="shrink-0 border-b border-orange-100 bg-orange-50/70 px-3 py-1 text-center text-[10px] font-medium leading-4 text-orange-900 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
          LOCAL DEMO · Sample data stored in this browser · No actual payments or shared database
        </div>
        {fullBleed ? children : <div className="min-w-0 flex-1 p-3 sm:p-5 xl:p-7">{children}</div>}
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 sm:mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-[1.65rem] font-extrabold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

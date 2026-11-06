import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CircleUserRound, ClipboardList, Info, PanelLeftClose, PanelLeftOpen, Maximize, Minimize } from "lucide-react";
import { useStore } from "@/lib/store";
import { AppSidebar, MobileNavigation } from "./AppSidebar";

export function AppLayout({ children, fullBleed = false }: { children: ReactNode; fullBleed?: boolean }) {
  const currentCashier = useStore((state) => state.currentCashier);
  const [collapsed, setCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch {
      setFullscreen(Boolean(document.fullscreenElement));
    }
  };
  return (
    <div className={fullBleed ? "flex h-dvh min-h-0 w-full overflow-hidden bg-background" : "flex min-h-dvh w-full bg-background"}>
      <AppSidebar collapsed={collapsed} />
      <main className={fullBleed ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : "flex min-w-0 flex-1 flex-col"}>
        <MobileNavigation />
        <header className="hidden h-[68px] shrink-0 items-center justify-between gap-5 border-b bg-card px-5 shadow-[0_2px_12px_rgba(52,26,12,0.03)] lg:flex xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" title={collapsed ? "Expand navigation" : "Collapse navigation"} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!collapsed} onClick={() => setCollapsed((v) => !v)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border hover:bg-accent">
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <span className="truncate text-sm font-semibold text-muted-foreground">Restaurant operations</span>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <button type="button" onClick={toggleFullscreen} title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-accent">
              {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <Info className="h-3.5 w-3.5" /> Demo mode
              </summary>
              <div role="note" className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-lg">
                Sample data is stored only in this browser. This demo does not process actual payments or use a shared database.
              </div>
            </details>
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
            </div>
          </div>
        </header>
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

import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard, ShoppingCart, Package, Tag, Boxes, ClipboardList, Users, Armchair,
  Truck, ReceiptText, BarChart3, ChefHat, Settings, Wallet, Moon, Sun, Menu, X, Maximize, Minimize,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "POS", icon: ShoppingCart, highlight: true },
  { to: "/tables", label: "Tables & Booking", icon: Armchair },
  { to: "/kitchen", label: "Kitchen", icon: ChefHat },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/products", label: "Products", icon: Package },
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/purchases", label: "Purchases", icon: ReceiptText },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const branchName = useStore((state) => state.settings.branchName);
  const darkMode = useStore((state) => state.darkMode);
  const toggleDark = useStore((state) => state.toggleDark);
  const [hoveredTab, setHoveredTab] = useState<{ label: string; top: number } | null>(null);

  return (
    <aside aria-label="Main navigation" className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-150 lg:flex", collapsed ? "w-[54px]" : "w-[206px] xl:w-[228px]")}>
      <div className={cn("flex items-center border-b border-sidebar-border py-5", collapsed ? "justify-center px-2" : "gap-3 px-4")}>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", collapsed ? "bg-black text-white" : "bg-orange-50 text-brand")}>
          <ChefHat className="h-7 w-7" />
        </div>
        <div className={cn("min-w-0", collapsed && "hidden")}>
          <div className="truncate font-display text-sm font-extrabold tracking-tight">Spice Kitchen <span className="text-brand">POS</span></div>
          <div className="truncate text-[11px] text-muted-foreground">{branchName}</div>
        </div>
      </div>

      <nav onScroll={() => setHoveredTab(null)} className={cn("scrollbar-thin flex-1 space-y-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {nav.map((n) => {
          const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              title={collapsed ? n.label : undefined}
              aria-label={n.label}
              onMouseEnter={(event) => collapsed && setHoveredTab({ label: n.label, top: event.currentTarget.getBoundingClientRect().top + 7 })}
              onMouseLeave={() => setHoveredTab(null)}
              onFocus={(event) => collapsed && setHoveredTab({ label: n.label, top: event.currentTarget.getBoundingClientRect().top + 7 })}
              onBlur={() => setHoveredTab(null)}
              className={cn(
                "group relative flex items-center rounded-lg py-2.5 text-sm font-semibold transition-all",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-brand-gradient text-brand-foreground shadow-sm"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground opacity-90",
                n.highlight && !active && "text-brand",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{n.label}</span>}
            </Link>
          );
        })}
      </nav>

      {collapsed && hoveredTab && typeof document !== "undefined" && createPortal(
        <div role="tooltip" className="pointer-events-none fixed left-[61px] z-[9999] whitespace-nowrap rounded-lg border border-orange-200 bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-xl dark:border-orange-700" style={{ top: hoveredTab.top }}>
          {hoveredTab.label}
        </div>,
        document.body
      )}
      <div className={cn("flex items-center border-t border-sidebar-border px-3 py-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && <div className="text-[11px] opacity-60 px-2">v1.0 · PKR</div>}
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg hover:bg-sidebar-accent"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}

/** Compact navigation for phones and narrow tablets. */
export function MobileNavigation({ fullscreen, onToggleFullscreen }: { fullscreen: boolean; onToggleFullscreen: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const darkMode = useStore((state) => state.darkMode);
  const toggleDark = useStore((state) => state.toggleDark);
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-card px-3 lg:hidden">
        <button type="button" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
          <Menu className="h-5 w-5" />
        </button>
        <span className="min-w-0 flex-1 truncate font-display text-sm font-extrabold">Spice Kitchen <span className="text-brand">POS</span></span>
        <button type="button" onClick={onToggleFullscreen} title={fullscreen ? "Exit fullscreen" : "Fullscreen"} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border hover:bg-accent">
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
        <Link to="/pos" className="rounded-lg bg-brand-gradient px-3 py-2 text-xs font-semibold text-brand-foreground">Open POS</Link>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute inset-0 h-full w-full bg-black/60" />
          <aside aria-label="Mobile navigation" className="relative flex h-full w-[min(82vw,310px)] flex-col bg-sidebar text-sidebar-foreground shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-sidebar-border px-4 py-4">
              <div className="min-w-0 truncate font-display text-sm font-extrabold">Spice Kitchen <span className="text-brand">POS</span></div>
              <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-sidebar-accent"><X className="h-5 w-5" /></button>
            </div>
            <nav className="scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                return (
                  <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium", active ? "bg-brand-gradient text-brand-foreground" : "hover:bg-sidebar-accent")}>
                    <Icon className="h-4 w-4" />{item.label}
                  </Link>
                );
              })}
            </nav>
            <button type="button" onClick={toggleDark} className="flex items-center gap-3 border-t border-sidebar-border p-4 text-sm hover:bg-sidebar-accent">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} Toggle theme
            </button>
          </aside>
        </div>
      )}
    </>
  );
}

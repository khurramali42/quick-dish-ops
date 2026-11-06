import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Tag, Boxes, ClipboardList, Users,
  Truck, ReceiptText, BarChart3, ChefHat, Settings, Wallet, Moon, Sun, Menu, X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "POS", icon: ShoppingCart, highlight: true },
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

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { settings, darkMode, toggleDark } = useStore();

  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex xl:w-60">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center text-xl">
          {settings.logoEmoji}
        </div>
        <div className="min-w-0">
          <div className="font-display font-semibold text-sm truncate">{settings.businessName}</div>
          <div className="text-[11px] opacity-60 truncate">{settings.branchName}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
        {nav.map((n) => {
          const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-brand-gradient text-brand-foreground shadow-sm"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground opacity-90",
                n.highlight && !active && "text-white/95",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border flex items-center justify-between">
        <div className="text-[11px] opacity-60 px-2">v1.0 · PKR</div>
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
export function MobileNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { settings, darkMode, toggleDark } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="z-30 flex h-13 shrink-0 items-center gap-3 border-b bg-card px-3 md:hidden">
        <button type="button" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
          <Menu className="h-5 w-5" />
        </button>
        <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold">{settings.businessName}</span>
        <Link to="/pos" className="rounded-lg bg-brand-gradient px-3 py-2 text-xs font-semibold text-brand-foreground">Open POS</Link>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute inset-0 h-full w-full bg-black/60" />
          <aside aria-label="Mobile navigation" className="relative flex h-full w-[min(82vw,310px)] flex-col bg-sidebar text-sidebar-foreground shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-sidebar-border px-4 py-4">
              <div className="min-w-0 truncate font-display text-sm font-semibold">{settings.businessName}</div>
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

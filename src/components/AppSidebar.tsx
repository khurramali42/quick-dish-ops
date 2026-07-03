import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ShoppingCart, Package, Tag, Boxes, ClipboardList, Users,
  Truck, ReceiptText, BarChart3, ChefHat, Settings, Wallet, Moon, Sun,
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
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
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

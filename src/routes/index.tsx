import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { money } from "@/lib/format";
import { ArrowUpRight, DollarSign, ShoppingBag, TrendingUp, AlertTriangle, ChefHat } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Spice Kitchen POS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { orders, products, expenses, settings } = useStore();
  const today = new Date().toDateString();
  const todaysOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const todaySales = todaysOrders.reduce((s, o) => s + o.total, 0);
  const todayProfit = todaysOrders.reduce((s, o) => {
    const cost = o.items.reduce((c, i) => {
      const p = products.find((p) => p.id === i.productId);
      return c + (p?.cost ?? 0) * i.qty;
    }, 0);
    return s + (o.total - cost);
  }, 0);
  const todayExpenses = expenses.filter((e) => new Date(e.date).toDateString() === today).reduce((s, e) => s + e.amount, 0);
  const lowStock = products.filter((p) => p.trackStock && p.stock <= 10);

  // sales by hour today
  const hourly = Array.from({ length: 12 }, (_, i) => ({ hour: `${10 + i}:00`, sales: 0 }));
  todaysOrders.forEach((o) => {
    const h = new Date(o.createdAt).getHours() - 10;
    if (h >= 0 && h < 12) hourly[h].sales += o.total;
  });

  // top items
  const itemCount: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.slice(0, 200).forEach((o) => o.items.forEach((i) => {
    itemCount[i.productId] ??= { name: i.name, qty: 0, revenue: 0 };
    itemCount[i.productId].qty += i.qty;
    itemCount[i.productId].revenue += i.unitPrice * i.qty;
  }));
  const topItems = Object.values(itemCount).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return (
    <AppLayout>
      <PageHeader
        title={`Good day, ${useStore.getState().currentCashier} 👋`}
        subtitle={`${settings.branchName} · ${new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
        action={
          <Link to="/pos" className="inline-flex items-center gap-2 bg-brand-gradient text-brand-foreground px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm hover:opacity-90">
            Open POS <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Today's Sales" value={money(todaySales, settings.currency)} tint="bg-emerald-50 text-emerald-600" />
        <StatCard icon={ShoppingBag} label="Today's Orders" value={todaysOrders.length.toString()} tint="bg-blue-50 text-blue-600" />
        <StatCard icon={TrendingUp} label="Est. Profit" value={money(todayProfit, settings.currency)} tint="bg-orange-50 text-orange-600" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={lowStock.length.toString()} tint="bg-red-50 text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Hourly Sales — Today</h3>
            <span className="text-xs text-muted-foreground">Expenses today: {money(todayExpenses, settings.currency)}</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.006 260)" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="sales" fill="oklch(0.72 0.19 45)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elevated p-5">
          <h3 className="font-semibold mb-4">Top Selling Items</h3>
          {topItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet — take your first order in POS.</p>
          ) : (
            <ul className="space-y-3">
              {topItems.map((t, i) => (
                <li key={t.name} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-accent text-accent-foreground flex items-center justify-center text-xs font-semibold">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.qty} sold · {money(t.revenue, settings.currency)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><ChefHat className="h-4 w-4" /> Kitchen Queue</h3>
            <Link to="/kitchen" className="text-xs text-brand hover:underline">Open KDS</Link>
          </div>
          <p className="text-sm text-muted-foreground">Live orders will appear on the Kitchen Display.</p>
        </div>

        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Low Stock Alerts</h3>
            <Link to="/inventory" className="text-xs text-brand hover:underline">Manage stock</Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">All stock levels healthy.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {lowStock.slice(0, 6).map((p) => (
                <li key={p.id} className="flex justify-between"><span>{p.name}</span><span className="font-mono text-destructive">{p.stock}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <div className="card-elevated p-5">
      <div className={`w-10 h-10 rounded-lg ${tint} flex items-center justify-center mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

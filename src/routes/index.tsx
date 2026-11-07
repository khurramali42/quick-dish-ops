import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { money, formatDateTime } from "@/lib/format";
import { ArrowUpRight, BarChart3, ClipboardList, Coins, Users, Wallet, TrendingUp, Package, Utensils, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { ComponentType } from "react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Spice Kitchen POS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { orders, products, customers, expenses, settings } = useStore();
  const today = new Date().toDateString();
  const completed = orders.filter((order) => order.status === "completed");
  const todaysOrders = completed.filter((order) => new Date(order.createdAt).toDateString() === today);
  const todaySales = todaysOrders.reduce((total, order) => total + order.total, 0);
  const todayExpenses = expenses.filter((entry) => new Date(entry.date).toDateString() === today)
    .reduce((total, entry) => total + entry.amount, 0);
  const todayGrossProfit = todaysOrders.reduce((total, order) => total + order.total - order.tax -
    order.items.reduce((cost, item) => cost + (item.unitCostSnapshot ?? products.find((p) => p.id === item.productId)?.cost ?? 0) * item.qty, 0), 0);
  const todayProfit = todayGrossProfit - todayExpenses;
  const lowStock = products.filter((product) => product.trackStock && product.stock <= 10);
  const kitchenQueue = completed.filter((order) => (order.kitchenStatus ?? "new") !== "served");
  const recentOrders = orders.slice(0, 5);

  const chart = Array.from({ length: 12 }, (_, i) => ({ hour: String(i + 9).padStart(2, "0") + ":00", sales: 0 }));
  todaysOrders.forEach((order) => {
    const hour = new Date(order.createdAt).getHours() - 9;
    if (hour >= 0 && hour < chart.length) chart[hour].sales += order.total;
  });
  const sold: Record<string, { name: string; quantity: number }> = {};
  completed.forEach((order) => order.items.forEach((item) => {
    if (!sold[item.productId]) sold[item.productId] = { name: item.name, quantity: 0 };
    sold[item.productId].quantity += item.qty;
  }));
  const best = Object.values(sold).sort((a, b) => b.quantity - a.quantity)[0];

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1700px]">
        <PageHeader
          title="Dashboard"
          subtitle="Restaurant Operations Overview"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden rounded-xl border bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-sm sm:block">
                {new Date().toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
              </div>
              <Link to="/pos" className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:brightness-105">
                <Utensils className="h-4 w-4" /> Open POS <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          }
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard label="Today's Sales" value={money(todaySales, settings.currency)} icon={Coins} tone="orange" caption="Completed orders" />
          <StatCard label="Orders" value={String(todaysOrders.length)} icon={ClipboardList} tone="blue" caption="Sales today" />
          <StatCard label="Expenses" value={money(todayExpenses, settings.currency)} icon={Wallet} tone="red" caption="Recorded today" />
          <StatCard label="Est. Profit" value={money(todayProfit, settings.currency)} icon={TrendingUp} tone="green" caption="After product cost & expenses" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
          <section className="card-elevated min-w-0 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Sales Overview</h2>
                <p className="text-xs text-muted-foreground">Hourly completed sales for today</p>
              </div>
              <span className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-200">Sales</span>
            </div>
            <div className="h-[250px] sm:h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ left: -20, right: 8, top: 12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spiceSalesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f15a24" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#f15a24" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#ede8e3" strokeDasharray="4 4" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#8b8680" }} tickLine={false} axisLine={false} minTickGap={18} />
                  <YAxis tick={{ fontSize: 10, fill: "#8b8680" }} tickLine={false} axisLine={false} tickFormatter={(value: number) => value >= 1000 ? (value / 1000).toFixed(0) + "k" : String(value)} />
                  <Tooltip formatter={(value: number | string | undefined) => money(Number(value ?? 0), settings.currency)} />
                  <Area type="monotone" dataKey="sales" stroke="#ed4d1a" strokeWidth={3} fill="url(#spiceSalesFill)" dot={{ r: 3, fill: "#ed4d1a", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="card-elevated min-w-0 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">Recent Orders</h2>
              <Link to="/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">View All <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </div>
            {recentOrders.length ? (
              <div className="divide-y">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs font-semibold">{order.invoiceNo}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(order.createdAt)} · {order.orderType}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums">{money(order.total, settings.currency)}</div>
                      <span className={order.status === "refunded" ? "mt-1 inline-block rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700" : "mt-1 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"}>{order.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <ClipboardList className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No orders yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Use POS to create a sample order.</p>
              </div>
            )}
          </section>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InsightCard icon={Utensils} tone="orange" label="Top Item" value={best?.name ?? "No sales yet"} detail={best ? String(best.quantity) + " units sold" : "Start a sample order"} to="/products" />
          <InsightCard icon={Users} tone="green" label="Customers" value={String(customers.length)} detail="Stored in this browser" to="/customers" />
          <InsightCard icon={Package} tone="red" label="Low Stock Items" value={String(lowStock.length)} detail="View inventory" to="/inventory" />
          <InsightCard icon={BarChart3} tone="blue" label="Kitchen Queue" value={String(kitchenQueue.length)} detail="Active preparation tickets" to="/kitchen" />
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50/60 px-4 py-3 text-xs text-orange-900 dark:border-orange-900 dark:bg-orange-950/20 dark:text-orange-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>This is a local demonstration. Figures reflect this browser's sample activity and are not connected to an actual restaurant or payment system.</p>
        </div>
      </div>
    </AppLayout>
  );
}

type IconType = ComponentType<{ className?: string }>;
function StatCard({ label, value, icon: Icon, tone, caption }: { label: string; value: string; icon: IconType; tone: "orange" | "blue" | "red" | "green"; caption: string }) {
  const tint = {
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-300",
    blue: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300",
    red: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  }[tone];
  return (
    <section className="card-elevated min-w-0 p-3.5 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl " + tint}><Icon className="h-5 w-5" /></div>
        <span className="hidden text-[10px] font-medium text-muted-foreground lg:block">Today</span>
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-[clamp(1.05rem,2vw,1.75rem)] font-extrabold leading-tight tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">{caption}</p>
    </section>
  );
}
function InsightCard({ icon: Icon, tone, label, value, detail, to }: { icon: IconType; tone: "orange" | "green" | "red" | "blue"; label: string; value: string; detail: string; to: "/products" | "/customers" | "/inventory" | "/kitchen" }) {
  const tint = {
    orange: "bg-orange-50 text-orange-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-rose-50 text-rose-600",
    blue: "bg-sky-50 text-sky-600",
  }[tone];
  return (
    <Link to={to} className="card-elevated group flex min-w-0 items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
      <div className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-xl " + tint}><Icon className="h-6 w-6" /></div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground group-hover:text-brand">{detail}</p>
      </div>
    </Link>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import { BellRing, Check, CheckCheck, ChefHat, CircleDot, Clock3, Flame, ListFilter, Ban, UtensilsCrossed } from "lucide-react";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/kitchen")({
  head: () => ({ meta: [{ title: "Kitchen Display — Spice Kitchen POS" }] }),
  component: KitchenPage,
});

type Stage = "new" | "preparing" | "ready";
type Filter = "all" | Stage;

const stages: {
  key: Stage;
  title: string;
  icon: typeof ChefHat;
  bar: string;
  chip: string;
  action: string;
}[] = [
  { key: "new", title: "Queued", icon: BellRing, bar: "bg-gradient-to-r from-[#7525a4] to-[#9c27b0]", chip: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200", action: "bg-black text-white hover:bg-zinc-800" },
  { key: "preparing", title: "Preparing", icon: ChefHat, bar: "bg-gradient-to-r from-[#f99b04] to-[#ed8b00]", chip: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200", action: "bg-orange-500 text-white hover:bg-orange-600" },
  { key: "ready", title: "Ready", icon: BellRing, bar: "bg-gradient-to-r from-[#2d9e49] to-[#38ae52]", chip: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200", action: "bg-green-600 text-white hover:bg-green-700" },
];

function elapsedMinutes(createdAt: string, now: number) {
  return Math.max(0, Math.floor((now - Date.parse(createdAt)) / 60_000));
}
function KitchenPage() {
  const { orders, products, setKitchenStatus, toggleKitchenItem, assignKitchenChef } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const ticker = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(ticker);
  }, []);
  const kitchenOrders = orders.filter((order) => order.status === "completed");
  const active = kitchenOrders.filter((order) => (order.kitchenStatus ?? "new") !== "served");
  const servedCount = kitchenOrders.filter((order) => order.kitchenStatus === "served").length;
  const cancelledCount = orders.filter((order) => order.status === "cancelled" || order.status === "refunded").length;
  const count = (stage: Stage) => active.filter((order) => (order.kitchenStatus ?? "new") === stage).length;
  const visibleStages = stages.filter((stage) => filter === "all" || filter === stage.key);
  const oldestFirst = (a: Order, b: Order) => Date.parse(a.createdAt) - Date.parse(b.createdAt);

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight"><ChefHat className="h-6 w-6 text-brand" /> Kitchen Display</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Preparation queue and handoff overview · browser-local demo</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"><CircleDot className="h-3.5 w-3.5 text-green-600" /> {active.length} active orders</div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[
            { title: "New Orders", count: count("new"), icon: BellRing, iconStyle: "bg-orange-100 text-orange-600" },
            { title: "Preparing", count: count("preparing"), icon: ChefHat, iconStyle: "bg-amber-100 text-amber-600" },
            { title: "Completed Orders", count: servedCount, icon: CheckCheck, iconStyle: "bg-green-100 text-green-600" },
            { title: "Cancelled / Refunded", count: cancelledCount, icon: Ban, iconStyle: "bg-red-100 text-red-600" },
          ].map((stat) => { const Icon = stat.icon; return (
            <div key={stat.title} className="rounded-xl border bg-card px-3.5 py-3 shadow-[0_2px_10px_rgba(31,27,26,0.04)]">
              <div className="flex items-center justify-between gap-1"><span className="text-[11px] font-semibold text-muted-foreground">{stat.title}</span><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.iconStyle}`}><Icon className="h-3.5 w-3.5" /></span></div>
              <div className="mt-1 text-[24px] font-extrabold leading-none tabular-nums">{String(stat.count).padStart(2, "0")}</div>
            </div>
          ); })}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {[
            { key: "all" as const, label: "All Orders", icon: ListFilter },
            { key: "new" as const, label: "Queued", icon: BellRing },
            { key: "preparing" as const, label: "Preparing", icon: ChefHat },
            { key: "ready" as const, label: "Ready", icon: Check },
          ].map((tab) => { const Icon = tab.icon; return <button key={tab.key} type="button" aria-pressed={filter === tab.key} onClick={() => setFilter(tab.key)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${filter === tab.key ? "border-brand bg-orange-50 text-brand dark:bg-accent" : "bg-card text-muted-foreground hover:bg-muted"}`}><Icon className="h-3.5 w-3.5" />{tab.label}</button>; })}
        </div>

        <div className={`grid items-start gap-3 ${filter === "all" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1"}`}>
          {visibleStages.map((stage) => {
            const StageIcon = stage.icon;
            const tickets = active.filter((order) => (order.kitchenStatus ?? "new") === stage.key).sort(oldestFirst);
            return (
              <section key={stage.key} aria-label={stage.title} className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[0_2px_14px_rgba(0,0,0,0.035)]">
                <div className={`flex h-10 items-center gap-2 px-3.5 text-white ${stage.bar}`}>
                  <StageIcon className="h-4 w-4" /><h2 className="text-[13px] font-extrabold">{stage.title}</h2>
                  <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold tabular-nums">{tickets.length}</span>
                </div>
                <div className="divide-y">
                  {tickets.map((order) => {
                    const checked = order.kitchenDoneLineIds ?? [];
                    const doneCount = order.items.filter((item) => checked.includes(item.lineId)).length;
                    const totalCount = order.items.length;
                    const percentage = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
                    const elapsed = elapsedMinutes(order.createdAt, now);
                    const prepGoal = Math.max(1, ...order.items.map((item) => products.find((p) => p.id === item.productId)?.prepTime ?? 15));
                    const overdue = elapsed > prepGoal && stage.key !== "ready";
                    return (
                      <article key={order.id} className="px-3 py-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-extrabold">{order.invoiceNo}</p>
                            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${order.orderType === "dine-in" ? "bg-green-100 text-green-700" : "bg-sky-100 text-sky-700"}`}>{order.orderType === "dine-in" ? "Dine-in" : order.orderType === "takeaway" ? "Takeaway" : order.orderType === "pickup" ? "Pickup" : "Delivery"}</span>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[11px] font-semibold">{order.table ? "Table " + order.table.replace(/^T/, "") : "Token " + order.invoiceNo.slice(-4)}</p>
                            <p className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${overdue ? "bg-rose-100 text-rose-700" : stage.key === "ready" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-700"}`}><Clock3 className="h-3 w-3" />{stage.key === "ready" ? "Ready" : overdue ? elapsed - prepGoal + "m over goal" : elapsed + "m elapsed"}</p>
                          </div>
                        </div>
                        <p className="mt-1.5 text-[10px] text-muted-foreground">Placed {formatDateTime(order.createdAt)}</p>
                        {stage.key !== "ready" && (
                          <select aria-label={`Assigned chef for ${order.invoiceNo}`} value={order.kitchenChef || ""} onChange={(e) => assignKitchenChef(order.id, e.target.value)} className="mt-2 h-8 w-full rounded-md border bg-card px-2 text-[11px]">
                            <option value="">Unassigned station</option><option value="Head chef">Head chef</option><option value="Line cook">Line cook</option><option value="Prep station">Prep station</option>
                          </select>
                        )}
                        {stage.key === "preparing" && (
                          <div className="mt-2">
                            <div className="flex justify-between text-[10px] font-semibold"><span>Progress</span><span>{percentage}%</span></div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${percentage}%` }} /></div>
                          </div>
                        )}
                        <div className="mt-2.5 space-y-1.5">
                          {order.items.map((item) => {
                            const isDone = stage.key === "ready" || checked.includes(item.lineId);
                            return <div key={item.lineId} className="flex items-start gap-2">
                              {stage.key === "preparing" ? <button type="button" aria-label={`Mark ${item.name} ${isDone ? "not prepared" : "prepared"}`} aria-pressed={isDone} onClick={() => toggleKitchenItem(order.id, item.lineId)} className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isDone ? "border-orange-500 bg-orange-500 text-white" : "border-zinc-300 bg-white"}`}>{isDone && <Check className="h-3 w-3" />}</button> : <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${stage.key === "ready" ? "bg-zinc-500 text-white" : "border border-zinc-300"}`}>{stage.key === "ready" && <Check className="h-3 w-3" />}</span>}
                              <div className="min-w-0 text-[11px] leading-[1.35]"><span className={`mr-1 font-extrabold ${isDone ? "text-muted-foreground" : "text-brand"}`}>{item.qty}×</span><span className={isDone && stage.key === "preparing" ? "text-muted-foreground line-through" : "font-medium"}>{item.name}</span>{item.note && <p className="mt-0.5 text-[10px] text-orange-700 dark:text-orange-300">Note: {item.note}</p>}</div>
                            </div>;
                          })}
                        </div>
                        {stage.key === "ready" && <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-green-600"><CheckCheck className="h-3.5 w-3.5" /> Ready for handoff</div>}
                        <button type="button" disabled={stage.key === "preparing" && percentage < 100} title={stage.key === "preparing" && percentage < 100 ? "Tick all prepared items first" : undefined} onClick={() => setKitchenStatus(order.id, stage.key === "new" ? "preparing" : stage.key === "preparing" ? "ready" : "served")} className={`mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${stage.action}`}>{stage.key === "new" ? <Flame className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}{stage.key === "new" ? "Start Preparing" : stage.key === "preparing" ? "Mark Ready" : "Mark Served"}</button>
                      </article>
                    );
                  })}
                  {!tickets.length && <div className="px-3 py-12 text-center text-xs text-muted-foreground"><UtensilsCrossed className="mx-auto mb-2 h-6 w-6 opacity-40" />No {stage.title.toLowerCase()} tickets</div>}
                </div>
              </section>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">Order status and chef station assignments are stored in this browser only. Kitchen tickets currently appear after checkout, not before payment.</p>
      </div>
    </AppLayout>
  );
}

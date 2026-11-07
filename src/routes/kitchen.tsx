import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import { ChefHat, Clock3, Check, UtensilsCrossed, CircleDot, Flame, CheckCheck } from "lucide-react";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/kitchen")({
  head: () => ({ meta: [{ title: "Kitchen Display — Spice Kitchen POS" }] }),
  component: KitchenPage,
});

type KitchenStage = NonNullable<Order["kitchenStatus"]>;
type TicketStage = Exclude<KitchenStage, "served">;

const columns: { key: TicketStage; title: string; description: string; icon: typeof ChefHat; border: string; color: string; button: string }[] = [
  { key: "new", title: "Queued", description: "Waiting to prepare", icon: CircleDot, border: "border-sky-200 dark:border-sky-900", color: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300", button: "bg-slate-900 text-white hover:bg-slate-800" },
  { key: "preparing", title: "Preparing", description: "Currently in the kitchen", icon: Flame, border: "border-amber-200 dark:border-amber-900", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", button: "bg-amber-500 text-white hover:bg-amber-600" },
  { key: "ready", title: "Ready", description: "Waiting for handoff", icon: CheckCheck, border: "border-emerald-200 dark:border-emerald-900", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", button: "bg-emerald-600 text-white hover:bg-emerald-700" },
];

function KitchenPage() {
  const { orders, setKitchenStatus } = useStore();
  const completed = orders.filter((order) => order.status === "completed");
  const active = completed.filter((order) => (order.kitchenStatus ?? "new") !== "served");
  const served = completed.filter((order) => order.kitchenStatus === "served").length;
  const count = (stage: TicketStage) => active.filter((order) => (order.kitchenStatus ?? "new") === stage).length;
  const oldestFirst = (a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  return (
    <AppLayout>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-brand dark:bg-accent"><ChefHat className="h-5 w-5" /></span><h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Kitchen Display</h1></div>
          <p className="mt-1 text-sm text-muted-foreground">Order preparation and handoff board · demo mode</p>
        </div>
        <div className="rounded-full border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">{active.length} active tickets · {served} served</div>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "New orders", value: count("new"), icon: CircleDot, style: "text-sky-600" },
          { label: "Preparing", value: count("preparing"), icon: Flame, style: "text-amber-600" },
          { label: "Ready to serve", value: count("ready"), icon: Check, style: "text-emerald-600" },
          { label: "Served", value: served, icon: UtensilsCrossed, style: "text-brand" },
        ].map((item) => {
          const Icon = item.icon;
          return <div key={item.label} className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm"><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{item.value.toString().padStart(2, "0")}</p></div><Icon className={`h-5 w-5 ${item.style}`} /></div>;
        })}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="rounded-full border bg-card px-3 py-1.5">Queued → Preparing → Ready → Served</span><span>Kitchen updates are stored in this browser only. Other devices do not sync.</span></div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {columns.map((column) => {
          const Icon = column.icon;
          const tickets = active.filter((order) => (order.kitchenStatus ?? "new") === column.key).sort(oldestFirst);
          return <section key={column.key} aria-label={column.title} className={`min-h-[270px] overflow-hidden rounded-2xl border bg-muted/20 ${column.border}`}>
            <div className="flex items-center justify-between gap-2 border-b bg-card px-4 py-3">
              <div className="flex items-center gap-2.5"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${column.color}`}><Icon className="h-4.5 w-4.5" /></span><div><h2 className="text-sm font-extrabold">{column.title}</h2><p className="text-[11px] text-muted-foreground">{column.description}</p></div></div>
              <span className="rounded-full border bg-card px-2.5 py-1 text-xs font-bold tabular-nums">{tickets.length}</span>
            </div>
            <div className="space-y-3 p-3">
              {tickets.map((order) => <article key={order.id} className="overflow-hidden rounded-xl border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="flex items-start justify-between gap-2 p-3.5">
                  <div><p className="text-sm font-extrabold">{order.invoiceNo}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{order.orderType}{order.table ? " · Table " + order.table.replace(/^T/, "") : ""}</p></div>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /><time dateTime={order.createdAt}>{formatDateTime(order.createdAt).split(",")[1]?.trim() ?? ""}</time></span>
                </div>
                <div className="mx-3.5 border-t" />
                <div className="space-y-2.5 p-3.5">
                  {order.items.map((item) => <div key={item.lineId} className="flex items-start gap-2 text-xs"><span className="min-w-7 rounded-md bg-muted px-1.5 py-1 text-center font-bold tabular-nums">{item.qty}×</span><div className="min-w-0 flex-1"><p className="font-semibold leading-relaxed">{item.name}</p>{item.note && <p className="mt-1 rounded bg-orange-50 px-2 py-1 text-[11px] text-orange-800 dark:bg-accent dark:text-accent-foreground">Note: {item.note}</p>}</div></div>)}
                </div>
                <div className="border-t bg-muted/25 p-3">
                  <button type="button" onClick={() => setKitchenStatus(order.id, column.key === "new" ? "preparing" : column.key === "preparing" ? "ready" : "served")} className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${column.button}`}>{column.key === "new" ? <Flame className="h-4 w-4" /> : <Check className="h-4 w-4" />}{column.key === "new" ? "Start Preparing" : column.key === "preparing" ? "Mark Ready" : "Mark Served"}</button>
                </div>
              </article>)}
              {tickets.length === 0 && <div className="rounded-xl border border-dashed bg-card/60 px-4 py-12 text-center text-xs text-muted-foreground"><ChefHat className="mx-auto mb-2 h-6 w-6 opacity-40" />No orders in this stage</div>}
            </div>
          </section>;
        })}
      </div>
      {completed.length === 0 && <p className="mt-5 text-center text-xs text-muted-foreground">Tickets appear after a POS checkout is completed.</p>}
    </AppLayout>
  );
}

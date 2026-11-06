import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import { ChefHat, Clock, Check, UtensilsCrossed } from "lucide-react";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/kitchen")({
  head: () => ({ meta: [{ title: "Kitchen Display — Spice Kitchen POS" }] }),
  component: KitchenPage,
});

type KitchenStage = NonNullable<Order["kitchenStatus"]>;

const columns: { key: KitchenStage; title: string; description: string; style: string }[] = [
  { key: "new", title: "New Orders", description: "Waiting to start", style: "border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/20" },
  { key: "preparing", title: "Preparing", description: "Being prepared", style: "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20" },
  { key: "ready", title: "Ready to Serve", description: "Waiting for handoff", style: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20" },
];

function KitchenPage() {
  const { orders, setKitchenStatus } = useStore();
  // Paid/completed POS transactions have a separate preparation lifecycle.
  // A served ticket is removed from the active board, not from order history.
  const active = orders.filter((order) => order.status === "completed" && (order.kitchenStatus ?? "new") !== "served");
  const served = orders.filter((order) => order.status === "completed" && order.kitchenStatus === "served").length;

  return (
    <AppLayout>
      <PageHeader title="Kitchen Display" subtitle={`${active.length} active tickets · ${served} served · statuses saved in this browser`} />
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border bg-card px-3 py-1.5">New → Preparing → Ready → Served</span>
        <span>This is a browser-local kitchen board, not multi-device synchronization.</span>
      </div>
      {active.length === 0 ? (
        <div className="card-elevated p-12 text-center text-muted-foreground">
          <ChefHat className="mx-auto mb-3 h-10 w-10 opacity-50" />
          No active kitchen tickets. Completed POS checkouts will appear here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {columns.map((column) => {
            const tickets = active.filter((order) => (order.kitchenStatus ?? "new") === column.key);
            return (
              <section key={column.key} aria-label={column.title} className={`min-h-[240px] rounded-xl border p-3 ${column.style}`}>
                <div className="mb-4 flex items-center justify-between gap-3 px-1">
                  <div>
                    <h2 className="font-semibold">{column.title}</h2>
                    <p className="text-xs text-muted-foreground">{column.description}</p>
                  </div>
                  <span className="rounded-full border bg-card px-2.5 py-1 text-xs font-bold">{tickets.length}</span>
                </div>
                <div className="space-y-3">
                  {tickets.map((order) => (
                    <article key={order.id} className="rounded-xl border bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">{order.invoiceNo}</div>
                          <div className="text-sm font-semibold capitalize">{order.orderType}{order.table ? ` · ${order.table}` : ""}</div>
                        </div>
                        <time className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" dateTime={order.createdAt}>
                          <Clock className="h-3.5 w-3.5" /> {formatDateTime(order.createdAt).split(",")[1]?.trim() ?? ""}
                        </time>
                      </div>
                      <ul className="mt-3 space-y-2 border-y py-3 text-sm">
                        {order.items.map((item) => (
                          <li key={item.lineId} className="flex gap-2">
                            <span className="min-w-7 shrink-0 rounded bg-muted px-1.5 py-0.5 text-center font-bold tabular-nums">{item.qty}×</span>
                            <div className="min-w-0">
                              <div className="font-medium">{item.name}</div>
                              {item.note && <div className="text-xs italic text-muted-foreground">Note: {item.note}</div>}
                            </div>
                          </li>
                        ))}
                      </ul>
                      {column.key === "new" && (
                        <button type="button" onClick={() => setKitchenStatus(order.id, "preparing")} className="mt-3 w-full rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-amber-700">Start preparing</button>
                      )}
                      {column.key === "preparing" && (
                        <button type="button" onClick={() => setKitchenStatus(order.id, "ready")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"><Check className="h-4 w-4" /> Mark ready</button>
                      )}
                      {column.key === "ready" && (
                        <button type="button" onClick={() => setKitchenStatus(order.id, "served")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gradient px-3 py-2.5 text-sm font-semibold text-brand-foreground"><UtensilsCrossed className="h-4 w-4" /> Mark served</button>
                      )}
                    </article>
                  ))}
                  {tickets.length === 0 && <p className="rounded-lg border border-dashed bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">No tickets in this stage</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import { useState } from "react";
import { ChefHat, Clock, Check } from "lucide-react";

export const Route = createFileRoute("/kitchen")({
  head: () => ({ meta: [{ title: "Kitchen Display — Spice Kitchen POS" }] }),
  component: KitchenPage,
});

type KStatus = "new" | "preparing" | "ready";

function KitchenPage() {
  const { orders } = useStore();
  // Take last 20 orders and give them ephemeral kitchen status
  const [status, setStatus] = useState<Record<string, KStatus>>({});
  const recent = orders.slice(0, 20);

  const set = (id: string, s: KStatus) => setStatus((prev) => ({ ...prev, [id]: s }));

  const cols: { key: KStatus; label: string; tint: string }[] = [
    { key: "new", label: "New Orders", tint: "bg-blue-50 border-blue-200" },
    { key: "preparing", label: "Preparing", tint: "bg-orange-50 border-orange-200" },
    { key: "ready", label: "Ready", tint: "bg-emerald-50 border-emerald-200" },
  ];

  return (
    <AppLayout>
      <PageHeader title="Kitchen Display" subtitle="Live orders — mark preparing then ready" />
      {recent.length === 0 ? (
        <div className="card-elevated p-16 text-center text-muted-foreground">
          <ChefHat className="h-10 w-10 mx-auto mb-3 opacity-40" />
          Orders from POS will appear here.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {cols.map((col) => {
            const list = recent.filter((o) => (status[o.id] ?? "new") === col.key);
            return (
              <div key={col.key} className={`rounded-xl border p-3 ${col.tint} min-h-[60vh]`}>
                <div className="font-semibold mb-3 flex items-center justify-between">
                  <span>{col.label}</span>
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full">{list.length}</span>
                </div>
                <div className="space-y-3">
                  {list.map((o) => (
                    <div key={o.id} className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">{o.invoiceNo}</div>
                          <div className="text-sm font-semibold">{o.orderType}{o.table ? ` · ${o.table}` : ""}</div>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDateTime(o.createdAt).split(",")[1]?.trim()}</div>
                      </div>
                      <ul className="mt-2 text-sm space-y-0.5">
                        {o.items.map((i) => (
                          <li key={i.lineId}><span className="font-semibold">{i.qty}×</span> {i.name}{i.note ? <em className="text-muted-foreground"> · {i.note}</em> : null}</li>
                        ))}
                      </ul>
                      <div className="mt-3 flex gap-1">
                        {col.key === "new" && <button onClick={() => set(o.id, "preparing")} className="flex-1 text-xs py-1.5 rounded bg-orange-500 text-white">Start</button>}
                        {col.key === "preparing" && <button onClick={() => set(o.id, "ready")} className="flex-1 text-xs py-1.5 rounded bg-emerald-500 text-white flex items-center justify-center gap-1"><Check className="h-3 w-3" /> Ready</button>}
                        {col.key === "ready" && <div className="flex-1 text-xs py-1.5 rounded bg-emerald-100 text-emerald-700 text-center">Awaiting service</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

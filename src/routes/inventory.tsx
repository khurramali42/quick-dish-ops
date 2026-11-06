import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { money } from "@/lib/format";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Spice Kitchen POS" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const { products, upsertProduct, settings } = useStore();
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const shown = products.filter((p) => {
    if (filter === "low") return p.trackStock && p.stock > 0 && p.stock <= 10;
    if (filter === "out") return p.trackStock && p.stock <= 0;
    return p.trackStock;
  });

  const totalValue = products.reduce((s, p) => s + p.cost * p.stock, 0);
  const lowCount = products.filter((p) => p.trackStock && p.stock <= 10).length;

  const adjust = (id: string, delta: number) => {
    const p = products.find((x) => x.id === id)!;
    upsertProduct({ ...p, stock: Math.max(0, p.stock + delta) });
  };

  return (
    <AppLayout>
      <PageHeader title="Inventory" subtitle="Manage stock levels across your menu" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card-elevated p-5"><div className="text-xs text-muted-foreground uppercase">Total Stock Value</div><div className="text-2xl font-semibold mt-1">{money(totalValue, settings.currency)}</div></div>
        <div className="card-elevated p-5"><div className="text-xs text-muted-foreground uppercase">Tracked Items</div><div className="text-2xl font-semibold mt-1">{products.filter((p) => p.trackStock).length}</div></div>
        <div className="card-elevated p-5"><div className="text-xs text-muted-foreground uppercase flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Low / Out</div><div className="text-2xl font-semibold mt-1 text-destructive">{lowCount}</div></div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="p-4 border-b flex gap-2">
          {(["all", "low", "out"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm ${filter === f ? "bg-brand-gradient text-brand-foreground" : "hover:bg-accent"}`}>
              {f === "all" ? "All" : f === "low" ? "Low stock" : "Out of stock"}
            </button>
          ))}
        </div>
        <div className="table-scroll"><table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr><th className="text-left px-4 py-2">Item</th><th className="text-right px-4 py-2">Cost</th><th className="text-right px-4 py-2">Stock</th><th className="text-right px-4 py-2">Value</th><th className="text-center px-4 py-2">Adjust</th></tr>
          </thead>
          <tbody className="divide-y">
            {shown.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 flex items-center gap-2"><span className="text-xl">{p.emoji}</span> {p.name}</td>
                <td className="px-4 py-2.5 text-right">{money(p.cost, settings.currency)}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${p.stock <= 5 ? "text-destructive" : p.stock <= 10 ? "text-warning" : ""}`}>{p.stock}</td>
                <td className="px-4 py-2.5 text-right">{money(p.cost * p.stock, settings.currency)}</td>
                <td className="px-4 py-2.5 text-center">
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => adjust(p.id, -1)} className="w-7 h-7 rounded border hover:bg-accent">-</button>
                    <button onClick={() => adjust(p.id, +1)} className="w-7 h-7 rounded border hover:bg-accent">+</button>
                    <button onClick={() => { const v = prompt("Set stock to:", String(p.stock)); if (v != null) { upsertProduct({ ...p, stock: Math.max(0, +v) }); toast.success("Stock updated"); } }} className="ml-1 px-2 py-1 text-xs rounded border hover:bg-accent">Set</button>
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground py-10">Nothing to show.</td></tr>}
          </tbody>
        </table></div>
      </div>
    </AppLayout>
  );
}

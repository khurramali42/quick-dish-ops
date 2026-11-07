import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { money } from "@/lib/format";
import { useState } from "react";
import { AlertTriangle, FlaskConical, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Spice Kitchen POS" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const { products, upsertProduct, recordWaste, setRecipe, settings, activityLog } = useStore();
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [recipeProductId, setRecipeProductId] = useState<string | null>(null);
  const [recipeLines, setRecipeLines] = useState<{ ingredientProductId: string; qty: number }[]>([]);

  const shown = products.filter((p) => {
    if (filter === "low") return p.trackStock && p.stock > 0 && p.stock <= 10;
    if (filter === "out") return p.trackStock && p.stock <= 0;
    return p.trackStock;
  });

  const totalValue = products.filter((p) => p.trackStock).reduce((s, p) => s + p.cost * p.stock, 0);
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
            <tr><th className="text-left px-4 py-2">Item</th><th className="text-right px-4 py-2">Cost</th><th className="text-right px-4 py-2">Stock</th><th className="text-right px-4 py-2">Value</th><th className="text-center px-4 py-2">Adjust</th><th className="text-center px-4 py-2">Waste</th></tr>
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
                    <button onClick={() => { const v = prompt("Set stock to:", String(p.stock)); if (v != null) { const stock = Number(v); if (!Number.isInteger(stock) || stock < 0) { toast.error("Enter a valid whole-number stock quantity."); return; } upsertProduct({ ...p, stock }); toast.success("Stock updated"); } }} className="ml-1 px-2 py-1 text-xs rounded border hover:bg-accent">Set</button>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-center"><button type="button" title="Record waste" onClick={() => {
                  const count = prompt("Units wasted:", "1");
                  if (count === null) return;
                  const reason = prompt("Reason for wastage:") ?? "";
                  try { recordWaste(p.id, Number(count), reason); toast.success("Waste recorded"); }
                  catch (error) { toast.error(error instanceof Error ? error.message : "Unable to record waste"); }
                }} className="rounded-lg border px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="inline h-3.5 w-3.5" /> Waste</button></td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground py-10">Nothing to show.</td></tr>}
          </tbody>
        </table></div>
      </div>

      <div className="mt-5 rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2"><FlaskConical className="h-4 w-4 text-brand" /><h2 className="font-bold">Recipe ingredients</h2></div>
        <p className="mb-3 text-xs text-muted-foreground">Choose a sold menu product and assign tracked ingredient items. Checkout deducts recipe ingredients instead of finished-product stock.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {products.filter((p) => p.available).map((product) => <button key={product.id} type="button" onClick={() => { setRecipeProductId(product.id); setRecipeLines(product.recipe?.map((line) => ({ ...line })) ?? []); }} className="flex items-center justify-between rounded-lg border p-2 text-left text-xs hover:border-brand"><span className="truncate">{product.name}</span><span className="ml-2 text-muted-foreground">{product.recipe?.length ?? 0} ingredients</span></button>)}
        </div>
        <h3 className="mt-4 text-xs font-bold">Recent inventory waste (local demo)</h3>
        <div className="mt-2 space-y-1">{activityLog.filter((event) => event.action === "inventory.waste").slice(0, 10).map((event) => <div key={event.id} className="flex justify-between gap-3 text-[11px] text-muted-foreground"><span>{event.details}</span><span>{new Date(event.createdAt).toLocaleString("en-PK")}</span></div>)}</div>
      </div>
      <Dialog open={recipeProductId !== null} onOpenChange={(open) => !open && setRecipeProductId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Recipe editor: {products.find((p) => p.id === recipeProductId)?.name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Each row consumes the listed quantity per one sold dish. Do not add the finished dish itself as an ingredient.</p>
          <div className="max-h-64 space-y-2 overflow-y-auto">{recipeLines.map((line, index) => <div key={index} className="flex items-center gap-2">
            <select aria-label={"Ingredient " + (index + 1)} value={line.ingredientProductId} onChange={(e) => setRecipeLines((lines) => lines.map((x, i) => i === index ? { ...x, ingredientProductId: e.target.value } : x))} className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs">
              {products.filter((p) => p.trackStock && p.id !== recipeProductId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" aria-label={"Ingredient quantity " + (index + 1)} min={0.01} step={0.01} value={line.qty} onChange={(e) => setRecipeLines((lines) => lines.map((x, i) => i === index ? { ...x, qty: Number(e.target.value) } : x))} className="h-9 w-24 rounded-lg border bg-background px-2 text-xs" />
            <button type="button" aria-label="Remove ingredient" onClick={() => setRecipeLines((lines) => lines.filter((_, i) => i !== index))} className="rounded-lg border p-2 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>)}</div>
          <button type="button" onClick={() => { const option = products.find((p) => p.trackStock && p.id !== recipeProductId); if (option) setRecipeLines((lines) => [...lines, { ingredientProductId: option.id, qty: 1 }]); }} className="rounded-lg border px-3 py-2 text-xs font-semibold">Add ingredient</button>
          <button type="button" onClick={() => { try { if (recipeProductId) setRecipe(recipeProductId, recipeLines); toast.success("Recipe saved"); setRecipeProductId(null); } catch (error) { toast.error(error instanceof Error ? error.message : "Recipe invalid"); } }} className="rounded-lg bg-brand-gradient px-3 py-2 text-xs font-bold text-brand-foreground">Save recipe</button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

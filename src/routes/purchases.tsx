import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { money, formatDateTime, todayISO } from "@/lib/format";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/purchases")({
  head: () => ({ meta: [{ title: "Purchases — Spice Kitchen POS" }] }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const { purchases, suppliers, products, addPurchase, settings } = useStore();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [rows, setRows] = useState<{ productId: string; qty: number; cost: number }[]>([{ productId: products[0]?.id ?? "", qty: 1, cost: products[0]?.cost ?? 0 }]);

  const total = rows.reduce((sum, row) => sum + (Number.isFinite(row.qty) && Number.isFinite(row.cost) ? row.qty * row.cost : 0), 0);

  const save = () => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier || rows.length === 0) {
      toast.error("Select a supplier and at least one product.");
      return;
    }
    if (!rows.every((row) => products.some((product) => product.id === row.productId)
      && Number.isInteger(row.qty) && row.qty > 0
      && Number.isFinite(row.cost) && row.cost >= 0)) {
      toast.error("Each purchase line needs a product, positive whole-number quantity and valid cost.");
      return;
    }
    const items = rows.map((row) => ({
      productId: row.productId,
      name: products.find((product) => product.id === row.productId)!.name,
      qty: row.qty,
      cost: row.cost,
    }));
    try {
      addPurchase({ supplierId, supplierName: supplier.name, date: todayISO(), items, total, paid: total });
      toast.success("Purchase recorded · stock updated");
      setOpen(false);
      setRows([{ productId: products[0]?.id ?? "", qty: 1, cost: products[0]?.cost ?? 0 }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to record purchase.");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Purchases"
        subtitle="Record stock received from suppliers"
        action={<button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-brand-gradient text-brand-foreground px-4 py-2 rounded-lg font-medium text-sm"><Plus className="h-4 w-4" /> New purchase</button>}
      />

      <div className="card-elevated overflow-hidden">
        <div className="table-scroll"><table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr><th className="text-left px-4 py-2">Invoice</th><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Supplier</th><th className="text-left px-4 py-2">Items</th><th className="text-right px-4 py-2">Total</th></tr>
          </thead>
          <tbody className="divide-y">
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono text-xs">{p.invoiceNo}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(p.date)}</td>
                <td className="px-4 py-2.5">{p.supplierName}</td>
                <td className="px-4 py-2.5">{p.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</td>
                <td className="px-4 py-2.5 text-right font-medium">{money(p.total, settings.currency)}</td>
              </tr>
            ))}
            {purchases.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground py-16">No purchases recorded.</td></tr>}
          </tbody>
        </table></div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New purchase</DialogTitle></DialogHeader>
          <label className="text-xs block"><div className="text-muted-foreground mb-1">Supplier</div>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full h-9 rounded-lg border bg-background px-3 text-sm">
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <div className="mt-3 space-y-2 overflow-x-auto">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center min-w-[420px]">
                <select value={r.productId} onChange={(e) => setRows(rs => rs.map((x, j) => j === i ? { ...x, productId: e.target.value, cost: products.find((p) => p.id === e.target.value)?.cost ?? x.cost } : x))} className="col-span-6 h-9 rounded-lg border bg-background px-2 text-sm">
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" min={1} step={1} aria-label="Quantity" value={r.qty} onChange={(e) => setRows(rs => rs.map((x, j) => j === i ? { ...x, qty: +e.target.value } : x))} placeholder="Qty" className="col-span-2 h-9 rounded-lg border bg-background px-2 text-sm" />
                <input type="number" min={0} step="0.01" aria-label="Unit cost" value={r.cost} onChange={(e) => setRows(rs => rs.map((x, j) => j === i ? { ...x, cost: +e.target.value } : x))} placeholder="Cost" className="col-span-3 h-9 rounded-lg border bg-background px-2 text-sm" />
                <button onClick={() => setRows(rs => rs.filter((_, j) => j !== i))} className="col-span-1 h-9 rounded-lg border hover:bg-accent"><Trash2 className="h-3 w-3 mx-auto text-destructive" /></button>
              </div>
            ))}
            <button onClick={() => setRows(rs => [...rs, { productId: products[0]?.id ?? "", qty: 1, cost: products[0]?.cost ?? 0 }])} className="text-xs px-3 py-1.5 rounded border hover:bg-accent">+ Add line</button>
          </div>
          <div className="flex justify-between items-center border-t pt-3">
            <span className="text-sm">Total</span>
            <span className="text-xl font-bold">{money(total, settings.currency)}</span>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
            <button onClick={save} className="px-5 py-2 rounded-lg bg-brand-gradient text-brand-foreground text-sm font-medium">Save purchase</button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

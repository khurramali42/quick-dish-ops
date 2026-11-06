import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { money, shortId } from "@/lib/format";
import type { Supplier } from "@/lib/types";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — Spice Kitchen POS" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { suppliers, upsertSupplier, deleteSupplier, settings } = useStore();
  const [edit, setEdit] = useState<Supplier | null>(null);
  const empty = (): Supplier => ({ id: shortId("s"), name: "", contact: "", phone: "", balance: 0 });

  return (
    <AppLayout>
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} suppliers`}
        action={<button onClick={() => setEdit(empty())} className="inline-flex items-center gap-2 bg-brand-gradient text-brand-foreground px-4 py-2 rounded-lg font-medium text-sm"><Plus className="h-4 w-4" /> New supplier</button>}
      />

      <div className="card-elevated overflow-hidden">
        <div className="table-scroll"><table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Contact</th><th className="text-left px-4 py-2">Phone</th><th className="text-right px-4 py-2">Balance</th><th className="text-right px-4 py-2"></th></tr>
          </thead>
          <tbody className="divide-y">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{s.name}</td>
                <td className="px-4 py-2.5">{s.contact}</td>
                <td className="px-4 py-2.5">{s.phone}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${s.balance > 0 ? "text-destructive" : ""}`}>{money(s.balance, settings.currency)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => setEdit(s)} className="p-1.5 rounded hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Delete ${s.name}?`)) { deleteSupplier(s.id); toast.success("Deleted"); } }} className="p-1.5 rounded hover:bg-accent text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {edit && (
        <Dialog open onOpenChange={(v) => !v && setEdit(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit.name ? "Edit supplier" : "New supplier"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs col-span-2"><div className="text-muted-foreground mb-1">Name</div><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="input" /></label>
              <label className="text-xs"><div className="text-muted-foreground mb-1">Contact person</div><input value={edit.contact} onChange={(e) => setEdit({ ...edit, contact: e.target.value })} className="input" /></label>
              <label className="text-xs"><div className="text-muted-foreground mb-1">Phone</div><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className="input" /></label>
              <label className="text-xs col-span-2"><div className="text-muted-foreground mb-1">Balance payable (PKR)</div><input type="number" value={edit.balance} onChange={(e) => setEdit({ ...edit, balance: +e.target.value })} className="input" /></label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button onClick={() => { upsertSupplier(edit); toast.success("Saved"); setEdit(null); }} disabled={!edit.name} className="px-5 py-2 rounded-lg bg-brand-gradient text-brand-foreground text-sm font-medium disabled:opacity-50">Save</button>
            </div>
            <style>{`.input{width:100%;height:38px;border:1px solid var(--border);border-radius:.5rem;background:var(--background);padding:0 .75rem;font-size:.875rem}`}</style>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { money, shortId, todayISO } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — Spice Kitchen POS" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const { customers, upsertCustomer, deleteCustomer, settings } = useStore();
  const [edit, setEdit] = useState<Customer | null>(null);
  const empty = (): Customer => ({ id: shortId("cu"), name: "", phone: "", loyaltyPoints: 0, totalSpent: 0, createdAt: todayISO() });

  return (
    <AppLayout>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customers`}
        action={<button onClick={() => setEdit(empty())} className="inline-flex items-center gap-2 bg-brand-gradient text-brand-foreground px-4 py-2 rounded-lg font-medium text-sm"><Plus className="h-4 w-4" /> New customer</button>}
      />

      <div className="card-elevated overflow-hidden">
        <div className="table-scroll"><table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Phone</th><th className="text-left px-4 py-2">Address</th><th className="text-right px-4 py-2">Loyalty</th><th className="text-right px-4 py-2">Total Spent</th><th className="text-right px-4 py-2"></th></tr>
          </thead>
          <tbody className="divide-y">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{c.name}</td>
                <td className="px-4 py-2.5">{c.phone}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.address ?? "—"}</td>
                <td className="px-4 py-2.5 text-right">{c.loyaltyPoints} pts</td>
                <td className="px-4 py-2.5 text-right font-medium">{money(c.totalSpent, settings.currency)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => setEdit(c)} className="p-1.5 rounded hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                  {c.id !== "cu1" && <button onClick={() => { if (confirm(`Delete ${c.name}?`)) { try { deleteCustomer(c.id); toast.success("Deleted"); } catch (error) { toast.error(error instanceof Error ? error.message : "Cannot delete linked record."); } } }} className="p-1.5 rounded hover:bg-accent text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {edit && (
        <Dialog open onOpenChange={(v) => !v && setEdit(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit.name ? "Edit customer" : "New customer"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs col-span-2"><div className="text-muted-foreground mb-1">Name</div><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="input" /></label>
              <label className="text-xs"><div className="text-muted-foreground mb-1">Phone</div><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className="input" /></label>
              <label className="text-xs"><div className="text-muted-foreground mb-1">Email</div><input value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} className="input" /></label>
              <label className="text-xs col-span-2"><div className="text-muted-foreground mb-1">Address</div><input value={edit.address ?? ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} className="input" /></label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button onClick={() => { upsertCustomer(edit); toast.success("Saved"); setEdit(null); }} disabled={!edit.name} className="px-5 py-2 rounded-lg bg-brand-gradient text-brand-foreground text-sm font-medium disabled:opacity-50">Save</button>
            </div>
            <style>{`.input{width:100%;height:38px;border:1px solid var(--border);border-radius:.5rem;background:var(--background);padding:0 .75rem;font-size:.875rem}`}</style>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}

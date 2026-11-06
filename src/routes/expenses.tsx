import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { money, formatDateTime, todayISO } from "@/lib/format";
import { useState } from "react";
import type { PaymentMethod } from "@/lib/types";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses — Spice Kitchen POS" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { expenses, addExpense, settings } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "Utilities", amount: 0, paidTo: "", method: "cash" as PaymentMethod, note: "" });

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <AppLayout>
      <PageHeader
        title="Expenses"
        subtitle={`Total: ${money(total, settings.currency)}`}
        action={<button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-brand-gradient text-brand-foreground px-4 py-2 rounded-lg font-medium text-sm"><Plus className="h-4 w-4" /> New expense</button>}
      />

      <div className="card-elevated overflow-hidden">
        <div className="table-scroll"><table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Category</th><th className="text-left px-4 py-2">Paid to</th><th className="text-left px-4 py-2">Method</th><th className="text-right px-4 py-2">Amount</th></tr>
          </thead>
          <tbody className="divide-y">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(e.date)}</td>
                <td className="px-4 py-2.5">{e.category}</td>
                <td className="px-4 py-2.5">{e.paidTo || "—"}</td>
                <td className="px-4 py-2.5 capitalize">{e.method}</td>
                <td className="px-4 py-2.5 text-right font-medium">{money(e.amount, settings.currency)}</td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground py-16">No expenses recorded.</td></tr>}
          </tbody>
        </table></div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs"><div className="text-muted-foreground mb-1">Category</div><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" /></label>
            <label className="text-xs"><div className="text-muted-foreground mb-1">Amount</div><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} className="input" /></label>
            <label className="text-xs"><div className="text-muted-foreground mb-1">Paid to</div><input value={form.paidTo} onChange={(e) => setForm({ ...form, paidTo: e.target.value })} className="input" /></label>
            <label className="text-xs"><div className="text-muted-foreground mb-1">Method</div>
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })} className="input">
                <option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank</option><option value="easypaisa">Easypaisa</option><option value="jazzcash">JazzCash</option>
              </select>
            </label>
            <label className="text-xs col-span-2"><div className="text-muted-foreground mb-1">Note</div><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input" /></label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
            <button onClick={() => { addExpense({ ...form, date: todayISO() }); toast.success("Saved"); setOpen(false); setForm({ category: "Utilities", amount: 0, paidTo: "", method: "cash", note: "" }); }} disabled={!form.amount} className="px-5 py-2 rounded-lg bg-brand-gradient text-brand-foreground text-sm font-medium disabled:opacity-50">Save</button>
          </div>
          <style>{`.input{width:100%;height:38px;border:1px solid var(--border);border-radius:.5rem;background:var(--background);padding:0 .75rem;font-size:.875rem}`}</style>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

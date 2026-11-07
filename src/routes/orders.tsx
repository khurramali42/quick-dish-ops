import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { money, formatDateTime } from "@/lib/format";
import { useState } from "react";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import type { Order } from "@/lib/types";
import { Printer, Undo2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Orders — Spice Kitchen POS" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const { orders, settings, refundOrder } = useStore();
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [status, setStatus] = useState<"all" | "completed" | "refunded">("all");
  const shown = orders.filter((o) => status === "all" || o.status === status);

  const total = shown.reduce((s, o) => s + (o.status === "refunded" || o.status === "cancelled" ? 0 : o.total), 0);

  return (
    <AppLayout>
      <PageHeader title="Orders" subtitle={`${orders.length} orders · ${money(total, settings.currency)} in sales`} />

      <div className="card-elevated overflow-hidden">
        <div className="p-4 border-b flex gap-2">
          {(["all", "completed", "refunded"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-md text-sm capitalize ${status === s ? "bg-brand-gradient text-brand-foreground" : "hover:bg-accent"}`}>{s}</button>
          ))}
        </div>
        <div className="table-scroll"><table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Invoice</th>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-left px-4 py-2">Customer</th>
              <th className="text-left px-4 py-2">Cashier</th>
              <th className="text-right px-4 py-2">Total</th>
              <th className="text-center px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.map((o) => (
              <tr key={o.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono text-xs font-medium">{o.invoiceNo}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(o.createdAt)}</td>
                <td className="px-4 py-2.5">{o.orderType}{o.table ? ` · ${o.table}` : ""}</td>
                <td className="px-4 py-2.5">{o.customerName ?? "—"}</td>
                <td className="px-4 py-2.5">{o.cashier}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{money(o.total, settings.currency)}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === "refunded" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>{o.status}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => setReceipt(o)} className="p-1.5 rounded hover:bg-accent" title="Print"><Printer className="h-3.5 w-3.5" /></button>
                  {o.status !== "refunded" && (
                    <button onClick={() => { if (confirm("Refund this sale? It reverses customer totals but does not automatically restock prepared food. Adjust physical inventory manually if goods were actually returned.")) { refundOrder(o.id); toast.success("Refunded"); } }} className="p-1.5 rounded hover:bg-accent text-destructive" title="Refund"><Undo2 className="h-3.5 w-3.5" /></button>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={8} className="text-center text-muted-foreground py-16">No orders yet.</td></tr>}
          </tbody>
        </table></div>
      </div>

      <ReceiptDialog order={receipt} onClose={() => setReceipt(null)} />
    </AppLayout>
  );
}

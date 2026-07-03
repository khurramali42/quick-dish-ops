import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Order } from "@/lib/types";
import { money, formatDateTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Printer, X } from "lucide-react";

export function ReceiptDialog({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const { settings } = useStore();
  if (!order) return null;

  const doPrint = () => {
    const w = window.open("", "_blank", "width=380,height=700");
    if (!w) return;
    const html = document.getElementById("receipt-print")?.innerHTML ?? "";
    w.document.write(`<!doctype html><html><head><title>${order.invoiceNo}</title>
      <style>
        body{font-family:'JetBrains Mono',monospace;font-size:12px;padding:8px;color:#000}
        .center{text-align:center}.right{text-align:right}.b{font-weight:700}
        .hr{border-top:1px dashed #000;margin:6px 0}
        table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}
        h1{font-size:16px;margin:0}h2{font-size:13px;margin:2px 0}
      </style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold text-sm">Receipt · {order.invoiceNo}</div>
          <div className="flex gap-1">
            <button onClick={doPrint} className="px-3 py-1.5 text-xs rounded-md bg-brand-gradient text-brand-foreground flex items-center gap-1"><Printer className="h-3 w-3" /> Print</button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div id="receipt-print" className="p-4 bg-white text-black font-mono text-[11px] max-h-[70vh] overflow-y-auto">
          <div className="center">
            <h1 className="b">{settings.businessName}</h1>
            <div>{settings.branchName}</div>
            <div>{settings.address}</div>
            <div>Tel: {settings.phone}</div>
            {settings.taxNumber && <div>{settings.taxNumber}</div>}
          </div>
          <div className="hr" />
          <table>
            <tbody>
              <tr><td>Invoice</td><td className="right">{order.invoiceNo}</td></tr>
              <tr><td>Date</td><td className="right">{formatDateTime(order.createdAt)}</td></tr>
              <tr><td>Cashier</td><td className="right">{order.cashier}</td></tr>
              <tr><td>Type</td><td className="right">{order.orderType}{order.table ? ` · ${order.table}` : ""}</td></tr>
              {order.customerName && order.customerName !== "Walk-in" && <tr><td>Customer</td><td className="right">{order.customerName}</td></tr>}
            </tbody>
          </table>
          <div className="hr" />
          <table>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.lineId}>
                  <td>
                    <div>{i.name}</div>
                    <div>{i.qty} × {money(i.unitPrice, settings.currency)}{i.discount ? ` − ${money(i.discount, settings.currency)}` : ""}</div>
                    {i.note && <div>* {i.note}</div>}
                  </td>
                  <td className="right b">{money(i.unitPrice * i.qty - i.discount, settings.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="hr" />
          <table>
            <tbody>
              <tr><td>Subtotal</td><td className="right">{money(order.subtotal, settings.currency)}</td></tr>
              {order.itemDiscount > 0 && <tr><td>Item discount</td><td className="right">− {money(order.itemDiscount, settings.currency)}</td></tr>}
              {order.billDiscount > 0 && <tr><td>Bill discount</td><td className="right">− {money(order.billDiscount, settings.currency)}</td></tr>}
              <tr><td>Tax</td><td className="right">{money(order.tax, settings.currency)}</td></tr>
              {order.serviceCharge > 0 && <tr><td>Service</td><td className="right">{money(order.serviceCharge, settings.currency)}</td></tr>}
            </tbody>
          </table>
          <div className="hr" />
          <table>
            <tbody>
              <tr className="b"><td>TOTAL</td><td className="right">{money(order.total, settings.currency)}</td></tr>
              <tr><td>Paid ({order.paymentMethod})</td><td className="right">{money(order.paid, settings.currency)}</td></tr>
              <tr><td>Change</td><td className="right">{money(order.change, settings.currency)}</td></tr>
            </tbody>
          </table>
          <div className="hr" />
          <div className="center">{settings.receiptFooter}</div>
          <div className="center" style={{ marginTop: 8 }}>* * *</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

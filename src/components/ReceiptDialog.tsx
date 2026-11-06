import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Order, Settings } from "@/lib/types";
import { money, formatDateTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Printer } from "lucide-react";

/** One receipt component is used for both preview and printing. No popup is required. */
export function ReceiptDialog({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const settings = useStore((state) => state.settings);
  if (!order) return null;

  const printReceipt = () => {
    // The print-only copy is mounted directly under <body>, outside Radix's
    // transformed dialog, and works when popups are blocked.
    window.print();
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex max-h-[90dvh] max-w-sm flex-col gap-0 overflow-hidden p-0">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b py-3 pl-3 pr-12">
            <DialogTitle className="min-w-0 truncate text-sm font-semibold">Receipt · {order.invoiceNo}</DialogTitle>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={printReceipt} aria-label="Print receipt" className="flex items-center gap-1 rounded-md bg-brand-gradient px-3 py-2 text-xs font-semibold text-brand-foreground hover:brightness-105">
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto bg-muted/40 p-4">
            <ReceiptPaper order={order} settings={settings} />
          </div>
          <p className="shrink-0 border-t px-4 py-2 text-xs text-muted-foreground">
            Printer settings: choose {settings.receiptSize} paper and disable browser headers and footers.
          </p>
        </DialogContent>
      </Dialog>
      {typeof document !== "undefined" && createPortal(
        <div id="receipt-print-root" data-paper={settings.receiptSize} aria-hidden="true">
          <ReceiptPaper order={order} settings={settings} />
        </div>,
        document.body,
      )}
    </>
  );
}

function ReceiptPaper({ order, settings }: { order: Order; settings: Settings }) {
  return (
    <article className="receipt-paper mx-auto bg-white p-3 font-mono text-[11px] leading-5 text-black shadow-sm">
      <div className="text-center">
        <h2 className="text-base font-bold">{settings.businessName}</h2>
        <div>{settings.branchName}</div>
        <div className="whitespace-pre-wrap">{settings.address}</div>
        <div>Tel: {settings.phone}</div>
        {settings.taxNumber && <div>Tax No: {settings.taxNumber}</div>}
      </div>
      <div className="my-2 border-t border-dashed border-black" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-2">
        <dt>Invoice</dt><dd className="text-right">{order.invoiceNo}</dd>
        <dt>Date</dt><dd className="text-right">{formatDateTime(order.createdAt)}</dd>
        <dt>Cashier</dt><dd className="text-right">{order.cashier}</dd>
        <dt>Type</dt><dd className="text-right">{order.orderType}{order.table ? ` · ${order.table}` : ""}</dd>
        {order.customerName && order.customerName !== "Walk-in" && <><dt>Customer</dt><dd className="text-right">{order.customerName}</dd></>}
      </dl>
      <div className="my-2 border-t border-dashed border-black" />
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr><th className="w-[67%] text-left font-semibold">Description</th><th className="text-right font-semibold">Amount</th></tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.lineId} className="align-top">
              <td className="break-words py-1 pr-2">
                <div className="font-semibold">{item.name}</div>
                <div>{item.qty} × {money(item.unitPrice, settings.currency)}{item.discount ? ` − ${money(item.discount, settings.currency)}` : ""}</div>
                {item.note && <div className="break-words italic">Note: {item.note}</div>}
              </td>
              <td className="py-1 text-right font-semibold">{money(item.unitPrice * item.qty - item.discount, settings.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="my-2 border-t border-dashed border-black" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-2">
        <dt>Subtotal</dt><dd className="text-right">{money(order.subtotal, settings.currency)}</dd>
        {order.itemDiscount > 0 && <><dt>Item discount</dt><dd className="text-right">− {money(order.itemDiscount, settings.currency)}</dd></>}
        {order.billDiscount > 0 && <><dt>Bill discount</dt><dd className="text-right">− {money(order.billDiscount, settings.currency)}</dd></>}
        <dt>Tax</dt><dd className="text-right">{money(order.tax, settings.currency)}</dd>
        {order.serviceCharge > 0 && <><dt>Service</dt><dd className="text-right">{money(order.serviceCharge, settings.currency)}</dd></>}
        {order.deliveryCharge > 0 && <><dt>Delivery</dt><dd className="text-right">{money(order.deliveryCharge, settings.currency)}</dd></>}
      </dl>
      <div className="my-2 border-t border-dashed border-black" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-sm font-bold">
        <dt>TOTAL</dt><dd className="text-right">{money(order.total, settings.currency)}</dd>
      </dl>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2">
        <dt>Paid ({order.paymentMethod})</dt><dd className="text-right">{money(order.paid, settings.currency)}</dd>
        <dt>Change</dt><dd className="text-right">{money(order.change, settings.currency)}</dd>
      </dl>
      {order.status === "refunded" && <div className="mt-2 border border-black p-2 text-center font-bold">REFUNDED</div>}
      <div className="my-2 border-t border-dashed border-black" />
      <div className="whitespace-pre-wrap text-center">{settings.receiptFooter}</div>
      <div className="mt-2 text-center">* * *</div>
    </article>
  );
}

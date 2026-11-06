import { useState } from "react";
import { AlertTriangle, Archive, Clock3, CreditCard, PauseCircle, Play, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore, cartTotals } from "@/lib/store";
import { money, formatDateTime } from "@/lib/format";
import type { ParkedOrder, ParkedOrderStatus } from "@/lib/types";

type View = "active" | "pending" | "history";

export function ParkedOrdersDialog({ open, onClose, onResume }: { open: boolean; onClose: () => void; onResume: (id: string) => void }) {
  const heldOrders = useStore((s) => s.heldOrders);
  const history = useStore((s) => s.parkedHistory);
  const currentCart = useStore((s) => s.cart);
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);
  const setParkedStatus = useStore((s) => s.setParkedStatus);
  const removeParkedHistory = useStore((s) => s.removeParkedHistory);
  const [view, setView] = useState<View>("active");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [historyVisible, setHistoryVisible] = useState(true);

  const pendingCount = heldOrders.filter((h) => h.status === "pending-payment").length;
  const heldCount = heldOrders.length - pendingCount;
  const records = view === "history" ? (historyVisible ? history : []) :
    heldOrders.filter((h) => view === "pending" ? h.status === "pending-payment" : h.status !== "pending-payment");

  const changeStatus = (id: string, status: ParkedOrderStatus, detail?: string) => {
    try {
      setParkedStatus(id, status, detail);
      toast.success(status === "ignored" ? "Order moved out of active list" : status === "cancelled" ? "Order cancelled and recorded in history" : "Order status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update order");
    }
  };

  const resume = (id: string) => {
    if (currentCart.length) {
      toast.error("Current cart has items. Hold or checkout this order before resuming.");
      return;
    }
    try {
      onResume(id);
      onClose();
      toast.success("Saved order restored to cart");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to resume order");
    }
  };

  const cancel = () => {
    if (!cancelId) return;
    if (!reason.trim()) {
      toast.error("Enter a reason to cancel this order.");
      return;
    }
    changeStatus(cancelId, "cancelled", reason);
    setCancelId(null);
    setReason("");
  };

  const removeFromHistory = (id: string) => {
    if (!window.confirm("Permanently remove this cancelled/ignored order from local history? This cannot be undone.")) return;
    removeParkedHistory(id);
    toast.success("History entry removed from this browser");
  };

  const orderTotal = (item: ParkedOrder) => cartTotals(item.cart, item.billDiscount ?? 0, settings.serviceChargePct).total;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setCancelId(null); setReason(""); onClose(); } }}>
      <DialogContent className="flex h-[min(92dvh,850px)] w-[min(96vw,960px)] max-w-[960px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b bg-gradient-to-r from-orange-50 to-card px-5 py-4 dark:from-accent dark:to-card">
          <DialogTitle className="text-xl font-extrabold">Parked Orders</DialogTitle>
          <p className="text-sm text-muted-foreground">Save a customer order once, serve the next customer, and resume later without rebuilding the cart.</p>
        </DialogHeader>
        <div className="grid shrink-0 grid-cols-3 gap-2 border-b bg-card p-3">
          <button type="button" onClick={() => { setView("active"); setCancelId(null); }} className={`rounded-xl border px-2 py-3 text-sm font-bold ${view === "active" ? "border-orange-300 bg-orange-100 text-orange-900 dark:bg-accent dark:text-accent-foreground" : "bg-secondary hover:bg-accent"}`}>
            <PauseCircle className="mr-1 inline h-4 w-4" /> Held ({heldCount})
          </button>
          <button type="button" onClick={() => { setView("pending"); setCancelId(null); }} className={`rounded-xl border px-2 py-3 text-sm font-bold ${view === "pending" ? "border-orange-300 bg-orange-100 text-orange-900 dark:bg-accent dark:text-accent-foreground" : "bg-secondary hover:bg-accent"}`}>
            <CreditCard className="mr-1 inline h-4 w-4" /> Payment Pending ({pendingCount})
          </button>
          <button type="button" onClick={() => { setView("history"); setCancelId(null); }} className={`rounded-xl border px-2 py-3 text-sm font-bold ${view === "history" ? "border-orange-300 bg-orange-100 text-orange-900 dark:bg-accent dark:text-accent-foreground" : "bg-secondary hover:bg-accent"}`}>
            <Archive className="mr-1 inline h-4 w-4" /> History ({history.length})
          </button>
        </div>
        {view === "history" && (
          <div className="flex items-center justify-between border-b bg-card px-4 py-2 text-sm">
            <span className="text-muted-foreground">Cancelled and ignored orders (not counted as sales)</span>
            <button type="button" className="rounded-lg border px-3 py-1.5 font-semibold hover:bg-accent" onClick={() => setHistoryVisible((v) => !v)}>{historyVisible ? "Hide history" : "Show history"}</button>
          </div>
        )}
        {currentCart.length > 0 && view !== "history" && (
          <div role="alert" className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-secondary dark:text-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" /> Active cart contains {currentCart.length} item lines. Hold or finish it before resuming another order.
          </div>
        )}
        <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto bg-background p-3 sm:p-4">
          {records.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">{view === "history" ? "No archived history to display." : "No orders in this queue."}</div>
          ) : records.map((item) => {
            const customer = customers.find((c) => c.id === item.customerId);
            const units = item.cart.reduce((n, p) => n + p.qty, 0);
            return (
              <article key={item.id} className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold">{item.id}</span>
                      <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold">{item.status === "pending-payment" ? "Payment Pending" : item.status === "cancelled" ? "Cancelled" : item.status === "ignored" ? "Ignored" : "Held"}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium">{customer?.name ?? "Walk-in customer"} · {item.orderType}{item.table ? ` · Table ${item.table}` : ""}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> {formatDateTime(item.at)} · {item.cashier ?? "Cashier"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{item.cart.length} lines · {units} units</div>
                    <div className="mt-1 text-xl font-extrabold tabular-nums">{money(orderTotal(item), settings.currency)}</div>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                  {item.cart.map((line) => `${line.qty}× ${line.name}`).join(" · ")}
                </div>
                {item.reason && <p className="mt-2 text-xs text-muted-foreground">Reason: {item.reason}</p>}
                {view !== "history" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" disabled={currentCart.length > 0} onClick={() => resume(item.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand-gradient px-4 text-sm font-bold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-40"><Play className="h-4 w-4" /> Resume</button>
                    <button type="button" onClick={() => changeStatus(item.id, item.status === "pending-payment" ? "held" : "pending-payment")} className="min-h-10 rounded-lg border bg-secondary px-3 text-sm font-semibold hover:bg-accent">{item.status === "pending-payment" ? "Move to Held" : "Mark Payment Pending"}</button>
                    <button type="button" onClick={() => { setCancelId(item.id); setReason(""); }} className="min-h-10 rounded-lg border px-3 text-sm font-semibold text-destructive hover:bg-accent"><XCircle className="mr-1 inline h-4 w-4" /> Cancel</button>
                    <button type="button" onClick={() => { if (window.confirm("Ignore this order? It will leave the active queue and remain in history.")) changeStatus(item.id, "ignored", "Ignored by cashier"); }} className="min-h-10 rounded-lg border px-3 text-sm font-semibold hover:bg-accent">Ignore</button>
                  </div>
                ) : (
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={() => removeFromHistory(item.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-destructive/40 px-3 text-sm font-semibold text-destructive hover:bg-accent"><Trash2 className="h-4 w-4" /> Remove from local history</button>
                  </div>
                )}
                {cancelId === item.id && view !== "history" && (
                  <div className="mt-3 rounded-lg border border-destructive/30 bg-secondary p-3">
                    <label className="block text-sm font-semibold">Reason for cancellation
                      <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer left / payment not received…" className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 text-sm" />
                    </label>
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setCancelId(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Back</button>
                      <button type="button" onClick={cancel} disabled={!reason.trim()} className="rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-50">Confirm Cancel</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <div className="shrink-0 border-t bg-card px-4 py-3 text-xs text-muted-foreground">
          This is a browser-local demo. Parked orders are not paid sales; no payment or tax invoice is finalized until checkout.
        </div>
      </DialogContent>
    </Dialog>
  );
}

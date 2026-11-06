import { useEffect, useMemo, useState } from "react";
import { CreditCard, Minus, Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore, cartTotals } from "@/lib/store";
import { money } from "@/lib/format";
import type { CartItem } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function CartReviewDialog({ open, onClose, onCheckout }: Props) {
  const cart = useStore((s) => s.cart);
  const replaceCart = useStore((s) => s.replaceCart);
  const products = useStore((s) => s.products);
  const billDiscount = useStore((s) => s.billDiscount);
  const settings = useStore((s) => s.settings);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CartItem[]>([]);

  useEffect(() => {
    if (open) {
      setDraft(cart.map((item) => ({ ...item })));
      setEditing(false);
    }
    // Deliberately take a snapshot only on open, not during edits.
  }, [open]);

  const displayedItems = editing ? draft : cart;
  const totals = useMemo(
    () => cartTotals(displayedItems, billDiscount, settings.serviceChargePct),
    [displayedItems, billDiscount, settings.serviceChargePct],
  );
  const units = displayedItems.reduce((sum, item) => sum + item.qty, 0);
  const changeItem = (lineId: string, change: Partial<CartItem>) =>
    setDraft((items) => items.map((item) => item.lineId === lineId ? { ...item, ...change } : item));

  const save = () => {
    try {
      replaceCart(draft);
      setEditing(false);
      toast.success("Order changes saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Order changes could not be saved");
    }
  };
  const cancelEdit = () => {
    setDraft(cart.map((item) => ({ ...item })));
    setEditing(false);
  };
  const close = () => {
    if (editing) cancelEdit();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}>
      <DialogContent className="flex h-[min(96dvh,960px)] w-[min(98vw,1180px)] max-w-[1180px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b bg-gradient-to-r from-orange-50 via-amber-50/40 to-card px-4 py-2.5 pr-12 dark:from-orange-950/25 dark:via-card sm:px-5">
          <DialogTitle className="text-xl font-extrabold">Full Order Review</DialogTitle>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 dark:border-orange-900 dark:bg-accent">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-700 dark:text-orange-300">Products</p>
              <p className="text-2xl font-extrabold tabular-nums">{displayedItems.length}</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 dark:border-sky-900 dark:bg-secondary">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">Total quantity</p>
              <p className="text-2xl font-extrabold tabular-nums">{units}</p>
            </div>

          </div>
        </DialogHeader>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
          <span className="text-sm font-semibold">{editing ? "Editing order: Save Changes to apply" : "Order details"}</span>
          {editing ? (
            <div className="flex gap-2">
              <button type="button" onClick={cancelEdit} className="min-h-11 rounded-lg border bg-card px-4 text-sm font-semibold">Cancel Edit</button>
              <button type="button" onClick={save} className="min-h-11 rounded-lg bg-brand-gradient px-4 text-sm font-semibold text-brand-foreground">Save Changes</button>
            </div>
          ) : (
            <button type="button" onClick={() => { setDraft(cart.map((item) => ({ ...item }))); setEditing(true); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-800 hover:bg-orange-100 dark:border-orange-900 dark:bg-accent dark:text-orange-200">
              <Pencil className="h-4 w-4" /> Edit Order
            </button>
          )}
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/80 p-2.5 dark:bg-background sm:p-3">
          {displayedItems.length === 0 ? (
            <div className="p-12 text-center text-base text-muted-foreground">No items in this order.</div>
          ) : (
            <div className="space-y-2">
              {displayedItems.map((item, index) => {
                const product = products.find((p) => p.id === item.productId);
                const lineAmount = Math.max(0, item.unitPrice * item.qty - item.discount);
                return (
                  <div key={item.lineId} className="overflow-hidden rounded-xl border border-orange-100 bg-white p-2.5 shadow-sm dark:border-orange-900/50 dark:bg-card sm:p-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_145px_155px_165px] sm:items-center">
                      <div className="col-span-2 min-w-0 rounded-lg border border-orange-100 bg-orange-50/70 px-3 py-2 dark:border-orange-900/40 dark:bg-accent sm:col-span-1">
                        <div className="break-words text-base font-extrabold leading-snug sm:text-lg"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200">{index + 1}</span>{item.name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">Tax {item.taxRate}%</div>
                      </div>
                      <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-900 dark:bg-secondary">
                        <span className="mb-1 block text-xs font-bold uppercase text-sky-700 dark:text-sky-300">Quantity</span>
                        {editing ? (
                          <div className="flex items-center rounded-lg border">
                            <button type="button" aria-label={`Decrease quantity of ${item.name}`} onClick={() => changeItem(item.lineId, { qty: Math.max(1, item.qty - 1), discount: Math.min(item.discount, item.unitPrice * Math.max(1, item.qty - 1)) })} className="flex h-11 w-9 items-center justify-center hover:bg-accent"><Minus className="h-4 w-4" /></button>
                            <span className="min-w-8 text-center text-base font-bold tabular-nums">{item.qty}</span>
                            <button type="button" aria-label={`Increase quantity of ${item.name}`} disabled={!!product?.trackStock && draft.filter((i) => i.productId === product.id).reduce((sum, i) => sum + i.qty, 0) >= product.stock} onClick={() => changeItem(item.lineId, { qty: item.qty + 1 })} className="flex h-11 w-9 items-center justify-center hover:bg-accent disabled:opacity-30"><Plus className="h-4 w-4" /></button>
                          </div>
                        ) : <span className="inline-flex rounded-lg bg-white px-4 py-2 text-2xl font-extrabold tabular-nums shadow-sm dark:bg-card">× {item.qty}</span>}
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-border dark:bg-secondary">
                        <div className="text-xs font-bold uppercase text-muted-foreground">Unit price</div>
                        <div className="mt-1 text-base font-bold tabular-nums">{money(item.unitPrice, settings.currency)}</div>
                        {editing ? (
                          <label className="mt-1 block text-xs text-muted-foreground">Discount
                            <input aria-label={`Discount for ${item.name}`} type="number" min={0} max={item.unitPrice * item.qty} value={item.discount} onChange={(event) => changeItem(item.lineId, { discount: Math.min(item.unitPrice * item.qty, Math.max(0, Number(event.target.value) || 0)) })} className="mt-1 h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base font-semibold tabular-nums" />
                          </label>
                        ) : item.discount > 0 && <div className="mt-1 text-sm text-muted-foreground">Discount: {money(item.discount, settings.currency)}</div>}
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-secondary">
                        <span className="mb-1 block text-xs font-bold uppercase text-amber-800 dark:text-amber-300">Line total</span>
                        <span className="break-words text-lg font-extrabold tabular-nums">{money(lineAmount, settings.currency)}</span>
                      </div>
                    </div>
                    {editing ? (
                      <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-orange-100 bg-slate-50 p-2 dark:border-orange-900/40 dark:bg-secondary">
                        <label className="min-w-0 flex-1 text-xs text-muted-foreground">Kitchen note
                          <input value={item.note ?? ""} onChange={(event) => changeItem(item.lineId, { note: event.target.value })} placeholder="Optional instructions" className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm" />
                        </label>
                        <button type="button" aria-label={`Remove ${item.name}`} onClick={() => setDraft((items) => items.filter((i) => i.lineId !== item.lineId))} className="mt-4 flex h-11 w-11 items-center justify-center rounded-lg border text-destructive hover:bg-accent"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ) : item.note ? <div className="mt-3 border-t pt-2 text-sm text-muted-foreground">Note: {item.note}</div> : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="shrink-0 border-t bg-card px-4 py-3 shadow-[0_-8px_24px_-20px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span>Subtotal <strong className="text-foreground tabular-nums">{money(totals.subtotal, settings.currency)}</strong></span>
              <span>Discount <strong className="text-foreground tabular-nums">{money(totals.itemDiscount + totals.appliedBillDiscount, settings.currency)}</strong></span>
              <span>Tax & service <strong className="text-foreground tabular-nums">{money(totals.tax + totals.serviceCharge, settings.currency)}</strong></span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-orange-900 dark:bg-accent dark:text-orange-100">
              <span className="text-sm font-bold">Grand total</span>
              <span className="text-xl font-extrabold tabular-nums">{money(totals.total, settings.currency)}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={close} className="min-h-11 rounded-lg border px-5 text-sm font-semibold">{editing ? "Discard & Close" : "Close"}</button>
            <button type="button" disabled={editing || cart.length === 0} onClick={() => { onClose(); onCheckout(); }} className="flex min-h-11 items-center gap-2 rounded-lg bg-brand-gradient px-6 text-sm font-bold text-brand-foreground disabled:opacity-50">
              <CreditCard className="h-4 w-4" /> Continue to Checkout
            </button>
          </div>
          {editing && <p className="mt-2 text-right text-xs text-muted-foreground">Save Changes first to enable checkout. Cancel Edit discards uncommitted edits.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

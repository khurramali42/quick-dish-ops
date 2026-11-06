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
      <DialogContent className="flex h-[min(92dvh,820px)] w-[min(96vw,1100px)] max-w-[1100px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-4 pr-12">
          <DialogTitle className="text-xl font-bold">Full Order Review</DialogTitle>
          <p className="text-sm text-muted-foreground">{displayedItems.length} items · {units} total units · Review everything before checkout</p>
        </DialogHeader>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-5 py-3">
          <span className="text-sm font-semibold">{editing ? "Editing order: Save Changes to apply" : "Order details"}</span>
          {editing ? (
            <div className="flex gap-2">
              <button type="button" onClick={cancelEdit} className="min-h-11 rounded-lg border bg-card px-4 text-sm font-semibold">Cancel Edit</button>
              <button type="button" onClick={save} className="min-h-11 rounded-lg bg-brand-gradient px-4 text-sm font-semibold text-brand-foreground">Save Changes</button>
            </div>
          ) : (
            <button type="button" onClick={() => { setDraft(cart.map((item) => ({ ...item }))); setEditing(true); }} className="flex min-h-11 items-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-accent">
              <Pencil className="h-4 w-4" /> Edit Order
            </button>
          )}
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
          {displayedItems.length === 0 ? (
            <div className="p-12 text-center text-base text-muted-foreground">No items in this order.</div>
          ) : (
            <div className="space-y-3">
              <div className="hidden grid-cols-[minmax(0,1fr)_110px_135px_140px] gap-3 px-4 text-sm font-bold text-muted-foreground md:grid">
                <span>Product</span><span>Quantity</span><span>Unit / Discount</span><span className="text-right">Line total</span>
              </div>
              {displayedItems.map((item, index) => {
                const product = products.find((p) => p.id === item.productId);
                const lineAmount = Math.max(0, item.unitPrice * item.qty - item.discount);
                return (
                  <div key={item.lineId} className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_135px_140px] md:items-center">
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold leading-snug sm:text-base">{index + 1}. {item.name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">Tax {item.taxRate}%</div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-1">
                        <span className="text-sm text-muted-foreground md:hidden">Qty</span>
                        {editing ? (
                          <div className="flex items-center rounded-lg border">
                            <button type="button" aria-label={`Decrease quantity of ${item.name}`} onClick={() => changeItem(item.lineId, { qty: Math.max(1, item.qty - 1), discount: Math.min(item.discount, item.unitPrice * Math.max(1, item.qty - 1)) })} className="flex h-11 w-9 items-center justify-center hover:bg-accent"><Minus className="h-4 w-4" /></button>
                            <span className="min-w-8 text-center text-base font-bold tabular-nums">{item.qty}</span>
                            <button type="button" aria-label={`Increase quantity of ${item.name}`} disabled={!!product?.trackStock && draft.filter((i) => i.productId === product.id).reduce((sum, i) => sum + i.qty, 0) >= product.stock} onClick={() => changeItem(item.lineId, { qty: item.qty + 1 })} className="flex h-11 w-9 items-center justify-center hover:bg-accent disabled:opacity-30"><Plus className="h-4 w-4" /></button>
                          </div>
                        ) : <span className="rounded-lg bg-accent px-4 py-2 text-lg font-extrabold tabular-nums">× {item.qty}</span>}
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold tabular-nums">{money(item.unitPrice, settings.currency)}</div>
                        {editing ? (
                          <label className="mt-1 block text-xs text-muted-foreground">Discount
                            <input aria-label={`Discount for ${item.name}`} type="number" min={0} max={item.unitPrice * item.qty} value={item.discount} onChange={(event) => changeItem(item.lineId, { discount: Math.min(item.unitPrice * item.qty, Math.max(0, Number(event.target.value) || 0)) })} className="mt-1 h-10 w-full rounded-lg border bg-background px-2 text-sm" />
                          </label>
                        ) : item.discount > 0 && <div className="mt-1 text-sm text-muted-foreground">Discount: {money(item.discount, settings.currency)}</div>}
                      </div>
                      <div className="flex items-center justify-between gap-2 md:justify-end">
                        <span className="text-sm text-muted-foreground md:hidden">Line total</span>
                        <span className="text-base font-extrabold tabular-nums">{money(lineAmount, settings.currency)}</span>
                      </div>
                    </div>
                    {editing ? (
                      <div className="mt-3 flex items-center gap-3 border-t pt-3">
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
        <div className="shrink-0 border-t bg-card p-4 shadow-[0_-8px_24px_-20px_rgba(0,0,0,0.35)] sm:px-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <div><span className="text-muted-foreground">Subtotal</span><div className="font-semibold tabular-nums">{money(totals.subtotal, settings.currency)}</div></div>
            <div><span className="text-muted-foreground">Discounts</span><div className="font-semibold tabular-nums">{money(totals.itemDiscount + totals.appliedBillDiscount, settings.currency)}</div></div>
            <div><span className="text-muted-foreground">Tax & service</span><div className="font-semibold tabular-nums">{money(totals.tax + totals.serviceCharge, settings.currency)}</div></div>
            <div><span className="text-muted-foreground">Grand Total</span><div className="text-xl font-extrabold tabular-nums">{money(totals.total, settings.currency)}</div></div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
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

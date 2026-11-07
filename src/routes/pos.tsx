import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore, useCartTotals } from "@/lib/store";
import { money } from "@/lib/format";
import type { OrderType, PaymentMethod, Product } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, X, Plus, Minus, ChevronLeft, ChevronRight, Trash2, Pause, Play, Printer, Percent, CreditCard, ClipboardList, Clock3, CheckCircle2,
  Utensils, Bike, ShoppingBag, Truck, Keyboard, User, StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { ParkedOrdersDialog } from "@/components/ParkedOrdersDialog";
import { CartReviewDialog } from "@/components/CartReviewDialog";
import { ProductThumb } from "@/components/ImageUpload";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/pos")({
  head: () => ({ meta: [{ title: "POS — Spice Kitchen" }] }),
  component: POSScreen,
});

const orderTypes: { key: OrderType; label: string; icon: any }[] = [
  { key: "dine-in", label: "Dine-in", icon: Utensils },
  { key: "takeaway", label: "Takeaway", icon: ShoppingBag },
  { key: "delivery", label: "Delivery", icon: Bike },
  { key: "pickup", label: "Pickup", icon: Truck },
];

function POSScreen() {
  const {
    products, categories, activeCategory, setCategory, search, setSearch,
    cart, addToCart, updateQty, removeLine, clearCart, updateItemDiscount, updateNote,
    orderType, setOrderType, table, setTable, customerId, setCustomer, customers,
    billDiscount, setBillDiscount, heldOrders, holdOrder, recallOrder,
    settings, checkout, currentCashier, orders,
  } = useStore();
  const totals = useCartTotals();
  const [payOpen, setPayOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [parkStatus, setParkStatus] = useState<"held" | "pending-payment" | null>(null);
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [mobilePane, setMobilePane] = useState<"menu" | "cart">("menu");
  const [queueFilter, setQueueFilter] = useState<"all" | "held" | "ready">("all");
  const [selectedPastOrder, setSelectedPastOrder] = useState<Order | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Convert vertical mouse-wheel movement into horizontal scrolling only
  // when the pointer is over the overflowing category strip.
  useEffect(() => {
    const strip = categoryScrollRef.current;
    if (!strip) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (strip.scrollWidth <= strip.clientWidth + 1) return;
      const maxLeft = strip.scrollWidth - strip.clientWidth;
      const nextLeft = Math.min(maxLeft, Math.max(0, strip.scrollLeft + event.deltaY));
      if (Math.abs(nextLeft - strip.scrollLeft) < 0.5) return; // allow page scroll at edges
      event.preventDefault();
      strip.scrollLeft = nextLeft;
    };
    strip.addEventListener("wheel", onWheel, { passive: false });
    return () => strip.removeEventListener("wheel", onWheel);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => p.available
      && (activeCategory === "all" || p.categoryId === activeCategory)
      && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)));
  }, [products, activeCategory, search]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditing = !!target?.closest("input, textarea, select, [contenteditable]");
      if (isEditing && e.key !== "Escape" && e.key !== "F1") return;
      if (e.key === "F1") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "F2") { e.preventDefault(); clearCart(); toast("New order started"); }
      else if (e.key === "F3") { e.preventDefault(); if (cart.length) setParkStatus("held"); }
      else if (e.key === "F4") { e.preventDefault(); setHeldOpen(true); }
      else if (e.key === "F5") { e.preventDefault(); if (cart.length) setPayOpen(true); }
      else if (e.key === "?" && e.shiftKey) { e.preventDefault(); setHelpOpen(true); }
      else if (e.key === "Escape") { setPayOpen(false); setHelpOpen(false); setHeldOpen(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart, clearCart, holdOrder]);

  return (
    <AppLayout fullBleed>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Cashier workspace: order mode above product search, with independent scroll panes. */}
        <div className="shrink-0 border-b bg-card px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-base font-extrabold tracking-tight">Cashier Workspace <span className="ml-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-brand dark:bg-accent">POS</span></div>
              <p className="text-[11px] text-muted-foreground">Manage orders, menu and billing in one place</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { if (cart.length) { if (confirm("Clear the current order and start a new one?")) clearCart(); } else clearCart(); setMobilePane("menu"); }} className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-gradient px-3 text-xs font-bold text-brand-foreground"><Plus className="h-3.5 w-3.5" /> New Order</button>
              <button onClick={() => setHeldOpen(true)} className="flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold hover:bg-accent"><ClipboardList className="h-3.5 w-3.5" /> Saved <span className="rounded-full bg-muted px-1.5">{heldOrders.length}</span></button>
            </div>
          </div>
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted/65 p-1">
              {orderTypes.map((t) => {
                const Icon = t.icon;
                const active = orderType === t.key;
                return <button key={t.key} onClick={() => setOrderType(t.key)} aria-pressed={active} className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${active ? "bg-card text-brand shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-card/80"}`}><Icon className="h-3.5 w-3.5" /> {t.label}</button>;
              })}
            </div>
            {orderType === "dine-in" && <select aria-label="Choose table" value={table ?? ""} onChange={(e) => setTable(e.target.value || undefined)} className="h-9 min-w-[110px] rounded-lg border bg-background px-2 text-xs"><option value="">Select Table</option>{Array.from({ length: 12 }, (_, i) => `T${i + 1}`).map((t) => <option key={t} value={t}>{t}</option>)}</select>}
            <select aria-label="Choose customer" value={customerId ?? ""} onChange={(e) => setCustomer(e.target.value || undefined)} className="h-9 min-w-[130px] max-w-[180px] rounded-lg border bg-background px-2 text-xs"><option value="">Walk-in customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or scan barcode (F1)" aria-label="Search products" className="h-9 w-full rounded-lg border bg-background pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
              {search && <button aria-label="Clear product search" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-b bg-card px-3 py-2 md:hidden">
          <button type="button" onClick={() => setMobilePane("menu")} className={mobilePane === "menu" ? "flex-1 rounded-lg bg-brand-gradient px-3 py-2 text-sm font-semibold text-brand-foreground" : "flex-1 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-foreground"}>Menu</button>
          <button type="button" onClick={() => setMobilePane("cart")} className={mobilePane === "cart" ? "flex-1 rounded-lg bg-brand-gradient px-3 py-2 text-sm font-semibold text-brand-foreground" : "flex-1 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-foreground"}>Order ({cart.reduce((n, item) => n + item.qty, 0)})</button>
        </div>
        {/* Every pane has an independent scroll area. */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Desktop order queue. Clicking a saved ticket safely resumes it only when the current cart is empty. */}
          <aside aria-label="Order queue" className="hidden min-h-0 w-[205px] shrink-0 flex-col border-r bg-card xl:flex 2xl:w-[240px]">
            <div className="shrink-0 border-b px-3 py-3">
              <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">Order List</h2><span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-brand">{heldOrders.length + orders.length}</span></div>
              <div className="mt-2 flex gap-1">
                {(["all", "held", "ready"] as const).map((filter) => <button key={filter} onClick={() => setQueueFilter(filter)} className={`flex-1 rounded-md px-1.5 py-1.5 text-[11px] font-semibold capitalize ${queueFilter === filter ? "bg-orange-50 text-brand dark:bg-accent" : "text-muted-foreground hover:bg-muted"}`}>{filter === "held" ? "Pending" : filter}</button>)}
              </div>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
              {(queueFilter !== "ready") && [...heldOrders].reverse().map((held) => (
                <button key={held.id} type="button" onClick={() => { try { recallOrder(held.id); toast.success("Order resumed"); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not resume order"); } }} className="w-full rounded-lg border border-orange-200 bg-orange-50/40 p-3 text-left transition hover:border-brand hover:bg-orange-50 dark:border-border dark:bg-accent/20">
                  <div className="flex items-center justify-between gap-1"><span className="truncate text-xs font-extrabold">#{held.id.slice(-6)}</span><span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">{held.status === "pending-payment" ? "Payment" : "Held"}</span></div>
                  <div className="mt-1 text-[11px] capitalize text-muted-foreground">{held.orderType}{held.table ? " · " + held.table : ""}</div>
                  <div className="mt-2 text-[11px] font-semibold">{held.cart.reduce((n, item) => n + item.qty, 0)} items <span className="float-right text-brand">Resume</span></div>
                </button>
              ))}
              {orders.filter((order) => queueFilter === "all" || (queueFilter === "ready" && order.kitchenStatus === "ready")).slice(0, 30).map((order) => (
                <button key={order.id} type="button" onClick={() => setSelectedPastOrder(order)} className="w-full rounded-lg border bg-background p-3 text-left transition hover:border-brand/40 hover:shadow-sm">
                  <div className="flex items-center justify-between gap-1"><span className="truncate text-xs font-extrabold">{order.invoiceNo}</span><span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${order.kitchenStatus === "ready" ? "bg-emerald-100 text-emerald-800" : order.kitchenStatus === "preparing" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"}`}>{order.kitchenStatus === "ready" ? "Ready" : order.kitchenStatus === "preparing" ? "Preparing" : order.status}</span></div>
                  <div className="mt-1 text-[11px] capitalize text-muted-foreground">{order.orderType}{order.table ? " · " + order.table : ""}</div>
                  <div className="mt-2 flex justify-between text-[11px]"><span>{order.items.reduce((n, i) => n + i.qty, 0)} items</span><span className="font-bold">{money(order.total, settings.currency)}</span></div>
                </button>
              ))}
              {heldOrders.length === 0 && orders.length === 0 && <div className="px-2 py-12 text-center text-xs text-muted-foreground"><ClipboardList className="mx-auto mb-2 h-7 w-7 opacity-40" />No orders yet. Save an order to see it here.</div>}
            </div>
            <button onClick={() => setHeldOpen(true)} className="shrink-0 border-t px-3 py-3 text-xs font-bold text-brand hover:bg-accent">Manage saved orders</button>
          </aside>
          <div className={mobilePane === "menu" ? "flex min-h-0 min-w-0 flex-1 overflow-hidden md:flex" : "hidden min-h-0 min-w-0 flex-1 overflow-hidden md:flex"}>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Category filters have a visible themed horizontal scrollbar and accessible arrow controls. */}
          <div className="flex min-w-0 shrink-0 items-stretch border-b bg-card">
            <button type="button" aria-label="Scroll categories left" onClick={() => categoryScrollRef.current?.scrollBy({ left: -280, behavior: "smooth" })} className="shrink-0 border-r px-1.5 text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring sm:px-2">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div ref={categoryScrollRef} aria-label="Product categories" tabIndex={0} className="pos-menu-tabs flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain px-2 py-2 sm:px-3">
              <CatBtn active={activeCategory === "all"} onClick={() => setCategory("all")} icon="🍽️" label="All Items" />
              {categories.filter((c) => c.active).map((c) => (
                <CatBtn key={c.id} active={activeCategory === c.id} onClick={() => setCategory(c.id)} icon={c.icon} label={c.name} />
              ))}
            </div>
            <button type="button" aria-label="Scroll categories right" onClick={() => categoryScrollRef.current?.scrollBy({ left: 280, behavior: "smooth" })} className="shrink-0 border-l px-1.5 text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring sm:px-2">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Product grid */}
          <div className="scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-background p-2.5 sm:p-3 xl:p-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-3 xl:gap-3.5">
              {filtered.map((p) => <ProductCard key={p.id} product={p} onSelect={() => addToCart(p)} />)}
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-16">No items match.</div>
              )}
            </div>
          </div>
          </div>

          </div>
          {/* Current order with pinned totals. */}
          <section aria-label="Current order" className={mobilePane === "cart" ? "flex min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden border-l bg-card md:flex md:w-[290px] lg:w-[310px] xl:w-[310px] 2xl:w-[350px]" : "hidden min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden border-l bg-card md:flex md:w-[310px] lg:w-[340px] xl:w-[380px] 2xl:w-[400px]"}>
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3.5">
              <div>
                <div className="text-base font-bold">Current Order</div>
                <div className="text-xs text-muted-foreground">
                  {orderType}{table ? ` · ${table}` : ""} · {cart.reduce((n, item) => n + item.qty, 0)} units
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setReviewOpen(true)} className="mr-1 rounded-lg bg-accent px-2.5 py-2 text-sm font-bold text-brand hover:bg-orange-100">View All</button>
                <IconBtn title="Hold (F3)" onClick={() => { if (cart.length) setParkStatus("held"); }}><Pause className="h-4 w-4" /></IconBtn>
                <IconBtn title="Parked orders (F4)" onClick={() => setHeldOpen(true)}>
                  <Play className="h-4 w-4" />
                  {heldOrders.length > 0 && <span className="ml-1 text-[10px] bg-brand-gradient text-brand-foreground rounded-full px-1.5">{heldOrders.length}</span>}
                </IconBtn>
                <IconBtn title="Clear" onClick={() => cart.length && clearCart()}><Trash2 className="h-4 w-4" /></IconBtn>
              </div>
            </div>

            <div aria-label="Order line items" tabIndex={0} className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 focus-visible:outline-2 focus-visible:outline-ring">
              {cart.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-12">
                  <div className="text-4xl mb-2">🛒</div>
                  Cart is empty. Tap an item to add.
                </div>
              ) : cart.map((item) => (
                <div key={item.lineId} className="rounded-lg border-b bg-background p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.025)]">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold leading-snug break-words">{item.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{money(item.unitPrice, settings.currency)} · Tax {item.taxRate}%</div>
                    </div>
                    <button onClick={() => removeLine(item.lineId)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center border rounded-md">
                      <button onClick={() => item.qty > 1 ? updateQty(item.lineId, item.qty - 1) : removeLine(item.lineId)} className="w-8 h-8 flex items-center justify-center hover:bg-accent"><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center text-sm font-extrabold tabular-nums">{item.qty}</span>
                      <button onClick={() => updateQty(item.lineId, item.qty + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-accent"><Plus className="h-3 w-3" /></button>
                    </div>
                    <div className="text-base font-bold tabular-nums">{money(item.unitPrice * item.qty - item.discount, settings.currency)}</div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <div className="relative flex-1">
                      <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input type="number" value={item.discount || ""} onChange={(e) => updateItemDiscount(item.lineId, +e.target.value)} placeholder="Discount" className="h-10 w-full min-w-0 rounded-md border bg-background pl-7 pr-3 text-sm font-medium tabular-nums" />
                    </div>
                    <div className="relative flex-1">
                      <StickyNote className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input value={item.note ?? ""} onChange={(e) => updateNote(item.lineId, e.target.value)} placeholder="Note" className="w-full h-10 pl-7 pr-2 rounded-md border bg-background text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="z-10 shrink-0 space-y-1.5 border-t bg-card px-4 py-3 text-sm shadow-[0_-10px_28px_-20px_rgba(69,33,23,0.32)]">
              <Row label="Subtotal" value={money(totals.subtotal, settings.currency)} />
              {totals.itemDiscount > 0 && <Row label="Item discount" value={"− " + money(totals.itemDiscount, settings.currency)} muted />}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Bill discount</span>
                <input type="number" value={billDiscount || ""} onChange={(e) => setBillDiscount(+e.target.value)} min={0} max={Math.max(0, totals.subtotal - totals.itemDiscount)} aria-label="Bill discount" className="h-10 w-32 min-w-[8rem] rounded-lg border bg-background px-3 text-right text-base font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-ring" />
              </div>
              <Row label={`Tax`} value={money(totals.tax, settings.currency)} muted />
              {totals.serviceCharge > 0 && <Row label={`Service (${settings.serviceChargePct}%)`} value={money(totals.serviceCharge, settings.currency)} muted />}
              <div className="flex items-center justify-between border-t pt-2 text-lg font-bold tabular-nums">
                <span>Total</span>
                <span>{money(totals.total, settings.currency)}</span>
              </div>
              <button type="button" disabled={!cart.length} onClick={() => setParkStatus("pending-payment")} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 text-sm font-bold text-orange-800 hover:bg-orange-100 disabled:opacity-40 dark:bg-accent dark:text-accent-foreground">
                <Pause className="h-4 w-4" /> Save as Payment Pending
              </button>
              <button
                onClick={() => cart.length && setPayOpen(true)}
                disabled={!cart.length}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient font-semibold text-brand-foreground shadow-sm transition-[filter,transform] hover:brightness-105 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" /> Charge · {money(totals.total, settings.currency)}
              </button>
            </div>
          </section>
        </div>
      </div>

      <Dialog open={selectedPastOrder !== null} onOpenChange={(open) => { if (!open) setSelectedPastOrder(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Order {selectedPastOrder?.invoiceNo}</DialogTitle></DialogHeader>
          {selectedPastOrder && <div className="space-y-3 text-sm">
            <div className="flex justify-between rounded-lg bg-muted p-3"><span className="capitalize">{selectedPastOrder.orderType}{selectedPastOrder.table ? " · " + selectedPastOrder.table : ""}</span><span className="font-semibold capitalize">{selectedPastOrder.kitchenStatus ?? selectedPastOrder.status}</span></div>
            <div className="max-h-64 space-y-2 overflow-y-auto">{selectedPastOrder.items.map((item) => <div key={item.lineId} className="flex justify-between gap-3 border-b pb-2"><span>{item.qty}× {item.name}</span><span className="shrink-0 font-semibold">{money(item.unitPrice * item.qty - item.discount, settings.currency)}</span></div>)}</div>
            <div className="flex justify-between border-t pt-3 text-base font-bold"><span>Total paid</span><span>{money(selectedPastOrder.total, settings.currency)}</span></div>
            <p className="text-xs text-muted-foreground">Completed bills are read-only. Use Orders for refunds and receipts.</p>
          </div>}
        </DialogContent>
      </Dialog>
      <CartReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} onCheckout={() => setPayOpen(true)} />
      <PaymentDialog open={payOpen} onClose={() => setPayOpen(false)} onDone={(o) => { setPayOpen(false); setReceipt(o); }} />
      <ReceiptDialog order={receipt} onClose={() => setReceipt(null)} />
      <Dialog open={parkStatus !== null} onOpenChange={(value) => { if (!value) setParkStatus(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{parkStatus === "pending-payment" ? "Save payment-pending order?" : "Hold this order?"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">The full item list, quantities, discounts, notes, customer and table will be saved. Your current cart will be cleared for the next customer. No payment is recorded.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setParkStatus(null)}>Back</Button>
            <Button onClick={() => {
              try {
                if (!parkStatus) return;
                holdOrder(parkStatus);
                toast.success(parkStatus === "pending-payment" ? "Saved to Payment Pending" : "Order held successfully");
                setParkStatus(null);
              } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save order"); }
            }}>Save Order</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ParkedOrdersDialog open={heldOpen} onClose={() => setHeldOpen(false)} onResume={recallOrder} />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </AppLayout>
  );
}

function CatBtn({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex min-w-[74px] shrink-0 flex-col items-center gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-ring ${active ? "border-transparent bg-brand-gradient text-brand-foreground shadow-sm" : "border-border/60 bg-card text-foreground hover:border-brand/40 hover:bg-accent"}`}>
      <span className="text-base leading-none">{icon}</span>
      <span className="whitespace-nowrap leading-tight">{label}</span>
    </button>
  );
}

function ProductCard({ product, onSelect }: { product: Product; onSelect: () => void }) {
  const { settings } = useStore();
  const low = product.trackStock && product.stock <= 5;
  const out = product.trackStock && product.stock <= 0;
  return (
    <button
      onClick={onSelect}
      disabled={out}
      className="group overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className={`${product.isDeal ? "aspect-[16/9]" : "h-28"} bg-gradient-to-br from-accent to-secondary relative overflow-hidden`}>
        <ProductThumb src={product.thumbnailUrl ?? product.imageUrl} emoji={product.emoji ?? "🍽️"} />
        {product.featured && <span className="absolute top-2 left-2 bg-brand-gradient text-brand-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full shadow">★ Popular</span>}
        {out ? (
          <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">Out</span>
        ) : low ? (
          <span className="absolute top-2 right-2 bg-warning text-warning-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">Low · {product.stock}</span>
        ) : null}
      </div>
      <div className="p-3">
        <div className="line-clamp-2 min-h-[2.4rem] text-sm font-bold leading-tight">{product.name}</div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="font-semibold text-sm">{money(product.price, settings.currency)}</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-50 text-brand transition group-hover:bg-brand-gradient group-hover:text-brand-foreground"><Plus className="h-3.5 w-3.5" /></span>
        </div>
      </div>
    </button>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={muted ? "text-muted-foreground" : ""}>{value}</span>
    </div>
  );
}

function IconBtn({ children, onClick, title }: any) {
  return <button title={title} onClick={onClick} className="flex items-center px-2 py-2 rounded-md hover:bg-accent text-xs">{children}</button>;
}

function PaymentDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (o: Order) => void }) {
  const totals = useCartTotals();
  const { settings, checkout } = useStore();
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paid, setPaid] = useState(0);
  useEffect(() => { if (open) setPaid(Math.ceil(totals.total)); }, [open, totals.total]);
  const change = Math.max(0, paid - totals.total);

  const quick = [100, 500, 1000, 2000, 5000];
  const methods: { k: PaymentMethod; label: string }[] = [
    { k: "cash", label: "Cash" }, { k: "card", label: "Card" }, { k: "bank", label: "Bank" },
    { k: "easypaisa", label: "Easypaisa" }, { k: "jazzcash", label: "JazzCash" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto p-0">
        <DialogHeader>
          <div className="border-b px-5 py-4 pr-12">
            <DialogTitle className="text-lg">Payment Checkout</DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">Review the bill and choose how the customer pays.</p>
          </div>
        </DialogHeader>
        <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
          <section aria-label="Order summary" className="border-b p-5 md:border-b-0 md:border-r">
            <h3 className="mb-3 text-sm font-extrabold">Order Summary</h3>
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-3 text-xs">
              <div><div className="text-muted-foreground">Order type</div><div className="mt-0.5 font-semibold capitalize">{useStore.getState().orderType}</div></div>
              <div><div className="text-muted-foreground">Table / customer</div><div className="mt-0.5 font-semibold">{useStore.getState().table || "Walk-in"}</div></div>
            </div>
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {useStore.getState().cart.map((item) => <div key={item.lineId} className="flex items-start justify-between gap-3 border-b pb-2.5 text-xs">
                <div><div className="font-semibold">{item.name}</div><div className="mt-1 text-muted-foreground">Qty {item.qty} × {money(item.unitPrice, settings.currency)}</div></div>
                <span className="shrink-0 font-bold tabular-nums">{money(item.unitPrice * item.qty - item.discount, settings.currency)}</span>
              </div>)}
            </div>
            <div className="mt-5 space-y-2 border-t pt-4 text-xs">
              <Row label="Subtotal" value={money(totals.subtotal, settings.currency)} muted />
              <Row label="Discounts" value={money(totals.itemDiscount + totals.appliedBillDiscount, settings.currency)} muted />
              <Row label="Tax" value={money(totals.tax, settings.currency)} muted />
              {totals.serviceCharge > 0 && <Row label="Service charge" value={money(totals.serviceCharge, settings.currency)} muted />}
              <div className="flex justify-between border-t pt-3 text-base font-extrabold"><span>Total due</span><span>{money(totals.total, settings.currency)}</span></div>
            </div>
          </section>
          <section aria-label="Payment details" className="space-y-4 bg-orange-50/35 p-5 dark:bg-card">
            <h3 className="text-sm font-extrabold">Select Payment Method</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-3">
              {methods.map((m) => <button type="button" key={m.k} onClick={() => setMethod(m.k)} aria-pressed={method === m.k} className={`min-h-14 rounded-xl border bg-card px-2 py-2 text-xs font-semibold transition ${method === m.k ? "border-brand text-brand ring-1 ring-brand" : "hover:border-brand/40"}`}>{m.label}</button>)}
            </div>
            <label className="block text-xs font-semibold" htmlFor="pos-payment-amount">Amount received</label>
            <input id="pos-payment-amount" type="number" min={0} step="0.01" value={paid} onChange={(e) => setPaid(+e.target.value)} className="h-14 w-full rounded-xl border bg-card px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/40" />
            <div className="grid grid-cols-3 gap-2">
              {quick.map((v) => <button key={v} onClick={() => setPaid(v)} className="rounded-full bg-muted px-2 py-2 text-xs font-semibold hover:bg-accent">{money(v, settings.currency)}</button>)}
              <button onClick={() => setPaid(Math.ceil(totals.total))} className="rounded-full bg-muted px-2 py-2 text-xs font-semibold hover:bg-accent">Exact</button>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><span>Change due</span><span className="text-lg font-extrabold tabular-nums">{money(change, settings.currency)}</span></div>
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 flex-1" onClick={onClose}>Back</Button>
              <button disabled={!Number.isFinite(paid) || paid < totals.total || paid < 0} onClick={() => { try { const o = checkout(paid, method); toast.success(`Order ${o.invoiceNo} completed`); onDone(o); } catch (err) { toast.error(err instanceof Error ? err.message : "Checkout could not be completed."); } }} className="h-11 flex-[2] rounded-xl bg-brand-gradient px-3 text-sm font-bold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50">Complete Payment</button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HelpDialog({ open, onClose }: any) {
  const shortcuts = [
    ["F1", "Focus product search"],
    ["F2", "New / clear order"],
    ["F3", "Hold current order"],
    ["F4", "Open held orders"],
    ["F5", "Open payment / checkout"],
    ["Esc", "Close dialog"],
    ["Shift + ?", "Show shortcuts"],
  ];
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Keyboard Shortcuts</DialogTitle></DialogHeader>
        <ul className="divide-y">
          {shortcuts.map(([k, l]) => (
            <li key={k} className="flex justify-between py-2 text-sm">
              <span>{l}</span>
              <kbd className="px-2 py-0.5 rounded border bg-muted font-mono text-xs">{k}</kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

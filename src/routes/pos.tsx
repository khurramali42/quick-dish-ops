import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore, useCartTotals } from "@/lib/store";
import { money, formatDateTime } from "@/lib/format";
import type { OrderType, PaymentMethod, Product } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, X, Plus, Minus, ChevronLeft, ChevronRight, Trash2, Pause, Play, Printer, Percent, CreditCard,
  Utensils, Bike, ShoppingBag, Truck, Keyboard, User, StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReceiptDialog } from "@/components/ReceiptDialog";
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
    billDiscount, setBillDiscount, heldOrders, holdOrder, recallOrder, deleteHeld,
    settings, checkout, currentCashier,
  } = useStore();
  const totals = useCartTotals();
  const [payOpen, setPayOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [mobilePane, setMobilePane] = useState<"menu" | "cart">("menu");
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
      else if (e.key === "F3") { e.preventDefault(); if (cart.length) { holdOrder(); toast.success("Order held"); } }
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
        {/* Top bar */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-card px-3 py-2.5 shadow-sm sm:gap-3 sm:px-4 lg:flex-nowrap lg:gap-2">
          <div className="relative order-1 w-full min-w-0 lg:w-auto lg:min-w-[190px] lg:flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item, SKU or scan barcode…  (F1)"
              className="w-full h-10 pl-10 pr-9 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="order-2 flex max-w-full shrink-0 items-center gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1">
            {orderTypes.map((t) => {
              const Icon = t.icon;
              const active = orderType === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setOrderType(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${active ? "bg-brand-gradient text-brand-foreground" : "hover:bg-accent"}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          {orderType === "dine-in" && (
            <select
              value={table ?? ""}
              onChange={(e) => setTable(e.target.value || undefined)}
              className="order-2 h-9 min-w-[104px] max-w-[130px] shrink-0 rounded-lg border bg-background px-2 text-xs sm:px-3"
            >
              <option value="">Select Table</option>
              {Array.from({ length: 12 }, (_, i) => `T${i + 1}`).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          <select
            value={customerId ?? ""}
            onChange={(e) => setCustomer(e.target.value || undefined)}
            className="order-2 h-10 w-[145px] shrink-0 rounded-lg border bg-background px-3 text-sm"
          >
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="order-2 ml-auto hidden items-center gap-3 text-xs 2xl:flex">
            <button onClick={() => setHelpOpen(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-accent">
              <Keyboard className="h-4 w-4" /> Shortcuts
            </button>
            <div className="text-right">
              <div className="font-medium flex items-center gap-1"><User className="h-3 w-3" /> {currentCashier}</div>
              <div className="text-muted-foreground">{new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-b bg-card px-3 py-2 md:hidden">
          <button type="button" onClick={() => setMobilePane("menu")} className={mobilePane === "menu" ? "flex-1 rounded-lg bg-brand-gradient px-3 py-2 text-sm font-semibold text-brand-foreground" : "flex-1 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-foreground"}>Menu</button>
          <button type="button" onClick={() => setMobilePane("cart")} className={mobilePane === "cart" ? "flex-1 rounded-lg bg-brand-gradient px-3 py-2 text-sm font-semibold text-brand-foreground" : "flex-1 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-foreground"}>Order ({cart.reduce((n, item) => n + item.qty, 0)})</button>
        </div>
        {/* Every pane has an independent scroll area. */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,145px),1fr))] gap-3 xl:gap-3.5">
              {filtered.map((p) => <ProductCard key={p.id} product={p} onSelect={() => addToCart(p)} />)}
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-16">No items match.</div>
              )}
            </div>
          </div>
          </div>

          </div>
          {/* Current order with pinned totals. */}
          <section aria-label="Current order" className={mobilePane === "cart" ? "flex min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden border-l bg-card md:flex md:w-[310px] lg:w-[340px] xl:w-[380px] 2xl:w-[400px]" : "hidden min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden border-l bg-card md:flex md:w-[310px] lg:w-[340px] xl:w-[380px] 2xl:w-[400px]"}>
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3.5">
              <div>
                <div className="font-semibold">Current Order</div>
                <div className="text-xs text-muted-foreground">
                  {orderType}{table ? ` · ${table}` : ""} · {cart.reduce((n, item) => n + item.qty, 0)} units
                </div>
              </div>
              <div className="flex gap-1">
                <IconBtn title="Hold (F3)" onClick={() => { if (cart.length) { holdOrder(); toast.success("Order held"); } }}><Pause className="h-4 w-4" /></IconBtn>
                <IconBtn title="Held (F4)" onClick={() => setHeldOpen(true)}>
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
                <div key={item.lineId} className="rounded-xl border bg-background p-3 shadow-[0_1px_2px_rgba(0,0,0,0.025)]">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{money(item.unitPrice, settings.currency)} · Tax {item.taxRate}%</div>
                    </div>
                    <button onClick={() => removeLine(item.lineId)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center border rounded-md">
                      <button onClick={() => item.qty > 1 ? updateQty(item.lineId, item.qty - 1) : removeLine(item.lineId)} className="w-8 h-8 flex items-center justify-center hover:bg-accent"><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                      <button onClick={() => updateQty(item.lineId, item.qty + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-accent"><Plus className="h-3 w-3" /></button>
                    </div>
                    <div className="text-sm font-semibold">{money(item.unitPrice * item.qty - item.discount, settings.currency)}</div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <div className="relative flex-1">
                      <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input type="number" value={item.discount || ""} onChange={(e) => updateItemDiscount(item.lineId, +e.target.value)} placeholder="Discount" className="w-full h-8 pl-7 pr-2 rounded-md border bg-background text-xs" />
                    </div>
                    <div className="relative flex-1">
                      <StickyNote className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input value={item.note ?? ""} onChange={(e) => updateNote(item.lineId, e.target.value)} placeholder="Note" className="w-full h-8 pl-7 pr-2 rounded-md border bg-background text-xs" />
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
                <input type="number" value={billDiscount || ""} onChange={(e) => setBillDiscount(+e.target.value)} min={0} max={Math.max(0, totals.subtotal - totals.itemDiscount)} aria-label="Bill discount" className="h-8 w-28 rounded-md border bg-background px-2 text-right text-sm focus-visible:outline-2 focus-visible:outline-ring" />
              </div>
              <Row label={`Tax`} value={money(totals.tax, settings.currency)} muted />
              {totals.serviceCharge > 0 && <Row label={`Service (${settings.serviceChargePct}%)`} value={money(totals.serviceCharge, settings.currency)} muted />}
              <div className="flex items-center justify-between border-t pt-2 text-lg font-bold tabular-nums">
                <span>Total</span>
                <span>{money(totals.total, settings.currency)}</span>
              </div>
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

      <PaymentDialog open={payOpen} onClose={() => setPayOpen(false)} onDone={(o) => { setPayOpen(false); setReceipt(o); }} />
      <ReceiptDialog order={receipt} onClose={() => setReceipt(null)} />
      <HeldDialog open={heldOpen} onClose={() => setHeldOpen(false)} onRecall={(id: string) => { recallOrder(id); setHeldOpen(false); }} onDelete={deleteHeld} held={heldOrders} />
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Complete Payment</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-accent/60 p-4">
            <div className="text-xs uppercase text-muted-foreground">Total Due</div>
            <div className="text-3xl font-bold mt-1">{money(totals.total, settings.currency)}</div>
            <div className="mt-3 text-xs text-muted-foreground">Tax {money(totals.tax, settings.currency)} · Subtotal {money(totals.subtotal, settings.currency)}</div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Payment method</label>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {methods.map((m) => (
                <button key={m.k} onClick={() => setMethod(m.k)} className={`px-2 py-2 rounded-md text-xs border ${method === m.k ? "bg-brand-gradient text-brand-foreground border-transparent" : "hover:bg-accent"}`}>{m.label}</button>
              ))}
            </div>
            <label className="text-xs text-muted-foreground mt-3 block">Amount received</label>
            <input type="number" min={0} step="0.01" value={paid} onChange={(e) => setPaid(+e.target.value)} className="w-full h-11 mt-1 rounded-lg border bg-background px-3 text-lg font-semibold" />
            <div className="flex gap-1 mt-2 flex-wrap">
              {quick.map((v) => (
                <button key={v} onClick={() => setPaid((p) => p + v)} className="text-xs px-2 py-1 rounded-md border hover:bg-accent">+{v}</button>
              ))}
              <button onClick={() => setPaid(Math.ceil(totals.total))} className="text-xs px-2 py-1 rounded-md border hover:bg-accent">Exact</button>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center rounded-lg border bg-background p-4">
          <span className="text-sm text-muted-foreground">Change to return</span>
          <span className="text-2xl font-bold text-emerald-600">{money(change, settings.currency)}</span>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <button
            disabled={!Number.isFinite(paid) || paid < totals.total || paid < 0}
            onClick={() => {
              try {
                const o = checkout(paid, method);
                toast.success(`Order ${o.invoiceNo} completed`);
                onDone(o);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Checkout could not be completed.");
              }
            }}
            className="px-5 h-10 rounded-lg bg-brand-gradient text-brand-foreground font-medium disabled:opacity-50"
          >
            Complete sale
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HeldDialog({ open, onClose, held, onRecall, onDelete }: any) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Held Orders ({held.length})</DialogTitle></DialogHeader>
        {held.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No held orders.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto space-y-2">
            {held.map((h: any) => (
              <li key={h.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium text-sm">{h.id} · {h.orderType}{h.table ? ` · ${h.table}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{h.cart.length} items · {formatDateTime(h.at)}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => onRecall(h.id)} className="px-3 py-1.5 text-xs rounded-md bg-brand-gradient text-brand-foreground">Recall</button>
                  <button onClick={() => onDelete(h.id)} className="px-2 py-1.5 text-xs rounded-md border hover:bg-accent"><Trash2 className="h-3 w-3" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
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

import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, RotateCcw } from "lucide-react";
import type { Settings } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Spice Kitchen POS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings, resetAll, products, categories, customers, orders, activityLog, refundRequests, resolveRefundRequest, currentCashier, setCurrentCashier } = useStore();
  const [operatorName, setOperatorName] = useState(currentCashier);
  const importRef = useRef<HTMLInputElement>(null);
  const [s, setS] = useState<Settings>(settings);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  const exportAll = () => {
    const state = useStore.getState();
    const data = JSON.stringify({
      format: "spice-pos-browser-backup", version: 2, exportedAt: new Date().toISOString(),
      data: {
        products: state.products, categories: state.categories,
        customers: state.customers, suppliers: state.suppliers,
        orders: state.orders, purchases: state.purchases,
        expenses: state.expenses, settings: state.settings,
        restaurantTables: state.restaurantTables, reservations: state.reservations,
        heldOrders: state.heldOrders, parkedHistory: state.parkedHistory,
        cart: state.cart, orderType: state.orderType, table: state.table,
        customerId: state.customerId, billDiscount: state.billDiscount,
        currentCashier: state.currentCashier,
        activityLog: state.activityLog,
        refundRequests: state.refundRequests,
      },
    }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `spice-pos-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Complete local data backup downloaded");
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("Backup file is too large (maximum 20 MB).");
      const value: unknown = JSON.parse(await file.text());
      if (!value || typeof value !== "object") throw new Error("Invalid backup format.");
      const backup = value as Record<string, unknown>;
      const data = backup.data;
      if (backup.format !== "spice-pos-browser-backup" || ![1, 2].includes(Number(backup.version)) || !data || typeof data !== "object") {
        throw new Error("Unsupported backup. Export a fresh backup from Settings first.");
      }
      const records = data as Record<string, unknown>;
      const keys = ["products", "categories", "customers", "suppliers", "orders", "purchases", "expenses"] as const;
      if (!keys.every((key) => Array.isArray(records[key])) || !records.settings || typeof records.settings !== "object") {
        throw new Error("Backup is missing required restaurant data.");
      }
      const profile = records.settings as Record<string, unknown>;
      if (typeof profile.businessName !== "string" || !["58mm", "80mm", "A4"].includes(String(profile.receiptSize))) {
        throw new Error("Backup business profile is invalid.");
      }
      const isV2 = backup.version === 2;
      const extendedKeys = ["restaurantTables", "reservations", "heldOrders", "parkedHistory", "cart"] as const;
      if (isV2 && !extendedKeys.every((key) => Array.isArray(records[key]))) throw new Error("Backup is missing tables, reservations or pending-order data.");
      if (isV2 && (typeof records.currentCashier !== "string" || typeof records.billDiscount !== "number" || !["dine-in", "takeaway", "delivery", "pickup"].includes(String(records.orderType)))) throw new Error("Backup has invalid cashier or POS session fields.");
      const tableRecords = isV2 ? records.restaurantTables as ReturnType<typeof useStore.getState>["restaurantTables"] : undefined;
      const reservationRecords = isV2 ? records.reservations as ReturnType<typeof useStore.getState>["reservations"] : undefined;
      if (isV2 && (!tableRecords!.every((table) => typeof table?.id === "string" && typeof table?.label === "string" && Number.isInteger(table?.seats)) ||
        !reservationRecords!.every((reservation) => typeof reservation?.tableId === "string" && typeof reservation?.startAt === "string" && typeof reservation?.status === "string") ||
        !reservationRecords!.every((reservation) => tableRecords!.some((table) => table.id === reservation.tableId)))) throw new Error("Backup contains invalid table or reservation links.");
      const message = isV2
        ? "Replace ALL browser-local business, table, reservation, order and cashier demo data with this backup? Download current data first."
        : "This older backup has no tables, reservations or parked orders. Your current table bookings will be kept, but older product/order records will replace the current ones. Continue?";
      if (!confirm(message)) return;
      const next: Partial<ReturnType<typeof useStore.getState>> = {
        products: records.products as typeof products,
        categories: records.categories as typeof categories,
        customers: records.customers as typeof customers,
        suppliers: records.suppliers as ReturnType<typeof useStore.getState>["suppliers"],
        orders: records.orders as typeof orders,
        purchases: records.purchases as ReturnType<typeof useStore.getState>["purchases"],
        expenses: records.expenses as ReturnType<typeof useStore.getState>["expenses"],
        settings: records.settings as Settings,
        cart: [], heldOrders: [], parkedHistory: [], billDiscount: 0, table: undefined,
      };
      if (isV2) Object.assign(next, {
        restaurantTables: tableRecords,
        reservations: reservationRecords,
        heldOrders: records.heldOrders,
        parkedHistory: records.parkedHistory,
        cart: records.cart,
        orderType: records.orderType,
        table: records.table,
        customerId: records.customerId,
        billDiscount: records.billDiscount,
        currentCashier: records.currentCashier,
        activityLog: Array.isArray(records.activityLog) ? records.activityLog : [],
        refundRequests: Array.isArray(records.refundRequests) ? records.refundRequests : [],
      });
      useStore.setState(next);
      setS(records.settings as Settings);
      if (isV2) setOperatorName(records.currentCashier as string);
      toast.success("Backup restored to this browser.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import backup.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Settings" subtitle="Business profile, receipts, tax and system" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-elevated p-6 space-y-4">
          <h3 className="font-semibold">Business Profile</h3>
          <div className="rounded-xl border bg-muted/30 p-3">
            <h4 className="mb-1 text-xs font-bold">Demo Operator Profile</h4>
            <p className="mb-2 text-[11px] text-muted-foreground">Display name only. This is not a login, verified staff account or permission role.</p>
            <label className="block text-xs"><span className="mb-1 block text-muted-foreground">Cashier display name</span>
              <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} maxLength={60} className="input" placeholder="Demo operator" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Business name"><input value={s.businessName} onChange={(e) => set("businessName", e.target.value)} className="input" /></Field>
            <Field label="Branch name"><input value={s.branchName} onChange={(e) => set("branchName", e.target.value)} className="input" /></Field>
            <Field label="Phone"><input value={s.phone} onChange={(e) => set("phone", e.target.value)} className="input" /></Field>
            <Field label="Tax number"><input value={s.taxNumber} onChange={(e) => set("taxNumber", e.target.value)} className="input" /></Field>
            <Field label="Address" full><input value={s.address} onChange={(e) => set("address", e.target.value)} className="input" /></Field>
            <Field label="Logo emoji"><input value={s.logoEmoji} onChange={(e) => set("logoEmoji", e.target.value)} className="input" /></Field>
            <Field label="Currency"><input value={s.currency} onChange={(e) => set("currency", e.target.value)} className="input" /></Field>
          </div>

          <h3 className="font-semibold pt-4 border-t">Tax & Charges</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default tax rate (%)"><input type="number" value={s.defaultTaxRate} onChange={(e) => set("defaultTaxRate", +e.target.value)} className="input" /></Field>
            <Field label="Service charge (%)"><input type="number" value={s.serviceChargePct} onChange={(e) => set("serviceChargePct", +e.target.value)} className="input" /></Field>
          </div>

          <h3 className="font-semibold pt-4 border-t">Receipt</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Size">
              <select value={s.receiptSize} onChange={(e) => set("receiptSize", e.target.value as any)} className="input">
                <option value="58mm">58mm</option><option value="80mm">80mm</option><option value="A4">A4</option>
              </select>
            </Field>
            <Field label="Footer message" full><input value={s.receiptFooter} onChange={(e) => set("receiptFooter", e.target.value)} className="input" /></Field>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button onClick={() => { try {
              if (!s.businessName.trim() || !s.branchName.trim() || !s.currency.trim()) throw new Error("Enter the business name, branch and currency.");
              if (![s.defaultTaxRate, s.serviceChargePct].every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) throw new Error("Tax and service charge must be between 0 and 100%.");
              setCurrentCashier(operatorName);
              updateSettings(s);
              toast.success("Business settings and demo operator saved");
            } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save settings."); } }} className="px-5 py-2 rounded-lg bg-brand-gradient text-brand-foreground text-sm font-medium">Save changes</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-3">Backup & Data</h3>
            <p className="mb-3 text-xs leading-5 text-muted-foreground">Records are saved in this browser only. Version 2 backup includes tables, reservations and held orders. Keep backup files private: they contain customer and business information.</p>
            <div className="space-y-2">
              <button onClick={exportAll} className="w-full flex items-center gap-2 justify-center px-4 py-2 rounded-lg border text-sm hover:bg-accent"><Download className="h-4 w-4" /> Export backup (JSON)</button>
              <input ref={importRef} type="file" accept=".json,application/json" className="sr-only" aria-label="Choose POS backup" onChange={(e) => void importBackup(e.target.files?.[0])} />
              <button onClick={() => importRef.current?.click()} className="w-full flex items-center gap-2 justify-center px-4 py-2 rounded-lg border text-sm hover:bg-accent"><Upload className="h-4 w-4" /> Restore JSON backup</button>
              <button onClick={() => { if (confirm("Reset ALL local data? This cannot be undone.")) resetAll(); }} className="w-full flex items-center gap-2 justify-center px-4 py-2 rounded-lg border border-destructive text-destructive text-sm hover:bg-destructive/5"><RotateCcw className="h-4 w-4" /> Reset all data</button>
            </div>
          </div>

          <div className="card-elevated p-5 text-sm">
            <h3 className="mb-1 font-bold">Refund review queue (demo)</h3>
            <p className="mb-3 text-xs text-muted-foreground">This is a sample approval workflow, not real manager authorization. Any browser user can reach these buttons. Production must restrict reviews to authenticated managers.</p>
            <div className="space-y-2">{refundRequests.filter((entry) => entry.status === "pending").map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3 text-xs">
                <p className="font-semibold">Order {entry.orderId}</p>
                <p className="mt-1 text-muted-foreground">{entry.reason} · Requested by {entry.requestedBy}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => { try { resolveRefundRequest(entry.id, true); toast.success("Refund approved in demo ledger"); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to approve"); } }} className="rounded-lg bg-brand-gradient px-3 py-1.5 font-bold text-brand-foreground">Approve (demo)</button>
                  <button type="button" onClick={() => { try { resolveRefundRequest(entry.id, false); toast.success("Refund request rejected"); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to reject"); } }} className="rounded-lg border px-3 py-1.5 font-semibold">Reject</button>
                </div>
              </div>
            ))}{!refundRequests.some((entry) => entry.status === "pending") && <p className="text-xs text-muted-foreground">No pending review requests.</p>}</div>
          </div>
          <div className="card-elevated p-6 text-sm">
            <h3 className="mb-2 font-semibold">Local activity history</h3>
            <p className="mb-3 text-xs text-muted-foreground">Demo-only events. These can be edited by anyone with browser data access; they are not a secure audit trail.</p>
            <div className="max-h-48 space-y-2 overflow-y-auto">{activityLog.slice(0,15).map((event) => (
              <div key={event.id} className="rounded-lg border p-2 text-[11px]">
                <div className="flex justify-between gap-2"><b>{event.action}</b><span className="text-muted-foreground">{new Date(event.createdAt).toLocaleString("en-PK")}</span></div>
                <div className="mt-1 text-muted-foreground">{event.details} · {event.operator}</div>
              </div>
            ))}</div>
          </div>
          <div className="card-elevated p-6 text-sm">
            <h3 className="font-semibold mb-3">System info</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>Products: {products.length}</li>
              <li>Categories: {categories.length}</li>
              <li>Customers: {customers.length}</li>
              <li>Orders: {orders.length}</li>
            </ul>
          </div>
        </div>
      </div>
      <style>{`.input{width:100%;height:38px;border:1px solid var(--border);border-radius:.5rem;background:var(--background);padding:0 .75rem;font-size:.875rem}`}</style>
    </AppLayout>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`text-xs ${full ? "col-span-2" : ""}`}><div className="text-muted-foreground mb-1">{label}</div>{children}</label>;
}

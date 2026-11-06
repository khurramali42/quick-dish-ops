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
  const { settings, updateSettings, resetAll, products, categories, customers, orders } = useStore();
  const importRef = useRef<HTMLInputElement>(null);
  const [s, setS] = useState<Settings>(settings);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  const exportAll = () => {
    const state = useStore.getState();
    const data = JSON.stringify({
      format: "spice-pos-browser-backup", version: 1, exportedAt: new Date().toISOString(),
      data: {
        products: state.products, categories: state.categories,
        customers: state.customers, suppliers: state.suppliers,
        orders: state.orders, purchases: state.purchases,
        expenses: state.expenses, settings: state.settings,
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
      if (backup.format !== "spice-pos-browser-backup" || backup.version !== 1 || !data || typeof data !== "object") {
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
      if (!confirm("Replace this browser's products, orders, stock, purchases, customers and settings with the selected backup? Download a backup of current data first.")) return;
      useStore.setState({
        products: records.products as typeof products,
        categories: records.categories as typeof categories,
        customers: records.customers as typeof customers,
        suppliers: records.suppliers as ReturnType<typeof useStore.getState>["suppliers"],
        orders: records.orders as typeof orders,
        purchases: records.purchases as ReturnType<typeof useStore.getState>["purchases"],
        expenses: records.expenses as ReturnType<typeof useStore.getState>["expenses"],
        settings: records.settings as Settings,
        cart: [], heldOrders: [], billDiscount: 0, table: undefined,
      });
      setS(records.settings as Settings);
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
            <button onClick={() => { updateSettings(s); toast.success("Settings saved"); }} className="px-5 py-2 rounded-lg bg-brand-gradient text-brand-foreground text-sm font-medium">Save changes</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-3">Backup & Data</h3>
            <p className="mb-3 text-xs leading-5 text-muted-foreground">Records are saved in this browser only. Export regularly and store the JSON file privately. Import replaces existing local data.</p>
            <div className="space-y-2">
              <button onClick={exportAll} className="w-full flex items-center gap-2 justify-center px-4 py-2 rounded-lg border text-sm hover:bg-accent"><Download className="h-4 w-4" /> Export backup (JSON)</button>
              <input ref={importRef} type="file" accept=".json,application/json" className="sr-only" aria-label="Choose POS backup" onChange={(e) => void importBackup(e.target.files?.[0])} />
              <button onClick={() => importRef.current?.click()} className="w-full flex items-center gap-2 justify-center px-4 py-2 rounded-lg border text-sm hover:bg-accent"><Upload className="h-4 w-4" /> Restore JSON backup</button>
              <button onClick={() => { if (confirm("Reset ALL local data? This cannot be undone.")) resetAll(); }} className="w-full flex items-center gap-2 justify-center px-4 py-2 rounded-lg border border-destructive text-destructive text-sm hover:bg-destructive/5"><RotateCcw className="h-4 w-4" /> Reset all data</button>
            </div>
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

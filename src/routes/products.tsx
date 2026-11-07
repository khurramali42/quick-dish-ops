import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { money, shortId } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUpload, ProductThumb } from "@/components/ImageUpload";
import { toast } from "sonner";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — Spice Kitchen POS" }] }),
  component: ProductsPage,
});

const empty = (): Product => ({
  id: shortId("p"), name: "", categoryId: "", sku: "", price: 0, cost: 0, taxRate: 0,
  emoji: "🍽️", available: true, featured: false, stock: 0, trackStock: true, prepTime: 5,
});

function ProductsPage() {
  const { products, categories, upsertProduct, deleteProduct, settings } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [edit, setEdit] = useState<Product | null>(null);
  const filtered = products.filter((p) => (cat === "all" || p.categoryId === cat) && p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppLayout>
      <PageHeader
        title="Products"
        subtitle={`${products.length} items on the menu`}
        action={
          <button onClick={() => setEdit({ ...empty(), taxRate: settings.defaultTaxRate })} className="inline-flex items-center gap-2 bg-brand-gradient text-brand-foreground px-4 py-2 rounded-lg font-medium text-sm">
            <Plus className="h-4 w-4" /> New product
          </button>
        }
      />

      <div className="card-elevated overflow-hidden">
        <div className="p-4 flex gap-3 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full h-9 pl-9 pr-3 rounded-lg border bg-background text-sm" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm">
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="table-scroll"><table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Item</th>
              <th className="text-left px-4 py-2">Category</th>
              <th className="text-left px-4 py-2">SKU</th>
              <th className="text-right px-4 py-2">Cost</th>
              <th className="text-right px-4 py-2">Price</th>
              <th className="text-right px-4 py-2">Stock</th>
              <th className="text-center px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-md overflow-hidden border shrink-0">
                      <ProductThumb src={p.thumbnailUrl ?? p.imageUrl} emoji={p.emoji ?? "🍽️"} size="sm" />
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{categories.find((c) => c.id === p.categoryId)?.name ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-2.5 text-right">{money(p.cost, settings.currency)}</td>
                <td className="px-4 py-2.5 text-right font-medium">{money(p.price, settings.currency)}</td>
                <td className={`px-4 py-2.5 text-right ${p.trackStock && p.stock <= 5 ? "text-destructive font-medium" : ""}`}>{p.trackStock ? p.stock : "—"}</td>
                <td className="px-4 py-2.5 text-center">
                  {p.available
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Hidden</span>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => setEdit(p)} className="p-1.5 rounded hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) { try { deleteProduct(p.id); toast.success("Deleted"); } catch (error) { toast.error(error instanceof Error ? error.message : "Cannot delete linked record."); } } }} className="p-1.5 rounded hover:bg-accent text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-muted-foreground py-10">No products found.</td></tr>}
          </tbody>
        </table></div>
      </div>

      {edit && <ProductForm product={edit} onClose={() => setEdit(null)} onSave={(p) => { upsertProduct(p); toast.success("Saved"); setEdit(null); }} />}
    </AppLayout>
  );
}

function ProductForm({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (p: Product) => void }) {
  const { categories } = useStore();
  const [p, setP] = useState<Product>(product);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((s) => ({ ...s, [k]: v }));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{product.name ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-[220px_1fr] gap-5">
          <div className="space-y-2">
            <div className="text-xs font-medium">Product image</div>
            <ImageUpload
              imageUrl={p.imageUrl}
              thumbnailUrl={p.thumbnailUrl}
              fallbackEmoji={p.emoji || "🍽️"}
              kind={p.isDeal ? "deal" : "product"}
              aspect={p.isDeal ? "wide" : "square"}
              onChange={(v) => {
                if (!v) {
                  setP((s) => ({ ...s, imageUrl: undefined, thumbnailUrl: undefined, imageMimeType: undefined, imageFileSize: undefined, imageUploadedAt: undefined }));
                } else {
                  setP((s) => ({
                    ...s,
                    imageUrl: v.imageUrl,
                    thumbnailUrl: v.thumbnailUrl,
                    imageMimeType: v.mimeType,
                    imageFileSize: v.bytes,
                    imageAltText: s.name,
                    imageUploadedAt: new Date().toISOString(),
                  }));
                }
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><input value={p.name} onChange={(e) => set("name", e.target.value)} className="input" /></Field>
            <Field label="Emoji fallback"><input value={p.emoji ?? ""} onChange={(e) => set("emoji", e.target.value)} className="input" placeholder="🍔" /></Field>
            <Field label="Category">
              <select value={p.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="input">
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="SKU"><input value={p.sku} onChange={(e) => set("sku", e.target.value)} className="input" /></Field>
            <Field label="Cost price (PKR)"><input type="number" value={p.cost} onChange={(e) => set("cost", +e.target.value)} className="input" /></Field>
            <Field label="Sale price (PKR)"><input type="number" value={p.price} onChange={(e) => set("price", +e.target.value)} className="input" /></Field>
            <Field label="Tax rate %"><input type="number" value={p.taxRate} onChange={(e) => set("taxRate", +e.target.value)} className="input" /></Field>
            <Field label="Prep time (min)"><input type="number" value={p.prepTime} onChange={(e) => set("prepTime", +e.target.value)} className="input" /></Field>
            <Field label="Stock"><input type="number" value={p.stock} onChange={(e) => set("stock", +e.target.value)} className="input" /></Field>
            <div className="flex items-center gap-3 pt-6 flex-wrap col-span-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.trackStock} onChange={(e) => set("trackStock", e.target.checked)} /> Track stock</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.available} onChange={(e) => set("available", e.target.checked)} /> Available</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!p.isDeal} onChange={(e) => set("isDeal", e.target.checked)} /> Deal / Combo</label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
          <button onClick={() => onSave(p)} disabled={!p.name || !p.categoryId} className="px-5 py-2 rounded-lg bg-brand-gradient text-brand-foreground text-sm font-medium disabled:opacity-50">Save</button>
        </div>
        <style>{`.input{width:100%;height:38px;border:1px solid var(--border);border-radius:.5rem;background:var(--background);padding:0 .75rem;font-size:.875rem}`}</style>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs"><div className="text-muted-foreground mb-1">{label}</div>{children}</label>;
}

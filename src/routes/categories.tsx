import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import type { Category } from "@/lib/types";
import { shortId } from "@/lib/format";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUpload, ProductThumb } from "@/components/ImageUpload";
import { toast } from "sonner";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories — Spice Kitchen POS" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { categories, upsertCategory, deleteCategory, products } = useStore();
  const [edit, setEdit] = useState<Category | null>(null);

  return (
    <AppLayout>
      <PageHeader
        title="Categories"
        subtitle="Organize your menu"
        action={
          <button onClick={() => setEdit({ id: shortId("c"), name: "", icon: "🍽️", sortOrder: categories.length + 1, active: true })} className="inline-flex items-center gap-2 bg-brand-gradient text-brand-foreground px-4 py-2 rounded-lg font-medium text-sm">
            <Plus className="h-4 w-4" /> New category
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((c) => (
          <div key={c.id} className="card-elevated overflow-hidden relative group">
            <div className="aspect-square bg-gradient-to-br from-accent to-secondary">
              <ProductThumb src={c.thumbnailUrl ?? c.imageUrl} emoji={c.icon} />
            </div>
            <div className="p-3 text-center">
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{products.filter((p) => p.categoryId === c.id).length} items</div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
              <button onClick={() => setEdit(c)} className="p-1.5 rounded bg-background border shadow-sm"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => { if (confirm(`Delete "${c.name}"?`)) { deleteCategory(c.id); toast.success("Deleted"); } }} className="p-1.5 rounded bg-background border shadow-sm text-destructive"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <Dialog open onOpenChange={(v) => !v && setEdit(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{edit.name ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-[160px_1fr] gap-4">
              <ImageUpload
                imageUrl={edit.imageUrl}
                thumbnailUrl={edit.thumbnailUrl}
                fallbackEmoji={edit.icon || "🍽️"}
                kind="category"
                onChange={(v) => setEdit(v
                  ? { ...edit, imageUrl: v.imageUrl, thumbnailUrl: v.thumbnailUrl }
                  : { ...edit, imageUrl: undefined, thumbnailUrl: undefined })}
              />
              <div className="space-y-3">
                <label className="text-xs block"><div className="text-muted-foreground mb-1">Name</div><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="w-full h-9 rounded-lg border bg-background px-3 text-sm" /></label>
                <label className="text-xs block"><div className="text-muted-foreground mb-1">Emoji fallback</div><input value={edit.icon} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} placeholder="🍕" className="w-full h-9 rounded-lg border bg-background px-3 text-sm" /></label>
                <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
              <button onClick={() => { upsertCategory(edit); toast.success("Saved"); setEdit(null); }} disabled={!edit.name} className="px-5 py-2 rounded-lg bg-brand-gradient text-brand-foreground text-sm font-medium disabled:opacity-50">Save</button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}

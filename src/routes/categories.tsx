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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((c) => (
          <div key={c.id} className="card-elevated group relative flex min-w-0 items-center gap-3 overflow-hidden p-2.5 pr-20">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-accent to-secondary sm:h-[72px] sm:w-[72px]">
              <ProductThumb src={c.thumbnailUrl ?? c.imageUrl} emoji={c.icon} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold" title={c.name}>{c.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{products.filter((p) => p.categoryId === c.id).length} items</div>
            </div>
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              <button type="button" aria-label={`Edit ${c.name}`} onClick={() => setEdit(c)} className="rounded-lg border bg-background p-2 shadow-sm focus-visible:outline-2 focus-visible:outline-ring"><Pencil className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label={`Delete ${c.name}`} onClick={() => { if (confirm(`Delete "${c.name}"?`)) { try { deleteCategory(c.id); toast.success("Deleted"); } catch (error) { toast.error(error instanceof Error ? error.message : "Cannot delete linked record."); } } }} className="rounded-lg border bg-background p-2 text-destructive shadow-sm focus-visible:outline-2 focus-visible:outline-ring"><Trash2 className="h-3.5 w-3.5" /></button>
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

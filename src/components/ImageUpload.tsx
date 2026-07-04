import { useRef, useState, useCallback } from "react";
import { UploadCloud, RefreshCw, Trash2, ImageIcon, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { processImage, formatBytes, ACCEPTED_EXT, type OptimizedImageSet } from "@/lib/image";

interface Props {
  imageUrl?: string;
  thumbnailUrl?: string;
  fallbackEmoji?: string;
  kind?: "product" | "deal" | "category";
  aspect?: "square" | "wide";
  onChange: (v: { imageUrl?: string; thumbnailUrl?: string; mimeType?: string; bytes?: number } | null) => void;
}

export function ImageUpload({
  imageUrl, thumbnailUrl, fallbackEmoji = "🍽️",
  kind = "product", aspect = "square", onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastSize, setLastSize] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    try {
      const out: OptimizedImageSet = await processImage(file, kind);
      onChange({
        imageUrl: out.full.dataUrl,
        thumbnailUrl: out.thumb.dataUrl,
        mimeType: out.full.mimeType,
        bytes: out.full.bytes,
      });
      setLastSize(out.full.bytes);
      toast.success(`Image optimized · ${formatBytes(out.full.bytes)}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not process image");
    } finally {
      setBusy(false);
    }
  }, [kind, onChange]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const remove = () => {
    onChange(null);
    setLastSize(null);
    setConfirmRemove(false);
    toast.success("Image removed");
  };

  const aspectCls = aspect === "wide" ? "aspect-[16/9]" : "aspect-square";
  const previewSrc = imageUrl ?? thumbnailUrl;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXT.join(",") + ",image/jpeg,image/png,image/webp"}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {previewSrc ? (
        <div className={`relative rounded-xl overflow-hidden border bg-muted ${aspectCls}`}>
          <img src={previewSrc} alt="Preview" className="w-full h-full object-cover" />
          {busy && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 bg-background/95 backdrop-blur border rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-accent shadow-sm"
            >
              <RefreshCw className="h-3 w-3" /> Replace
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="inline-flex items-center gap-1.5 bg-background/95 backdrop-blur border rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 shadow-sm"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`w-full ${aspectCls} rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/40 hover:bg-muted"
          }`}
        >
          {busy ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <>
              <div className="relative">
                <div className="text-4xl">{fallbackEmoji}</div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-brand-gradient text-brand-foreground flex items-center justify-center shadow">
                  <UploadCloud className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xs font-medium text-foreground">
                Drop image or <span className="text-primary underline">browse</span>
              </div>
              <div className="text-[10px] text-muted-foreground text-center px-3 leading-tight">
                JPG, PNG or WebP · max 5 MB<br />
                Recommended: {aspect === "wide" ? "1200 × 675" : "600 × 600"} px
              </div>
            </>
          )}
        </button>
      )}

      {previewSrc && lastSize != null && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Optimized · {formatBytes(lastSize)} · auto-cropped &amp; converted to WebP
        </div>
      )}

      {!previewSrc && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ImageIcon className="h-3 w-3" />
          No image · POS will show the emoji placeholder.
        </div>
      )}

      {confirmRemove && (
        <div className="rounded-lg border bg-card p-3 text-xs flex items-center justify-between">
          <span>Remove this image? A default emoji placeholder will be shown.</span>
          <div className="flex gap-2 ml-3">
            <button type="button" onClick={() => setConfirmRemove(false)} className="px-3 py-1 rounded-md border">Cancel</button>
            <button type="button" onClick={remove} className="px-3 py-1 rounded-md bg-destructive text-destructive-foreground">Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Small thumbnail-with-emoji-fallback for grids and tables. */
export function ProductThumb({
  src, emoji = "🍽️", className = "", size = "md",
}: { src?: string; emoji?: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const emojiSize = size === "sm" ? "text-2xl" : size === "lg" ? "text-6xl" : "text-5xl";
  if (!src || failed) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-accent to-secondary ${emojiSize} ${className}`}>
        {emoji}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}

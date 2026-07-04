// Client-side image compression & optimization for Spice Kitchen POS.
// Uses Canvas to resize, center-crop, and encode as WebP (JPEG fallback).

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ACCEPTED_EXT = [".jpg", ".jpeg", ".png", ".webp"];

export type ImagePreset = "product" | "thumbnail" | "deal" | "category";

export interface ProcessedImage {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
}

export interface OptimizedImageSet {
  full: ProcessedImage;      // 600x600 product / 1200x675 deal
  thumb: ProcessedImage;     // 300x300 for POS grid
}

const PRESETS: Record<ImagePreset, { w: number; h: number; quality: number; mode: "cover" | "contain" }> = {
  product:   { w: 600,  h: 600, quality: 0.82, mode: "cover" },
  thumbnail: { w: 300,  h: 300, quality: 0.78, mode: "cover" },
  deal:      { w: 1200, h: 675, quality: 0.82, mode: "cover" },
  category:  { w: 400,  h: 400, quality: 0.8,  mode: "cover" },
};

export function validateImageFile(file: File): string | null {
  const nameOk = ACCEPTED_EXT.some((e) => file.name.toLowerCase().endsWith(e));
  const mimeOk = ACCEPTED_MIME.includes(file.type);
  if (!nameOk && !mimeOk) return "Unsupported format. Use JPG, PNG or WebP.";
  if (file.size > MAX_UPLOAD_BYTES) return `File too large. Maximum 5 MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image file."));
    img.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read file."));
    r.readAsDataURL(file);
  });
}

function encode(canvas: HTMLCanvasElement, quality: number): { dataUrl: string; mime: string; bytes: number } {
  // Prefer WebP; browsers without support return the PNG data URL, so we detect and fall back to JPEG.
  const webp = canvas.toDataURL("image/webp", quality);
  if (webp.startsWith("data:image/webp")) {
    return { dataUrl: webp, mime: "image/webp", bytes: dataUrlBytes(webp) };
  }
  const jpeg = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl: jpeg, mime: "image/jpeg", bytes: dataUrlBytes(jpeg) };
}

function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

async function renderPreset(img: HTMLImageElement, preset: ImagePreset): Promise<ProcessedImage> {
  const { w, h, quality, mode } = PRESETS[preset];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // subtle neutral bg so PNG transparency doesn't turn black under JPEG fallback
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, w, h);

  const srcAR = img.width / img.height;
  const dstAR = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (mode === "cover") {
    if (srcAR > dstAR) {
      // source wider than target — crop sides
      sw = img.height * dstAR;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / dstAR;
      sy = (img.height - sh) / 2;
    }
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  const enc = encode(canvas, quality);
  return { dataUrl: enc.dataUrl, mimeType: enc.mime, bytes: enc.bytes, width: w, height: h };
}

export async function processImage(
  file: File,
  kind: "product" | "deal" | "category" = "product",
): Promise<OptimizedImageSet> {
  const err = validateImageFile(file);
  if (err) throw new Error(err);
  const src = await readAsDataUrl(file);
  const img = await loadImage(src);
  const full = await renderPreset(img, kind === "deal" ? "deal" : kind === "category" ? "category" : "product");
  const thumb = await renderPreset(img, "thumbnail");
  return { full, thumb };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

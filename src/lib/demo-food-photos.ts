import type { Product } from "./types";

/**
 * Illustrative royalty-free food photos for the browser demo only.
 * Restaurant operators should upload their own matching product photos.
 * Uploaded images always take precedence over these sample category photos.
 *
 * Source: Unsplash (see the linked photo pages in docs/demo-photo-credits.md).
 * External images require an internet connection; ProductThumb falls back
 * to the existing product emoji when an image cannot load.
 */
const samplePhotos: Record<string, string[]> = {
  c1: [
    "https://images.unsplash.com/photo-1610440042657-612c34d95e9f?auto=format&fit=crop&w=520&h=330&q=78",
    "https://images.unsplash.com/photo-1632552544460-055cff0d29a5?auto=format&fit=crop&w=520&h=330&q=78",
  ],
  c2: ["https://images.unsplash.com/photo-1680405620826-83b0f0f61b28?auto=format&fit=crop&w=520&h=330&q=78"],
  c3: ["https://images.unsplash.com/photo-1559528896-c5310744cce8?auto=format&fit=crop&w=520&h=330&q=78"],
  c4: ["https://images.unsplash.com/photo-1705359573325-f2006d5e459f?auto=format&fit=crop&w=520&h=330&q=78"],
  c5: ["https://images.unsplash.com/photo-1610440042657-612c34d95e9f?auto=format&fit=crop&w=520&h=330&q=78"],
};

export function demoFoodPhoto(product: Product): string | undefined {
  if (product.imageUrl || product.thumbnailUrl) return undefined;
  const options = samplePhotos[product.categoryId];
  if (!options) return undefined;
  const value = product.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return options[value % options.length];
}

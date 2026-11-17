// Gallery images for a product: the API's chosen main image first, then the
// front / ingredients / nutrition / packaging pictures, without duplicates.
import type { Product, SelectedImages, ImageVariantSet } from "../api/types";

export interface GalleryImage {
  url: string;
  thumbUrl: string;
  label: string;
  width?: number | undefined;
  height?: number | undefined;
}

const KINDS: (keyof SelectedImages & string)[] = ["front", "ingredients", "nutrition", "packaging"];
const LABELS: Record<string, string> = {
  front: "Front",
  ingredients: "Ingredients",
  nutrition: "Nutrition facts",
  packaging: "Packaging",
};

function firstUrl(map: Record<string, string> | undefined, preferred = "en"): string | undefined {
  if (!map) return undefined;
  return map[preferred] ?? Object.values(map).find((u) => typeof u === "string" && u !== "");
}

function isVariantSet(value: unknown): value is ImageVariantSet {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Low resolution: the short side is below this many pixels (same threshold idea as the CMS). */
export const LOW_RES_SIDE = 400;

export function galleryImages(
  product: Pick<
    Product,
    "image_url" | "image_thumb_url" | "image_width" | "image_height" | "selected_images"
  >,
): GalleryImage[] {
  const out: GalleryImage[] = [];
  const seen = new Set<string>();
  const add = (image: GalleryImage) => {
    if (!image.url || seen.has(image.url)) return;
    seen.add(image.url);
    out.push(image);
  };
  if (product.image_url) {
    add({
      url: product.image_url,
      thumbUrl: product.image_thumb_url ?? product.image_url,
      label: "Main image",
      width: product.image_width ?? undefined,
      height: product.image_height ?? undefined,
    });
  }
  const selected = product.selected_images as SelectedImages | null | undefined;
  for (const kind of KINDS) {
    const set = selected?.[kind];
    if (!isVariantSet(set)) continue;
    const url = firstUrl(set.display) ?? firstUrl(set.small) ?? firstUrl(set.thumb);
    if (!url) continue;
    add({ url, thumbUrl: firstUrl(set.thumb) ?? firstUrl(set.small) ?? url, label: LABELS[kind] ?? kind });
  }
  return out;
}

export function isLowResolution(width?: number | null, height?: number | null): boolean {
  if (!width || !height) return false;
  return Math.min(width, height) < LOW_RES_SIDE;
}

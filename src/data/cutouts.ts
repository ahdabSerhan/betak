// Furniture cut out of its photo (transparent background), for placing inside the designer's room.
import type { Product } from "./catalog";
import rawCutouts from "./cutouts.json";
import { asset } from "../lib/asset";

// Product id → width / height of its cutout. Products missing here have no usable cutout.
const CUTOUTS: Record<string, number | undefined> = rawCutouts;

// Width / height of a product's cutout (1 when it has none).
export const cutoutAspect = (product: Product) => CUTOUTS[product.id] ?? 1;

export const cutoutOf = (product: Product) => (CUTOUTS[product.id] ? asset(`img/cut/c${product.id}.webp`) : null);

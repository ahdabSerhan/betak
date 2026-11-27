// Descriptions, specs and gallery photos collected from the product pages of betak.co.il.
import type { Lang } from "../i18n/text";
import type { Product } from "./catalog";
import rawDetails from "./details.json";
import rawGalleries from "./galleries.json";
import rawPolicies from "./policies.json";
import { asset } from "../lib/asset";

// One product's text in both languages. `source` is the betak.co.il page it was read from.
interface RawDetails {
  source?: string;
  description: Record<Lang, string[]>;
  specs: Record<Lang, string[]>;
  gallery?: string[];
}

export interface ProductDetails {
  paragraphs: string[];
  // Size, foam and fabric lines such as "Length: 200 cm", shown as a spec list.
  specs: string[];
  photos: string[];
}

const DETAILS: Record<string, RawDetails | undefined> = rawDetails;
// Extra photos of each product, by their image number on the store's image server.
const GALLERIES: Record<string, number[] | undefined> = rawGalleries;
// Extra product photos, copied from betak.co.il into public/img/g and named by their number there.
const storePhoto = (imageId: number) => asset(`img/g/${imageId}.webp`);

export function detailsOf(product: Product, lang: Lang = "he"): ProductDetails {
  const raw = DETAILS[product.id];
  const paragraphs = raw?.description[lang] ?? [];
  const specs = raw?.specs[lang] ?? [];
  const gallery = GALLERIES[product.id]?.map(storePhoto) ?? raw?.gallery ?? [];
  return { paragraphs, specs, photos: [product.image, ...gallery] };
}

export interface Policies {
  delivery: string[];
  questions: string[][];
}

// Delivery notes and common questions, the same for every product.
export const POLICIES: Record<Lang, Policies> = rawPolicies;

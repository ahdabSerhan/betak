// Descriptions and gallery photos collected from the product pages of betak.co.il (Hebrew).
import type { Lang } from "../i18n/text";
import type { Product } from "./catalog";
import rawDetails from "./details.json";
import rawGalleries from "./galleries.json";
import rawReviews from "./reviews.json";
import rawPolicies from "./policies.json";
import { asset } from "../lib/asset";

interface RawDetails {
  description: string;
  gallery: string[];
}

export interface ProductDetails {
  paragraphs: string[];
  // Size lines such as "אורך: 200 ס"מ", shown as a spec list.
  specs: string[];
  photos: string[];
}

export interface Review {
  name: string;
  text: string;
}

const DETAILS: Record<string, RawDetails | undefined> = rawDetails;
// Extra photos of each product, by their image number on the store's image server.
const GALLERIES: Record<string, number[] | undefined> = rawGalleries;
const REVIEWS: Record<string, Review[] | undefined> = rawReviews;
// Extra product photos, copied from betak.co.il into public/img/g and named by their number there.
const storePhoto = (imageId: number) => asset(`img/g/${imageId}.webp`);

// What customers wrote about this product on the store's site (in Hebrew).
export const reviewsOf = (product: Product): Review[] => REVIEWS[product.id] ?? [];

// Every review with the id of the product it was written about, for the home page.
export const ALL_REVIEWS = Object.entries(REVIEWS).flatMap(([productId, reviews]) => (reviews ?? []).map((review) => ({ ...review, productId: Number(productId) })));
const SPECS_HEADING = /^מידות/;

export function detailsOf(product: Product): ProductDetails {
  const raw = DETAILS[product.id];
  const lines = (raw?.description ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
  // Everything after the "מידות" (dimensions) heading is a spec line.
  const heading = lines.findIndex((line) => SPECS_HEADING.test(line));
  const paragraphs = heading === -1 ? lines : lines.slice(0, heading);
  const specs = heading === -1 ? [] : lines.slice(heading + 1);
  const gallery = GALLERIES[product.id]?.map(storePhoto) ?? raw?.gallery ?? [];
  return { paragraphs, specs, photos: [product.image, ...gallery] };
}

export interface Policies {
  delivery: string[];
  questions: string[][];
}

// Delivery notes and common questions, the same for every product.
export const POLICIES: Record<Lang, Policies> = rawPolicies;

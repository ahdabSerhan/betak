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
// The dimensions heading, e.g. "מידות:", "📏 מידות:" or "מידת המזנון :".
const SPECS_HEADING = /^[^\p{L}]*מידו?ת/u;
// A dimension line has a number in it, e.g. "אורך: 220 ס"מ"; a second heading ("מידות השולחן:") stays with them.
const isSpec = (line: string) => /\d/.test(line) || SPECS_HEADING.test(line);

export function detailsOf(product: Product): ProductDetails {
  const raw = DETAILS[product.id];
  const lines = (raw?.description ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
  // The "מידות" (dimensions) heading, if the description has one.
  const heading = lines.findIndex((line) => SPECS_HEADING.test(line));
  if (heading === -1) return { paragraphs: lines, specs: [], photos: photosOf(product, raw) };
  // The dimension lines right after the heading are specs; any text after them stays in the description.
  const rest = lines.slice(heading + 1);
  const end = rest.findIndex((line) => !isSpec(line));
  const specs = (end === -1 ? rest : rest.slice(0, end)).map((line) => line.replace(/^[•*\s]+/, ""));
  const paragraphs = [...lines.slice(0, heading), ...(end === -1 ? [] : rest.slice(end))];
  return { paragraphs, specs, photos: photosOf(product, raw) };
}

// The main photo followed by the product's extra photos.
function photosOf(product: Product, raw: RawDetails | undefined): string[] {
  const gallery = GALLERIES[product.id]?.map(storePhoto) ?? raw?.gallery ?? [];
  return [product.image, ...gallery];
}

export interface Policies {
  delivery: string[];
  questions: string[][];
}

// Delivery notes and common questions, the same for every product.
export const POLICIES: Record<Lang, Policies> = rawPolicies;

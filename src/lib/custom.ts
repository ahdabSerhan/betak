// "Make it yours": the sizes, seat division and fabric colour code a visitor may choose for an upholstered piece.
import type { Product, ProductType } from "../data/catalog";
import { footprint } from "./measure";
import { detailsOf } from "../data/details";
import { swatchLabel } from "../data/fabrics";
import type { Lang } from "../i18n/text";

export type Side = "left" | "right";
export type Firmness = "soft" | "medium" | "firm";
export const FIRMNESS: Firmness[] = ["soft", "medium", "firm"];

// One visitor's choices for one product. Sizes are in centimetres.
export interface Design {
  width: number;
  depth: number;
  seats: number;
  // Corner sofas only: which side the chaise is on, how far it reaches, and how deep (wide) its seat is.
  chaiseSide: Side;
  chaiseLength: number;
  chaiseDepth: number;
  // The fabric colour code the visitor picked in the fabric step (e.g. "REEF-4601"); empty until they pick one.
  colorCode: string;
  firmness: Firmness;
}

interface Range {
  min: number;
  max: number;
  step: number;
}

export interface DesignRules {
  shape: "sofa" | "corner" | "seat" | "bed";
  width: Range;
  depths: number[];
  seats: number[];
  chaise: Range | null;
  // The sizes the listed price is for, per measure that changes the price (empty when the size never changes it).
  priceBase: PriceBase;
  // Where the length starts when it is not the price base (an armchair's listed length).
  standardWidth?: number;
  // Beds sold in set mattress sizes: each size (width x length) and what it adds; the first is the listed one.
  sizes?: SizeOption[];
}

export interface SizeOption {
  size: string;
  extra: number;
}

type PriceBase = Partial<Record<"width" | "chaiseLength", number>>;

const SOFA_TYPES: ProductType[] = ["three", "two", "lounge", "sofa", "set32", "sofaotto"];
// Sofa and armchair beds are not designed on the site: a customer who wants changes contacts the store.
const SOFA_BED_TYPES: ProductType[] = ["sofabed", "twobed", "chairbed"];
export const isSofaBed = (product: Product) => SOFA_BED_TYPES.includes(product.type);
const CORNER_TYPES: ProductType[] = ["corner", "cornerlux"];
// Armchairs: length 70-125 cm and a choice of depths; ottomans and benches: width only.
const ARMCHAIR_TYPES: ProductType[] = ["armchair", "tv"];
const ARMCHAIR_DEPTHS = [85, 90, 95, 100, 105, 110];
const SEAT_TYPES: ProductType[] = ["ottoman", "bench"];
const BED_TYPES: ProductType[] = ["dbed", "bed"];
// A seat cushion narrower or wider than this is uncomfortable.
const SEAT_WIDTH = { min: 55, max: 115 };
const ARMS_CM = 40;

// Listed corner sofa prices are for a 300 cm sofa with a 200 cm chaise.
const CORNER_BASE = { width: 300, chaiseLength: 200 };
const SOFA_WIDTH = { min: 180, max: 340, step: 10 };
// Straight sofa depths the store offers; depth never changes the price.
const SOFA_DEPTHS = [90, 95, 100, 105, 110, 115, 120];

// The length in the product description ("אורך: 220 ס"מ"), which a straight sofa's listed price is for.
function listedLength(product: Product): number | null {
  const line = detailsOf(product, "he").specs.find((spec) => /^אורך: \d+ ס"מ$/.test(spec));
  return line ? Number(line.match(/\d+/)![0]) : null;
}

// The sofa slider in 10 cm steps that pass through the listed length (e.g. 185-335 for a 215 cm sofa).
// A sofa listed shorter than the usual minimum starts at its own length.
function sofaWidth(listed: number | null): Range {
  if (!listed) return SOFA_WIDTH;
  const below = Math.floor(Math.max(0, listed - SOFA_WIDTH.min) / SOFA_WIDTH.step) * SOFA_WIDTH.step;
  const above = Math.floor((SOFA_WIDTH.max - listed) / SOFA_WIDTH.step) * SOFA_WIDTH.step;
  return { min: listed - below, max: listed + above, step: SOFA_WIDTH.step };
}

// Mattress sizes (width x length, cm) and what each adds to the listed price, as betak.co.il lists them.
export const MATTRESS_SIZES: SizeOption[] = [
  { size: "140x190", extra: 0 },
  { size: "160x190", extra: 349 },
  { size: "160x200", extra: 499 },
  { size: "180x200", extra: 650 },
];
// The longer list some beds give on betak.co.il.
const BED_SIZES: SizeOption[] = [
  { size: "140x190", extra: 0 },
  { size: "140x200", extra: 310 },
  { size: "160x190", extra: 350 },
  { size: "160x200", extra: 450 },
  { size: "180x200", extra: 650 },
  { size: "200x200", extra: 750 },
];
// The beds whose description lists mattress sizes, and which list (Noble and Georgia use the mattresses' one).
const BED_SIZE_LISTS: Record<number, SizeOption[]> = {
  1715: BED_SIZES, 1991: BED_SIZES, 1997: BED_SIZES, 2004: BED_SIZES, 2007: BED_SIZES, 2020: BED_SIZES,
  1994: MATTRESS_SIZES, 2002: MATTRESS_SIZES,
};
export const isMattress = (product: Product) => product.type === "mattress";
// A saved size that is no longer offered falls back to the listed one.
export const mattressSize = (saved?: string) => MATTRESS_SIZES.find((option) => option.size === saved) ?? MATTRESS_SIZES[0];
// "160x200" as people read it: "160 × 200".
export const sizeLabel = (size: string) => size.replace("x", " × ");

// What can be changed on this product, or null when it is sold as it is (tables, rugs, mattresses).
export function rulesFor(product: Product): DesignRules | null {
  const { type } = product;
  if (CORNER_TYPES.includes(type)) return { shape: "corner", width: { min: 220, max: 350, step: 10 }, depths: [90, 100, 110], seats: [2, 3, 4], chaise: { min: 150, max: 250, step: 10 }, priceBase: CORNER_BASE };
  if (SOFA_TYPES.includes(type)) {
    // Straight sofas cost more above the length in their description; without one, the size never changes the price.
    const listed = listedLength(product);
    return { shape: "sofa", width: sofaWidth(listed), depths: SOFA_DEPTHS, seats: [1, 2, 3, 4], chaise: null, priceBase: listed ? { width: listed } : {} };
  }
  if (ARMCHAIR_TYPES.includes(type)) {
    const width = { min: 70, max: 125, step: 5 };
    const listed = listedLength(product);
    return { shape: "seat", width, depths: ARMCHAIR_DEPTHS, seats: [], chaise: null, priceBase: {}, standardWidth: listed ? within(listed, width) : undefined };
  }
  if (SEAT_TYPES.includes(type)) return { shape: "seat", width: { min: 50, max: 160, step: 5 }, depths: [], seats: [], chaise: null, priceBase: {} };
  if (BED_TYPES.includes(type)) return { shape: "bed", width: { min: 120, max: 200, step: 20 }, depths: [190, 200], seats: [], chaise: null, priceBase: {}, sizes: BED_SIZE_LISTS[product.id] };
  return null;
}

// Seat divisions that give comfortable cushions at this width.
export function seatChoices(rules: DesignRules, width: number): number[] {
  const inside = width - ARMS_CM;
  return rules.seats.filter((seats) => inside / seats >= SEAT_WIDTH.min && inside / seats <= SEAT_WIDTH.max);
}

const nearest = (value: number, choices: number[]) => choices.reduce((best, choice) => (Math.abs(choice - value) < Math.abs(best - value) ? choice : best));
const within = (value: number, range: Range) => Math.min(range.max, Math.max(range.min, Math.round(value / range.step) * range.step));

// Every 10 cm (or part of it) above the base size adds 100 ₪; smaller sizes and other depths cost the same.
export const EXTRA_STEP_CM = 10;
export const EXTRA_PER_STEP = 100;

// How much one measure adds to the price, e.g. a 330 cm corner sofa adds 300 ₪.
const extraFor = (size: number, base: number) => Math.ceil(Math.max(0, size - base) / EXTRA_STEP_CM) * EXTRA_PER_STEP;

// A design's size as a size list names it, e.g. "160x200".
export const sizeKey = (design: Pick<Design, "width" | "depth">) => `${design.width}x${design.depth}`;

// What the chosen size adds to the listed price.
export function sizeExtra(rules: DesignRules, design: Design): number {
  if (rules.sizes) return rules.sizes.find((option) => option.size === sizeKey(design))?.extra ?? 0;
  return Object.entries(rules.priceBase).reduce((sum, [key, base]) => sum + extraFor(design[key as keyof PriceBase], base), 0);
}

// Each size the visitor can pick and what it adds, for the server to price orders with, e.g. { width: { "310": 100 } }.
export function sizeExtraTable(product: Product): Record<string, Record<string, number>> | null {
  if (isMattress(product)) return { mattress: Object.fromEntries(MATTRESS_SIZES.map((option) => [option.size, option.extra])) };
  const rules = rulesFor(product);
  if (!rules) return null;
  if (rules.sizes) return { size: Object.fromEntries(rules.sizes.map((option) => [option.size, option.extra])) };
  const ranges: Record<string, Range | null> = { width: rules.width, chaiseLength: rules.chaise };
  const entries = Object.entries(rules.priceBase).map(([key, base]) => {
    const range = ranges[key]!;
    const sizes = Array.from({ length: (range.max - range.min) / range.step + 1 }, (_, index) => range.min + index * range.step);
    return [key, Object.fromEntries(sizes.map((size) => [size, extraFor(size, base)]))];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

// The product as the store usually makes it, before the visitor changes anything.
export function standardDesign(product: Product, rules: DesignRules): Design {
  const typical = footprint(product);
  // Sofas start at the size their listed price is for.
  const base = rules.priceBase;
  // A bed with set sizes starts at the first one, which the listed price is for.
  const [listedWidth, listedDepth] = rules.sizes ? rules.sizes[0].size.split("x").map(Number) : [];
  const width = base.width ?? rules.standardWidth ?? listedWidth ?? within(typical.width, rules.width);
  const seats = seatChoices(rules, width);
  return {
    width,
    depth: listedDepth ? listedDepth : rules.depths.length > 0 ? nearest(rules.shape === "corner" ? 100 : typical.depth, rules.depths) : typical.depth,
    seats: seats.length > 0 ? nearest(3, seats) : 0,
    chaiseSide: "right",
    chaiseLength: rules.chaise ? base.chaiseLength ?? within(typical.depth, rules.chaise) : 0,
    chaiseDepth: rules.chaise ? nearest(100, rules.depths) : 0,
    colorCode: "",
    firmness: "medium",
  };
}

// A saved design completed with choices added since, and its sizes moved onto this product's slider steps.
export function savedDesign(product: Product, rules: DesignRules, saved: Partial<Design> = {}): Design {
  const standard = standardDesign(product, rules);
  const design = { ...standard, ...saved };
  // A bed size that is not on its list goes back to the listed one.
  if (rules.sizes && !rules.sizes.some((option) => option.size === sizeKey(design))) return { ...design, width: standard.width, depth: standard.depth };
  return { ...design, width: within(design.width, rules.width), depth: rules.depths.length > 0 ? nearest(design.depth, rules.depths) : design.depth, chaiseLength: rules.chaise ? within(design.chaiseLength, rules.chaise) : design.chaiseLength };
}

// Keeps the seat division valid after the width changes.
export function withWidth(design: Design, rules: DesignRules, width: number): Design {
  const seats = seatChoices(rules, width);
  return { ...design, width, seats: seats.length === 0 || seats.includes(design.seats) ? design.seats : nearest(design.seats, seats) };
}

// The seats step (חלוקת מושבים) is hidden for now; set to true to bring it back everywhere.
export const SHOW_SEATS = false;

// The colour code as the store should read it: trimmed, inner spaces removed, upper case ("" when not given).
export const cleanColorCode = (design: Design) => design.colorCode.replace(/\s+/g, "").toUpperCase();

// A short code the store can read the whole design from, e.g. "sh91030-280x100-3-R200x100-F(1203)-M".
export function designCode(product: Product, design: Design): string {
  const size = `${design.width}x${design.depth}`;
  // Chaise: side (R/L), then length x depth.
  const chaise = design.chaiseLength > 0 && `${design.chaiseSide[0].toUpperCase()}${design.chaiseLength}x${design.chaiseDepth}`;
  // The fabric colour code, marked F, when the visitor picked one.
  const color = cleanColorCode(design);
  return [product.sku ?? product.id, size, design.seats || null, chaise, color && `F(${color})`, design.firmness[0].toUpperCase()].filter(Boolean).join("-");
}

interface DesignWords {
  cm: string;
  fabricLabel: string;
  firmness: Record<Firmness, string>;
  seatsCount: (seats: number) => string;
  chaiseOn: (side: Side, length: number, depth: number) => string;
}

// The chosen fabric as text, e.g. "Fabric: Flamingo 2409" (null when not chosen yet).
export function fabricText(design: Design, words: Pick<DesignWords, "fabricLabel">, lang: Lang): string | null {
  return design.colorCode ? `${words.fabricLabel}: ${swatchLabel(design.colorCode, lang)}` : null;
}

// One line for the cart and the WhatsApp order, e.g. "250 × 95 cm · 3 seats · Fabric: REEF-4601".
export function describeDesign(design: Design, rules: DesignRules, words: DesignWords, lang: Lang): string {
  return [
    `${design.width} × ${design.depth} ${words.cm}`,
    SHOW_SEATS && design.seats > 0 && words.seatsCount(design.seats),
    rules.chaise && words.chaiseOn(design.chaiseSide, design.chaiseLength, design.chaiseDepth),
    fabricText(design, words, lang),
    words.firmness[design.firmness],
  ].filter(Boolean).join(" · ");
}

// "Make it yours": the sizes, seat division and fabric a visitor may choose for an upholstered piece.
import type { Product, ProductType } from "../data/catalog";
import { colorOf, fabricOf, FABRICS, type FabricKey } from "../data/fabrics";
import type { Lang } from "../i18n/text";
import { footprint } from "./measure";

export type Side = "left" | "right";
export type Firmness = "soft" | "medium" | "firm";
export const FIRMNESS: Firmness[] = ["soft", "medium", "firm"];

// One visitor's choices for one product. Sizes are in centimetres.
export interface Design {
  width: number;
  depth: number;
  seats: number;
  // Corner sofas only: which side the chaise is on, and how far it reaches.
  chaiseSide: Side;
  chaiseLength: number;
  fabric: FabricKey;
  color: string;
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
}

const SOFA_TYPES: ProductType[] = ["three", "two", "lounge", "sofa", "set32", "sofaotto", "sofabed", "twobed"];
const CORNER_TYPES: ProductType[] = ["corner", "cornerlux"];
const SEAT_TYPES: ProductType[] = ["armchair", "tv", "chairbed", "ottoman", "bench"];
const BED_TYPES: ProductType[] = ["dbed", "bed"];
// A seat cushion narrower or wider than this is uncomfortable.
const SEAT_WIDTH = { min: 55, max: 115 };
const ARMS_CM = 40;

// What can be changed on this product, or null when it is sold as it is (tables, rugs, mattresses).
export function rulesFor(product: Product): DesignRules | null {
  const { type } = product;
  if (CORNER_TYPES.includes(type)) return { shape: "corner", width: { min: 220, max: 350, step: 10 }, depths: [90, 100, 110], seats: [2, 3, 4], chaise: { min: 150, max: 250, step: 10 } };
  if (SOFA_TYPES.includes(type)) return { shape: "sofa", width: { min: 140, max: 340, step: 10 }, depths: [85, 95, 105], seats: [1, 2, 3, 4], chaise: null };
  if (SEAT_TYPES.includes(type)) return { shape: "seat", width: { min: 50, max: 160, step: 5 }, depths: [], seats: [], chaise: null };
  if (BED_TYPES.includes(type)) return { shape: "bed", width: { min: 120, max: 200, step: 20 }, depths: [190, 200], seats: [], chaise: null };
  return null;
}

// Seat divisions that give comfortable cushions at this width.
export function seatChoices(rules: DesignRules, width: number): number[] {
  const inside = width - ARMS_CM;
  return rules.seats.filter((seats) => inside / seats >= SEAT_WIDTH.min && inside / seats <= SEAT_WIDTH.max);
}

const nearest = (value: number, choices: number[]) => choices.reduce((best, choice) => (Math.abs(choice - value) < Math.abs(best - value) ? choice : best));
const within = (value: number, range: Range) => Math.min(range.max, Math.max(range.min, Math.round(value / range.step) * range.step));

// The product as the store usually makes it, before the visitor changes anything.
export function standardDesign(product: Product, rules: DesignRules): Design {
  const typical = footprint(product);
  const width = within(typical.width, rules.width);
  const seats = seatChoices(rules, width);
  return {
    width,
    depth: rules.depths.length > 0 ? nearest(rules.shape === "corner" ? 100 : typical.depth, rules.depths) : typical.depth,
    seats: seats.length > 0 ? nearest(3, seats) : 0,
    chaiseSide: "right",
    chaiseLength: rules.chaise ? within(typical.depth, rules.chaise) : 0,
    fabric: FABRICS[0].key,
    color: FABRICS[0].colors[0].key,
    firmness: "medium",
  };
}

// Keeps the seat division valid after the width changes.
export function withWidth(design: Design, rules: DesignRules, width: number): Design {
  const seats = seatChoices(rules, width);
  return { ...design, width, seats: seats.length === 0 || seats.includes(design.seats) ? design.seats : nearest(design.seats, seats) };
}

// A short code the store can read the whole design from, e.g. "sh91030-280x100-3-VEL-cream-M".
export function designCode(product: Product, design: Design): string {
  const size = `${design.width}x${design.depth}`;
  return [product.sku ?? product.id, size, design.seats || null, design.fabric.slice(0, 3).toUpperCase(), design.color, design.firmness[0].toUpperCase()].filter(Boolean).join("-");
}

interface DesignWords {
  cm: string;
  firmness: Record<Firmness, string>;
  seatsCount: (seats: number) => string;
  chaiseOn: (side: Side, length: number) => string;
}

// One line for the cart and the WhatsApp order, e.g. "250 × 95 cm · 3 seats · Velvet / Cream".
export function describeDesign(design: Design, rules: DesignRules, words: DesignWords, lang: Lang): string {
  const fabric = fabricOf(design.fabric);
  return [
    `${design.width} × ${design.depth} ${words.cm}`,
    design.seats > 0 && words.seatsCount(design.seats),
    rules.chaise && words.chaiseOn(design.chaiseSide, design.chaiseLength),
    `${fabric.name[lang]} / ${colorOf(fabric, design.color).name[lang]}`,
    words.firmness[design.firmness],
  ].filter(Boolean).join(" · ");
}

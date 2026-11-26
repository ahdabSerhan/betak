// Room designer logic: pure functions, no React.
import { PRODUCTS, type CategoryId, type Product, type ProductType } from "../data/catalog";
import { cutoutOf } from "../data/cutouts";

export type RoomKey = "living" | "bedroom" | "dining";
export type RoomSize = "small" | "medium" | "large";
export type SlotKey = "sofa" | "tables" | "armchair" | "rug" | "bed" | "mattress" | "ottoman" | "table" | "chairs" | "sideboard";

export interface Slot {
  key: SlotKey;
  category: CategoryId;
  // This slot's part of the budget, relative to the room's other slots.
  share: number;
  types?: ProductType[];
  quantity?: number;
}

export interface Piece {
  slot: Slot;
  product: Product;
  quantity: number;
}

export interface Taste {
  liked: Product[];
  skipped: Product[];
}

export interface BudgetRange {
  min: number;
  max: number;
  initial: number;
}

export const ROOM_KEYS: RoomKey[] = ["living", "bedroom", "dining"];
export const ROOM_SIZES: RoomSize[] = ["small", "medium", "large"];
export const TASTE_DECK_SIZE = 8;

export const BUDGETS: Record<RoomKey, BudgetRange> = {
  living: { min: 5000, max: 16000, initial: 9000 },
  bedroom: { min: 4000, max: 9000, initial: 6000 },
  dining: { min: 4500, max: 12000, initial: 7000 },
};

const SMALL_ROOM_SOFAS: ProductType[] = ["two", "three", "sofa", "lounge", "sofaotto"];
const LARGE_ROOM_SOFAS: ProductType[] = ["corner", "cornerlux", "set32"];

// Bigger rooms get more pieces; the first slot is the room's main piece.
export function roomSlots(room: RoomKey, size: RoomSize): Slot[] {
  const slots: Record<RoomKey, (Slot | false)[]> = {
    living: [
      { key: "sofa", category: "sofas", share: 5, types: size === "small" ? SMALL_ROOM_SOFAS : size === "large" ? LARGE_ROOM_SOFAS : undefined },
      { key: "tables", category: "sideboards", share: 3 },
      size !== "small" && { key: "armchair", category: "armchairs", share: 2 },
      { key: "rug", category: "rugs", share: 0.5 },
    ],
    bedroom: [
      { key: "bed", category: "beds", share: 5, types: ["dbed", "bed"] },
      { key: "mattress", category: "mattresses", share: 3 },
      size !== "small" && { key: "ottoman", category: "beds", share: 1.5, types: ["bench", "ottoman"] },
      size === "large" && { key: "rug", category: "rugs", share: 0.5 },
    ],
    dining: [
      { key: "table", category: "dining", share: 5, types: ["table", "diningset"] },
      { key: "chairs", category: "dining", share: 4, types: ["chair", "dchair"], quantity: size === "small" ? 4 : 6 },
      size === "large" && { key: "sideboard", category: "sideboards", share: 3, types: ["sideboard", "dresser", "console", "consolewall"] },
    ],
  };
  return slots[room].filter((slot): slot is Slot => slot !== false);
}

const BED_TYPES: ProductType[] = ["dbed", "bed"];
const OTTOMAN_TYPES: ProductType[] = ["bench", "ottoman"];
const CHAIR_TYPES: ProductType[] = ["chair", "dchair"];
const TABLE_TYPES: ProductType[] = ["table", "diningset", "set6"];

// The slot a product fills when the AI designer (not a room template) picked it.
export function slotForProduct(product: Product): Slot {
  const slot = (key: SlotKey, types?: ProductType[]): Slot => ({ key, category: product.category, share: 1, types });
  switch (product.category) {
    case "sofas":
    case "sofa-beds": return slot("sofa");
    case "sideboards": return slot("tables");
    case "armchairs": return slot("armchair");
    case "mattresses": return slot("mattress");
    case "rugs": return slot("rug");
    case "beds": return OTTOMAN_TYPES.includes(product.type) ? slot("ottoman", OTTOMAN_TYPES) : slot("bed", BED_TYPES);
    case "dining": return CHAIR_TYPES.includes(product.type) ? slot("chairs", CHAIR_TYPES) : slot("table", TABLE_TYPES);
  }
}

export function candidates(slot: Slot): Product[] {
  const fitting = PRODUCTS.filter((product) => product.category === slot.category && (!slot.types || slot.types.includes(product.type)));
  // Pieces that can stand in the room as cutouts come first; rugs lie flat, so any rug works.
  const showable = fitting.filter((product) => slot.key === "rug" || cutoutOf(product));
  return showable.length > 0 ? showable : fitting;
}

// A visitor who has not rated anything yet.
export const NO_TASTE: Taste = { liked: [], skipped: [] };

// Likes pull in the same collection and type; skips push the type down.
export function tasteScore(product: Product, taste: Taste): number {
  let score = 0;
  if (product.model && taste.liked.some((liked) => liked.model === product.model)) score += 3;
  if (taste.liked.some((liked) => liked.type === product.type)) score += 2;
  if (taste.liked.includes(product)) score += 2;
  if (taste.skipped.some((skipped) => skipped.type === product.type)) score -= 1;
  if (taste.skipped.includes(product)) score -= 3;
  return score;
}

function shuffle<T>(items: T[]): T[] {
  return items
    .map((item) => ({ item, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);
}

// A random handful of pieces the room could use, for the love-or-skip step.
export function tasteDeck(room: RoomKey, size: RoomSize): Product[] {
  const pool = new Set(roomSlots(room, size).flatMap(candidates));
  return shuffle([...pool]).slice(0, TASTE_DECK_SIZE);
}

// Fills slots in order, giving each its share of the money still left.
export function buildRoom(room: RoomKey, size: RoomSize, budget: number, taste: Taste, randomness = 0): Piece[] {
  const slots = roomSlots(room, size);
  let moneyLeft = budget;
  let sharesLeft = slots.reduce((sum, slot) => sum + slot.share, 0);

  return slots.map((slot) => {
    const quantity = slot.quantity ?? 1;
    const allowance = (moneyLeft * slot.share) / sharesLeft;
    const ranked = candidates(slot)
      .map((product) => ({ product, score: tasteScore(product, taste) + Math.random() * randomness }))
      .sort((a, b) => b.score - a.score || b.product.price - a.product.price);
    const affordable = ranked.find(({ product }) => product.price * quantity <= allowance);
    const cheapest = ranked.reduce((best, entry) => (entry.product.price < best.product.price ? entry : best));
    const { product } = affordable ?? cheapest;

    moneyLeft -= product.price * quantity;
    sharesLeft -= slot.share;
    return { slot, product, quantity };
  });
}

export const roomTotal = (pieces: Piece[]) => pieces.reduce((sum, piece) => sum + piece.product.price * piece.quantity, 0);

// Swap options for a piece, best taste match first.
export function alternatives(piece: Piece, taste: Taste): Product[] {
  return candidates(piece.slot)
    .filter((product) => product !== piece.product)
    .sort((a, b) => tasteScore(b, taste) - tasteScore(a, taste) || a.price - b.price);
}

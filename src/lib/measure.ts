// Room measurements: typical furniture footprints, a top-view layout to scale, and fit checks.
import type { Product, ProductType } from "../data/catalog";
import type { Piece, RoomSize, SlotKey } from "./designer";

export interface RoomDimensions {
  // Metres. The main wall is the one the sofa or bed stands against.
  wall: number;
  depth: number;
}

export interface Footprint {
  // Centimetres, seen from above.
  width: number;
  depth: number;
}

export interface Placed extends Footprint {
  key: string;
  slot: SlotKey;
  x: number;
  y: number;
}

export interface FitCheck {
  kind: "fits" | "tooWide" | "tight";
  // Centimetres: the walkway that is left, or how much too wide the main piece is.
  amount: number;
}

export const WALL_RANGE = { min: 2.5, max: 7, step: 0.1 };
export const DEPTH_RANGE = { min: 2.5, max: 6, step: 0.1 };
export const SOFA_WIDTH_RANGE = { min: 160, max: 340, step: 10 };
// A comfortable passage in front of the furniture.
export const WALKWAY_CM = 80;

const WALL_GAP = 10;
const SIDE_CLEARANCE = 40;

// Typical sizes per furniture type. Betak makes to measure, so these are starting points.
const TYPICAL: Record<ProductType, [width: number, depth: number]> = {
  corner: [280, 190], cornerlux: [300, 200], three: [220, 95], two: [160, 90], lounge: [240, 105], sofa: [210, 95],
  set32: [220, 95], sofaotto: [200, 95], chairbed: [95, 95], twobed: [150, 95], sofabed: [200, 95],
  consolewall: [120, 35], console: [120, 35], dresser: [120, 45], sideboard: [200, 40], sbtable: [200, 40], tables: [110, 70],
  armchair: [90, 90], tv: [90, 95], tantra: [170, 60],
  diningset: [160, 90], set6: [180, 100], table: [160, 90], dchair: [45, 50], chair: [45, 50],
  dbed: [170, 210], bed: [150, 200], bench: [130, 45], ottoman: [60, 60], mattress: [160, 200], rug: [290, 200],
};

export function footprint(product: Product): Footprint {
  const [width, depth] = TYPICAL[product.type];
  return { width, depth };
}

export const areaOf = (room: RoomDimensions) => room.wall * room.depth;

// The designer picks more pieces for bigger rooms.
export function sizeOf(room: RoomDimensions): RoomSize {
  const area = areaOf(room);
  return area < 15 ? "small" : area <= 25 ? "medium" : "large";
}

const MAIN_SLOTS: SlotKey[] = ["sofa", "bed", "table"];
export const mainPiece = (pieces: Piece[]) => pieces.find((piece) => MAIN_SLOTS.includes(piece.slot.key));

// Lays the pieces out from above: the main piece on the main wall, the rest around it.
export function layout(pieces: Piece[], room: RoomDimensions, sofaWidth: number | null): Placed[] {
  const wall = room.wall * 100;
  const depth = room.depth * 100;
  const centred = (width: number) => (wall - width) / 2;
  const main = mainPiece(pieces);
  const mainSize = main ? { ...footprint(main.product), ...(sofaWidth && main.slot.key === "sofa" ? { width: sofaWidth } : {}) } : { width: 0, depth: 0 };
  // A dining table stands in the middle of the room; sofas and beds stand on the main wall.
  const mainY = main?.slot.key === "table" ? (depth - mainSize.depth) / 2 : WALL_GAP;
  const placed: Placed[] = [];
  let sideIndex = 0;

  for (const piece of pieces) {
    const size = piece === main ? mainSize : footprint(piece.product);
    const at = (x: number, y: number) => placed.push({ ...size, key: `${piece.slot.key}-${piece.product.id}`, slot: piece.slot.key, x, y });

    if (piece === main) at(centred(size.width), mainY);
    else if (piece.slot.key === "rug") at(centred(size.width), Math.max(WALL_GAP, mainY + mainSize.depth - 40));
    else if (piece.slot.key === "tables" || piece.slot.key === "sideboard") at(centred(size.width), depth - size.depth - WALL_GAP);
    else if (piece.slot.key === "ottoman") at(centred(size.width), mainY + mainSize.depth + 15);
    else if (piece.slot.key === "chairs") {
      // Chairs sit evenly along the two long sides of the table.
      const perSide = Math.ceil(piece.quantity / 2);
      const tableX = centred(mainSize.width);
      for (let index = 0; index < piece.quantity; index++) {
        const along = tableX + ((index % perSide) + 0.5) * (mainSize.width / perSide) - size.width / 2;
        const y = index < perSide ? mainY - size.depth - 5 : mainY + mainSize.depth + 5;
        placed.push({ ...size, key: `chair-${index}`, slot: "chairs", x: along, y });
      }
    } else if (piece.slot.key !== "mattress") {
      // Armchairs and other extras alternate between the left and right walls.
      const left = sideIndex++ % 2 === 0;
      at(left ? WALL_GAP : wall - size.width - WALL_GAP, mainY + mainSize.depth + 40);
    }
  }
  // Rugs are drawn first so furniture sits on top of them.
  return placed.sort((a, b) => Number(b.slot === "rug") - Number(a.slot === "rug"));
}

// Does the main piece fit the wall, and is there room to walk in front of it?
export function checkFit(pieces: Piece[], room: RoomDimensions, sofaWidth: number | null): FitCheck | null {
  const main = mainPiece(pieces);
  if (!main) return null;
  const placed = layout(pieces, room, sofaWidth);
  const mainBox = placed.find((box) => box.slot === main.slot.key)!;
  const overWidth = mainBox.width + SIDE_CLEARANCE - room.wall * 100;
  if (overWidth > 0) return { kind: "tooWide", amount: Math.round(overWidth) };

  const facing = placed.find((box) => box.slot === "tables" || box.slot === "sideboard");
  const walkway = Math.round((facing ? facing.y : room.depth * 100) - (mainBox.y + mainBox.depth));
  return { kind: walkway >= WALKWAY_CM ? "fits" : "tight", amount: walkway };
}

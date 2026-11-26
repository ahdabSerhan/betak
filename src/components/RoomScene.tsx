import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { cutoutOf } from "../data/cutouts";
import type { Piece, SlotKey } from "../lib/designer";
import { money, quantitySuffix } from "../lib/format";
import { useShop } from "../state/ShopContext";

type Spot = "main" | "left" | "right" | "front" | "far-left" | "far-right" | "rug";

// How a piece was moved and resized by the visitor. x / y are fractions of the room's width and height.
interface Placement {
  x: number;
  y: number;
  zoom: number;
  // Degrees, clockwise.
  turn: number;
  // Mirrored left to right, e.g. to move a corner sofa's chaise to the other side.
  flipped: boolean;
}

interface Point {
  x: number;
  y: number;
}

// One hand gesture on a piece: one pointer moves (or turns) it, two pointers pinch and twist it.
interface Gesture {
  id: number;
  mode: "move" | "turn";
  pointers: Map<number, Point>;
  from: Placement;
  start: Point;
  centre: Point;
  // How far the piece may travel, so its centre stays inside the room.
  reach: { minX: number; maxX: number; minY: number; maxY: number };
  // Distance and angle between the two fingers when the pinch began.
  span: number;
  angle: number;
  moved: boolean;
}

// Where each kind of furniture likes to stand in the room.
const PREFERRED: Record<SlotKey, Spot> = {
  sofa: "main", bed: "main", table: "main",
  tables: "right", sideboard: "right", mattress: "right",
  armchair: "left", chairs: "left",
  ottoman: "front", rug: "rug",
};
const SPARE: Spot[] = ["left", "right", "front", "far-left", "far-right"];
const UNMOVED: Placement = { x: 0, y: 0, zoom: 1, turn: 0, flipped: false };
// A press that moves less than this many pixels is a click (select), not a drag.
const CLICK_SLOP = 6;
const ZOOM = { min: 0.4, max: 2.6, step: 0.15 };
const WHEEL = { zoom: 0.0015, turn: 0.15 };
// Pieces dragged toward the viewer grow a little, as they would in a real room.
const DEPTH_GROWTH = 0.9;
// A piece pushed to the back wall never shrinks below this.
const MIN_DEPTH_SCALE = 0.55;
const RIGHT_BUTTON = 2;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const degrees = (radians: number) => (radians * 180) / Math.PI;
const between = (a: Point, b: Point) => ({ span: Math.hypot(b.x - a.x, b.y - a.y), angle: degrees(Math.atan2(b.y - a.y, b.x - a.x)) });

// Gives every piece its own spot: the preferred one, or the next free one.
function arrange(pieces: Piece[]): Spot[] {
  const taken = new Set<Spot>();
  return pieces.map((piece) => {
    const wanted = PREFERRED[piece.slot.key];
    const spot = taken.has(wanted) ? SPARE.find((spare) => !taken.has(spare)) ?? wanted : wanted;
    taken.add(spot);
    return spot;
  });
}

interface RoomSceneProps {
  pieces: Piece[];
  // The visitor's own room photo; without it a drawn room is shown.
  photo?: string | null;
  onSwap: (index: number) => void;
  onRemove: (index: number) => void;
}

// An empty room with the chosen furniture in it.
// Mouse: drag to move, wheel to zoom, Shift + wheel or right-drag to turn.
// Touch: drag to move, pinch to zoom, twist two fingers to turn.
export function RoomScene({ pieces, photo, onSwap, onRemove }: RoomSceneProps) {
  const { t, nameOf } = useShop();
  const scene = useRef<HTMLDivElement>(null);
  const [placements, setPlacements] = useState<Record<number, Placement>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  const spots = arrange(pieces);

  const placementOf = (id: number) => placements[id] ?? UNMOVED;
  const update = (id: number, change: Partial<Placement> | ((current: Placement) => Partial<Placement>)) =>
    setPlacements((all) => {
      const current = all[id] ?? UNMOVED;
      return { ...all, [id]: { ...current, ...(typeof change === "function" ? change(current) : change) } };
    });

  // Restarts the gesture's reference points, e.g. when a second finger lands or one lifts.
  const rebase = (current: Gesture, from: Placement) => {
    const [first, second] = [...current.pointers.values()];
    current.from = from;
    current.start = first;
    if (second) Object.assign(current, between(first, second));
  };

  const onPiecePointerDown = (event: PointerEvent<HTMLDivElement>, id: number) => {
    if (gesture.current) return;
    if (!scene.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    const room = scene.current.getBoundingClientRect();
    const from = placementOf(id);
    const centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    gesture.current = {
      id, from, centre, start: { x: event.clientX, y: event.clientY }, span: 0, angle: 0, moved: false,
      mode: event.button === RIGHT_BUTTON || event.altKey ? "turn" : "move",
      pointers: new Map(),
      reach: {
        minX: from.x - (centre.x - room.left) / room.width, maxX: from.x + (room.right - centre.x) / room.width,
        minY: from.y - (centre.y - room.top) / room.height, maxY: from.y + (room.bottom - centre.y) / room.height,
      },
    };
  };

  // Every pointer that lands in the room while a piece is held joins that piece's gesture.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current) {
      if (event.target === event.currentTarget) setSelected(null);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    rebase(current, placementOf(current.id));
    if (current.pointers.size > 1) current.moved = true;
    setBusy(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current?.pointers.has(event.pointerId) || !scene.current) return;
    current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const [first, second] = [...current.pointers.values()];

    if (second) {
      // Two fingers: their distance zooms the piece, their angle turns it.
      const now = between(first, second);
      update(current.id, { zoom: clamp((current.from.zoom * now.span) / current.span, ZOOM.min, ZOOM.max), turn: current.from.turn + now.angle - current.angle });
      return;
    }
    const deltaX = first.x - current.start.x;
    const deltaY = first.y - current.start.y;
    if (!current.moved && Math.hypot(deltaX, deltaY) < CLICK_SLOP) return;
    current.moved = true;
    if (current.mode === "turn") {
      const before = degrees(Math.atan2(current.start.y - current.centre.y, current.start.x - current.centre.x));
      const after = degrees(Math.atan2(first.y - current.centre.y, first.x - current.centre.x));
      update(current.id, { turn: current.from.turn + after - before });
      return;
    }
    const { width, height } = scene.current.getBoundingClientRect();
    const { reach } = current;
    update(current.id, { x: clamp(current.from.x + deltaX / width, reach.minX, reach.maxX), y: clamp(current.from.y + deltaY / height, reach.minY, reach.maxY) });
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current?.pointers.delete(event.pointerId)) return;
    if (current.pointers.size > 0) return rebase(current, placementOf(current.id));
    // A press without movement selects the piece and shows its tools.
    if (!current.moved) setSelected(selected === current.id ? null : current.id);
    gesture.current = null;
    setBusy(false);
  };

  // The wheel zooms the piece under the pointer; with Shift it turns it. Needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const room = scene.current!;
    const onWheel = (event: WheelEvent) => {
      const piece = (event.target as Element).closest<HTMLElement>("[data-piece]");
      if (!piece) return;
      event.preventDefault();
      const id = Number(piece.dataset.piece);
      const amount = event.deltaY || event.deltaX;
      if (event.shiftKey) update(id, (current) => ({ turn: current.turn + amount * WHEEL.turn }));
      else update(id, (current) => ({ zoom: clamp(current.zoom - amount * WHEEL.zoom, ZOOM.min, ZOOM.max) }));
    };
    room.addEventListener("wheel", onWheel, { passive: false });
    return () => room.removeEventListener("wheel", onWheel);
  }, []);

  const zoom = (id: number, direction: 1 | -1) => update(id, (current) => ({ zoom: clamp(current.zoom + direction * ZOOM.step, ZOOM.min, ZOOM.max) }));

  return (
    <div className={`scene ${busy ? "busy" : ""} ${photo ? "own" : ""}`} ref={scene} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onContextMenu={(event) => event.preventDefault()}>
      {photo ? <img className="scene-photo" src={photo} alt="" draggable={false} /> : (
        <>
          <div className="scene-window" />
          <div className="scene-curtain" />
          <div className="scene-floor" />
          <div className="scene-light" />
        </>
      )}
      {pieces.map((piece, index) => {
        const id = piece.product.id;
        const cutout = cutoutOf(piece.product);
        const placement = placementOf(id);
        const kind = cutout ? "" : piece.slot.key === "rug" ? "flat" : "framed";
        const style = {
          "--dx": placement.x * 100, "--dy": placement.y * 100, "--grow": Math.max(MIN_DEPTH_SCALE, 1 + placement.y * DEPTH_GROWTH) * placement.zoom,
          "--turn": `${placement.turn}deg`, "--flip": placement.flipped ? -1 : 1, animationDelay: `${index * 140}ms`,
        } as CSSProperties;
        return (
          <div className={`scene-piece at-${spots[index]} ${kind} ${selected === id ? "selected" : ""}`} style={style} data-piece={id} role="button" tabIndex={0} aria-label={nameOf(piece.product)}
            onPointerDown={(event) => onPiecePointerDown(event, id)} onKeyDown={(event) => event.key === "Enter" && setSelected(id)} key={`${piece.slot.key}-${id}`}>
            <img src={cutout ?? piece.product.image} alt="" draggable={false} />
            <span className="scene-tag">
              <b>{nameOf(piece.product)}{quantitySuffix(piece.quantity)}</b>
              <span className="price">{money(piece.product.price * piece.quantity)}</span>
            </span>
            {selected === id && (
              // The tools must not start a drag of the piece under them.
              <span className="scene-tools" onPointerDown={(event) => event.stopPropagation()}>
                <button onClick={() => zoom(id, -1)} aria-label={t.zoomOut}>−</button>
                <button onClick={() => zoom(id, 1)} aria-label={t.zoomIn}>+</button>
                <button onClick={() => update(id, { turn: placement.turn + 15 })} aria-label={t.rotate}>⟳</button>
                <button onClick={() => update(id, { flipped: !placement.flipped })}>{t.flip}</button>
                <button onClick={() => onSwap(index)}>{t.swap}</button>
                <button className="danger" onClick={() => { setSelected(null); onRemove(index); }}>{t.remove}</button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

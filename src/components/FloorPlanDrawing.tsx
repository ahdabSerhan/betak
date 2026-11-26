import type { Placed, RoomDimensions } from "../lib/measure";
import { useShop } from "../state/ShopContext";

// Space around the room for the dimension lines, in centimetres of drawing.
const MARGIN = 70;
const TICK = 10;

interface FloorPlanDrawingProps {
  room: RoomDimensions;
  title: string;
  placed?: Placed[];
}

// A dimension line with end ticks and its measurement, like on an architect's drawing.
export function Dimension({ x1, y1, x2, y2, label }: { x1: number; y1: number; x2: number; y2: number; label: string }) {
  const vertical = x1 === x2;
  const middleX = (x1 + x2) / 2;
  const middleY = (y1 + y2) / 2;
  return (
    <g className="plan-dimension">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical
        ? <><line x1={x1 - TICK} y1={y1} x2={x1 + TICK} y2={y1} /><line x1={x2 - TICK} y1={y2} x2={x2 + TICK} y2={y2} /></>
        : <><line x1={x1} y1={y1 - TICK} x2={x1} y2={y1 + TICK} /><line x1={x2} y1={y2 - TICK} x2={x2} y2={y2 + TICK} /></>}
      <text x={middleX} y={middleY} dx={vertical ? -16 : 0} dy={vertical ? 0 : -14} transform={vertical ? `rotate(-90 ${middleX - 16} ${middleY})` : undefined}>{label}</text>
    </g>
  );
}

// The room from above, drawn to scale, with its measurements and (optionally) the furniture.
export function FloorPlanDrawing({ room, title, placed = [] }: FloorPlanDrawingProps) {
  const { t } = useShop();
  const wall = room.wall * 100;
  const depth = room.depth * 100;

  return (
    <svg className="plan-drawing" viewBox={`${-MARGIN} ${-MARGIN} ${wall + MARGIN * 1.4} ${depth + MARGIN * 1.4}`} role="img" aria-label={`${title}: ${room.wall} × ${room.depth} ${t.metres}`}>
      <rect className="plan-walls" width={wall} height={depth} rx="6" />
      <Dimension x1={0} y1={-34} x2={wall} y2={-34} label={`${room.wall.toFixed(1)} ${t.metres}`} />
      <Dimension x1={-34} y1={0} x2={-34} y2={depth} label={`${room.depth.toFixed(1)} ${t.metres}`} />

      {placed.map((box) => (
        <g className={`plan-item plan-${box.slot}`} key={box.key}>
          <rect x={box.x} y={box.y} width={box.width} height={box.depth} rx={box.slot === "rug" ? 4 : 10} />
          {box.slot !== "chairs" && (
            <text x={box.x + box.width / 2} y={box.y + box.depth / 2}>
              <tspan x={box.x + box.width / 2} dy="-4">{t.slots[box.slot]}</tspan>
              <tspan x={box.x + box.width / 2} dy="18">{box.width} × {box.depth}</tspan>
            </text>
          )}
        </g>
      ))}

      {placed.length === 0 && (
        <text className="plan-title" x={wall / 2} y={depth / 2}>
          <tspan x={wall / 2}>{title}</tspan>
          <tspan x={wall / 2} dy="26">{(room.wall * room.depth).toFixed(1)} {t.squareMetres}</tspan>
        </text>
      )}
    </svg>
  );
}

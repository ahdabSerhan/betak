import { colorOf, fabricOf, type FabricKey } from "../data/fabrics";
import type { Design, DesignRules } from "../lib/custom";
import { useShop } from "../state/ShopContext";
import { Dimension } from "./FloorPlanDrawing";

// Space around the piece for the dimension lines, and the thickness of arms and back, in centimetres.
const MARGIN = 62;
const ARM = 20;
const BACK = 22;
const GAP = 4;

// A light texture over the colour, so velvet, bouclé, linen and leather look different.
function Texture({ fabric }: { fabric: FabricKey }) {
  return (
    <defs>
      <pattern id="weave-boucle" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.6" /><circle cx="7" cy="6.5" r="1.4" /></pattern>
      <pattern id="weave-linen" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 3H6M3 0V6" strokeWidth="0.7" /></pattern>
      <linearGradient id="weave-velvet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".16" /></linearGradient>
      <linearGradient id="weave-leather" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".34" /><stop offset=".35" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <style>{`.design-piece .weave { fill: url(#weave-${fabric}); }`}</style>
    </defs>
  );
}

// One upholstered block (seat, arm, cushion) in the chosen colour and texture.
function Block({ x, y, width, height, radius = 9 }: { x: number; y: number; width: number; height: number; radius?: number }) {
  return (
    <>
      <rect x={x} y={y} width={width} height={height} rx={radius} />
      <rect className="weave" x={x} y={y} width={width} height={height} rx={radius} />
    </>
  );
}

// The piece seen from above, drawn to scale in its fabric, with its measurements.
interface DesignDrawingProps {
  design: Design;
  rules: DesignRules;
  // A plain line drawing without the fabric, for small previews and option cards.
  outline?: boolean;
  dimensions?: boolean;
}

export function DesignDrawing({ design, rules, outline = false, dimensions = true }: DesignDrawingProps) {
  const { t } = useShop();
  const { width, depth, seats, chaiseLength } = design;
  const fabric = fabricOf(design.fabric);
  const hasChaise = rules.chaise !== null;
  const height = hasChaise ? chaiseLength : depth;
  const onRight = design.chaiseSide === "right";
  const isBed = rules.shape === "bed";
  const inner = width - ARM * 2;
  const cushions = Math.max(seats, 1);
  const cushion = inner / cushions;
  // The chaise takes the place of the end seat and reaches forward.
  const chaiseWidth = cushion + ARM;
  const chaiseX = onRight ? width - chaiseWidth : 0;
  const margin = dimensions ? MARGIN : 6;

  return (
    <svg className={outline ? "design-drawing outline" : "design-drawing"} viewBox={`${-margin} ${-margin} ${width + margin * 2} ${height + margin * (dimensions ? 1.6 : 2)}`} role="img" aria-label={`${width} × ${depth} ${t.cm}`}>
      {!outline && <Texture fabric={design.fabric} />}
      <g className="design-piece" style={{ fill: outline ? "#fff" : colorOf(fabric, design.color).hex }}>
        <Block x={0} y={0} width={width} height={depth} radius={14} />
        {hasChaise && <Block x={chaiseX} y={0} width={chaiseWidth} height={chaiseLength} radius={14} />}
        {isBed ? (
          <>
            <Block x={0} y={0} width={width} height={BACK} radius={8} />
            <rect className="design-linen" x={10} y={BACK + 6} width={width - 20} height={depth - BACK - 16} rx="10" />
            <rect className="design-linen" x={18} y={BACK + 14} width={width / 2 - 26} height={34} rx="12" />
            <rect className="design-linen" x={width / 2 + 8} y={BACK + 14} width={width / 2 - 26} height={34} rx="12" />
          </>
        ) : (
          <>
            <Block x={0} y={0} width={width} height={BACK} radius={10} />
            {!(hasChaise && !onRight) && <Block x={0} y={BACK - 6} width={ARM} height={depth - BACK + 6} />}
            {!(hasChaise && onRight) && <Block x={width - ARM} y={BACK - 6} width={ARM} height={depth - BACK + 6} />}
            {Array.from({ length: cushions }, (_, index) => (
              <Block x={ARM + index * cushion + GAP / 2} y={BACK + GAP} width={cushion - GAP} height={24} radius={11} key={index} />
            ))}
            {Array.from({ length: cushions - 1 }, (_, index) => (
              <line className="design-seam" x1={ARM + (index + 1) * cushion} y1={BACK + 34} x2={ARM + (index + 1) * cushion} y2={depth - 4} key={index} />
            ))}
          </>
        )}
      </g>

      {dimensions && (
        <>
          <Dimension x1={0} y1={-30} x2={width} y2={-30} label={`${width} ${t.cm}`} />
          <Dimension x1={onRight ? -30 : width + 30} y1={0} x2={onRight ? -30 : width + 30} y2={depth} label={`${depth}`} />
          {hasChaise && <Dimension x1={onRight ? width + 30 : -30} y1={0} x2={onRight ? width + 30 : -30} y2={chaiseLength} label={`${chaiseLength}`} />}
        </>
      )}
    </svg>
  );
}

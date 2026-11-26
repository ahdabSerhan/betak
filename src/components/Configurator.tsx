import { useState, type ReactNode } from "react";
import type { Product } from "../data/catalog";
import { cleanColorCode, designCode, fabricText, FIRMNESS, seatChoices, SHOW_SEATS, withWidth, type Design, type DesignRules } from "../lib/custom";
import { useShop } from "../state/ShopContext";
import { DesignDrawing } from "./DesignDrawing";
import { Fold } from "./Fold";

type Step = "size" | "seats" | "fabric" | "firmness";

interface ConfiguratorProps {
  design: Design;
  rules: DesignRules;
  onChange: (design: Design) => void;
  onReset: () => void;
}

interface SliderProps {
  label: string;
  value: number;
  range: { min: number; max: number; step: number };
  unit: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, range, unit, onChange }: SliderProps) {
  return (
    <label className="config-slider">
      <span>{label}<b>{value} {unit}</b></span>
      <input type="range" min={range.min} max={range.max} step={range.step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <small className="muted">{range.min}–{range.max} {unit}</small>
    </label>
  );
}

// What the visitor chose in each step, as short text.
function useChosen(design: Design): Record<Step, string> {
  const { t } = useShop();
  return {
    size: `${design.width} × ${design.depth} ${t.cm}`,
    seats: t.seatsCount(design.seats),
    fabric: fabricText(design, t),
    firmness: t.firmness[design.firmness],
  };
}

// "Your design": the finished choice as a small drawing and a table, with a code the store can read it from.
export function DesignSummary({ product, design, rules }: { product: Product; design: Design; rules: DesignRules }) {
  const { t } = useShop();
  const [copied, setCopied] = useState(false);
  const chosen = useChosen(design);
  const code = designCode(product, design);

  const spec: [label: string, value: string][] = [
    [t.specShape, t.shapes[rules.shape]],
    [t.specSize, chosen.size],
    ...(SHOW_SEATS && rules.seats.length > 0 ? [[t.specSeats, chosen.seats] as [string, string]] : []),
    ...(rules.chaise ? [[t.configChaise, `${t.sides[design.chaiseSide]} · ${design.chaiseLength} ${t.cm}`] as [string, string], [t.configChaiseDepth, `${design.chaiseDepth} ${t.cm}`] as [string, string]] : []),
    [t.specColorCode, cleanColorCode(design) || t.colorCodeMissing],
    [t.configSteps.firmness, chosen.firmness],
    [t.specCode, code],
  ];

  const copySpec = async () => {
    await navigator.clipboard?.writeText(spec.map(([label, value]) => `${label}: ${value}`).join("\n"));
    setCopied(true);
  };

  return (
    <section className="config-sheet" aria-label={t.configYours}>
      <h3>{t.configYours}</h3>
      <DesignDrawing design={design} rules={rules} outline />
      <dl>
        {spec.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <button className="link small" onClick={copySpec}>⧉ {copied ? t.specCopied : t.specCopy}</button>
      <small className="muted">{t.configNote}</small>
    </section>
  );
}

// "Make it yours": numbered sections that expand in place; each closed row shows the current choice.
export function Configurator({ design, rules, onChange, onReset }: ConfiguratorProps) {
  const { t } = useShop();
  const steps: Step[] = SHOW_SEATS && rules.seats.length > 0 ? ["size", "seats", "fabric", "firmness"] : ["size", "fabric", "firmness"];
  const [open, setOpen] = useState<Step | null>("size");
  const change = (part: Partial<Design>) => onChange({ ...design, ...part });

  const chosen = useChosen(design);

  const panels: Record<Step, ReactNode> = {
    size: (
      <>
        <Slider label={rules.shape === "bed" ? t.configMattress : t.configWidth} value={design.width} range={rules.width} unit={t.cm} onChange={(width) => onChange(withWidth(design, rules, width))} />
        {rules.depths.length > 0 && (
          <div className="config-row">
            <span>{rules.shape === "bed" ? t.configLength : rules.chaise ? t.configSofaDepth : t.configDepth}</span>
            <div className="chips">
              {rules.depths.map((depth) => <button className="chip" aria-pressed={design.depth === depth} onClick={() => change({ depth })} key={depth}>{depth} {t.cm}</button>)}
            </div>
          </div>
        )}
        {rules.chaise && (
          <>
            <Slider label={t.configChaise} value={design.chaiseLength} range={rules.chaise} unit={t.cm} onChange={(chaiseLength) => change({ chaiseLength })} />
            {/* The chaise seat has its own depth, chosen from the same depths as the sofa. */}
            <div className="config-row">
              <span>{t.configChaiseDepth}</span>
              <div className="chips">
                {rules.depths.map((chaiseDepth) => <button className="chip" aria-pressed={design.chaiseDepth === chaiseDepth} onClick={() => change({ chaiseDepth })} key={chaiseDepth}>{chaiseDepth} {t.cm}</button>)}
              </div>
            </div>
            <div className="config-row">
              <span>{t.configSide}</span>
              <div className="chips">
                {(["right", "left"] as const).map((side) => <button className="chip" aria-pressed={design.chaiseSide === side} onClick={() => change({ chaiseSide: side })} key={side}>{t.sides[side]}</button>)}
              </div>
            </div>
          </>
        )}
      </>
    ),
    seats: (
      <div className="config-cards">
        {seatChoices(rules, design.width).map((seats) => (
          <button aria-pressed={design.seats === seats} onClick={() => change({ seats })} key={seats}>
            <DesignDrawing design={{ ...design, seats }} rules={rules} outline dimensions={false} />
            {t.seatsCount(seats)}
          </button>
        ))}
      </div>
    ),
    firmness: (
      <div className="config-cards">
        {FIRMNESS.map((firmness) => (
          <button aria-pressed={design.firmness === firmness} onClick={() => change({ firmness })} key={firmness}>
            <b>{t.firmness[firmness]}</b>
            <small>{t.firmnessFeel[firmness]}</small>
          </button>
        ))}
      </div>
    ),
    fabric: (
      <>
        {/* The fabrics and colours are shown in the product photos, so the visitor types the code printed there. */}
        <p className="config-photo-hint" id="color-code-hint">{t.colorCodeHint}</p>
        <label className="config-code">
          <span>{t.colorCodeLabel}</span>
          <input type="text" dir="ltr" value={design.colorCode} maxLength={20} autoComplete="off" spellCheck={false} placeholder={t.colorCodePlaceholder} aria-describedby="color-code-hint" onChange={(event) => change({ colorCode: event.target.value })} />
        </label>
      </>
    ),
  };

  return (
    <section className="config" aria-label={t.configTitle}>
      <header className="config-head">
        <b>✦ {t.configTitle}</b>
        <button className="link small" onClick={onReset}>{t.configReset}</button>
      </header>

      {steps.map((step, index) => (
        <Fold number={index + 1} title={t.configSteps[step]} chosen={chosen[step]} open={open === step} onToggle={() => setOpen(open === step ? null : step)} key={step}>
          {panels[step]}
        </Fold>
      ))}
    </section>
  );
}

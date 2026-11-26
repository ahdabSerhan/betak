import { useEffect, useRef, useState } from "react";
import type { Product } from "../data/catalog";
import { cutoutOf } from "../data/cutouts";
import { catalogsFor, findSwatch, swatchImage, swatchLabel, type Swatch } from "../data/fabrics";
import { useShop } from "../state/ShopContext";
import { Dialog } from "./Dialog";

// The preview is drawn at most this wide, which is enough for the dialog and quick to recolour.
const PREVIEW_WIDTH = 720;
// How far (RGB distance) a pixel may be from the upholstery's own colour and still count as fabric.
const FABRIC_NEAR = 70;
const FABRIC_FAR = 150;

const toRgb = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

// The piece's cut-out photo repainted in the swatch colour: each pixel keeps its light and shade,
// and pixels far from the upholstery colour (wooden legs, props) are left mostly as they are.
function TintedPhoto({ src, color, alt }: { src: string; color: string; alt: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<ImageData | null>(null);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, PREVIEW_WIDTH / image.naturalWidth);
      const board = document.createElement("canvas");
      board.width = Math.round(image.naturalWidth * scale);
      board.height = Math.round(image.naturalHeight * scale);
      const context = board.getContext("2d", { willReadFrequently: true })!;
      context.drawImage(image, 0, 0, board.width, board.height);
      setPhoto(context.getImageData(0, 0, board.width, board.height));
    };
    image.src = src;
  }, [src]);

  useEffect(() => {
    if (!photo || !canvas.current) return;
    const source = photo.data;
    // The upholstery colour: the median of the visible pixels, since the fabric covers most of the piece.
    const visible: number[][] = [];
    for (let i = 0; i < source.length; i += 16) if (source[i + 3] > 200) visible.push([source[i], source[i + 1], source[i + 2]]);
    const median = [0, 1, 2].map((c) => visible.map((p) => p[c]).sort((a, b) => a - b)[visible.length >> 1] ?? 128);
    const baseLight = luminance(median[0], median[1], median[2]);
    const [r, g, b] = toRgb(color);

    const out = new ImageData(photo.width, photo.height);
    const target = out.data;
    for (let i = 0; i < source.length; i += 4) {
      const [sr, sg, sb] = [source[i], source[i + 1], source[i + 2]];
      // Light and shade relative to the fabric's average, laid over the new colour.
      const shade = luminance(sr, sg, sb) - baseLight;
      const distance = Math.hypot(sr - median[0], sg - median[1], sb - median[2]);
      const weight = Math.min(1, Math.max(0, (FABRIC_FAR - distance) / (FABRIC_FAR - FABRIC_NEAR)));
      target[i] = sr + (r + shade - sr) * weight;
      target[i + 1] = sg + (g + shade - sg) * weight;
      target[i + 2] = sb + (b + shade - sb) * weight;
      target[i + 3] = source[i + 3];
    }
    canvas.current.width = photo.width;
    canvas.current.height = photo.height;
    canvas.current.getContext("2d")!.putImageData(out, 0, 0);
  }, [photo, color]);

  return <canvas ref={canvas} className="fabric-preview-photo" role="img" aria-label={alt} />;
}

interface FabricPickerProps {
  product: Product;
  code: string;
  onPick: (code: string) => void;
}

// The fabric step: the chosen swatch, and a button that opens the catalogs.
export function FabricPicker({ product, code, onPick }: FabricPickerProps) {
  const { t, lang } = useShop();
  const [open, setOpen] = useState(false);
  const chosen = findSwatch(code);

  return (
    <div className="fabric-step">
      {chosen && (
        <div className="fabric-chosen">
          <img src={swatchImage(chosen.swatch)} alt="" />
          <b dir="auto">{swatchLabel(code, lang)}</b>
        </div>
      )}
      {/* A code typed in the old free-text field, from before the catalogs. */}
      {code && !chosen && <b className="fabric-chosen" dir="ltr">{code}</b>}
      <button className="btn ghost" onClick={() => setOpen(true)}>{chosen ? t.fabricChange : t.fabricPick}</button>
      {open && <FabricDialog product={product} code={code} onPick={(picked) => { onPick(picked); setOpen(false); }} onClose={() => setOpen(false)} />}
    </div>
  );
}

// Catalog tabs, a grid of swatches, and the piece previewed in the selected colour.
function FabricDialog({ product, code, onPick, onClose }: FabricPickerProps & { onClose: () => void }) {
  const { t, lang, nameOf } = useShop();
  const catalogs = catalogsFor(product);
  const start = findSwatch(code);
  const [catalogId, setCatalogId] = useState(start && catalogs.includes(start.catalog) ? start.catalog.id : catalogs[0].id);
  const [selected, setSelected] = useState<Swatch>(start?.swatch ?? catalogs[0].swatches[0]);
  const catalog = catalogs.find((item) => item.id === catalogId)!;
  const cutout = cutoutOf(product);
  const label = swatchLabel(selected.code, lang);
  const colors = catalogs.reduce((sum, item) => sum + item.swatches.length, 0);

  return (
    <Dialog label={t.configSteps.fabric} onClose={onClose} narrow>
      <div className="fabric-dialog">
        <div className="fabric-head">
          <h2>{t.configSteps.fabric}</h2>
          <small className="muted">{t.fabricColors(colors, catalogs.length)}</small>
        </div>

        <figure className="fabric-preview">
          {cutout ? <TintedPhoto src={cutout} color={selected.color} alt={`${nameOf(product)} · ${label}`} /> : <img src={swatchImage(selected)} alt={label} />}
          <figcaption>
            <b dir="auto">{label}</b>
            <span className="fabric-badge">{t.fabricSimulation}</span>
          </figcaption>
        </figure>
        <small className="muted">{cutout ? t.fabricSimulationNote : t.fabricNoPreview}</small>

        <div className="chips" role="group" aria-label={t.fabricLabel}>
          {catalogs.map((item) => (
            <button className="chip" aria-pressed={item.id === catalogId} onClick={() => setCatalogId(item.id)} key={item.id}>
              {item.name[lang]} · {item.swatches.length}
            </button>
          ))}
        </div>

        <div className="fabric-grid" role="group" aria-label={catalog.name[lang]}>
          {catalog.swatches.map((swatch) => (
            <button aria-pressed={swatch.code === selected.code} aria-label={swatch.code} onClick={() => setSelected(swatch)} key={swatch.code}>
              <img src={swatchImage(swatch)} alt="" loading="lazy" />
              {/* The tab already names the catalog, so the tile shows the number only. */}
              <span dir="ltr">{swatch.code.replace(/^\D+/, "")}</span>
            </button>
          ))}
        </div>

        <button className="btn fabric-confirm" onClick={() => onPick(selected.code)}>
          {t.fabricConfirm} ·{" "}<span dir="auto">{label}</span>
        </button>
      </div>
    </Dialog>
  );
}

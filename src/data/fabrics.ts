// The store's fabric catalogs, cut out of the fabric charts photographed on betak.co.il (scripts/fabric-swatches.py).
import type { Product } from "./catalog";
import raw from "./fabrics.json";
import { asset } from "../lib/asset";
import type { Lang } from "../i18n/text";

export interface Swatch {
  // The code printed next to the colour on the chart, e.g. "REEF-4601" or "Flamingo 2409".
  code: string;
  file: string;
  // The swatch's typical colour, used to tint the sofa preview.
  color: string;
}

export interface FabricCatalog {
  id: string;
  name: { he: string; en: string };
  swatches: Swatch[];
}

export const FABRIC_CATALOGS: FabricCatalog[] = raw.catalogs;
const BY_PRODUCT: Record<string, string[] | undefined> = raw.products;
const WITH_PROPS = new Set(raw.props);

// The catalogs pictured in this product's gallery; all of them when its gallery shows none.
export function catalogsFor(product: Product): FabricCatalog[] {
  const ids = BY_PRODUCT[product.id];
  return ids ? FABRIC_CATALOGS.filter((catalog) => ids.includes(catalog.id)) : FABRIC_CATALOGS;
}

export const swatchImage = (swatch: Swatch) => asset(`img/fabrics/${swatch.file}`);

// A mask of the props in the product's cut-out photo (tables, vases, plants), which the preview leaves uncoloured.
export const propsMaskOf = (product: Product) => (WITH_PROPS.has(String(product.id)) ? asset(`img/fabric-props/p${product.id}.png`) : null);

// The catalog and swatch for a colour code, or null for a code typed by hand that is not in any catalog.
export function findSwatch(code: string): { catalog: FabricCatalog; swatch: Swatch } | null {
  for (const catalog of FABRIC_CATALOGS) {
    const swatch = catalog.swatches.find((item) => item.code === code);
    if (swatch) return { catalog, swatch };
  }
  return null;
}

// The code as the visitor reads it: catalogs that print plain numbers get their name in front ("Dream" style codes already carry the name).
export function swatchLabel(code: string, lang: Lang): string {
  const found = findSwatch(code);
  if (!found || /\D/.test(code)) return code;
  return `${found.catalog.name[lang]} · #${code}`;
}

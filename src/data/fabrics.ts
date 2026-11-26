// Upholstery fabrics offered in the product configurator; the visitor types the colour code from the product photos.
// SAMPLE LIST: replace with Betak's real fabric catalogue before launch.
import type { Lang } from "../i18n/text";

export type FabricKey = "velvet" | "boucle" | "linen" | "leather";

export interface Fabric {
  key: FabricKey;
  name: Record<Lang, string>;
  feel: Record<Lang, string>;
}

export const FABRICS: Fabric[] = [
  { key: "velvet", name: { he: "קטיפה", en: "Velvet" }, feel: { he: "מגע רך ומבריק", en: "Soft, with a gentle sheen" } },
  { key: "boucle", name: { he: "בוקלה", en: "Bouclé" }, feel: { he: "מרקם לולאות חמים", en: "Warm, looped texture" } },
  { key: "linen", name: { he: "אריג", en: "Woven linen" }, feel: { he: "אריגה טבעית ונושמת", en: "Natural, breathable weave" } },
  { key: "leather", name: { he: "דמוי עור", en: "Faux leather" }, feel: { he: "חלק וקל לניקוי", en: "Smooth and easy to clean" } },
];

export const fabricOf = (key: FabricKey) => FABRICS.find((fabric) => fabric.key === key) ?? FABRICS[0];

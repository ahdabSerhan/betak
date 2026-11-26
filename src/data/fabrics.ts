// Upholstery fabrics and colours offered in the product configurator.
// SAMPLE LIST: replace with Betak's real fabric catalogue (names and colours) before launch.
import type { Lang } from "../i18n/text";

export type FabricKey = "velvet" | "boucle" | "linen" | "leather";

export interface FabricColor {
  key: string;
  name: Record<Lang, string>;
  hex: string;
}

export interface Fabric {
  key: FabricKey;
  name: Record<Lang, string>;
  feel: Record<Lang, string>;
  colors: FabricColor[];
}

const color = (key: string, he: string, en: string, hex: string): FabricColor => ({ key, name: { he, en }, hex });

export const FABRICS: Fabric[] = [
  {
    key: "velvet", name: { he: "קטיפה", en: "Velvet" }, feel: { he: "מגע רך ומבריק", en: "Soft, with a gentle sheen" },
    colors: [
      color("cream", "שמנת", "Cream", "#d9bf9c"), color("stone", "אבן", "Stone", "#bfb39a"), color("beige", "בז'", "Beige", "#cdb9a0"), color("white", "לבן", "White", "#efece6"),
      color("terracotta", "חום חמרה", "Terracotta", "#8f3a1d"), color("bordeaux", "בורדו", "Bordeaux", "#6b1420"), color("olive", "ירוק זית", "Olive", "#5d6238"), color("navy", "כחול כהה", "Navy", "#1f2c44"),
      color("mustard", "חרדל", "Mustard", "#c08a1e"), color("grey", "אפור", "Grey", "#8d8b88"),
    ],
  },
  {
    key: "boucle", name: { he: "בוקלה", en: "Bouclé" }, feel: { he: "מרקם לולאות חמים", en: "Warm, looped texture" },
    colors: [color("ivory", "שנהב", "Ivory", "#ece5d8"), color("oat", "שיבולת שועל", "Oat", "#d8cab3"), color("taupe", "טאופ", "Taupe", "#a39686"), color("sage", "מרווה", "Sage", "#a3ab94"), color("charcoal", "פחם", "Charcoal", "#4a4947")],
  },
  {
    key: "linen", name: { he: "אריג", en: "Woven linen" }, feel: { he: "אריגה טבעית ונושמת", en: "Natural, breathable weave" },
    colors: [color("sand", "חול", "Sand", "#d2c2a6"), color("greige", "גרייז'", "Greige", "#b7ada0"), color("lightgrey", "אפור בהיר", "Light grey", "#bdbdb9"), color("blue", "כחול מעושן", "Smoky blue", "#6f8496"), color("anthracite", "אנתרציט", "Anthracite", "#3f4245")],
  },
  {
    key: "leather", name: { he: "דמוי עור", en: "Faux leather" }, feel: { he: "חלק וקל לניקוי", en: "Smooth and easy to clean" },
    colors: [color("camel", "קאמל", "Camel", "#b07a45"), color("brown", "חום", "Brown", "#5e3b26"), color("black", "שחור", "Black", "#23211f"), color("offwhite", "אוף-וייט", "Off-white", "#e6dfd2")],
  },
];

export const fabricOf = (key: FabricKey) => FABRICS.find((fabric) => fabric.key === key) ?? FABRICS[0];
export const colorOf = (fabric: Fabric, key: string) => fabric.colors.find((item) => item.key === key) ?? fabric.colors[0];

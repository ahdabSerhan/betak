// The site's pages the assistant can send a visitor to, and how it describes where the visitor is now.
import { CATEGORIES } from "../data/catalog";
import type { Lang } from "../i18n/text";
import { productFromRoute } from "./routes";

// Information pages, with what each one answers (read by the AI, so in English).
const PAGES: Record<string, string> = {
  home: "home page with the 3D showroom",
  designer: "room designer: build a whole room in 3D, also on a photo of the visitor's room",
  saved: "the visitor's saved products",
  about: "about Betak: we make every model ourselves, everything can be custom-made",
  contact: "contact details: phone, WhatsApp, email",
  shipping: "shipping policy: delivery areas, times and fees",
  terms: "terms of use: orders, cancellations, returns and warranty",
  privacy: "privacy policy",
  accessibility: "accessibility statement",
};

// Every page the assistant may link to: the information pages and each category.
export const AGENT_PAGES: Record<string, string> = {
  ...PAGES,
  ...Object.fromEntries(CATEGORIES.map((category) => [category.id, `all ${category.en.toLowerCase()} (category page)`])),
};

export const isAgentPage = (route: unknown): route is string => typeof route === "string" && route in AGENT_PAGES;

// The page list for the AI, one per line as key: what it is.
export const agentPagesText = () => Object.entries(AGENT_PAGES).map(([key, about]) => `${key}: ${about}`).join("\n");

// Where the visitor is, for the AI.
export function describePage(route: string): string {
  const product = productFromRoute(route);
  if (product) return `the product page of ${product.name.en} (id ${product.id})`;
  return AGENT_PAGES[route] ?? AGENT_PAGES.home;
}

// What kind of page a route is, for the hint and the suggested questions.
export type PageKind = { kind: "home" | "designer" | "other" } | { kind: "category"; name: string } | { kind: "product"; name: string };

export function pageKind(route: string, lang: Lang, nameOf: (product: NonNullable<ReturnType<typeof productFromRoute>>) => string): PageKind {
  const product = productFromRoute(route);
  if (product) return { kind: "product", name: nameOf(product) };
  const category = CATEGORIES.find((item) => item.id === route);
  if (category) return { kind: "category", name: category[lang] };
  if (route === "home" || route === "designer") return { kind: route };
  return { kind: "other" };
}

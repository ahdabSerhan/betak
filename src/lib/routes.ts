// Page addresses. On the real site every page has its own path (/sofas, /product/1686-camila-3-seater-sofa)
// so search engines can index it; the Claude preview serves only its first page, so there pages use #routes.
import { CATEGORIES, productById, type Product } from "../data/catalog";

export const USES_PATHS = import.meta.env.BASE_URL === "/";

const PAGES = ["designer", "saved", "about", "contact", "accessibility", "terms", "privacy", "shipping", "paid"];
const PRODUCT_PREFIX = "product-";

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const productRoute = (product: Product) => `${PRODUCT_PREFIX}${product.id}`;
export const productFromRoute = (route: string) => (route.startsWith(PRODUCT_PREFIX) ? productById(Number(route.slice(PRODUCT_PREFIX.length))) : undefined);

// The address of a page, e.g. "product-1686" → "/product/1686-camila-3-seater-sofa".
export function pathOf(route: string): string {
  if (route === "home") return "/";
  if (route === "admin") return "/admin/orders";
  const product = productFromRoute(route);
  if (product) return `/product/${product.id}-${slugify(product.name.en)}`;
  return `/${route}`;
}

// The page at an address; the number at the start of a product's slug is all that counts, so renamed products keep working.
export function routeOf(pathname: string): string {
  const [section, slug] = pathname.split("/").filter(Boolean);
  if (!section) return "home";
  if (section === "product") return `${PRODUCT_PREFIX}${Number.parseInt(slug ?? "", 10)}`;
  return section;
}

export const isRoute = (route: string) =>
  route === "home" || PAGES.includes(route) || CATEGORIES.some((category) => category.id === route) || Boolean(productFromRoute(route));

export const href = (route: string) => (USES_PATHS ? pathOf(route) : `#${route}`);
export const productHref = (product: Product) => href(productRoute(product));

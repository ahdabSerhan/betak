// What the page builder (scripts/prerender.mjs) needs from the app, bundled by Vite so it can read TypeScript and JSON.
export { CATEGORIES, PRODUCTS, productsIn } from "../data/catalog";
export { detailsOf } from "../data/details";
export { pathOf, productRoute } from "../lib/routes";
export { sizeExtraTable } from "../lib/custom";
export { ACCESSIBILITY } from "../data/accessibility";
export { PRIVACY } from "../data/privacy";
export { SHIPPING } from "../data/shipping";
export { TERMS } from "../data/terms";

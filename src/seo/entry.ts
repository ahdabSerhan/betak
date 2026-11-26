// What the page builder (scripts/prerender.mjs) needs from the app, bundled by Vite so it can read TypeScript and JSON.
export { CATEGORIES, PRODUCTS, productsIn } from "../data/catalog";
export { detailsOf, reviewsOf } from "../data/details";
export { pathOf, productRoute } from "../lib/routes";
export { ACCESSIBILITY } from "../data/accessibility";
export { PRIVACY } from "../data/privacy";
export { TERMS } from "../data/terms";

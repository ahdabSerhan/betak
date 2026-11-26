// Builds one HTML file per page, so search engines get each page's own title, description and content
// without running the app. The app then starts on top of it as usual.
// Runs after `vite build`; reads the catalog from the bundle that `vite build --ssr src/seo/entry.ts` made.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ACCESSIBILITY, CATEGORIES, PRIVACY, TERMS, PRODUCTS, detailsOf, pathOf, productRoute, productsIn, reviewsOf } from "../seo-build/entry.js";

const SITE_URL = (process.env.SITE_URL ?? "https://betak.co.il").replace(/\/$/, "");
const DIST = join(dirname(fileURLToPath(import.meta.url)), "../dist");
const BRAND = "רהיטי ביתאק";
const HOME_TITLE = "עולם שלם של רהיטים במחירים משתלמים - רהיטי ביתאק";
const DELIVERY = "משלוחים מהירים לכל הארץ.";
const DESCRIPTION_LENGTH = 155;

const template = readFileSync(join(DIST, "index.html"), "utf8");

const escape = (text) => String(text).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
const absolute = (path) => (path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);
const shekels = (price) => `${price.toLocaleString("en-US")} ₪`;
const clip = (text) => (text.length <= DESCRIPTION_LENGTH ? text : `${text.slice(0, DESCRIPTION_LENGTH - 1).replace(/\s+\S*$/, "")}…`);
const link = (route, text) => `<a href="${pathOf(route)}">${escape(text)}</a>`;
const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

// The menu every page carries, so search engines can follow links to all categories.
const menu = `<nav>${link("home", BRAND)} · ${CATEGORIES.map((category) => link(category.id, category.he)).join(" · ")} · ${link("designer", "עצבו חדר")}</nav>`;

const breadcrumbs = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([route, name], index) => ({ "@type": "ListItem", position: index + 1, name, item: absolute(pathOf(route)) })),
});

function writePage({ route, title, description, image, body, data = [], index = true }) {
  const url = absolute(pathOf(route));
  const head = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    index ? "" : `<meta name="robots" content="noindex" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:locale" content="he_IL" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    image ? `<meta property="og:image" content="${absolute(image)}" />` : "",
    ...data.map(jsonLd),
  ].filter(Boolean).join("\n    ");

  const html = template
    .replace(/<title>[^<]*<\/title>/, head)
    .replace('<div id="root"></div>', `<div id="root">${menu}<main>${body}</main></div>`);
  const file = route === "home" ? join(DIST, "index.html") : join(DIST, pathOf(route), "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  return { url, index };
}

const productLine = (product) => `<li>${link(productRoute(product), product.name.he)} – ${shekels(product.price)}</li>`;

function productPage(product) {
  const category = CATEGORIES.find((item) => item.id === product.category);
  const details = detailsOf(product);
  const reviews = reviewsOf(product);
  const route = productRoute(product);
  const summary = details.paragraphs[0] ?? `${product.name.he} מבית ${BRAND}, ${shekels(product.price)}. כל הדגמים זמינים להזמנה, עם אפשרות למידה, בד וצבע לבחירה.`;

  return writePage({
    route,
    title: `${product.name.he} | ${BRAND}`,
    description: clip(`${summary} ${DELIVERY}`),
    image: product.image,
    body: [
      `<p>${link("home", "דף הבית")} / ${link(category.id, category.he)}</p>`,
      `<h1>${escape(product.name.he)}</h1>`,
      `<p>מחיר: ${shekels(product.price)}${product.listPrice > product.price ? ` (במקום ${shekels(product.listPrice)})` : ""}${product.sku ? ` · מק"ט: ${escape(product.sku)}` : ""}</p>`,
      ...details.paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`),
      details.specs.length ? `<ul>${details.specs.map((spec) => `<li>${escape(spec)}</li>`).join("")}</ul>` : "",
      details.photos.map((photo, index) => `<img src="${photo}" alt="${escape(product.name.he)}${index ? ` ${index + 1}` : ""}" width="600" height="600" />`).join(""),
      reviews.length ? `<h2>לקוחות ממליצים</h2><ul>${reviews.map((review) => `<li>${escape(review.text)} – ${escape(review.name)}</li>`).join("")}</ul>` : "",
    ].join(""),
    data: [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name.he,
        image: details.photos.map(absolute),
        description: summary,
        sku: product.sku || String(product.id),
        brand: { "@type": "Brand", name: BRAND },
        offers: { "@type": "Offer", url: absolute(pathOf(route)), priceCurrency: "ILS", price: product.price, availability: "https://schema.org/InStock" },
      },
      breadcrumbs([["home", BRAND], [category.id, category.he], [route, product.name.he]]),
    ],
  });
}

function categoryPage(category) {
  const products = productsIn(category.id);
  const cheapest = Math.min(...products.map((product) => product.price));
  return writePage({
    route: category.id,
    title: `${category.h1.he} | ${BRAND}`,
    description: clip(`${category.h1.he} מבית ${BRAND}: ${products.length} דגמים, החל מ-${shekels(cheapest)}. ${DELIVERY}`),
    image: products[0]?.image,
    body: `<h1>${escape(category.h1.he)}</h1><ul>${products.map(productLine).join("")}</ul>`,
    data: [breadcrumbs([["home", BRAND], [category.id, category.he]])],
  });
}

// A pre-built page of legal text (terms, privacy policy).
function statementPage(route, description, statement) {
  return writePage({
    route,
    title: `${statement.title} | ${BRAND}`,
    description: clip(description),
    body: `<h1>${escape(statement.title)}</h1><p>${escape(statement.updated)}</p>${statement.sections.map((section) => `<h2>${escape(section.title)}</h2>${(section.paragraphs ?? []).map((text) => `<p>${escape(text)}</p>`).join("")}${section.items ? `<ul>${section.items.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>` : ""}`).join("")}`,
  });
}

const pages = [
  writePage({
    route: "home",
    title: HOME_TITLE,
    description: clip(`${BRAND}: ${CATEGORIES.map((category) => category.he).join(", ")} במחירים משתלמים, ועיצוב חדר בעזרת בינה מלאכותית. ${DELIVERY}`),
    image: "/img/hero1.webp",
    body: `<h1>${escape(HOME_TITLE)}</h1><ul>${PRODUCTS.filter((product) => product.featured).map(productLine).join("")}</ul>`,
    data: [{ "@context": "https://schema.org", "@type": "FurnitureStore", name: BRAND, url: SITE_URL, telephone: "+972-54-693-8334", email: "support@betak.co.il", logo: absolute("/img/logo.webp") }],
  }),
  ...CATEGORIES.map(categoryPage),
  ...PRODUCTS.map(productPage),
  writePage({ route: "designer", title: `עצבו חדר | ${BRAND}`, description: clip(`עצבו את החדר שלכם עם רהיטי ${BRAND}: בחרו חדר, מידות, תקציב וסגנון, או העלו תמונה של החדר.`), body: "<h1>עצבו חדר</h1>" }),
  writePage({ route: "about", title: `אודות | ${BRAND}`, description: clip(`${BRAND} – רהיטים לבית ולעסק במחירים הוגנים. ${DELIVERY}`), body: "<h1>אודות ביתאק</h1>" }),
  writePage({ route: "contact", title: `צור קשר | ${BRAND}`, description: clip(`צרו קשר עם ${BRAND}: טלפון 054-6938334, וואטסאפ ומייל support@betak.co.il.`), body: "<h1>צור קשר</h1>" }),
  statementPage("accessibility", `${ACCESSIBILITY.he.title} של אתר ${BRAND}: רמת הנגישות, ההתאמות שבוצעו ופרטי רכז/ת הנגישות.`, ACCESSIBILITY.he),
  statementPage("terms", `${TERMS.he.title} ${BRAND}: הזמנות, תשלום, ביטול עסקאות, אחריות ושירות.`, TERMS.he),
  statementPage("privacy", `${PRIVACY.he.title} של ${BRAND}: איזה מידע נאסף, עוגיות (Cookies), שיתוף מידע וזכויות המשתמש.`, PRIVACY.he),
  writePage({ route: "saved", title: `הרשימה שלי | ${BRAND}`, description: `הרהיטים ששמרתם ב${BRAND}.`, body: "<h1>הרשימה שלי</h1>", index: false }),
];

const indexed = pages.filter((page) => page.index);
writeFileSync(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexed.map((page) => `  <url><loc>${page.url}</loc></url>`).join("\n")}\n</urlset>\n`);
writeFileSync(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
// The server uses this to send the old site's product addresses to the new ones.
writeFileSync(join(DIST, "routes.json"), JSON.stringify(Object.fromEntries(PRODUCTS.map((product) => [product.id, pathOf(productRoute(product))]))));

console.log(`Pre-built ${pages.length} pages (${indexed.length} in the sitemap) for ${SITE_URL}`);

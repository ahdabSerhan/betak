# Betak website

New site for Betak Furniture (רהיטי ביתאק), replacing the old betak.co.il on the 2all builder.
Vite + React 19 + TypeScript, plain CSS, three.js. Hebrew (RTL) and English.

## Commands
- `npm install` then `npm run dev`: local development (the AI agent falls back to simple rules, there is no server).
- `npm run build`: builds the app, pre-builds one HTML page per route (SEO), sitemap.xml, robots.txt and routes.json into `dist/`.
- `PORT=8080 node server/server.mjs`: serves `dist/` like production, including 301 redirects and `/api/designer`.
- Deploy: every push to `main` deploys to the live site automatically (Cloud Build trigger). Before pushing, run `npm run build` and make sure it passes.
  Live: https://betak-website-230492521256.me-west1.run.app (noindex until the betak.co.il domain points here).

## Layout
- `src/pages`, `src/components`: UI. `src/i18n/text.ts`: every visible string, in `he` and `en`.
- `src/lib/routes.ts`, `src/hooks/useRoute.ts`: real paths (`/sofas`, `/product/1686-camila-...`) with pushState.
- `src/data`: catalog, `galleries.json` (photos per product, files in `public/img/g`), `reviews.json`, `accessibility.ts` (accessibility statement), `store.ts` (phone, email).
- `scripts/prerender.mjs` + `src/seo/entry.ts`: static pages with titles, meta, canonical and JSON-LD.
- `server/server.mjs`: no-dependency Node server. `server/redirects.json` maps old betak.co.il addresses to new ones (301).
- Orders: the cart form saves each order (`src/lib/orders.ts` → `POST /api/orders`, `server/orders.mjs`, Firestore) then opens WhatsApp. The private page `/admin/orders` (`src/pages/AdminOrders.tsx`) needs Google sign-in with an account in `ADMIN_EMAILS` (`server/admin-auth.mjs`). Setup in README.
- Card payments: `server/upay.mjs` sends card orders to UPay's hosted payment page (`UPAY_EMAIL`, `UPAY_LIVE`); UPay reports back to `/api/upay/ipn`, the customer returns to `/paid`.
- AI agent: `src/lib/agent.ts` calls `/api/designer`, which calls Gemini on Vertex AI (`GEMINI_MODEL`, default gemini-3.8-flash).
- Room designer (`src/pages/Designer.tsx`, scene) and 3D showroom (`src/showroom`). AI-made 3D models in `public/models`.

## Rules
- Never invent products, photos or reviews: everything comes from the original betak.co.il.
- Every change works in Hebrew (RTL) and English; use logical CSS (`inset-inline-start`, not `left`).
- Accessibility: IS 5568 / WCAG AA. Keep axe-core at zero violations. Accessibility menu options are classes on `<html>` (`a11y-*`).
- Code style: simple and readable, like a senior Google engineer would write it; one-line comments on new code.

## Open items
- Google reviews widget: needs the embed code or business link.
- Product descriptions and specs (he + en) are in `src/data/details.json`, read from betak.co.il; 2054 (Kiara table set) has none because its page is empty. The configurator's size ranges and the sample fabric list in `fabrics.ts` are still generic.
- UPay: their API isn't public; payment reports are not yet verified with UPay (needs their docs + API key).
- Domain move: betak.co.il is managed by 2all; DNS has to point here (keep the MX records for email).

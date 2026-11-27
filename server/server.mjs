// Production server: serves the built site and the AI designer endpoint (Gemini on Vertex AI).
// On Cloud Run it signs in as the service account, so there is no API key to manage.
// Local run: npm run build && GOOGLE_CLOUD_PROJECT=<project> GOOGLE_ACCESS_TOKEN=$(gcloud auth print-access-token) npm start
import { timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { adminConfig, checkAdmin } from "./admin-auth.mjs";
import { cleanOrder, createOrderStore, linePrice } from "./orders.mjs";
import { cleanMessage, createMessageStore } from "./messages.mjs";
import { newPayment, paymentConfig, paymentsEnabled, paymentUrl, readReport } from "./upay.mjs";

const PORT = Number(process.env.PORT ?? 8080);
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const LOCATION = process.env.VERTEX_LOCATION ?? "global";
const SITE_ROOT = resolve(fileURLToPath(new URL("../dist", import.meta.url)));
const METADATA_URL = "http://metadata.google.internal/computeMetadata/v1";
const MAX_BODY_BYTES = 200_000;
const TOKEN_MARGIN_MS = 60_000;
const SITE_DOMAIN = process.env.SITE_DOMAIN ?? "betak.co.il";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".glb": "model/gltf-binary",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

let cachedToken = { value: "", expiresAt: 0 };

function sendJson(response, status, payload) {
  // Orders hold personal details, so no API answer is ever cached.
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > MAX_BODY_BYTES) throw new Error("Request too large");
  }
  return body;
}

const readJson = async (request) => JSON.parse(await readBody(request));

// Google Cloud's metadata server knows the project and hands out access tokens.
async function metadata(path) {
  const response = await fetch(`${METADATA_URL}/${path}`, { headers: { "Metadata-Flavor": "Google" } });
  if (!response.ok) throw new Error(`Metadata server answered ${response.status} for ${path}`);
  return response.text();
}

async function accessToken() {
  if (process.env.GOOGLE_ACCESS_TOKEN) return process.env.GOOGLE_ACCESS_TOKEN;
  if (Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const token = JSON.parse(await metadata("instance/service-accounts/default/token"));
  cachedToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 - TOKEN_MARGIN_MS };
  return cachedToken.value;
}

let cachedProject = process.env.GOOGLE_CLOUD_PROJECT ?? "";
const projectId = async () => (cachedProject ||= await metadata("project/project-id"));
const orders = createOrderStore({ getToken: accessToken, getProject: projectId });
const messages = createMessageStore({ getToken: accessToken, getProject: projectId });

// A check that says when one visitor sent more than perHour forms in the last hour; more is a script filling the form.
function hourlyLimit(perHour) {
  const recent = new Map();
  return (request) => {
    const visitor = String(request.headers["x-forwarded-for"] ?? request.socket.remoteAddress).split(",")[0].trim();
    const hourAgo = Date.now() - 3_600_000;
    const times = (recent.get(visitor) ?? []).filter((time) => time > hourAgo);
    if (recent.size > 5000) recent.clear();
    recent.set(visitor, [...times, Date.now()]);
    return times.length >= perHour;
  };
}

const tooManyOrders = hourlyLimit(10);
const tooManyMessages = hourlyLimit(5);

// Catalog prices by product id, written by the build, so an order's total never trusts the browser.
const PRICES = existsSync(join(SITE_ROOT, "prices.json")) ? JSON.parse(readFileSync(join(SITE_ROOT, "prices.json"), "utf8")) : {};
// What each chosen size adds, by product id and measure, e.g. { "1686": { "width": { "310": 100 } } }.
const SIZE_PRICES = existsSync(join(SITE_ROOT, "size-prices.json")) ? JSON.parse(readFileSync(join(SITE_ROOT, "size-prices.json"), "utf8")) : {};
const priceOf = (productId, size) => linePrice(PRICES[productId], SIZE_PRICES[productId], size);

// This site's own address, for the links UPay sends the customer and its report back to.
function siteUrl(request) {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL.replace(/\/$/, "");
  const protocol = String(request.headers["x-forwarded-proto"] ?? "http").split(",")[0];
  return `${protocol}://${request.headers.host}`;
}

// A visitor sends an order from the cart; the answer carries its order number,
// and for a card payment the address of UPay's payment page.
async function handleNewOrder(request, response) {
  try {
    if (tooManyOrders(request)) return sendJson(response, 429, { error: "Too many orders" });
    const { order, error } = cleanOrder(await readJson(request), priceOf);
    if (error) return sendJson(response, 400, { error });
    if (order.payWith === "card" && !paymentsEnabled()) return sendJson(response, 409, { error: "payments-off" });
    if (order.payWith === "card") order.payment = newPayment();
    const saved = await orders.add(order);
    if (saved.payment) return sendJson(response, 201, { number: saved.number, payUrl: paymentUrl(saved, siteUrl(request)) });
    sendJson(response, 201, { number: saved.number });
  } catch (error) {
    // The cart still sends the order on WhatsApp when this fails.
    console.error(error);
    sendJson(response, 502, { error: "Orders are unavailable right now." });
  }
}

// A visitor sends a question from the contact form; it waits on the store's admin page.
async function handleNewMessage(request, response) {
  try {
    const input = await readJson(request);
    // The hidden "website" field is left empty by people and filled by bots: answer as if saved.
    if (input?.website) return sendJson(response, 201, { ok: true });
    if (tooManyMessages(request)) return sendJson(response, 429, { error: "Too many messages" });
    const { message, error } = cleanMessage(input);
    if (error) return sendJson(response, 400, { error });
    await messages.add(message);
    sendJson(response, 201, { ok: true });
  } catch (error) {
    // The contact page offers WhatsApp instead when this fails.
    console.error(error);
    sendJson(response, 502, { error: "Messages are unavailable right now." });
  }
}

// UPay reports a payment to the address the order gave it; the token in that address must match the order's.
async function handlePaymentReport(request, response, url) {
  try {
    const body = request.method === "POST" ? await readBody(request) : "";
    const fields = Object.fromEntries(url.searchParams);
    // UPay's format is not published, so both a form and JSON body are read.
    const bodyFields = body.trim().startsWith("{") ? JSON.parse(body) : Object.fromEntries(new URLSearchParams(body));
    Object.assign(fields, typeof bodyFields === "object" && bodyFields ? bodyFields : {});
    const token = String(fields.token ?? "");
    delete fields.token;
    const order = /^\d+$/.test(String(fields.order)) ? await orders.get(String(fields.order)) : null;
    const expected = Buffer.from(order?.payment?.token ?? "");
    if (!order || expected.length === 0 || expected.length !== token.length || !timingSafeEqual(expected, Buffer.from(token))) {
      return sendJson(response, 404, { error: "Unknown order" });
    }
    await orders.setPayment(order.id, { ...order.payment, ...readReport(fields, order) });
    response.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" });
    response.end("OK");
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Could not record the payment." });
  }
}

// The payment token is only for UPay's report, so the orders page never sees it.
const withoutToken = (order) => (order.payment ? { ...order, payment: { ...order.payment, token: undefined } } : order);

// The store's own admin page: list the orders and contact messages, mark one read or unread.
async function handleAdmin(request, response, pathname) {
  if (pathname === "/api/admin/config") return sendJson(response, 200, adminConfig());
  const access = await checkAdmin(request);
  if (access !== "ok") return sendJson(response, access === "signed-out" ? 401 : 403, { error: access });
  try {
    if (pathname === "/api/admin/orders" && request.method === "GET") return sendJson(response, 200, { orders: (await orders.list()).map(withoutToken) });
    const match = pathname.match(/^\/api\/admin\/orders\/(\d+)$/);
    if (match && request.method === "PATCH") {
      await orders.setRead(match[1], Boolean((await readJson(request)).read));
      return sendJson(response, 200, { ok: true });
    }
    if (pathname === "/api/admin/messages" && request.method === "GET") return sendJson(response, 200, { messages: await messages.list() });
    const messageMatch = pathname.match(/^\/api\/admin\/messages\/([A-Za-z0-9]+)$/);
    if (messageMatch && request.method === "PATCH") {
      await messages.setRead(messageMatch[1], Boolean((await readJson(request)).read));
      return sendJson(response, 200, { ok: true });
    }
    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    sendJson(response, 502, { error: "Orders are unavailable right now." });
  }
}

async function askGemini({ system, messages }) {
  const project = await projectId();
  const host = LOCATION === "global" ? "aiplatform.googleapis.com" : `${LOCATION}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${project}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      // Gemini calls the assistant's turns "model".
      contents: messages.map(({ role, content }) => ({ role: role === "assistant" ? "model" : "user", parts: [{ text: content }] })),
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096 },
    }),
  });
  if (!response.ok) throw new Error(`Vertex AI answered ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
}

async function handleDesigner(request, response) {
  try {
    sendJson(response, 200, { text: await askGemini(await readJson(request)) });
  } catch (error) {
    // The site falls back to its rule-based designer when this fails.
    console.error(error);
    sendJson(response, 502, { error: "The designer is unavailable right now." });
  }
}

// The old betak.co.il addresses and where each now lives, so links and search rankings carry over (301).
const OLD_ADDRESSES = JSON.parse(readFileSync(new URL("./redirects.json", import.meta.url), "utf8"));
const OLD_STORE_SECTIONS = new Set(["חנות", "קטגוריות-מומלצות"]);
// Old single pages, e.g. /תקנון is now /terms.
const OLD_PAGES = { "תקנון": "/terms", "מדיניות-משלוחים": "/shipping" };
const productPaths = existsSync(join(SITE_ROOT, "routes.json")) ? JSON.parse(readFileSync(join(SITE_ROOT, "routes.json"), "utf8")) : {};

// The new address for an old one, or null when the address is not an old one.
function redirectFor(url) {
  const segments = decodeURIComponent(url.pathname).split("/").filter(Boolean);
  if (url.pathname.toLowerCase() === "/catalog.asp") {
    // Old product links look like /catalog.asp?page=newshowprod.asp&prodid=2935783.
    return productPaths[OLD_ADDRESSES.prodids[url.searchParams.get("prodid")]] ?? "/";
  }
  if (segments[0] === "product") {
    // A product link with a missing or old name part goes to the product's current address.
    const current = productPaths[Number.parseInt(segments[1], 10)];
    return current && current !== url.pathname ? current : null;
  }
  if (segments.length === 1 && OLD_PAGES[segments[0]]) return OLD_PAGES[segments[0]];
  if (!OLD_STORE_SECTIONS.has(segments[0])) return null;
  // /חנות/ספות/ספה-פינתית-דגם-קאמילה: the last part names the product, the middle part the section.
  const product = OLD_ADDRESSES.slugs[segments.at(-1)];
  if (product && productPaths[product]) return productPaths[product];
  const section = OLD_ADDRESSES.sections[segments[1]];
  return section ? `/${section}` : "/";
}

function redirect(response, location) {
  response.writeHead(301, { location, "cache-control": "public, max-age=86400" });
  response.end();
}

function serveFile(urlPath, response) {
  // normalize() collapses "..", so a request can never leave the site folder.
  const requested = join(SITE_ROOT, normalize(decodeURIComponent(urlPath)));
  const inside = requested.startsWith(SITE_ROOT);
  const isFile = (path) => existsSync(path) && statSync(path).isFile();
  // A page is a folder with its own pre-built index.html (/sofas → dist/sofas/index.html).
  const file = !inside ? null : isFile(requested) ? requested : isFile(join(requested, "index.html")) ? join(requested, "index.html") : null;

  if (!file) {
    if (extname(urlPath)) return sendJson(response, 404, { error: "Not found" });
    // An unknown page answers 404 for search engines; visitors still get the site, which shows the home page.
    response.writeHead(404, { "content-type": CONTENT_TYPES[".html"], "cache-control": "no-cache" });
    return createReadStream(join(SITE_ROOT, "index.html")).pipe(response);
  }
  // Vite fingerprints everything in assets/, so those files can be cached for a year.
  const cache = urlPath.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=300";
  response.writeHead(200, { "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream", "cache-control": cache });
  createReadStream(file).pipe(response);
}

createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const { pathname } = url;
  if (pathname === "/api/designer") return request.method === "POST" ? handleDesigner(request, response) : sendJson(response, 405, { error: "Use POST" });
  if (pathname === "/api/orders") return request.method === "POST" ? handleNewOrder(request, response) : sendJson(response, 405, { error: "Use POST" });
  if (pathname === "/api/messages") return request.method === "POST" ? handleNewMessage(request, response) : sendJson(response, 405, { error: "Use POST" });
  if (pathname.startsWith("/api/admin/")) return handleAdmin(request, response, pathname);
  if (pathname === "/api/payments/config") return sendJson(response, 200, paymentConfig());
  if (pathname === "/api/upay/ipn") return handlePaymentReport(request, response, url);
  if (request.method !== "GET" && request.method !== "HEAD") return sendJson(response, 405, { error: "Method not allowed" });
  const host = request.headers.host ?? "";
  // One domain: www.betak.co.il sends visitors to betak.co.il.
  if (host.startsWith("www.")) return redirect(response, `https://${host.slice(4)}${request.url}`);
  // Search engines index the site only on its real domain, never on the Cloud Run test address.
  if (!host.endsWith(SITE_DOMAIN)) response.setHeader("x-robots-tag", "noindex");
  const moved = redirectFor(url);
  if (moved) return redirect(response, moved);
  // One address per page: /sofas/ and /sofas are the same page, so the slash is dropped.
  if (pathname.length > 1 && pathname.endsWith("/")) return redirect(response, pathname.slice(0, -1) + url.search);
  // The orders page and the after-payment page are the site's own app, never indexed and never cached.
  if (pathname === "/admin/orders" || pathname === "/paid") {
    response.writeHead(200, { "content-type": CONTENT_TYPES[".html"], "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" });
    return createReadStream(join(SITE_ROOT, "index.html")).pipe(response);
  }
  serveFile(pathname, response);
}).listen(PORT, () => console.log(`Betak site listening on port ${PORT}; AI designer uses ${MODEL} on Vertex AI (${LOCATION})`));

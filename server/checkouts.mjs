// Checkouts that were started but not finished: the cart form saves a short draft while the customer fills it in,
// and the order removes it. Only what the store needs to call back is kept (no street address or note),
// and drafts older than RETENTION_DAYS are deleted. Kept in Firestore, or in memory with ORDERS_STORE=memory.

import { firestore, fromFields, toFields } from "./orders.mjs";

const LIST_LIMIT = 300;
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 3_600_000;

// The browser picks a random id per checkout, so a draft can be updated but never guessed or listed.
export const validCheckoutId = (id) => typeof id === "string" && /^[a-f0-9]{32}$/.test(id);

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// The draft as the store keeps it, or null when there is no way yet to reach the customer.
// priceOf gives the catalog price, so the total never comes from the browser.
export function cleanCheckout(input, priceOf) {
  const firstName = text(input?.firstName, 40);
  const lastName = text(input?.lastName, 40);
  const phone = text(input?.phone, 30);
  const email = text(input?.email, 120);
  const hasPhone = phone.replace(/\D/g, "").length >= 9;
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!hasPhone && !hasEmail) return null;

  const lines = (Array.isArray(input?.lines) ? input.lines : []).slice(0, 50).map((line) => {
    const productId = Number.isInteger(line?.productId) ? line.productId : 0;
    return {
      productId,
      name: text(line?.name, 200),
      sku: text(line?.sku, 40),
      design: text(line?.design, 500),
      quantity: Math.min(99, Math.max(1, Math.trunc(Number(line?.quantity) || 1))),
      price: (priceOf ? priceOf(productId, line?.size) : Number(line?.price)) || 0,
    };
  }).filter((line) => line.name);
  if (lines.length === 0) return null;

  return {
    name: `${firstName} ${lastName}`.trim(),
    phone: hasPhone ? phone : "",
    email: hasEmail ? email : "",
    city: text(input?.city, 60),
    payWith: input?.payWith === "card" ? "card" : "phone",
    lines,
    total: lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    lang: input?.lang === "en" ? "en" : "he",
  };
}

const isOld = (checkout) => Date.now() - Date.parse(checkout.updatedAt) > RETENTION_MS;

// Firestore store: each draft is a document in "checkouts" named by the browser's random id.
function firestoreStore(cloud) {
  const { call } = firestore(cloud);
  const path = (id) => `/checkouts/${encodeURIComponent(id)}`;
  const fieldsMask = (fields) => Object.keys(fields).map((key) => `updateMask.fieldPaths=${key}`).join("&");

  return {
    // Updates the draft; the first save also records when the customer started.
    async save(id, checkout) {
      const fields = { ...checkout, updatedAt: new Date() };
      try {
        await call(`${path(id)}?${fieldsMask(fields)}&currentDocument.exists=true`, { method: "PATCH", body: { fields: toFields(fields) } });
      } catch (error) {
        if (error.status !== 404) throw error;
        const first = { ...fields, startedAt: fields.updatedAt, handled: false };
        await call(`${path(id)}?currentDocument.exists=false`, { method: "PATCH", body: { fields: toFields(first) } });
      }
    },

    // The customer sent the order, so the draft is no longer needed.
    async remove(id) {
      await call(path(id), { method: "DELETE" });
    },

    // Newest first; drafts past the retention time are deleted on the way.
    async list() {
      const rows = await call(":runQuery", {
        method: "POST",
        body: { structuredQuery: { from: [{ collectionId: "checkouts" }], orderBy: [{ field: { fieldPath: "updatedAt" }, direction: "DESCENDING" }], limit: LIST_LIMIT } },
      });
      const checkouts = rows.filter((row) => row.document).map(({ document }) => ({ ...fromFields(document.fields), id: document.name.split("/").pop() }));
      const old = checkouts.filter(isOld);
      await Promise.all(old.map((checkout) => this.remove(checkout.id).catch((error) => console.error(error.message))));
      return checkouts.filter((checkout) => !isOld(checkout));
    },

    async setHandled(id, handled) {
      await call(`${path(id)}?updateMask.fieldPaths=handled&currentDocument.exists=true`, { method: "PATCH", body: { fields: toFields({ handled }) } });
    },
  };
}

// In-memory store for local runs; everything is gone when the server stops.
function memoryStore() {
  const checkouts = new Map();
  return {
    async save(id, checkout) {
      const now = new Date().toISOString();
      const before = checkouts.get(id);
      checkouts.set(id, { startedAt: now, handled: false, ...before, ...checkout, id, updatedAt: now });
    },
    async remove(id) {
      checkouts.delete(id);
    },
    async list() {
      return [...checkouts.values()].filter((checkout) => !isOld(checkout)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, LIST_LIMIT);
    },
    async setHandled(id, handled) {
      const checkout = checkouts.get(id);
      if (checkout) checkout.handled = handled;
    },
  };
}

export const createCheckoutStore = (cloud) => (process.env.ORDERS_STORE === "memory" ? memoryStore() : firestoreStore(cloud));

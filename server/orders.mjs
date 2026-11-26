// Customer orders: checked here, kept in Firestore (or in memory for a local run with ORDERS_STORE=memory).
// Firestore is reached over its REST API with the Cloud Run service account, so there are no dependencies.

const FIRST_ORDER_NUMBER = Number(process.env.FIRST_ORDER_NUMBER ?? 5001);
const LIST_LIMIT = 300;
const COMMIT_ATTEMPTS = 4;

// --- Checking what the visitor sent --------------------------------------------------------------

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// The order as the store keeps it, or an error message when something required is missing.
export function cleanOrder(input) {
  const name = text(input?.name, 80);
  const phone = text(input?.phone, 30);
  const email = text(input?.email, 120);
  const note = text(input?.note, 1000);
  const lines = (Array.isArray(input?.lines) ? input.lines : []).slice(0, 50).map((line) => ({
    productId: Number.isInteger(line?.productId) ? line.productId : 0,
    name: text(line?.name, 200),
    sku: text(line?.sku, 40),
    design: text(line?.design, 500),
    quantity: Math.min(99, Math.max(1, Math.trunc(Number(line?.quantity) || 1))),
    price: Math.max(0, Number(line?.price) || 0),
  })).filter((line) => line.name);

  if (name.length < 2) return { error: "name" };
  if (phone.replace(/\D/g, "").length < 9) return { error: "phone" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "email" };
  if (lines.length === 0) return { error: "lines" };

  // The total is worked out here, not taken from the browser.
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  return { order: { name, phone, email, note, lines, total, lang: input?.lang === "en" ? "en" : "he", source: "site", read: false } };
}

// --- Firestore values <-> plain values ----------------------------------------------------------

function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  return { mapValue: { fields: toFields(value) } };
}

const toFields = (object) => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, toValue(value)]));

function fromValue(value) {
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(fromValue);
  if ("mapValue" in value) return fromFields(value.mapValue.fields ?? {});
  return null;
}

const fromFields = (fields) => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromValue(value)]));

// --- Stores ---------------------------------------------------------------------------------------

// Firestore store; getToken and getProject come from the server (metadata server on Cloud Run).
function firestoreStore({ getToken, getProject }) {
  async function call(path, { method = "GET", body } = {}) {
    const root = `projects/${await getProject()}/databases/(default)/documents`;
    const response = await fetch(`https://firestore.googleapis.com/v1/${root}${path}`, {
      method,
      headers: { "content-type": "application/json", authorization: `Bearer ${await getToken()}` },
      body: body && JSON.stringify(body),
    });
    if (response.status === 404 && method === "GET") return null;
    if (!response.ok) throw Object.assign(new Error(`Firestore answered ${response.status}: ${await response.text()}`), { status: response.status });
    return response.json();
  }
  const docName = async (path) => `projects/${await getProject()}/databases/(default)/documents/${path}`;

  return {
    // The next order number and the order are written together, so two orders never share a number.
    async add(order) {
      for (let attempt = 1; ; attempt++) {
        const { transaction } = await call(":beginTransaction", { method: "POST", body: {} });
        const counter = await call(`/counters/orders?transaction=${encodeURIComponent(transaction)}`);
        const number = counter ? Number(counter.fields.last.integerValue) + 1 : FIRST_ORDER_NUMBER;
        const saved = { ...order, number, createdAt: new Date() };
        try {
          await call(":commit", {
            method: "POST",
            body: {
              transaction,
              writes: [
                { update: { name: await docName("counters/orders"), fields: toFields({ last: number }) } },
                { update: { name: await docName(`orders/${number}`), fields: toFields(saved) }, currentDocument: { exists: false } },
              ],
            },
          });
          return { ...saved, id: String(number), createdAt: saved.createdAt.toISOString() };
        } catch (error) {
          // Another order took the number at the same moment: try again.
          if (attempt >= COMMIT_ATTEMPTS || ![409, 400].includes(error.status)) throw error;
        }
      }
    },

    async list() {
      const rows = await call(":runQuery", {
        method: "POST",
        body: { structuredQuery: { from: [{ collectionId: "orders" }], orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }], limit: LIST_LIMIT } },
      });
      return rows.filter((row) => row.document).map(({ document }) => ({ ...fromFields(document.fields), id: document.name.split("/").pop() }));
    },

    async setRead(id, read) {
      await call(`/orders/${encodeURIComponent(id)}?updateMask.fieldPaths=read&currentDocument.exists=true`, { method: "PATCH", body: { fields: toFields({ read }) } });
    },
  };
}

// In-memory store for local runs; everything is gone when the server stops.
function memoryStore() {
  const orders = [];
  return {
    async add(order) {
      const saved = { ...order, number: FIRST_ORDER_NUMBER + orders.length, createdAt: new Date().toISOString() };
      saved.id = String(saved.number);
      orders.unshift(saved);
      return saved;
    },
    async list() {
      return orders.slice(0, LIST_LIMIT);
    },
    async setRead(id, read) {
      const order = orders.find((item) => item.id === id);
      if (order) order.read = read;
    },
  };
}

export const createOrderStore = (cloud) => (process.env.ORDERS_STORE === "memory" ? memoryStore() : firestoreStore(cloud));

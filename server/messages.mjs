// Contact form messages: checked here, kept in Firestore (or in memory for a local run with ORDERS_STORE=memory).

import { firestore, fromFields, toFields } from "./orders.mjs";

const LIST_LIMIT = 300;

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// The message as the store keeps it, or an error naming the field that is missing.
export function cleanMessage(input) {
  const name = text(input?.name, 80);
  const phone = text(input?.phone, 30);
  const email = text(input?.email, 120);
  const message = text(input?.message, 2000);

  if (name.length < 2) return { error: "name" };
  if (phone.replace(/\D/g, "").length < 9) return { error: "phone" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "email" };
  if (message.length < 2) return { error: "message" };
  return { message: { name, phone, email, message, page: text(input?.page, 200), lang: input?.lang === "en" ? "en" : "he", read: false } };
}

// Firestore store: each message is a document in "messages" with an id Firestore picks.
function firestoreStore(cloud) {
  const { call } = firestore(cloud);
  return {
    async add(message) {
      const saved = { ...message, createdAt: new Date() };
      const document = await call("/messages", { method: "POST", body: { fields: toFields(saved) } });
      return { ...saved, id: document.name.split("/").pop(), createdAt: saved.createdAt.toISOString() };
    },
    async list() {
      const rows = await call(":runQuery", {
        method: "POST",
        body: { structuredQuery: { from: [{ collectionId: "messages" }], orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }], limit: LIST_LIMIT } },
      });
      return rows.filter((row) => row.document).map(({ document }) => ({ ...fromFields(document.fields), id: document.name.split("/").pop() }));
    },
    async setRead(id, read) {
      await call(`/messages/${encodeURIComponent(id)}?updateMask.fieldPaths=read&currentDocument.exists=true`, { method: "PATCH", body: { fields: toFields({ read }) } });
    },
  };
}

// In-memory store for local runs; everything is gone when the server stops.
function memoryStore() {
  const messages = [];
  return {
    async add(message) {
      const saved = { ...message, id: String(messages.length + 1), createdAt: new Date().toISOString() };
      messages.unshift(saved);
      return saved;
    },
    async list() {
      return messages.slice(0, LIST_LIMIT);
    },
    async setRead(id, read) {
      const message = messages.find((item) => item.id === id);
      if (message) message.read = read;
    },
  };
}

export const createMessageStore = (cloud) => (process.env.ORDERS_STORE === "memory" ? memoryStore() : firestoreStore(cloud));

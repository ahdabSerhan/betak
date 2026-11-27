// Checkouts: the cart form saves a short draft while the customer types, so the store can call back
// customers who did not finish. Sending the order marks the draft with the order number.
import { adminFetch, type AdminStatus, type OrderLine, type PayWith } from "./orders";

// Only what the store needs to reach the customer and see the cart; the street address and note stay out.
export interface CheckoutDraft {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  payWith: PayWith;
  lang: string;
  lines: OrderLine[];
}

export interface Checkout {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  payWith: PayWith;
  lines: Omit<OrderLine, "size">[];
  total: number;
  lang: string;
  handled: boolean;
  // Set once the customer sent the order; the record is kept as the order's start.
  orderNumber?: number;
  startedAt: string;
  updatedAt: string;
}

// A random id per checkout, made in the browser so a draft can be updated but never guessed.
export function newCheckoutId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// The server keeps a draft only once it has a phone or an email.
export const reachable = (draft: CheckoutDraft) => draft.phone.replace(/\D/g, "").length >= 9 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email);

// Saves the draft; a failure is ignored because it only helps the store.
export async function saveDraft(id: string, draft: CheckoutDraft): Promise<void> {
  try {
    await fetch(`/api/checkouts/${id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(draft), keepalive: true });
  } catch {
    // Offline or blocked: the order itself is unaffected.
  }
}

export async function listCheckouts(token: string): Promise<{ status: AdminStatus; checkouts: Checkout[] }> {
  const { status, data } = await adminFetch("/api/admin/checkouts", token).catch(() => ({ status: "error" as const, data: null }));
  return { status, checkouts: data?.checkouts ?? [] };
}

export async function markHandled(token: string, id: string, handled: boolean): Promise<boolean> {
  const { status } = await adminFetch(`/api/admin/checkouts/${id}`, token, { method: "PATCH", body: JSON.stringify({ handled }) }).catch(() => ({ status: "error" }));
  return status === "ok";
}

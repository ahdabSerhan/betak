import type { OrderSize } from "../state/ShopContext";
// Orders: the cart sends one to the server, and the store's orders page reads them back.

export interface OrderLine {
  productId: number;
  name: string;
  sku: string;
  design: string;
  quantity: number;
  price: number;
  // The chosen sofa sizes in cm (or a mattress size), so the server can add the size extra itself.
  size?: OrderSize;
}

export interface Address {
  city: string;
  street: string;
  house: string;
  entrance: string;
  floor: string;
  apartment: string;
  entryCode: string;
  zip: string;
}

export type PayWith = "card" | "phone";

export interface NewOrder {
  firstName: string;
  lastName: string;
  phone: string;
  phone2: string;
  email: string;
  address: Address;
  elevator: "" | "yes" | "no";
  payWith: PayWith;
  note: string;
  lang: string;
  lines: OrderLine[];
  // The draft this checkout saved while the customer typed; the server removes it once the order is in.
  checkoutId?: string;
}

// What UPay reported about a card payment; orders from before card payments have none.
export interface Payment {
  method: "upay";
  status: "pending" | "reported" | "failed" | "amount-mismatch";
  live: boolean;
  amount?: number | null;
  reference?: string;
  payments?: string;
  reportedAt?: string;
}

// Older orders have only a name, phone, email and note, so the newer fields are optional.
export interface Order extends Omit<NewOrder, "firstName" | "lastName" | "phone2" | "address" | "elevator" | "payWith" | "checkoutId"> {
  id: string;
  number: number;
  name: string;
  phone2?: string;
  address?: Address;
  elevator?: string;
  payWith?: PayWith;
  payment?: Payment;
  total: number;
  source: string;
  read: boolean;
  createdAt: string;
}

// Saves the order. A card order also gets the address of UPay's payment page.
export async function saveOrder(order: NewOrder): Promise<{ number: number; payUrl?: string } | null> {
  try {
    const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(order) });
    if (!response.ok) return null;
    const answer = await response.json();
    return answer.number ? answer : null;
  } catch {
    return null;
  }
}

// Whether card payment is set up on the server, and the most installments offered.
export async function paymentConfig(): Promise<{ card: boolean; maxPayments: number }> {
  try {
    const response = await fetch("/api/payments/config");
    return response.ok ? await response.json() : { card: false, maxPayments: 1 };
  } catch {
    return { card: false, maxPayments: 1 };
  }
}

// One line for an address, e.g. "הרצל 12, כניסה ב, קומה 3, דירה 7, תל אביב".
export function addressLine(address: Address | undefined, t: { entrance: string; floor: string; apartment: string; entryCode: string }) {
  if (!address) return "";
  return [
    [address.street, address.house].filter(Boolean).join(" "),
    address.entrance && `${t.entrance} ${address.entrance}`,
    address.floor && `${t.floor} ${address.floor}`,
    address.apartment && `${t.apartment} ${address.apartment}`,
    address.entryCode && `${t.entryCode} ${address.entryCode}`,
    [address.city, address.zip].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");
}

export type AdminStatus = "ok" | "signed-out" | "not-allowed" | "error";

export async function adminFetch(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}` } });
  const status: AdminStatus = response.ok ? "ok" : response.status === 401 ? "signed-out" : response.status === 403 ? "not-allowed" : "error";
  return { status, data: response.ok ? await response.json() : null };
}

export async function adminConfig(): Promise<{ clientId: string; ready: boolean; password?: boolean }> {
  const response = await fetch("/api/admin/config");
  return response.ok ? response.json() : { clientId: "", ready: false };
}

// Signs in with the store's username and password; returns the session token, or why it failed.
export async function adminLogin(username: string, password: string): Promise<{ token?: string; error?: "wrong" | "locked" | "off" }> {
  const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) }).catch(() => null);
  return response ? response.json() : { error: "wrong" };
}

export async function listOrders(token: string): Promise<{ status: AdminStatus; orders: Order[] }> {
  const { status, data } = await adminFetch("/api/admin/orders", token).catch(() => ({ status: "error" as const, data: null }));
  return { status, orders: data?.orders ?? [] };
}

export async function markRead(token: string, id: string, read: boolean): Promise<boolean> {
  const { status } = await adminFetch(`/api/admin/orders/${id}`, token, { method: "PATCH", body: JSON.stringify({ read }) }).catch(() => ({ status: "error" }));
  return status === "ok";
}

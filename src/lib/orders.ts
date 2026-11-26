// Orders: the cart sends one to the server, and the store's orders page reads them back.

export interface OrderLine {
  productId: number;
  name: string;
  sku: string;
  design: string;
  quantity: number;
  price: number;
}

export interface NewOrder {
  name: string;
  phone: string;
  email: string;
  note: string;
  lang: string;
  lines: OrderLine[];
}

export interface Order extends NewOrder {
  id: string;
  number: number;
  total: number;
  source: string;
  read: boolean;
  createdAt: string;
}

// Saves the order and returns its number, or null when the server could not save it.
export async function saveOrder(order: NewOrder): Promise<number | null> {
  try {
    const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(order) });
    if (!response.ok) return null;
    return (await response.json()).number ?? null;
  } catch {
    return null;
  }
}

export type AdminStatus = "ok" | "signed-out" | "not-allowed" | "error";

async function adminFetch(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}` } });
  const status: AdminStatus = response.ok ? "ok" : response.status === 401 ? "signed-out" : response.status === 403 ? "not-allowed" : "error";
  return { status, data: response.ok ? await response.json() : null };
}

export async function adminConfig(): Promise<{ clientId: string; ready: boolean }> {
  const response = await fetch("/api/admin/config");
  return response.ok ? response.json() : { clientId: "", ready: false };
}

export async function listOrders(token: string): Promise<{ status: AdminStatus; orders: Order[] }> {
  const { status, data } = await adminFetch("/api/admin/orders", token).catch(() => ({ status: "error" as const, data: null }));
  return { status, orders: data?.orders ?? [] };
}

export async function markRead(token: string, id: string, read: boolean): Promise<boolean> {
  const { status } = await adminFetch(`/api/admin/orders/${id}`, token, { method: "PATCH", body: JSON.stringify({ read }) }).catch(() => ({ status: "error" }));
  return status === "ok";
}

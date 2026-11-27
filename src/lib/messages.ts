// Contact form messages: the contact page sends one, the store's admin page reads them back.
import { adminFetch, type AdminStatus } from "./orders";

export interface NewMessage {
  name: string;
  phone: string;
  email: string;
  message: string;
  page: string;
  lang: string;
  // Hidden from people; a bot that fills it is ignored by the server.
  website: string;
}

export interface Message extends Omit<NewMessage, "website"> {
  id: string;
  read: boolean;
  createdAt: string;
}

// Sends the message; false when the server could not save it.
export async function sendMessage(message: NewMessage): Promise<boolean> {
  try {
    const response = await fetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(message) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function listMessages(token: string): Promise<{ status: AdminStatus; messages: Message[] }> {
  const { status, data } = await adminFetch("/api/admin/messages", token).catch(() => ({ status: "error" as const, data: null }));
  return { status, messages: data?.messages ?? [] };
}

export async function markMessageRead(token: string, id: string, read: boolean): Promise<boolean> {
  const { status } = await adminFetch(`/api/admin/messages/${id}`, token, { method: "PATCH", body: JSON.stringify({ read }) }).catch(() => ({ status: "error" }));
  return status === "ok";
}

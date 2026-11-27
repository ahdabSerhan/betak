import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORE } from "../data/store";
import { money } from "../lib/format";
import { listMessages, markMessageRead, type Message } from "../lib/messages";
import { addressLine, adminConfig, listOrders, markRead, type AdminStatus, type Order } from "../lib/orders";
import type { Text } from "../i18n/text";
import { useShop } from "../state/ShopContext";

// Google's sign-in script, loaded only on this page.
declare global {
  interface Window {
    google?: { accounts: { id: {
      initialize: (options: { client_id: string; callback: (answer: { credential: string }) => void }) => void;
      renderButton: (element: HTMLElement, options: Record<string, string>) => void;
      disableAutoSelect: () => void;
    } } };
  }
}

const TOKEN_KEY = "betak.admin.token";
const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";

// When a Google ID token runs out, read from the token itself (milliseconds).
function expiryOf(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000;
  } catch {
    return 0;
  }
}

// The token is kept for this tab only, so closing the tab signs out.
function storedToken() {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY) ?? "";
    return expiryOf(token) > Date.now() ? token : "";
  } catch {
    return "";
  }
}

function keepToken(token: string) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage is blocked; the visitor signs in again after a reload.
  }
}

function loadGoogle(): Promise<void> {
  if (window.google) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.append(script);
  });
}

// Israeli numbers as WhatsApp and phone links want them: 054-1234567 → 972541234567.
const digits = (phone: string) => phone.replace(/\D/g, "");
const whatsappNumber = (phone: string) => (digits(phone).startsWith("0") ? `972${digits(phone).slice(1)}` : digits(phone));

// How an order is paid, in the store's words: a phone order, or the state of its card payment.
const paymentLabel = (order: Order, statuses: Record<string, string>) => statuses[order.payment?.status ?? "phone"] ?? statuses.phone;

function exportCsv(orders: Order[], headings: string[], a: Text["admin"], c: Text["checkout"]) {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = orders.map((order) => [
    order.number, new Date(order.createdAt).toLocaleString("he-IL"), order.name, order.phone, order.phone2 ?? "", order.email,
    addressLine(order.address, c), order.elevator ? (order.elevator === "yes" ? a.yes : a.no) : "", order.note,
    order.lines.map((line) => `${line.name} ×${line.quantity}${line.design ? ` (${line.design})` : ""}`).join("; "), order.total,
    paymentLabel(order, a.payStatus), order.payment?.reference ?? "", order.read ? "✓" : "",
  ]);
  // The byte order mark tells Excel the file is UTF-8, so Hebrew shows correctly.
  const csv = "﻿" + [headings, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `betak-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// The payment state of an order; a card payment UPay reported still has to be confirmed in UPay before shipping.
function PaymentCell({ order }: { order: Order }) {
  const a = useShop().t.admin;
  const payment = order.payment;
  return (
    <div className={`pay-state ${payment?.status ?? "phone"}`}>
      <b>{paymentLabel(order, a.payStatus)}</b>
      {payment && !payment.live && <small> ({a.test})</small>}
      {payment?.payments && Number(payment.payments) > 1 && <small>{a.installments(payment.payments)}</small>}
      {payment?.reference && <small>{a.reference}: <span dir="ltr">{payment.reference}</span></small>}
      {payment && payment.status !== "pending" && <small className="muted">{a.payCheck}</small>}
    </div>
  );
}

function OrderRow({ order, onRead }: { order: Order; onRead: (order: Order, read: boolean) => void }) {
  const { t, lang } = useShop();
  const a = t.admin;
  return (
    <tr className={order.read ? "" : "unread"}>
      <td><input type="checkbox" checked={order.read} onChange={(event) => onRead(order, event.target.checked)} aria-label={a.markRead(order.number)} /></td>
      <th scope="row">{order.number}</th>
      <td>{new Date(order.createdAt).toLocaleString(lang === "he" ? "he-IL" : "en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
      <td>{order.name}</td>
      <td>
        <div className="contact-links">
          <a href={`https://wa.me/${whatsappNumber(order.phone)}`} target="_blank" rel="noopener">{a.whatsapp}</a>
          <a href={`tel:${digits(order.phone)}`} dir="ltr">{order.phone}</a>
          {order.phone2 && <a href={`tel:${digits(order.phone2)}`} dir="ltr">{order.phone2}</a>}
          {order.email && <a href={`mailto:${order.email}`}>{a.email}</a>}
        </div>
        {order.address && <p className="order-note"><b>{a.address}:</b> {addressLine(order.address, t.checkout)}</p>}
        {order.elevator && <p className="order-note"><b>{a.elevator}:</b> {order.elevator === "yes" ? a.yes : a.no}</p>}
        {order.note && <p className="order-note"><b>{a.note}:</b> {order.note}</p>}
      </td>
      <td>
        <ul className="order-lines">
          {order.lines.map((line, index) => (
            <li key={index}>{line.name}{line.sku && ` (${line.sku})`} ×{line.quantity}{line.design && <small className="muted"> {line.design}</small>}</li>
          ))}
        </ul>
      </td>
      <td>
        <span className="price">{money(order.total)}</span>
        <PaymentCell order={order} />
      </td>
    </tr>
  );
}

// One contact form message: who wrote, how to reach them, and what they asked.
function MessageRow({ message, onRead }: { message: Message; onRead: (message: Message, read: boolean) => void }) {
  const { t, lang } = useShop();
  const a = t.admin;
  return (
    <tr className={message.read ? "" : "unread"}>
      <td><input type="checkbox" checked={message.read} onChange={(event) => onRead(message, event.target.checked)} aria-label={a.markMessageRead(message.name)} /></td>
      <td>{new Date(message.createdAt).toLocaleString(lang === "he" ? "he-IL" : "en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
      <th scope="row">{message.name}</th>
      <td>
        <div className="contact-links">
          <a href={`https://wa.me/${whatsappNumber(message.phone)}`} target="_blank" rel="noopener">{a.whatsapp}</a>
          <a href={`tel:${digits(message.phone)}`} dir="ltr">{message.phone}</a>
          {message.email && <a href={`mailto:${message.email}`}>{a.email}</a>}
        </div>
      </td>
      <td><p className="message-text">{message.message}</p></td>
    </tr>
  );
}

// Contact form messages, newest first, with the same search and unread filter as the orders.
function MessagesPanel({ status, messages, onRead, onRefresh }: { status: string; messages: Message[]; onRead: (message: Message, read: boolean) => void; onRefresh: () => void }) {
  const a = useShop().t.admin;
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    const queryDigits = digits(query);
    const matches = (message: Message) => !query
      || message.name.toLowerCase().includes(query)
      || message.message.toLowerCase().includes(query)
      || message.email.toLowerCase().includes(query)
      || (queryDigits !== "" && digits(message.phone).includes(queryDigits));
    return messages.filter((message) => (!unreadOnly || !message.read) && matches(message));
  }, [messages, unreadOnly, search]);

  return (
    <>
      <div className="admin-tools">
        <label className="admin-search">
          <span className="sr-only">{a.searchMessages}</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={a.searchMessages} />
        </label>
        <label className="admin-check"><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} /> {a.unreadMessagesOnly}</label>
        <button className="btn ghost small" onClick={onRefresh}>{a.refresh}</button>
      </div>
      <p role="status" className="muted">
        {status === "loading" ? a.messagesLoading : status === "not-allowed" ? a.notAllowed : status === "error" ? a.error : a.messagesCount(shown.length, messages.filter((message) => !message.read).length)}
      </p>
      {status === "ok" && shown.length === 0 && <p className="empty">{a.messagesEmpty}</p>}
      {shown.length > 0 && (
        <div className="table-scroll" tabIndex={0} role="region" aria-label={a.messagesTitle}>
          <table className="orders-table">
            <thead>
              <tr><th scope="col">{a.read}</th><th scope="col">{a.date}</th><th scope="col">{a.customer}</th><th scope="col">{a.contact}</th><th scope="col">{a.message}</th></tr>
            </thead>
            <tbody>
              {shown.map((message) => <MessageRow message={message} onRead={onRead} key={message.id} />)}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// The store's private orders page, at /admin/orders. Only the Google accounts in ADMIN_EMAILS see orders.
export function AdminOrders() {
  const { t } = useShop();
  const a = t.admin;
  const [token, setToken] = useState(storedToken);
  const [status, setStatus] = useState<AdminStatus | "loading" | "not-ready">("loading");
  const [orders, setOrders] = useState<Order[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"orders" | "messages">("orders");
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesStatus, setMessagesStatus] = useState<AdminStatus | "loading">("loading");
  const buttonRef = useRef<HTMLDivElement>(null);

  const signIn = useCallback((next: string) => {
    keepToken(next);
    setToken(next);
  }, []);

  // Without a token, show Google's sign-in button.
  useEffect(() => {
    if (token) return;
    let cancelled = false;
    (async () => {
      const config = await adminConfig().catch(() => ({ clientId: "", ready: false }));
      if (cancelled) return;
      if (!config.ready) return setStatus("not-ready");
      setStatus("signed-out");
      await loadGoogle();
      if (cancelled || !buttonRef.current || !window.google) return;
      window.google.accounts.id.initialize({ client_id: config.clientId, callback: (answer) => signIn(answer.credential) });
      window.google.accounts.id.renderButton(buttonRef.current, { theme: "outline", size: "large", text: "signin_with", locale: document.documentElement.lang });
    })().catch(() => setStatus("error"));
    return () => { cancelled = true; };
  }, [token, signIn]);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus("loading");
    const result = await listOrders(token);
    if (result.status === "signed-out") signIn("");
    setStatus(result.status);
    setOrders(result.orders);
  }, [token, signIn]);

  const loadMessages = useCallback(async () => {
    if (!token) return;
    setMessagesStatus("loading");
    const result = await listMessages(token);
    setMessagesStatus(result.status);
    setMessages(result.messages);
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMessages(); }, [loadMessages]);

  const onMessageRead = async (message: Message, read: boolean) => {
    setMessages((current) => current.map((item) => (item.id === message.id ? { ...item, read } : item)));
    if (!(await markMessageRead(token, message.id, read))) loadMessages();
  };

  const unreadMessages = messages.filter((message) => !message.read).length;

  const onRead = async (order: Order, read: boolean) => {
    setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, read } : item)));
    if (!(await markRead(token, order.id, read))) load();
  };

  const signOut = () => {
    window.google?.accounts.id.disableAutoSelect();
    signIn("");
    setOrders([]);
    setMessages([]);
  };

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    const queryDigits = digits(query);
    const matches = (order: Order) => !query
      || order.name.toLowerCase().includes(query)
      || order.email.toLowerCase().includes(query)
      || (queryDigits !== "" && (digits(order.phone).includes(queryDigits) || String(order.number).includes(queryDigits)));
    return orders.filter((order) => (!unreadOnly || !order.read) && matches(order));
  }, [orders, unreadOnly, search]);

  const headings = [a.number, a.date, a.customer, a.phone, a.phone2, a.email, a.address, a.elevator, a.note, a.items, a.total, a.payment, a.reference, a.read];

  return (
    <section className="wrap admin-orders">
      <header className="admin-head">
        <h1>{a.title}</h1>
        {token && <button className="btn ghost small" onClick={signOut}>{a.signOut}</button>}
      </header>

      {!token && (
        <div className="admin-signin">
          <p>{status === "not-ready" ? a.notReady : status === "error" ? a.error : a.signIn}</p>
          <div ref={buttonRef} />
          <p className="muted"><a href={`mailto:${STORE.email}`}>{STORE.email}</a></p>
        </div>
      )}

      {token && (
        <div className="admin-tabs">
          <button type="button" aria-pressed={view === "orders"} onClick={() => setView("orders")}>{a.tabOrders}</button>
          <button type="button" aria-pressed={view === "messages"} onClick={() => setView("messages")}>
            {a.tabMessages}{unreadMessages > 0 && <span className="tab-count">{unreadMessages}</span>}
          </button>
        </div>
      )}

      {token && view === "messages" && <MessagesPanel status={messagesStatus} messages={messages} onRead={onMessageRead} onRefresh={loadMessages} />}

      {token && view === "orders" && (
        <>
          <div className="admin-tools">
            <label className="admin-search">
              <span className="sr-only">{a.search}</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={a.search} />
            </label>
            <label className="admin-check"><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} /> {a.unreadOnly}</label>
            <button className="btn ghost small" onClick={load}>{a.refresh}</button>
            <button className="btn small" onClick={() => exportCsv(shown, headings, a, t.checkout)} disabled={shown.length === 0}>{a.export}</button>
          </div>
          <p role="status" className="muted">
            {status === "loading" ? a.loading : status === "not-allowed" ? a.notAllowed : status === "error" ? a.error : a.count(shown.length, orders.filter((order) => !order.read).length)}
          </p>
          {status === "ok" && shown.length === 0 && <p className="empty">{a.empty}</p>}
          {shown.length > 0 && (
            <div className="table-scroll" tabIndex={0} role="region" aria-label={a.title}>
              <table className="orders-table">
                <thead>
                  <tr><th scope="col">{a.read}</th><th scope="col">{a.number}</th><th scope="col">{a.date}</th><th scope="col">{a.customer}</th><th scope="col">{a.contact}</th><th scope="col">{a.items}</th><th scope="col">{a.total} / {a.payment}</th></tr>
                </thead>
                <tbody>
                  {shown.map((order) => <OrderRow order={order} onRead={onRead} key={order.id} />)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

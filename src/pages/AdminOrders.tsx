import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORE } from "../data/store";
import { money } from "../lib/format";
import { listCheckouts, markHandled, type Checkout } from "../lib/checkouts";
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

// A checkout with no change for this long counts as left; until then the customer may still be filling it in.
const LEFT_AFTER_MS = 30 * 60_000;

// One checkout that did not become a paid or sent order: a form draft, or a card order that was never paid.
interface Unfinished {
  key: string;
  stage: "filling" | "left-form" | "left-payment" | "payment-failed";
  time: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  lines: { name: string; sku: string; design: string; quantity: number }[];
  total: number;
  handled: boolean;
  number?: number;
  draft?: Checkout;
  order?: Order;
}

const isRecent = (time: string) => Date.now() - Date.parse(time) < LEFT_AFTER_MS;

// Form drafts and unpaid card orders in one list, newest first.
function unfinishedOf(checkouts: Checkout[], orders: Order[]): Unfinished[] {
  const drafts = checkouts.map((draft): Unfinished => ({
    key: `d${draft.id}`, stage: isRecent(draft.updatedAt) ? "filling" : "left-form", time: draft.updatedAt,
    name: draft.name, phone: draft.phone, email: draft.email, city: draft.city, lines: draft.lines, total: draft.total, handled: draft.handled, draft,
  }));
  const unpaid = orders
    .filter((order) => order.payment?.status === "failed" || (order.payment?.status === "pending" && !isRecent(order.createdAt)))
    .map((order): Unfinished => ({
      key: `o${order.id}`, stage: order.payment?.status === "failed" ? "payment-failed" : "left-payment", time: order.createdAt,
      name: order.name, phone: order.phone, email: order.email, city: order.address?.city ?? "", lines: order.lines, total: order.total, handled: order.read, number: order.number, order,
    }));
  return [...drafts, ...unpaid].sort((a, b) => b.time.localeCompare(a.time));
}

function UnfinishedRow({ item, onHandled }: { item: Unfinished; onHandled: (item: Unfinished, handled: boolean) => void }) {
  const { t, lang } = useShop();
  const a = t.admin;
  const when = (time: string) => new Date(time).toLocaleString(lang === "he" ? "he-IL" : "en-GB", { dateStyle: "short", timeStyle: "short" });
  return (
    <tr className={item.handled ? "" : "unread"}>
      <td><input type="checkbox" checked={item.handled} onChange={(event) => onHandled(item, event.target.checked)} aria-label={a.markHandled(item.name || item.phone || item.email)} /></td>
      <td>
        <div className={`checkout-stage ${item.stage}`}><b>{a.stages[item.stage]}</b></div>
        {item.number && <small className="muted">{a.number} {item.number}</small>}
        {item.draft && <small className="muted">{a.chosePay[item.draft.payWith]}</small>}
      </td>
      <td>
        {when(item.time)}
        {item.draft && item.draft.startedAt !== item.draft.updatedAt && <small className="muted stage-start">{a.started} {when(item.draft.startedAt)}</small>}
      </td>
      <th scope="row">{item.name || a.noName}{item.city && <small className="muted stage-start">{item.city}</small>}</th>
      <td>
        <div className="contact-links">
          {item.phone && <a href={`https://wa.me/${whatsappNumber(item.phone)}`} target="_blank" rel="noopener">{a.whatsapp}</a>}
          {item.phone && <a href={`tel:${digits(item.phone)}`} dir="ltr">{item.phone}</a>}
          {item.email && <a href={`mailto:${item.email}`} dir="ltr">{item.email}</a>}
        </div>
      </td>
      <td>
        <ul className="order-lines">
          {item.lines.map((line, index) => (
            <li key={index}>{line.name}{line.sku && ` (${line.sku})`} ×{line.quantity}{line.design && <small className="muted"> {line.design}</small>}</li>
          ))}
        </ul>
      </td>
      <td><span className="price">{money(item.total)}</span></td>
    </tr>
  );
}

// Customers who started an order and did not finish: who they are, what was in the cart, and where they stopped.
function UnfinishedPanel({ status, items, onHandled, onRefresh }: { status: string; items: Unfinished[]; onHandled: (item: Unfinished, handled: boolean) => void; onRefresh: () => void }) {
  const a = useShop().t.admin;
  const [openOnly, setOpenOnly] = useState(true);
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    const queryDigits = digits(query);
    const matches = (item: Unfinished) => !query
      || item.name.toLowerCase().includes(query)
      || item.email.toLowerCase().includes(query)
      || item.lines.some((line) => line.name.toLowerCase().includes(query))
      || (queryDigits !== "" && digits(item.phone).includes(queryDigits));
    return items.filter((item) => (!openOnly || !item.handled) && matches(item));
  }, [items, openOnly, search]);

  return (
    <>
      <p className="admin-intro muted">{a.unfinishedIntro}</p>
      <div className="admin-tools">
        <label className="admin-search">
          <span className="sr-only">{a.searchUnfinished}</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={a.searchUnfinished} />
        </label>
        <label className="admin-check"><input type="checkbox" checked={openOnly} onChange={(event) => setOpenOnly(event.target.checked)} /> {a.openOnly}</label>
        <button className="btn ghost small" onClick={onRefresh}>{a.refresh}</button>
      </div>
      <p role="status" className="muted">
        {status === "loading" ? a.unfinishedLoading : status === "not-allowed" ? a.notAllowed : status === "error" ? a.error : a.unfinishedCount(shown.length, items.filter((item) => !item.handled).length)}
      </p>
      {status === "ok" && shown.length === 0 && <p className="empty">{a.unfinishedEmpty}</p>}
      {shown.length > 0 && (
        <div className="table-scroll" tabIndex={0} role="region" aria-label={a.tabUnfinished}>
          <table className="orders-table">
            <thead>
              <tr><th scope="col">{a.handled}</th><th scope="col">{a.stage}</th><th scope="col">{a.lastActivity}</th><th scope="col">{a.customer}</th><th scope="col">{a.contact}</th><th scope="col">{a.items}</th><th scope="col">{a.total}</th></tr>
            </thead>
            <tbody>
              {shown.map((item) => <UnfinishedRow item={item} onHandled={onHandled} key={item.key} />)}
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
  const [view, setView] = useState<"orders" | "unfinished" | "messages">("orders");
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [checkoutsStatus, setCheckoutsStatus] = useState<AdminStatus | "loading">("loading");
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

  const loadCheckouts = useCallback(async () => {
    if (!token) return;
    setCheckoutsStatus("loading");
    const result = await listCheckouts(token);
    setCheckoutsStatus(result.status);
    setCheckouts(result.checkouts);
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCheckouts(); }, [loadCheckouts]);
  useEffect(() => { loadMessages(); }, [loadMessages]);

  const onMessageRead = async (message: Message, read: boolean) => {
    setMessages((current) => current.map((item) => (item.id === message.id ? { ...item, read } : item)));
    if (!(await markMessageRead(token, message.id, read))) loadMessages();
  };

  const unreadMessages = messages.filter((message) => !message.read).length;

  // Unpaid card orders come from the orders list, so the tab waits for both lists.
  const unfinished = useMemo(() => unfinishedOf(checkouts, orders), [checkouts, orders]);
  const unfinishedStatus = checkoutsStatus === "ok" ? status : checkoutsStatus;
  const openUnfinished = unfinished.filter((item) => !item.handled).length;

  // "Handled" on an unpaid card order is the order's own read mark.
  const onHandled = async (item: Unfinished, handled: boolean) => {
    if (item.order) return onRead(item.order, handled);
    if (!item.draft) return;
    const id = item.draft.id;
    setCheckouts((current) => current.map((draft) => (draft.id === id ? { ...draft, handled } : draft)));
    if (!(await markHandled(token, id, handled))) loadCheckouts();
  };

  const onRead = async (order: Order, read: boolean) => {
    setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, read } : item)));
    if (!(await markRead(token, order.id, read))) load();
  };

  const signOut = () => {
    window.google?.accounts.id.disableAutoSelect();
    signIn("");
    setOrders([]);
    setMessages([]);
    setCheckouts([]);
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
          <button type="button" aria-pressed={view === "unfinished"} onClick={() => setView("unfinished")}>
            {a.tabUnfinished}{openUnfinished > 0 && <span className="tab-count">{openUnfinished}</span>}
          </button>
          <button type="button" aria-pressed={view === "messages"} onClick={() => setView("messages")}>
            {a.tabMessages}{unreadMessages > 0 && <span className="tab-count">{unreadMessages}</span>}
          </button>
        </div>
      )}

      {token && view === "unfinished" && <UnfinishedPanel status={unfinishedStatus} items={unfinished} onHandled={onHandled} onRefresh={() => { load(); loadCheckouts(); }} />}

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

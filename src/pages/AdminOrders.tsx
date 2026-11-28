import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { STORE } from "../data/store";
import { money } from "../lib/format";
import { listCheckouts, markHandled, type Checkout } from "../lib/checkouts";
import { listMessages, markMessageRead, type Message } from "../lib/messages";
import { addressLine, adminConfig, adminLogin, listOrders, markRead, type AdminStatus, type Order } from "../lib/orders";
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

type Stage = "done" | "paid" | "paying" | "filling" | "left-form" | "left-payment" | "payment-failed";
const DONE_STAGES: Stage[] = ["done", "paid"];

// One row of the tracking page: a sent order, or a checkout that was started and not sent.
interface Tracked {
  key: string;
  stage: Stage;
  time: string;
  startedAt?: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  lines: { name: string; sku: string; design: string; quantity: number }[];
  total: number;
  handled: boolean;
  number?: number;
  payWith?: string;
  draft?: Checkout;
  order?: Order;
}

const isRecent = (time: string) => Date.now() - Date.parse(time) < LEFT_AFTER_MS;

// Where an order stands: a phone order is done; a card order depends on what UPay reported.
function orderStage(order: Order): Stage {
  const status = order.payment?.status;
  if (!status) return "done";
  if (status === "reported" || status === "amount-mismatch") return "paid";
  if (status === "failed") return "payment-failed";
  return isRecent(order.createdAt) ? "paying" : "left-payment";
}

// Every order and every checkout that never became one, newest first.
function trackedOf(checkouts: Checkout[], orders: Order[]): Tracked[] {
  const startOf = new Map(checkouts.filter((draft) => draft.orderNumber).map((draft) => [draft.orderNumber, draft.startedAt]));
  const sent = orders.map((order): Tracked => ({
    key: `o${order.id}`, stage: orderStage(order), time: order.createdAt, startedAt: startOf.get(order.number),
    name: order.name, phone: order.phone, email: order.email, city: order.address?.city ?? "", lines: order.lines, total: order.total,
    handled: order.read, number: order.number, payWith: order.payWith, order,
  }));
  const drafts = checkouts.filter((draft) => !draft.orderNumber).map((draft): Tracked => ({
    key: `d${draft.id}`, stage: isRecent(draft.updatedAt) ? "filling" : "left-form", time: draft.updatedAt, startedAt: draft.startedAt,
    name: draft.name, phone: draft.phone, email: draft.email, city: draft.city, lines: draft.lines, total: draft.total,
    handled: draft.handled, payWith: draft.payWith, draft,
  }));
  return [...sent, ...drafts].sort((a, b) => b.time.localeCompare(a.time));
}

function TrackedRow({ item, onHandled }: { item: Tracked; onHandled: (item: Tracked, handled: boolean) => void }) {
  const { t, lang } = useShop();
  const a = t.admin;
  const when = (time: string) => new Date(time).toLocaleString(lang === "he" ? "he-IL" : "en-GB", { dateStyle: "short", timeStyle: "short" });
  return (
    <tr className={item.handled ? "" : "unread"}>
      <td><input type="checkbox" checked={item.handled} onChange={(event) => onHandled(item, event.target.checked)} aria-label={a.markHandled(item.name || item.phone || item.email)} /></td>
      <td>
        <div className={`checkout-stage ${item.stage}`}><b>{a.stages[item.stage]}</b></div>
        {item.number && <small className="muted">{a.number} {item.number}</small>}
        {item.payWith && <small className="muted">{a.chosePay[item.payWith]}</small>}
      </td>
      <td>
        {when(item.time)}
        {item.startedAt && item.startedAt !== item.time && <small className="muted stage-start">{a.started} {when(item.startedAt)}</small>}
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

type Show = "all" | "open" | "done";

// The tracking page: every order the customers made and every one they started and did not finish.
function TrackingPanel({ status, items, onHandled, onRefresh }: { status: string; items: Tracked[]; onHandled: (item: Tracked, handled: boolean) => void; onRefresh: () => void }) {
  const a = useShop().t.admin;
  const [show, setShow] = useState<Show>("all");
  const [notHandledOnly, setNotHandledOnly] = useState(false);
  const [search, setSearch] = useState("");

  const isDone = (item: Tracked) => DONE_STAGES.includes(item.stage);
  const done = items.filter(isDone).length;

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    const queryDigits = digits(query);
    const matches = (item: Tracked) => !query
      || item.name.toLowerCase().includes(query)
      || item.email.toLowerCase().includes(query)
      || item.lines.some((line) => line.name.toLowerCase().includes(query))
      || (queryDigits !== "" && (digits(item.phone).includes(queryDigits) || String(item.number ?? "").includes(queryDigits)));
    const inView = (item: Tracked) => show === "all" || (show === "done") === DONE_STAGES.includes(item.stage);
    return items.filter((item) => inView(item) && (!notHandledOnly || !item.handled) && matches(item));
  }, [items, show, notHandledOnly, search]);

  return (
    <>
      <p className="admin-intro muted">{a.trackIntro}</p>
      <div className="admin-tabs">
        {(["all", "open", "done"] as Show[]).map((key) => (
          <button type="button" key={key} aria-pressed={show === key} onClick={() => setShow(key)}>
            {a.show[key]}<span className={key === "open" ? "tab-count" : "tab-count quiet"}>{key === "all" ? items.length : key === "done" ? done : items.length - done}</span>
          </button>
        ))}
      </div>
      <div className="admin-tools">
        <label className="admin-search">
          <span className="sr-only">{a.searchUnfinished}</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={a.searchUnfinished} />
        </label>
        <label className="admin-check"><input type="checkbox" checked={notHandledOnly} onChange={(event) => setNotHandledOnly(event.target.checked)} /> {a.openOnly}</label>
        <button className="btn ghost small" onClick={onRefresh}>{a.refresh}</button>
      </div>
      <p role="status" className="muted">
        {status === "loading" ? a.unfinishedLoading : status === "not-allowed" ? a.notAllowed : status === "error" ? a.error : a.unfinishedCount(shown.length, shown.filter((item) => !item.handled).length)}
      </p>
      {status === "ok" && shown.length === 0 && <p className="empty">{a.unfinishedEmpty}</p>}
      {shown.length > 0 && (
        <div className="table-scroll" tabIndex={0} role="region" aria-label={a.trackTitle}>
          <table className="orders-table">
            <thead>
              <tr><th scope="col">{a.handled}</th><th scope="col">{a.stage}</th><th scope="col">{a.lastActivity}</th><th scope="col">{a.customer}</th><th scope="col">{a.contact}</th><th scope="col">{a.items}</th><th scope="col">{a.total}</th></tr>
            </thead>
            <tbody>
              {shown.map((item) => <TrackedRow item={item} onHandled={onHandled} key={item.key} />)}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// The store's private pages: /admin/orders (orders and messages) and /admin/checkouts (order tracking).
// Only the Google accounts in ADMIN_EMAILS see anything; the sign-in is shared by both pages.
// The first day of the dashboard's default range: 30 days back, as yyyy-mm-dd for the date field.
const DASHBOARD_DAYS = 30;
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

// The business at a glance: orders, revenue and messages since a chosen day.
function Dashboard({ orders, messages, tracked }: { orders: Order[]; messages: Message[]; tracked: Tracked[] }) {
  const { t } = useShop();
  const a = t.admin;
  const [from, setFrom] = useState(() => daysAgo(DASHBOARD_DAYS));
  const since = (time: string) => time.slice(0, 10) >= from;
  const recent = orders.filter((order) => since(order.createdAt));
  const total = recent.reduce((sum, order) => sum + order.total, 0);
  const unfinished = tracked.filter((item) => !DONE_STAGES.includes(item.stage) && since(item.time)).length;
  const tiles: [string, string][] = [
    [a.dashOrders, String(recent.length)],
    [a.dashTotal, money(total)],
    [a.dashAverage, money(recent.length ? Math.round(total / recent.length) : 0)],
    [a.dashMessages, String(messages.filter((message) => since(message.createdAt)).length)],
    [a.dashUnread, String(orders.filter((order) => !order.read).length)],
    [a.dashUnfinished, String(unfinished)],
  ];

  return (
    <>
      <label className="admin-from">{a.dashFrom} <input type="date" value={from} max={daysAgo(0)} onChange={(event) => setFrom(event.target.value || daysAgo(DASHBOARD_DAYS))} /></label>
      <dl className="admin-tiles">
        {tiles.map(([label, value]) => <div key={label}><dd>{value}</dd><dt>{label}</dt></div>)}
      </dl>
    </>
  );
}

type AdminPage = "dashboard" | "orders" | "checkouts";

// Sign-in with the store's username and password, for when Google sign-in is not used.
function PasswordForm({ onSignIn }: { onSignIn: (token: string) => void }) {
  const { t } = useShop();
  const a = t.admin;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await adminLogin(username, password);
    setBusy(false);
    if (result.token) return onSignIn(result.token);
    setError(result.error === "locked" ? a.loginLocked : a.loginWrong);
  };

  return (
    <form className="admin-login" onSubmit={onSubmit}>
      <label>{a.loginUser} <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label>
      <label>{a.loginPassword} <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
      {error && <p className="admin-login-error" role="alert">{error}</p>}
      <button className="btn" disabled={busy}>{a.loginButton}</button>
    </form>
  );
}

export function AdminOrders({ page = "orders" }: { page?: AdminPage }) {
  const { t } = useShop();
  const a = t.admin;
  const [token, setToken] = useState(storedToken);
  const [status, setStatus] = useState<AdminStatus | "loading" | "not-ready">("loading");
  const [orders, setOrders] = useState<Order[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"orders" | "messages">("orders");
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [checkoutsStatus, setCheckoutsStatus] = useState<AdminStatus | "loading">("loading");
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesStatus, setMessagesStatus] = useState<AdminStatus | "loading">("loading");
  const buttonRef = useRef<HTMLDivElement>(null);
  const [passwordLogin, setPasswordLogin] = useState(false);

  const signIn = useCallback((next: string) => {
    keepToken(next);
    setToken(next);
  }, []);

  // Without a token, show Google's sign-in button.
  useEffect(() => {
    if (token) return;
    let cancelled = false;
    (async () => {
      const config = await adminConfig().catch(() => ({ clientId: "", ready: false, password: false }));
      if (cancelled) return;
      setPasswordLogin(Boolean(config.password));
      if (!config.ready) return setStatus(config.password ? "signed-out" : "not-ready");
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

  // The tracking page joins the orders and the checkouts, so it waits for both lists.
  const tracked = useMemo(() => trackedOf(checkouts, orders), [checkouts, orders]);
  const trackedStatus = checkoutsStatus === "ok" ? status : checkoutsStatus;

  // "Handled" on an order is the order's own read mark.
  const onHandled = async (item: Tracked, handled: boolean) => {
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
        <h1>{page === "checkouts" ? a.trackTitle : page === "dashboard" ? a.dashTitle : a.title}</h1>
        {token && (
          <div className="admin-head-actions">
            <a className="btn ghost small" href="/admin" aria-current={page === "dashboard" ? "page" : undefined}>{a.dashTitle}</a>
            <a className="btn ghost small" href="/admin/orders" aria-current={page === "orders" ? "page" : undefined}>{a.title}</a>
            <a className="btn ghost small" href="/admin/checkouts" aria-current={page === "checkouts" ? "page" : undefined}>{a.trackTitle}</a>
            <button className="btn ghost small" onClick={signOut}>{a.signOut}</button>
          </div>
        )}
      </header>

      {!token && (
        <div className="admin-signin">
          <p>{status === "not-ready" ? a.notReady : status === "error" ? a.error : passwordLogin ? a.loginIntro : a.signIn}</p>
          {passwordLogin && <PasswordForm onSignIn={signIn} />}
          <div ref={buttonRef} />
          <p className="muted"><a href={`mailto:${STORE.email}`}>{STORE.email}</a></p>
        </div>
      )}

      {token && page === "dashboard" && (status === "ok" ? <Dashboard orders={orders} messages={messages} tracked={tracked} /> : <p className="muted">{status === "loading" ? a.messagesLoading : status === "not-allowed" ? a.notAllowed : a.error}</p>)}

      {token && page === "checkouts" && <TrackingPanel status={trackedStatus} items={tracked} onHandled={onHandled} onRefresh={() => { load(); loadCheckouts(); }} />}

      {token && page === "orders" && (
        <div className="admin-tabs">
          <button type="button" aria-pressed={view === "orders"} onClick={() => setView("orders")}>{a.tabOrders}</button>
          <button type="button" aria-pressed={view === "messages"} onClick={() => setView("messages")}>
            {a.tabMessages}{unreadMessages > 0 && <span className="tab-count">{unreadMessages}</span>}
          </button>
        </div>
      )}

      {token && page === "orders" && view === "messages" && <MessagesPanel status={messagesStatus} messages={messages} onRead={onMessageRead} onRefresh={loadMessages} />}

      {token && page === "orders" && view === "orders" && (
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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORE } from "../data/store";
import { money } from "../lib/format";
import { adminConfig, listOrders, markRead, type AdminStatus, type Order } from "../lib/orders";
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

function exportCsv(orders: Order[], headings: string[]) {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = orders.map((order) => [
    order.number, new Date(order.createdAt).toLocaleString("he-IL"), order.name, order.phone, order.email, order.note,
    order.lines.map((line) => `${line.name} ×${line.quantity}${line.design ? ` (${line.design})` : ""}`).join("; "), order.total, order.read ? "✓" : "",
  ]);
  // The byte order mark tells Excel the file is UTF-8, so Hebrew shows correctly.
  const csv = "﻿" + [headings, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `betak-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
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
          {order.email && <a href={`mailto:${order.email}`}>{a.email}</a>}
        </div>
        {order.note && <p className="order-note"><b>{a.note}:</b> {order.note}</p>}
      </td>
      <td>
        <ul className="order-lines">
          {order.lines.map((line, index) => (
            <li key={index}>{line.name}{line.sku && ` (${line.sku})`} ×{line.quantity}{line.design && <small className="muted"> {line.design}</small>}</li>
          ))}
        </ul>
      </td>
      <td className="price">{money(order.total)}</td>
    </tr>
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

  useEffect(() => { load(); }, [load]);

  const onRead = async (order: Order, read: boolean) => {
    setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, read } : item)));
    if (!(await markRead(token, order.id, read))) load();
  };

  const signOut = () => {
    window.google?.accounts.id.disableAutoSelect();
    signIn("");
    setOrders([]);
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

  const headings = [a.number, a.date, a.customer, a.phone, a.email, a.note, a.items, a.total, a.read];

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
        <>
          <div className="admin-tools">
            <label className="admin-search">
              <span className="sr-only">{a.search}</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={a.search} />
            </label>
            <label className="admin-check"><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} /> {a.unreadOnly}</label>
            <button className="btn ghost small" onClick={load}>{a.refresh}</button>
            <button className="btn small" onClick={() => exportCsv(shown, headings)} disabled={shown.length === 0}>{a.export}</button>
          </div>
          <p role="status" className="muted">
            {status === "loading" ? a.loading : status === "not-allowed" ? a.notAllowed : status === "error" ? a.error : a.count(shown.length, orders.filter((order) => !order.read).length)}
          </p>
          {status === "ok" && shown.length === 0 && <p className="empty">{a.empty}</p>}
          {shown.length > 0 && (
            <div className="table-scroll" tabIndex={0} role="region" aria-label={a.title}>
              <table className="orders-table">
                <thead>
                  <tr><th scope="col">{a.read}</th><th scope="col">{a.number}</th><th scope="col">{a.date}</th><th scope="col">{a.customer}</th><th scope="col">{a.contact}</th><th scope="col">{a.items}</th><th scope="col">{a.total}</th></tr>
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

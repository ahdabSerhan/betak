import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { newCheckoutId, reachable, saveDraft, type CheckoutDraft } from "../lib/checkouts";
import { slotForProduct } from "../lib/designer";
import { money, whatsappLink } from "../lib/format";
import { addressLine, paymentConfig, saveOrder, type Address, type NewOrder, type PayWith } from "../lib/orders";
import { href } from "../lib/routes";
import { useShop, type CartLine } from "../state/ShopContext";

function CartRow({ line }: { line: CartLine }) {
  const { t, nameOf, addToCart, designNote, priceOf } = useShop();
  const { product, quantity } = line;

  return (
    <div className="line">
      <img src={product.image} alt="" />
      <div>
        <b>{nameOf(product)}</b>
        {designNote(product) && <small className="line-design">{designNote(product)}</small>}
        <div className="price muted">{money(priceOf(product))}</div>
        <div className="qty">
          <button onClick={() => addToCart(product.id, -1)} aria-label="-">−</button>
          <span>{quantity}</span>
          <button onClick={() => addToCart(product.id, 1)} aria-label="+">+</button>
        </div>
        <button className="link small" onClick={() => addToCart(product.id, -quantity)}>{t.remove}</button>
      </div>
      <b className="price">{money(priceOf(product) * quantity)}</b>
    </div>
  );
}

const EMPTY_ADDRESS: Address = { city: "", street: "", house: "", entrance: "", floor: "", apartment: "", entryCode: "", zip: "" };
// How long after the last keystroke the checkout draft is saved.
const DRAFT_DELAY_MS = 2000;
const EMPTY_DETAILS = { firstName: "", lastName: "", email: "", phone: "", phone2: "", note: "", elevator: "" as NewOrder["elevator"] };

// A labelled form field; required ones carry a visible star and the required attribute.
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label><span>{label}{required && <span className="required" aria-hidden="true"> *</span>}</span>{children}</label>;
}

export function CartDrawer() {
  const { t, lang, nameOf, cartLines, cartTotal, closeCart, clearCart, showInRoom, designNote, sizeOf, priceOf } = useShop();
  const c = t.checkout;
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [payments, setPayments] = useState({ card: false, maxPayments: 1 });
  const [payWith, setPayWith] = useState<PayWith>("phone");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const checkoutId = useRef(newCheckoutId());
  // The draft as it was when an order went out, so the same details are not saved again as a new checkout.
  const orderedKey = useRef("");
  const draftTimer = useRef(0);
  const draftSending = useRef<Promise<void>>(Promise.resolve());
  // The draft waiting for its timer, sent at once if the cart closes first.
  const pendingDraft = useRef<CheckoutDraft | null>(null);
  const field = (key: keyof typeof details) => ({ value: details[key], onChange: (event: { target: { value: string } }) => setDetails({ ...details, [key]: event.target.value }) });
  const addressField = (key: keyof Address) => ({ value: address[key], onChange: (event: { target: { value: string } }) => setAddress({ ...address, [key]: event.target.value }) });

  // Card payment is offered only when the server has UPay set up.
  useEffect(() => {
    paymentConfig().then((config) => {
      setPayments(config);
      if (config.card) setPayWith("card");
    });
  }, []);

  const seeInRoom = () => {
    closeCart();
    showInRoom(cartLines.map(({ product, quantity }) => ({ slot: slotForProduct(product), product, quantity })));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && closeCart();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeCart]);

  // The order goes to the store as a ready-to-send WhatsApp message, with its order number once saved.
  const orderMessage = (number: number | null) => [
    t.waOrder,
    ...(number ? [`${t.orderNumber}: ${number}`] : []),
    `${c.name}: ${details.firstName} ${details.lastName}`,
    `${c.phone}: ${details.phone}${details.phone2 ? `, ${details.phone2}` : ""}`,
    `${c.email}: ${details.email}`,
    `${c.address}: ${addressLine(address, c)}`,
    `${c.elevator} ${details.elevator === "yes" ? c.yes : c.no}`,
    ...cartLines.map(({ product, quantity }) => `• ${nameOf(product)}${product.sku ? ` (${product.sku})` : ""} ×${quantity} ${money(priceOf(product) * quantity)}${designNote(product) ? `\n   ${designNote(product)}` : ""}`),
    `${t.total}: ${money(cartTotal)}`,
    ...(details.note.trim() ? [details.note.trim()] : []),
  ].join("\n");

  // The sofa sizes the server prices the line by (none for a product sold as it is).
  const orderLines = () => cartLines.map(({ product, quantity }) => ({ productId: product.id, name: product.name.he, sku: product.sku, design: designNote(product) ?? "", quantity, price: priceOf(product), size: sizeOf(product) }));

  const newOrder = (): NewOrder => ({ ...details, address, payWith, lang, lines: orderLines(), checkoutId: checkoutId.current });

  // While the customer fills the form, a short draft (name, phone, email, city, cart) is saved,
  // so the store sees checkouts that were never finished. It waits for a pause in typing.
  const draft: CheckoutDraft = { firstName: details.firstName, lastName: details.lastName, phone: details.phone, email: details.email, city: address.city, payWith, lang, lines: orderLines() };
  const draftKey = JSON.stringify(draft);
  useEffect(() => {
    pendingDraft.current = null;
    if (sending || cartLines.length === 0 || draftKey === orderedKey.current || !reachable(draft)) return;
    pendingDraft.current = draft;
    draftTimer.current = window.setTimeout(() => {
      pendingDraft.current = null;
      draftSending.current = saveDraft(checkoutId.current, draft);
    }, DRAFT_DELAY_MS);
    return () => window.clearTimeout(draftTimer.current);
    // draftKey stands for the draft's contents.
  }, [draftKey, sending]);

  // Closing the cart sends a draft that was still waiting.
  useEffect(() => () => {
    if (pendingDraft.current) saveDraft(checkoutId.current, pendingDraft.current);
  }, []);

  // Before the order goes out, a pending draft is dropped and one on its way is let through,
  // so it cannot reach the server after the order and bring the draft back.
  const settleDraft = async () => {
    window.clearTimeout(draftTimer.current);
    pendingDraft.current = null;
    await draftSending.current;
  };

  // A card order is saved, then the customer moves to UPay's payment page. The card never touches this site.
  const payByCard = async () => {
    setMessage(c.toPaymentNow);
    await settleDraft();
    const saved = await saveOrder(newOrder());
    if (!saved?.payUrl) {
      setSending(false);
      return setMessage(c.payError);
    }
    clearCart();
    window.location.assign(saved.payUrl);
  };

  // A phone order is saved for the store's orders page, then WhatsApp opens. WhatsApp opens even if saving fails.
  const orderByPhone = async () => {
    // The tab is opened now, while the click still counts, so browsers do not block it.
    const whatsapp = window.open("", "_blank");
    await settleDraft();
    const saved = await saveOrder(newOrder());
    // Changes after this order belong to a new checkout.
    if (saved) {
      checkoutId.current = newCheckoutId();
      orderedKey.current = draftKey;
    }
    setSending(false);
    setMessage(saved ? t.orderSaved(saved.number) : "");
    const link = whatsappLink(orderMessage(saved?.number ?? null));
    if (whatsapp) {
      whatsapp.opener = null;
      whatsapp.location.href = link;
    } else {
      window.location.href = link;
    }
  };

  const sendOrder = (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    return payWith === "card" ? payByCard() : orderByPhone();
  };

  return (
    <>
      <div className="scrim" onClick={closeCart} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={t.cart}>
        <header>
          <h2>{t.cart}</h2>
          <button className="icon-btn" onClick={closeCart}>{t.close} ✕</button>
        </header>
        <div className="items">
          {cartLines.length === 0 && <p className="empty">{t.cartEmpty}</p>}
          {cartLines.map((line) => <CartRow line={line} key={line.product.id} />)}
          {cartLines.length > 0 && (
            // The submit button sits in the footer so it is always in view.
            <form id="order-form" className="order-form" onSubmit={sendOrder}>
              <fieldset>
                <legend>{c.buyer}</legend>
                <small className="muted">{c.required}</small>
                <div className="form-row">
                  <Field label={c.firstName} required><input {...field("firstName")} required minLength={2} maxLength={40} autoComplete="given-name" /></Field>
                  <Field label={c.lastName} required><input {...field("lastName")} required minLength={2} maxLength={40} autoComplete="family-name" /></Field>
                </div>
                <Field label={c.email} required><input {...field("email")} required type="email" maxLength={120} autoComplete="email" dir="ltr" /></Field>
                <div className="form-row">
                  <Field label={c.phone} required><input {...field("phone")} required type="tel" pattern="[0-9+\-\s]{9,}" maxLength={30} autoComplete="tel" dir="ltr" /></Field>
                  <Field label={c.phone2}><input {...field("phone2")} type="tel" pattern="[0-9+\-\s]{9,}" maxLength={30} dir="ltr" /></Field>
                </div>
                <div className="form-row">
                  <Field label={c.city} required><input {...addressField("city")} required minLength={2} maxLength={60} autoComplete="address-level2" /></Field>
                  <Field label={c.street} required><input {...addressField("street")} required minLength={2} maxLength={80} autoComplete="address-line1" /></Field>
                </div>
                <div className="form-row small-fields">
                  <Field label={c.house}><input {...addressField("house")} maxLength={10} /></Field>
                  <Field label={c.entrance}><input {...addressField("entrance")} maxLength={10} /></Field>
                  <Field label={c.floor}><input {...addressField("floor")} maxLength={10} /></Field>
                  <Field label={c.apartment}><input {...addressField("apartment")} maxLength={10} /></Field>
                  <Field label={c.entryCode}><input {...addressField("entryCode")} maxLength={20} dir="ltr" /></Field>
                  <Field label={c.zip}><input {...addressField("zip")} maxLength={10} inputMode="numeric" autoComplete="postal-code" dir="ltr" /></Field>
                </div>
                <Field label={c.note}><textarea {...field("note")} rows={2} maxLength={1000} /></Field>
              </fieldset>
              <fieldset>
                <legend>{c.more}</legend>
                <Field label={c.elevator} required>
                  <select {...field("elevator")} required>
                    <option value="">{c.choose}</option>
                    <option value="yes">{c.yes}</option>
                    <option value="no">{c.no}</option>
                  </select>
                </Field>
              </fieldset>
              <fieldset className="pay-choice">
                <legend>{c.payTitle}</legend>
                {payments.card && (
                  <label className="pay-option">
                    <input type="radio" name="pay-with" value="card" checked={payWith === "card"} onChange={() => setPayWith("card")} />
                    <span><b>{c.payCard}</b><small className="muted">{c.payCardNote(payments.maxPayments)}</small></span>
                  </label>
                )}
                <label className="pay-option">
                  <input type="radio" name="pay-with" value="phone" checked={payWith === "phone"} onChange={() => setPayWith("phone")} />
                  <span><b>{c.payPhone}</b><small className="muted">{c.payPhoneNote}</small></span>
                </label>
              </fieldset>
              <small className="muted">{t.orderPrivacy}<a href={href("privacy")} onClick={closeCart}>{t.privacy}</a>.</small>
            </form>
          )}
        </div>
        <footer>
          <div className="total price">
            <span>{t.total}</span>
            <span>{money(cartTotal)}</span>
          </div>
          {cartLines.length > 0 && (
            <>
              <button className={payWith === "card" ? "btn" : "btn wa"} form="order-form" disabled={sending}>{sending ? t.orderSending : payWith === "card" ? c.toPayment : c.sendPhone}</button>
              <p className="order-saved" role="status">{message}</p>
              <button className="btn gold" onClick={seeInRoom}>✦ {t.cartInRoom}</button>
            </>
          )}
          <button className="btn ghost" onClick={closeCart}>{t.keep}</button>
        </footer>
      </aside>
    </>
  );
}

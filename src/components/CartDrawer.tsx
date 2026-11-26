import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { slotForProduct } from "../lib/designer";
import { money, whatsappLink } from "../lib/format";
import { addressLine, paymentConfig, saveOrder, type Address, type NewOrder, type PayWith } from "../lib/orders";
import { href } from "../lib/routes";
import { useShop, type CartLine } from "../state/ShopContext";

function CartRow({ line }: { line: CartLine }) {
  const { t, nameOf, addToCart, designNote } = useShop();
  const { product, quantity } = line;

  return (
    <div className="line">
      <img src={product.image} alt="" />
      <div>
        <b>{nameOf(product)}</b>
        {designNote(product) && <small className="line-design">{designNote(product)}</small>}
        <div className="price muted">{money(product.price)}</div>
        <div className="qty">
          <button onClick={() => addToCart(product.id, -1)} aria-label="-">−</button>
          <span>{quantity}</span>
          <button onClick={() => addToCart(product.id, 1)} aria-label="+">+</button>
        </div>
        <button className="link small" onClick={() => addToCart(product.id, -quantity)}>{t.remove}</button>
      </div>
      <b className="price">{money(product.price * quantity)}</b>
    </div>
  );
}

const EMPTY_ADDRESS: Address = { city: "", street: "", house: "", entrance: "", floor: "", apartment: "", entryCode: "", zip: "" };
const EMPTY_DETAILS = { firstName: "", lastName: "", email: "", phone: "", phone2: "", note: "", elevator: "" as NewOrder["elevator"] };

// A labelled form field; required ones carry a visible star and the required attribute.
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label><span>{label}{required && <span className="required" aria-hidden="true"> *</span>}</span>{children}</label>;
}

export function CartDrawer() {
  const { t, lang, nameOf, cartLines, cartTotal, closeCart, clearCart, showInRoom, designNote } = useShop();
  const c = t.checkout;
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [payments, setPayments] = useState({ card: false, maxPayments: 1 });
  const [payWith, setPayWith] = useState<PayWith>("phone");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
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
    ...cartLines.map(({ product, quantity }) => `• ${nameOf(product)}${product.sku ? ` (${product.sku})` : ""} ×${quantity} ${money(product.price * quantity)}${designNote(product) ? `\n   ${designNote(product)}` : ""}`),
    `${t.total}: ${money(cartTotal)}`,
    ...(details.note.trim() ? [details.note.trim()] : []),
  ].join("\n");

  const newOrder = (): NewOrder => ({
    ...details,
    address,
    payWith,
    lang,
    lines: cartLines.map(({ product, quantity }) => ({ productId: product.id, name: product.name.he, sku: product.sku, design: designNote(product) ?? "", quantity, price: product.price })),
  });

  // A card order is saved, then the customer moves to UPay's payment page. The card never touches this site.
  const payByCard = async () => {
    setMessage(c.toPaymentNow);
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
    const saved = await saveOrder(newOrder());
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

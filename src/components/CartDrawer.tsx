import { useEffect, useState, type FormEvent } from "react";
import { slotForProduct } from "../lib/designer";
import { money, whatsappLink } from "../lib/format";
import { saveOrder } from "../lib/orders";
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

export function CartDrawer() {
  const { t, lang, nameOf, cartLines, cartTotal, closeCart, showInRoom, designNote } = useShop();
  const [details, setDetails] = useState({ name: "", phone: "", email: "", note: "" });
  const [sending, setSending] = useState(false);
  const [savedNumber, setSavedNumber] = useState<number | null>(null);
  const field = (key: keyof typeof details) => ({ value: details[key], onChange: (event: { target: { value: string } }) => setDetails({ ...details, [key]: event.target.value }) });

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
    `${t.orderName}: ${details.name}`,
    ...cartLines.map(({ product, quantity }) => `• ${nameOf(product)}${product.sku ? ` (${product.sku})` : ""} ×${quantity} ${money(product.price * quantity)}${designNote(product) ? `\n   ${designNote(product)}` : ""}`),
    `${t.total}: ${money(cartTotal)}`,
    ...(details.note.trim() ? [details.note.trim()] : []),
  ].join("\n");

  // Saves the order for the store's orders page, then opens WhatsApp. WhatsApp opens even if saving fails.
  const sendOrder = async (event: FormEvent) => {
    event.preventDefault();
    // The tab is opened now, while the click still counts, so browsers do not block it.
    const whatsapp = window.open("", "_blank");
    setSending(true);
    const number = await saveOrder({
      ...details,
      lang,
      lines: cartLines.map(({ product, quantity }) => ({ productId: product.id, name: product.name.he, sku: product.sku, design: designNote(product) ?? "", quantity, price: product.price })),
    });
    setSending(false);
    setSavedNumber(number);
    const link = whatsappLink(orderMessage(number));
    if (whatsapp) {
      whatsapp.opener = null;
      whatsapp.location.href = link;
    } else {
      window.location.href = link;
    }
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
              <h3>{t.orderDetails}</h3>
              <label>{t.orderName}<input {...field("name")} required minLength={2} maxLength={80} autoComplete="name" /></label>
              <label>{t.orderPhone}<input {...field("phone")} required type="tel" pattern="[0-9+\-\s]{9,}" maxLength={30} autoComplete="tel" dir="ltr" /></label>
              <label>{t.orderEmail}<input {...field("email")} type="email" maxLength={120} autoComplete="email" dir="ltr" /></label>
              <label>{t.orderNoteField}<textarea {...field("note")} rows={2} maxLength={1000} /></label>
              <small className="muted">{t.orderNote} {t.orderPrivacy}<a href={href("privacy")} onClick={closeCart}>{t.privacy}</a>.</small>
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
              <button className="btn wa" form="order-form" disabled={sending}>{sending ? t.orderSending : t.order}</button>
              <p className="order-saved" role="status">{savedNumber ? t.orderSaved(savedNumber) : ""}</p>
              <button className="btn gold" onClick={seeInRoom}>✦ {t.cartInRoom}</button>
            </>
          )}
          <button className="btn ghost" onClick={closeCart}>{t.keep}</button>
        </footer>
      </aside>
    </>
  );
}

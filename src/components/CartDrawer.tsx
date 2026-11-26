import { useEffect } from "react";
import { slotForProduct } from "../lib/designer";
import { money, whatsappLink } from "../lib/format";
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
  const { t, nameOf, cartLines, cartTotal, closeCart, showInRoom, designNote } = useShop();

  const seeInRoom = () => {
    closeCart();
    showInRoom(cartLines.map(({ product, quantity }) => ({ slot: slotForProduct(product), product, quantity })));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && closeCart();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeCart]);

  // The order goes to the store as a ready-to-send WhatsApp message.
  const orderMessage = [
    t.waOrder,
    ...cartLines.map(({ product, quantity }) => `• ${nameOf(product)}${product.sku ? ` (${product.sku})` : ""} ×${quantity} ${money(product.price * quantity)}${designNote(product) ? `\n   ${designNote(product)}` : ""}`),
    `${t.total}: ${money(cartTotal)}`,
  ].join("\n");

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
        </div>
        <footer>
          <div className="total price">
            <span>{t.total}</span>
            <span>{money(cartTotal)}</span>
          </div>
          {cartLines.length > 0 && (
            <>
              <a className="btn wa" href={whatsappLink(orderMessage)} target="_blank" rel="noopener">{t.order}</a>
              <small className="muted">{t.orderNote}</small>
              <button className="btn gold" onClick={seeInRoom}>✦ {t.cartInRoom}</button>
            </>
          )}
          <button className="btn ghost" onClick={closeCart}>{t.keep}</button>
        </footer>
      </aside>
    </>
  );
}

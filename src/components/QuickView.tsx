import { isOnSale, type Product } from "../data/catalog";
import { money } from "../lib/format";
import { useShop } from "../state/ShopContext";
import { Dialog } from "./Dialog";
import { productHref } from "../lib/routes";

// A pop-up summary of a product, for buying without leaving the grid.
export function QuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const { t, nameOf, addToCart, openCart } = useShop();
  const title = nameOf(product);

  const addAndShowCart = () => {
    addToCart(product.id);
    onClose();
    openCart();
  };

  return (
    <Dialog label={title} onClose={onClose}>
      <img src={product.image} alt={title} />
      <div className="body">
        <h2>{title}</h2>
        {product.sku && <span className="muted">{t.sku}: {product.sku}</span>}
        <div className="row price">
          <span className="now large">{money(product.price)}</span>
          {isOnSale(product) && <span className="was">{money(product.listPrice)}</span>}
        </div>
        <p className="muted">{t.intro}</p>
        <button className="btn" onClick={addAndShowCart}>{t.add}</button>
        <a className="btn ghost" href={productHref(product)} onClick={onClose}>{t.viewProduct}</a>
      </div>
    </Dialog>
  );
}

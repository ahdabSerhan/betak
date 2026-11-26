import { useState } from "react";
import { isOnSale, type Product } from "../data/catalog";
import { reviewsOf } from "../data/details";
import { useTilt } from "../hooks/useTilt";
import { money } from "../lib/format";
import { useShop } from "../state/ShopContext";
import { QuickView } from "./QuickView";
import { productHref } from "../lib/routes";

export const discountPercent = (product: Product) => Math.round((1 - product.price / product.listPrice) * 100);

function Badge({ product }: { product: Product }) {
  const { t } = useShop();
  if (isOnSale(product)) return <span className="badge sale">-{discountPercent(product)}%</span>;
  if (product.featured) return <span className="badge">{t.badgeFeatured}</span>;
  return null;
}

export function ProductCard({ product }: { product: Product }) {
  const { t, nameOf, isSaved, toggleSaved, addToCart, openCart } = useShop();
  const saved = isSaved(product.id);
  const tilt = useTilt<HTMLAnchorElement>(7);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const reviewCount = reviewsOf(product).length;

  const addAndShowCart = () => {
    addToCart(product.id);
    openCart();
  };

  return (
    <article className="card">
      <Badge product={product} />
      <button className="heart" onClick={() => toggleSaved(product.id)} aria-pressed={saved} aria-label={saved ? t.unsave : t.save}>
        {saved ? "♥" : "♡"}
      </button>
      <a className="shot tilt" href={productHref(product)} {...tilt}>
        <img src={product.image} alt={nameOf(product)} loading="lazy" />
      </a>
      <button className="quick-btn" onClick={() => setQuickViewOpen(true)}>{t.quick}</button>
      <button className="add" onClick={addAndShowCart} aria-label={`${t.add}: ${nameOf(product)}`}>+</button>
      <h3><a href={productHref(product)}>{nameOf(product)}</a></h3>
      <div className="row price">
        <span className="now">{money(product.price)}</span>
        {isOnSale(product) && <span className="was">{money(product.listPrice)}</span>}
        {reviewCount > 0 && <a className="card-reviews" href={productHref(product)}>{t.reviewsCount(reviewCount)}</a>}
      </div>
      {quickViewOpen && <QuickView product={product} onClose={() => setQuickViewOpen(false)} />}
    </article>
  );
}

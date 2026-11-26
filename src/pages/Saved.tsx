import { ProductCard } from "../components/ProductCard";
import { PRODUCTS } from "../data/catalog";
import { useShop } from "../state/ShopContext";
import { href } from "../lib/routes";

export function Saved() {
  const { t, isSaved } = useShop();
  const products = PRODUCTS.filter((product) => isSaved(product.id));

  return (
    <div className="wrap">
      <p className="crumbs"><a href={href("home")}>{t.crumbsHome}</a> / {t.saved}</p>
      <h1>{t.saved}</h1>
      {products.length === 0 ? (
        <p className="empty">{t.savedEmpty}</p>
      ) : (
        <div className="grid">{products.map((product) => <ProductCard product={product} key={product.id} />)}</div>
      )}
    </div>
  );
}

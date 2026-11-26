import { CATEGORIES, productsIn } from "../data/catalog";
import { useShop } from "../state/ShopContext";
import { href } from "../lib/routes";

// Collections as a bento grid: the first tile is the largest.
export function CategoryBento() {
  const { t, lang } = useShop();

  return (
    <div className="bento">
      {CATEGORIES.map((category) => {
        const products = productsIn(category.id);
        return (
          <a className="bento-tile" href={href(category.id)} key={category.id}>
            <img src={products[0].image} alt="" loading="lazy" />
            <span className="bento-label">
              <b>{category[lang]}</b>
              <small>{products.length} {t.models}</small>
            </span>
          </a>
        );
      })}
    </div>
  );
}

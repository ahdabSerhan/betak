import { productsIn, type Category } from "../data/catalog";
import { useShop } from "../state/ShopContext";
import { href } from "../lib/routes";

// Each tile shows the first product of its category.
export function CategoryTiles({ categories }: { categories: Category[] }) {
  const { lang } = useShop();

  return (
    <div className="tiles">
      {categories.map((category) => (
        <a className="tile" href={href(category.id)} key={category.id}>
          <img src={productsIn(category.id)[0].image} alt="" loading="lazy" />
          <span>{category[lang]}</span>
        </a>
      ))}
    </div>
  );
}

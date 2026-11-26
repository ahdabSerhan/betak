import { CATEGORIES } from "../data/catalog";
import { useShop } from "../state/ShopContext";
import { asset } from "../lib/asset";
import { href } from "../lib/routes";

export function Header({ route }: { route: string }) {
  const { t, lang, toggleLang, saved, cartCount, openCart } = useShop();
  const current = (id: string) => (route === id ? "page" : undefined);

  return (
    <>
      <div className="strip">{t.strip}</div>
      <header className="site">
        <div className="wrap">
          <div className="head-row">
            <a className="logo" href={href("home")}>
              <img src={asset("img/logo.webp")} alt="Betak Furniture Design" />
            </a>
            <div className="tools">
              <a className="icon-btn" href={href("about")}>{t.about}</a>
              <a className="icon-btn" href={href("contact")}>{t.contact}</a>
              <a className="icon-btn" href={href("saved")}>♡ {t.saved} <span className="count">{saved.length}</span></a>
              <button className="icon-btn" onClick={openCart}>{t.cart} <span className="count pop" key={cartCount}>{cartCount}</span></button>
              <button className="icon-btn" onClick={toggleLang}>{lang === "he" ? "English" : "עברית"}</button>
            </div>
          </div>
          <nav className="cats" aria-label={t.collections}>
            {CATEGORIES.map((category) => (
              <a href={href(category.id)} aria-current={current(category.id)} key={category.id}>{category[lang]}</a>
            ))}
            <a className="designer-link" href={href("designer")} aria-current={current("designer")}>✦ {t.designer}</a>
          </nav>
        </div>
      </header>
    </>
  );
}

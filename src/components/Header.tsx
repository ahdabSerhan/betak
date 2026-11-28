import { useEffect, useState } from "react";
import { CATEGORIES } from "../data/catalog";
import { SearchDialog } from "./SearchDialog";
import { useShop } from "../state/ShopContext";
import { asset } from "../lib/asset";
import { href } from "../lib/routes";

export function Header({ route }: { route: string }) {
  const { t, lang, toggleLang, saved, cartCount, openCart } = useShop();
  const current = (id: string) => (route === id ? "page" : undefined);
  const [searching, setSearching] = useState(false);

  // Ctrl+K or Cmd+K opens the search from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearching(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
              <button className="icon-btn search-open" onClick={() => setSearching(true)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4a6.5 6.5 0 0 1 5.2 10.4l4.4 4.4-1.4 1.4-4.4-4.4A6.5 6.5 0 1 1 10.5 4Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" /></svg>
                <span>{t.search.open}</span> <span className="search-ai-tag">AI</span>
              </button>
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
      {searching && <SearchDialog route={route} onClose={() => setSearching(false)} />}
    </>
  );
}

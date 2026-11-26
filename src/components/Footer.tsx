import { CATEGORIES } from "../data/catalog";
import { STORE } from "../data/store";
import { phoneLink, whatsappLink } from "../lib/format";
import { useShop } from "../state/ShopContext";
import { href } from "../lib/routes";

export function Footer() {
  const { t, lang } = useShop();

  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot">
          <div>
            <h3>Betak</h3>
            <p>{t.footTag}</p>
          </div>
          <div>
            <h3>{t.footCollections}</h3>
            <ul>
              {CATEGORIES.map((category) => (
                <li key={category.id}><a href={href(category.id)}>{category[lang]}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h3>{t.footInfo}</h3>
            <ul>
              <li><a href={href("about")}>{t.about}</a></li>
              <li><a href={href("contact")}>{t.contact}</a></li>
              <li><a href={href("designer")}>{t.designer}</a></li>
              <li><a href={href("terms")}>{t.terms}</a></li>
              <li><a href={href("shipping")}>{t.shipping}</a></li>
              <li><a href={href("privacy")}>{t.privacy}</a></li>
              <li><a href={href("accessibility")}>{t.accessibility}</a></li>
            </ul>
          </div>
          <div>
            <h3>{t.contact}</h3>
            <ul>
              <li><a href={phoneLink}>{STORE.phone}</a></li>
              <li><a href={whatsappLink()} target="_blank" rel="noopener">{t.whatsapp}</a></li>
              <li><a href={`mailto:${STORE.email}`}>{STORE.email}</a></li>
              <li>{t.pobox}</li>
              <li>
                <a href={STORE.instagram} target="_blank" rel="noopener">Instagram</a> · <a href={STORE.facebook} target="_blank" rel="noopener">Facebook</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="legal">{t.rights}</div>
      </div>
    </footer>
  );
}

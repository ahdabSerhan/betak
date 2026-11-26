import { STORE } from "../data/store";
import { phoneLink, whatsappLink } from "../lib/format";
import { useShop } from "../state/ShopContext";

export function Contact() {
  const { t } = useShop();

  return (
    <div className="wrap page stack">
      <h1>{t.contactTitle}</h1>
      <p>{t.contactText}</p>
      <ul className="contact-list">
        <li>{t.phone}: <a href={phoneLink}>{STORE.phone}</a></li>
        <li>{t.email}: <a href={`mailto:${STORE.email}`}>{STORE.email}</a></li>
        <li>{t.pobox}</li>
      </ul>
      <div className="chips">
        <a className="btn wa" href={whatsappLink()} target="_blank" rel="noopener">{t.whatsapp}</a>
        <a className="btn ghost" href={STORE.instagram} target="_blank" rel="noopener">Instagram</a>
        <a className="btn ghost" href={STORE.facebook} target="_blank" rel="noopener">Facebook</a>
      </div>
    </div>
  );
}

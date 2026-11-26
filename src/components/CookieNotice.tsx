import { usePersistentState } from "../hooks/usePersistentState";
import { href } from "../lib/routes";
import { useShop } from "../state/ShopContext";

// The cookie notice from the store's previous site; it stays hidden once the visitor agrees.
export function CookieNotice() {
  const { t } = useShop();
  const [accepted, setAccepted] = usePersistentState("betak-cookies-accepted", false);
  if (accepted) return null;

  return (
    <section className="cookie-notice" aria-label={t.cookieNotice}>
      <p>
        {t.cookieText} <a href={href("privacy")}>{t.privacy}</a>
      </p>
      <button type="button" className="btn" onClick={() => setAccepted(true)}>{t.cookieAccept}</button>
    </section>
  );
}

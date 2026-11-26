import { usePersistentState } from "../hooks/usePersistentState";
import { useShop } from "../state/ShopContext";

// The previous site's privacy policy, which the cookie notice links to.
const PRIVACY_POLICY = "https://2all.co.il/PP_Lang/PrivacyPolicy0.htm";

// The cookie notice from the previous site; it stays until the visitor accepts it.
export function CookieNotice() {
  const { t } = useShop();
  const [accepted, setAccepted] = usePersistentState("betak-cookies-accepted", false);
  if (accepted) return null;

  return (
    <section className="cookie-notice" role="region" aria-label={t.cookieLabel}>
      <p>
        {t.cookieText}{" "}
        <a href={PRIVACY_POLICY} target="_blank" rel="noopener">{t.cookiePolicy}</a>
      </p>
      <button className="btn" onClick={() => setAccepted(true)}>{t.cookieAccept}</button>
    </section>
  );
}

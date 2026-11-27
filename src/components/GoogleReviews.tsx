import { useEffect } from "react";
import { useShop } from "../state/ShopContext";
import { GOOGLE_REVIEWS_APP, GOOGLE_REVIEWS_SCRIPT } from "../data/reviewLinks";

// The store's Google reviews at the bottom of every page, shown by an Elfsight widget that loads only when scrolled into view.
export function GoogleReviews() {
  const { t } = useShop();
  useEffect(() => {
    // The script is added once; on later visits it finds the new widget by itself.
    if (document.querySelector(`script[src="${GOOGLE_REVIEWS_SCRIPT}"]`)) return;
    const script = document.createElement("script");
    script.src = GOOGLE_REVIEWS_SCRIPT;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <section className="block flush-top wrap" aria-labelledby="google-reviews-title">
      <h2 id="google-reviews-title">{t.reviewsTitle}</h2>
      <div className={`google-reviews elfsight-app-${GOOGLE_REVIEWS_APP}`} data-elfsight-app-lazy="" />
    </section>
  );
}

import { useEffect } from "react";
import { GOOGLE_REVIEWS_APP, GOOGLE_REVIEWS_SCRIPT } from "../data/reviewLinks";

// The store's Google reviews, shown by an Elfsight widget that loads only when scrolled into view.
export function GoogleReviews() {
  useEffect(() => {
    // The script is added once; on later visits it finds the new widget by itself.
    if (document.querySelector(`script[src="${GOOGLE_REVIEWS_SCRIPT}"]`)) return;
    const script = document.createElement("script");
    script.src = GOOGLE_REVIEWS_SCRIPT;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return <div className={`google-reviews elfsight-app-${GOOGLE_REVIEWS_APP}`} data-elfsight-app-lazy="" />;
}

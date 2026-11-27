import type { ReactNode } from "react";
import type { Review } from "../data/details";
import { useShop } from "../state/ShopContext";

// Fewer reviews than this fit on screen, so they stand still instead of gliding.
const MIN_TO_GLIDE = 4;
// How long one card takes to pass, so a short row and a long one glide at the same speed.
const SECONDS_PER_CARD = 6;

interface ReviewBeltProps<T extends Review> {
  reviews: T[];
  // Where a card leads, and an optional line under the name (the product, on the home page).
  linkOf?: (review: T) => string;
  noteOf?: (review: T) => ReactNode;
}

// Customer reviews in a row that glides by itself: to the right in Hebrew, to the left in English.
export function ReviewBelt<T extends Review>({ reviews, linkOf, noteOf }: ReviewBeltProps<T>) {
  const { lang, t } = useShop();
  const glides = reviews.length >= MIN_TO_GLIDE;
  // The row is doubled so it can loop without a gap; the copy is hidden from screen readers.
  const cards = glides ? [...reviews, ...reviews] : reviews;
  // With motion off the row scrolls instead; cards without links leave nothing to tab to, so the row itself takes focus.
  const scrollFocus = glides && !linkOf ? { tabIndex: 0, role: "region", "aria-label": t.reviewsTitle } : {};

  return (
    <div className={`review-belt ${glides ? "glides" : ""} ${lang === "he" ? "rightward" : ""}`} {...scrollFocus}>
      <div className="review-track" style={glides ? { animationDuration: `${reviews.length * SECONDS_PER_CARD}s` } : undefined}>
        {cards.map((review, index) => {
          const copy = index >= reviews.length;
          const body = (
            <>
              <p dir="auto">{review.text}</p>
              <b dir="auto">{review.name}</b>
              {noteOf && <small className="muted">{noteOf(review)}</small>}
            </>
          );
          return linkOf
            ? <a className="review-card" href={linkOf(review)} aria-hidden={copy} tabIndex={copy ? -1 : undefined} key={index}>{body}</a>
            : <div className="review-card" aria-hidden={copy} key={index}>{body}</div>;
        })}
      </div>
    </div>
  );
}

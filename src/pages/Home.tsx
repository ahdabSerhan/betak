import { lazy, Suspense, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { CategoryBento } from "../components/CategoryBento";
import { DesignerPrompt } from "../components/DesignerPrompt";
import { ProductCard } from "../components/ProductCard";
import { Reveal } from "../components/Reveal";
import AnimatedContent from "../components/bits/AnimatedContent";
import Magnet from "../components/bits/Magnet";
import SplitText from "../components/bits/SplitText";
import { ReviewBelt } from "../components/ReviewBelt";
import { productById, PRODUCTS } from "../data/catalog";
import { ALL_REVIEWS } from "../data/details";
import { GOOGLE_REVIEWS_URL } from "../data/reviewLinks";
import { useShop } from "../state/ShopContext";
import { asset } from "../lib/asset";
import { calm } from "../lib/motion";
import { href, productHref } from "../lib/routes";

const FEATURED = PRODUCTS.filter((product) => product.featured);
// The home page shows the longer reviews, which say the most.
const HOME_REVIEW_COUNT = 12;
// One review per customer, so the same thank-you left on two products shows once.
const HOME_REVIEWS = [...ALL_REVIEWS]
  .sort((a, b) => b.text.length - a.text.length)
  .filter((review, index, all) => all.findIndex((other) => other.name === review.name) === index)
  .slice(0, HOME_REVIEW_COUNT);

// three.js is heavy, so the showroom loads on its own after the page shows.
const Showroom = lazy(() => import("../showroom/Showroom"));

export function Home() {
  const { t, nameOf } = useShop();
  // The list is doubled so the marquee can loop without a gap.
  const marquee = [...t.values, ...t.values, ...t.values, ...t.values];
  const hero = useRef<HTMLElement>(null);

  // As the visitor scrolls past the showroom, its headline drifts up and fades out.
  useGSAP(() => {
    if (calm()) return;
    gsap.fromTo(".showroom-copy", { yPercent: 0, opacity: 1 }, {
      yPercent: -35,
      opacity: 0,
      ease: "none",
      scrollTrigger: { trigger: hero.current, start: "top top", end: "bottom 30%", scrub: true },
    });
  }, { scope: hero });

  return (
    <>
      <section className="showroom" ref={hero}>
        <img className="showroom-still" src={asset("img/hero1.webp")} alt="" />
        <Suspense fallback={null}><Showroom /></Suspense>
        <div className="showroom-copy">
          <span className="eyebrow">✦ {t.showroomLabel}</span>
          <SplitText tag="h1" text={t.heroTitle} splitType="words" effect="blur" trigger="load" delay={70} duration={1} textAlign="start" />
          <p>{t.showroomHint}</p>
        </div>
        <div className="showroom-prompt"><DesignerPrompt /></div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {marquee.map(([title], index) => <span key={index}>{title} ✦</span>)}
        </div>
      </div>

      <section className="block wrap">
        <AnimatedContent className="section-head" distance={30} duration={0.7}><h2>{t.collections}</h2></AnimatedContent>
        <Reveal><CategoryBento /></Reveal>
      </section>

      <section className="block flush-top">
        <div className="wrap section-head">
          <h2>{t.featured}</h2>
          <a href={href("sofas")}>{t.allModels}</a>
        </div>
        <AnimatedContent className="carousel" direction="horizontal" reverse distance={60} duration={0.8} stagger={0.08}>
          {FEATURED.map((product) => <ProductCard product={product} key={product.id} />)}
        </AnimatedContent>
      </section>

      <section className="block flush-top">
        <div className="wrap section-head">
          <h2>{t.reviewsTitle} <small className="muted">({ALL_REVIEWS.length})</small></h2>
        <a className="btn google" href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener"><b aria-hidden="true">G</b> {t.reviewGoogle}</a>
        </div>
        <ReviewBelt reviews={HOME_REVIEWS} linkOf={(review) => productHref(productById(review.productId)!)} noteOf={(review) => nameOf(productById(review.productId)!)} />
      </section>

      <section className="block wrap flush-top">
        <Reveal className="how">
          <div className="stack">
            <h2>{t.promoTitle}</h2>
            <p className="muted">{t.promoText}</p>
            <Magnet padding={40} magnetStrength={4}><a className="btn" href={href("designer")}>{t.tryDesigner}</a></Magnet>
          </div>
          <ol className="how-steps">
            {t.promoSteps.map((step, index) => <li key={step}><b>{index + 1}</b>{step}</li>)}
          </ol>
        </Reveal>
      </section>

      <section className="block wrap flush-top">
        <Reveal className="values">
          {t.values.map(([title, text]) => (
            <div className="value" key={title}>
              <b>{title}</b>
              <span className="muted">{text}</span>
            </div>
          ))}
        </Reveal>
      </section>
    </>
  );
}

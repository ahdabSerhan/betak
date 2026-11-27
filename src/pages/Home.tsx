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
import { GoogleReviews } from "../components/GoogleReviews";
import { PRODUCTS } from "../data/catalog";
import { useShop } from "../state/ShopContext";
import { asset } from "../lib/asset";
import { calm, smallScreen } from "../lib/motion";
import { href } from "../lib/routes";

const FEATURED = PRODUCTS.filter((product) => product.featured);

// three.js is heavy, so the showroom loads on its own after the page shows.
const Showroom = lazy(() => import("../showroom/Showroom"));

export function Home() {
  const { t } = useShop();
  // The list is doubled so the marquee can loop without a gap.
  const marquee = [...t.values, ...t.values, ...t.values, ...t.values];
  const hero = useRef<HTMLElement>(null);
  // The featured cards slide in sideways on wide screens; on phones they only fade up, so swiping the row stays steady.
  const phone = smallScreen();

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
        <AnimatedContent className="carousel" direction={phone ? "vertical" : "horizontal"} reverse={!phone} distance={phone ? 16 : 60} duration={phone ? 0.45 : 0.8} stagger={phone ? 0.04 : 0.08}>
          {FEATURED.map((product) => <ProductCard product={product} key={product.id} />)}
        </AnimatedContent>
      </section>

      <section className="block flush-top">
        <div className="wrap section-head">
          <h2>{t.reviewsTitle}</h2>
        </div>
        <div className="wrap"><GoogleReviews /></div>
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

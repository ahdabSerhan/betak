import { lazy, Suspense, useState, type PointerEvent } from "react";
import { Configurator, DesignSummary } from "../components/Configurator";
import { DesignDrawing } from "../components/DesignDrawing";
import { discountPercent, ProductCard } from "../components/ProductCard";
import { ReviewBelt } from "../components/ReviewBelt";
import { ReviewForm } from "../components/ReviewForm";
import { CATEGORIES, isOnSale, PRODUCTS, productsIn, type Product } from "../data/catalog";
import { detailsOf, POLICIES, reviewsOf, type Review } from "../data/details";
import { modelOf } from "../data/models";
import { GOOGLE_REVIEWS_URL } from "../data/reviewLinks";
import { fabricText, rulesFor, standardDesign, type Design, type DesignRules } from "../lib/custom";
import { money, whatsappLink } from "../lib/format";
import { useShop } from "../state/ShopContext";
import { href } from "../lib/routes";

const RELATED_COUNT = 4;

// three.js is heavy, so the 3D viewer loads only when a visitor opens it.
const Model3D = lazy(() => import("../components/Model3D"));

type View = "photos" | "design" | "model";

// Same model name in other categories, e.g. the Camila sofa, armchair and bed.
const sameCollection = (product: Product) => PRODUCTS.filter((other) => other.model && other.model === product.model && other.id !== product.id);

const sameCategory = (product: Product) => productsIn(product.category).filter((other) => other.id !== product.id && other.model !== product.model).slice(0, RELATED_COUNT);

// Main photo with thumbnails; moving the pointer over the photo zooms into that spot.
function Gallery({ photos: allPhotos, title, badge }: { photos: string[]; title: string; badge: string | null }) {
  const [active, setActive] = useState(0);
  // A photo the store's server no longer has is left out.
  const [missing, setMissing] = useState<string[]>([]);
  const photos = allPhotos.filter((photo) => !missing.includes(photo));
  const shown = photos[Math.min(active, photos.length - 1)];
  const [origin, setOrigin] = useState<string | null>(null);

  const zoomAt = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const box = event.currentTarget.getBoundingClientRect();
    setOrigin(`${((event.clientX - box.left) / box.width) * 100}% ${((event.clientY - box.top) / box.height) * 100}%`);
  };

  return (
    <div className="gallery">
      <div className={origin ? "gallery-main zoomed" : "gallery-main"} onPointerMove={zoomAt} onPointerLeave={() => setOrigin(null)}>
        {badge && <span className="badge sale">{badge}</span>}
        <img src={shown} alt={title} style={{ transformOrigin: origin ?? "center" }} key={shown} />
        {photos.length > 1 && <span className="gallery-count">{active + 1} / {photos.length}</span>}
      </div>
      {photos.length > 1 && (
        <div className="gallery-thumbs">
          {photos.map((photo, index) => (
            <button aria-pressed={index === active} aria-label={`${title} ${index + 1}`} onClick={() => setActive(index)} key={photo}>
              <img src={photo} alt="" loading="lazy" onError={() => setMissing((gone) => [...gone, photo])} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// The visitor's own version of the piece: a measured drawing in the chosen fabric.
function DesignSheet({ design, rules, summary }: { design: Design; rules: DesignRules; summary: string }) {
  const { t } = useShop();
  return (
    <div className="design-sheet">
      <DesignDrawing design={design} rules={rules} />
      <div className="design-fabric">
        <b>{fabricText(design, t) ?? `${t.colorCodeLabel}: ${t.colorCodeMissing}`}</b>
        <span className="muted">{summary}</span>
      </div>
    </div>
  );
}

// What customers wrote about the product, as on the store's site.
function Reviews({ reviews, productName }: { reviews: Review[]; productName: string }) {
  const { t } = useShop();
  return (
    <section className="block flush-top" id="reviews">
      <div className="section-head"><h2>{t.reviewsTitle} {reviews.length > 0 && <small className="muted">({reviews.length})</small>}</h2></div>
      {reviews.length > 0 ? <ReviewBelt reviews={reviews} /> : <p className="muted">{t.reviewFirst}</p>}
      <div className="review-actions">
        <ReviewForm productName={productName} />
        <a className="btn google" href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener"><b aria-hidden="true">G</b> {t.reviewGoogle}</a>
      </div>
    </section>
  );
}

function ProductRow({ title, products }: { title: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="block flush-top">
      <div className="section-head"><h2>{title}</h2></div>
      <div className="grid flush">{products.map((item) => <ProductCard product={item} key={item.id} />)}</div>
    </section>
  );
}

export function ProductPage({ product }: { product: Product }) {
  const { t, lang, nameOf, addToCart, openCart, isSaved, toggleSaved, designs, setDesign, designNote } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [view, setView] = useState<View>("photos");
  const model = modelOf(product.id);
  const rules = rulesFor(product);
  // Choices saved before a newer option existed are completed with the standard ones.
  const design = rules && { ...standardDesign(product, rules), ...designs[product.id] };
  const summary = designNote(product);
  const category = CATEGORIES.find((item) => item.id === product.category)!;
  const details = detailsOf(product);
  const reviews = reviewsOf(product);
  const title = nameOf(product);
  const saved = isSaved(product.id);
  const question = `${t.waAsk} ${title}${product.sku ? ` (${product.sku})` : ""}${summary ? `\n${t.waDesign} ${summary}` : ""}`;

  // Every change is saved for the cart and shown at once in the drawing.
  const changeDesign = (next: Design) => {
    setDesign(product.id, next);
    setView("design");
  };
  // The store's descriptions are written in Hebrew, so they show on the Hebrew site.
  const showDescription = lang === "he" && details.paragraphs.length > 0;

  const addAndShowCart = () => {
    addToCart(product.id, quantity);
    openCart();
  };

  const buyRow = (
    <div className="buy">
      <div className="qty" aria-label={t.quantity}>
        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="-">−</button>
        <span>{quantity}</span>
        <button onClick={() => setQuantity(quantity + 1)} aria-label="+">+</button>
      </div>
      <button className="btn grow" onClick={addAndShowCart}>{t.add} · {money(product.price * quantity)}</button>
      <button className="round light" onClick={() => toggleSaved(product.id)} aria-pressed={saved} aria-label={saved ? t.unsave : t.save}>{saved ? "♥" : "♡"}</button>
    </div>
  );

  return (
    <div className="wrap">
      <p className="crumbs">
        <a href={href("home")}>{t.crumbsHome}</a> / <a href={href(category.id)}>{category[lang]}</a> / {title}
      </p>

      <div className="product">
        <div className="product-view">
          {((rules && design) || model) && (
            <div className="view-tabs" role="tablist">
              <button role="tab" aria-selected={view === "photos"} onClick={() => setView("photos")}>{t.tabPhotos}</button>
              {model && <button role="tab" aria-selected={view === "model"} onClick={() => setView("model")}>◈ {t.tabModel}</button>}
              {rules && design && <button role="tab" aria-selected={view === "design"} onClick={() => setView("design")}>✦ {t.tabDesign}</button>}
            </div>
          )}
          {view === "design" && rules && design && <DesignSheet design={design} rules={rules} summary={`${design.width} × ${design.depth} ${t.cm}`} />}
          {view === "model" && model && (
            <div className="model-sheet">
              <Suspense fallback={null}><Model3D src={model} label={title} /></Suspense>
              <small className="muted">{t.modelHint}</small>
            </div>
          )}
          {view === "photos" && <Gallery photos={details.photos} title={title} badge={isOnSale(product) ? `-${discountPercent(product)}%` : null} key={product.id} />}
          {/* Under the photos: what was chosen, then what every buyer wants to know. */}
          {rules && design && <DesignSummary product={product} design={design} rules={rules} />}
          <ul className="trust">{t.points.map((point) => <li key={point}>{point}</li>)}</ul>

          <div className="accordion">
            <details>
              <summary>{t.deliveryTitle}</summary>
              <ul>{POLICIES[lang].delivery.map((note) => <li key={note}>{note}</li>)}</ul>
            </details>
            {POLICIES[lang].questions.map(([ask, answer]) => (
              <details key={ask}>
                <summary>{ask}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="product-info stack">
          <a className="eyebrow ink" href={href(category.id)}>{category[lang]}</a>
          <h1>{title}</h1>
          <div className="row price">
            <span className="now xl">{money(product.price)}</span>
            {isOnSale(product) && <span className="was">{money(product.listPrice)}</span>}
            {product.sku && <span className="muted sku">{t.sku}: {product.sku}</span>}
            {reviews.length > 0 && <a className="review-link" href="#reviews" onClick={(event) => { event.preventDefault(); document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" }); }}>{t.reviewsCount(reviews.length)}</a>}
          </div>

          {showDescription ? details.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>) : <p className="muted">{t.intro}</p>}

          {lang === "he" && details.specs.length > 0 && (
            <ul className="specs" aria-label={t.sizesTitle}>
              {details.specs.map((spec) => <li key={spec}>{spec}</li>)}
            </ul>
          )}

          {rules && design && (
            <Configurator design={design} rules={rules} onChange={changeDesign} onReset={() => { setDesign(product.id, null); setView("photos"); }} key={product.id} />
          )}

          {buyRow}
          <div className="buy">
            <a className="btn wa grow" href={whatsappLink(question)} target="_blank" rel="noopener">{t.ask}</a>
            <a className="btn ghost grow" href={href("designer")}>✦ {t.seeInRoom}</a>
          </div>
        </div>
      </div>

      <Reviews reviews={reviews} productName={title} />
      <ProductRow title={t.collectionOf(product.model)} products={sameCollection(product)} />
      <ProductRow title={t.alsoLike} products={sameCategory(product)} />

      <div className="buy-bar">
        <div><b>{title}</b><span className="price">{money(product.price)}</span></div>
        <button className="btn gold" onClick={addAndShowCart}>{t.add}</button>
      </div>
    </div>
  );
}

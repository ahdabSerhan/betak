import { Fragment, useMemo, useState } from "react";
import { CategoryTiles } from "../components/CategoryTiles";
import { ProductCard } from "../components/ProductCard";
import { Reveal } from "../components/Reveal";
import { CATEGORIES, isOnSale, productsIn, type Category, type Product } from "../data/catalog";
import { money, whatsappLink } from "../lib/format";
import { useShop } from "../state/ShopContext";
import { href } from "../lib/routes";

type SortKey = "rec" | "low" | "high" | "name";
type ShowKey = "all" | "sale" | "featured";

const PAGE_SIZE = 16;
const NUDGE_AFTER = 8;

// Price ranges for the filter chips; the first one means "any price".
const PRICE_RANGES: [min: number, max: number][] = [[0, Infinity], [0, 1000], [1000, 2500], [2500, 4000], [4000, Infinity]];
const inRange = (product: Product, range: number) => product.price >= PRICE_RANGES[range][0] && product.price < PRICE_RANGES[range][1];

const SHOW_FILTERS: Record<ShowKey, (product: Product) => boolean> = {
  all: () => true,
  sale: isOnSale,
  featured: (product) => product.featured,
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button className="chip" aria-pressed={active} onClick={onClick}>{children}</button>;
}

function WhatsAppNudge() {
  const { t } = useShop();
  return (
    <aside className="nudge">
      <div>
        <b>{t.nudgeTitle}</b>
        <p className="muted">{t.nudgeText}</p>
      </div>
      <a className="btn wa small" href={whatsappLink(t.waPhoto)} target="_blank" rel="noopener">{t.nudgeBtn}</a>
    </aside>
  );
}

export function CategoryPage({ category }: { category: Category }) {
  const { t, lang, nameOf } = useShop();
  const [sort, setSort] = useState<SortKey>("rec");
  const [show, setShow] = useState<ShowKey>("all");
  const [range, setRange] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const all = useMemo(() => productsIn(category.id), [category.id]);

  const matching = useMemo(() => {
    const sorters: Record<SortKey, (a: Product, b: Product) => number> = {
      rec: (a, b) => Number(b.featured) - Number(a.featured),
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
      name: (a, b) => nameOf(a).localeCompare(nameOf(b), lang),
    };
    return all.filter(SHOW_FILTERS[show]).filter((product) => inRange(product, range)).sort(sorters[sort]);
  }, [all, show, range, sort, lang, nameOf]);

  const visible = matching.slice(0, limit);
  const showLabels: Record<ShowKey, string> = { all: t.all, sale: t.onSale, featured: t.featuredOnly };
  const showOptions = (Object.keys(SHOW_FILTERS) as ShowKey[]).filter((key) => all.some(SHOW_FILTERS[key]));
  const rangeOptions = PRICE_RANGES.map((_, index) => index).filter((index) => all.some((product) => inRange(product, index)));

  const rangeLabel = (index: number) => {
    const [min, max] = PRICE_RANGES[index];
    if (index === 0) return t.priceAll;
    if (min === 0) return `${t.upTo} ${money(max)}`;
    return max === Infinity ? `${money(min)} ${t.andUp}` : `${money(min)}–${money(max)}`;
  };

  // Changing a filter starts again from the first page.
  const pickShow = (key: ShowKey) => { setShow(key); setLimit(PAGE_SIZE); };
  const pickRange = (index: number) => { setRange(index); setLimit(PAGE_SIZE); };

  return (
    <div className="wrap">
      <p className="crumbs"><a href={href("home")}>{t.crumbsHome}</a> / {t.collections} / {category[lang]}</p>

      <div className="cat-intro">
        <div className="stack">
          <h1>{category.h1[lang]}</h1>
          <p>{t.intro}</p>
        </div>
        <ul className="points">{t.points.map((point) => <li key={point}>{point}</li>)}</ul>
      </div>

      <div className="filterbar">
        <div className="chips">
          <b>{matching.length} {t.models}</b>
          {showOptions.map((key) => <Chip active={show === key} onClick={() => pickShow(key)} key={key}>{showLabels[key]}</Chip>)}
        </div>
        <div className="chips">
          {rangeOptions.map((index) => (
            <Chip active={range === index} onClick={() => pickRange(index)} key={index}>
              {rangeLabel(index)} ({all.filter((product) => inRange(product, index)).length})
            </Chip>
          ))}
        </div>
        <label className="chips" htmlFor="sort">
          {t.sort}
          <select id="sort" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="rec">{t.sortRec}</option>
            <option value="low">{t.sortLow}</option>
            <option value="high">{t.sortHigh}</option>
            <option value="name">{t.sortName}</option>
          </select>
        </label>
      </div>

      {matching.length === 0 ? (
        <p className="empty">{t.empty} <button className="link" onClick={() => { pickShow("all"); setRange(0); }}>{t.clear}</button></p>
      ) : (
        <div className="grid">
          {visible.map((product, index) => (
            <Fragment key={product.id}>
              {index === NUDGE_AFTER && <WhatsAppNudge />}
              <Reveal delay={(index % 4) * 60}><ProductCard product={product} /></Reveal>
            </Fragment>
          ))}
        </div>
      )}

      {matching.length > visible.length && (
        <div className="more">
          <span className="muted">{t.showing(visible.length, matching.length)}</span>
          <button className="btn ghost" onClick={() => setLimit(limit + PAGE_SIZE)}>{t.moreModels}</button>
        </div>
      )}

      <section className="block">
        <div className="section-head"><h2>{t.guideTitle}</h2></div>
        <div className="guide">
          {t.guide.map(([title, text]) => (
            <div key={title}>
              <b>{title}</b>
              <p className="muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="block flush-top">
        <div className="section-head"><h2>{t.related}</h2></div>
        <CategoryTiles categories={CATEGORIES.filter((other) => other.id !== category.id).slice(0, 6)} />
      </section>
    </div>
  );
}

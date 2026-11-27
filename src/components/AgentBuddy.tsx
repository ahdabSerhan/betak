import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { isOnSale, productById, type Product } from "../data/catalog";
import { reviewsOf } from "../data/details";
import { pageKind } from "../lib/agentPages";
import { money } from "../lib/format";
import { calm } from "../lib/motion";
import { useShop } from "../state/ShopContext";
import { Orb } from "./Orb";

// What the buddy is saying, and the product it is about (if any).
interface Remark {
  text: string;
  about?: Product;
}

// When the buddy speaks: after a page opens, after the pointer rests on a product, after scrolling stops.
const PAGE_TIP_MS = 3000;
const HOVER_MS = 900;
const IDLE_MS = 2000;
// How long a remark stays, the pause between remarks, and how many a visit gets.
const REMARK_MS = 10000;
const REMARK_GAP_MS = 12000;
const MAX_REMARKS = 6;
const TYPING_MS = 22;
// Where the buddy may stand: below the site header, above the bottom bars.
const KEEP_CLEAR = { top: 190, bottom: 100, side: 8 };
const EYE_REACH = 3;

// Kept for the whole visit, across pages: what was already said, and whether the visitor asked for quiet.
const told = { routes: new Set<string>(), products: new Set<number>(), spots: new Set<string>(), count: 0, lastAt: 0, quiet: false };
// Parts of pages the buddy comes to help with, marked with data-buddy="room" and so on.
type Spot = "room" | "choices" | "configure";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// The closed assistant: a small character that walks to the product the visitor is looking at and talks about it.
export function AgentBuddy({ route, onOpen }: { route: string; onOpen: (about?: Product) => void }) {
  const { t, lang, nameOf } = useShop();
  const dock = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [away, setAway] = useState(false);
  const [remark, setRemark] = useState<Remark | null>(null);
  const [typed, setTyped] = useState(0);

  // Walks back to the corner and stops talking.
  const goHome = useCallback(() => {
    setRemark(null);
    setAway(false);
    if (dock.current) gsap.to(dock.current, { x: 0, y: 0, duration: 0.6, ease: "power3.inOut", overwrite: true });
  }, []);

  // One line about a product: its sale, its reviews, or its price.
  const lineFor = useCallback((product: Product) => {
    const name = nameOf(product);
    const reviews = reviewsOf(product).length;
    if (isOnSale(product)) return t.agentSay.sale(name, money(product.price), money(product.listPrice));
    if (reviews > 0) return t.agentSay.loved(name, reviews);
    return t.agentSay.plain(name, money(product.price));
  }, [nameOf, t]);

  // Walks to the corner of an element, so it stands beside what the visitor uses instead of covering it.
  const walkTo = useCallback((element: HTMLElement, remark: Remark) => {
    if (!dock.current || !face.current) return;
    const say = () => setRemark(remark);
    // With "less motion" the buddy speaks from its corner.
    if (calm()) return say();
    const box = element.getBoundingClientRect();
    const faceBox = face.current.getBoundingClientRect();
    // The element's top corner on the reading side's end: the left edge in Hebrew, the right edge in English.
    const edge = lang === "he" ? box.left : box.right;
    const targetX = clamp(edge - faceBox.width / 2, KEEP_CLEAR.side, window.innerWidth - faceBox.width - KEEP_CLEAR.side);
    const targetY = clamp(box.top - faceBox.height / 2, KEEP_CLEAR.top, window.innerHeight - faceBox.height - KEEP_CLEAR.bottom);
    setRemark(null);
    setAway(true);
    gsap.to(dock.current, { x: `+=${targetX - faceBox.left}`, y: `+=${targetY - faceBox.top}`, duration: 0.8, ease: "power3.inOut", overwrite: true, onComplete: say });
  }, [lang]);

  // Walks to a product card and says a line about it.
  const visit = useCallback((card: HTMLElement) => {
    const product = productById(Number(card.dataset.product));
    const now = Date.now();
    if (!product || told.quiet || told.products.has(product.id) || told.count >= MAX_REMARKS || now - told.lastAt < REMARK_GAP_MS) return;
    told.products.add(product.id);
    told.count += 1;
    told.lastAt = now;
    walkTo(card, { text: lineFor(product), about: product });
  }, [lineFor, walkTo]);

  // When the visitor starts using the room, the designer's choices or a product's options, the buddy comes beside them once, right away.
  useEffect(() => {
    const onUse = (event: Event) => {
      const element = (event.target as Element).closest?.<HTMLElement>("[data-buddy]");
      const spot = element?.dataset.buddy as Spot | undefined;
      if (!element || !spot || told.quiet || told.spots.has(spot) || told.count >= MAX_REMARKS) return;
      told.spots.add(spot);
      told.count += 1;
      told.lastAt = Date.now();
      walkTo(element, { text: t.agentSay.spot[spot] });
    };
    document.addEventListener("pointerdown", onUse);
    document.addEventListener("focusin", onUse);
    return () => {
      document.removeEventListener("pointerdown", onUse);
      document.removeEventListener("focusin", onUse);
    };
  }, [t, walkTo]);

  // Scrolling tucks the label away and sends the buddy home; when scrolling stops it looks at the product in the middle.
  useEffect(() => {
    let last = window.scrollY;
    let idle = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 6) return;
      setCompact(y > last && y > 240);
      last = y;
      goHome();
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        const middle = window.innerHeight / 2;
        const inView = [...document.querySelectorAll<HTMLElement>(".card[data-product]")]
          .map((card) => ({ card, box: card.getBoundingClientRect() }))
          .filter(({ box }) => box.top > 80 && box.bottom < window.innerHeight && box.left >= 0 && box.right <= window.innerWidth)
          .sort((a, b) => Math.abs(a.box.top + a.box.height / 2 - middle) - Math.abs(b.box.top + b.box.height / 2 - middle));
        const fresh = inView.find(({ card }) => !told.products.has(Number(card.dataset.product)));
        if (fresh) visit(fresh.card);
      }, IDLE_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(idle);
    };
  }, [goHome, visit]);

  // A mouse resting on a product brings the buddy over; its eyes follow the pointer.
  useEffect(() => {
    let rest = 0;
    const cardOf = (event: PointerEvent) => (event.target as Element).closest?.<HTMLElement>(".card[data-product]") ?? null;
    const onOver = (event: PointerEvent) => {
      const card = event.pointerType === "mouse" ? cardOf(event) : null;
      window.clearTimeout(rest);
      if (card) rest = window.setTimeout(() => visit(card), HOVER_MS);
    };
    const onMove = (event: PointerEvent) => {
      if (!face.current || calm()) return;
      const box = face.current.getBoundingClientRect();
      const angle = Math.atan2(event.clientY - (box.top + box.height / 2), event.clientX - (box.left + box.width / 2));
      face.current.style.setProperty("--look-x", `${Math.cos(angle) * EYE_REACH}px`);
      face.current.style.setProperty("--look-y", `${Math.sin(angle) * EYE_REACH}px`);
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointermove", onMove);
      window.clearTimeout(rest);
    };
  }, [visit]);

  // A short tip about the page the visitor just opened, once per page.
  useEffect(() => {
    goHome();
    if (told.quiet || told.routes.has(route)) return;
    const page = pageKind(route, lang, nameOf);
    const text = page.kind === "product" || page.kind === "category" ? t.agentHint[page.kind](page.name) : t.agentHint[page.kind];
    const speak = window.setTimeout(() => {
      told.routes.add(route);
      told.lastAt = Date.now();
      setRemark({ text });
    }, PAGE_TIP_MS);
    return () => window.clearTimeout(speak);
  }, [route, lang, nameOf, t, goHome]);

  // The remark is typed out letter by letter, then the buddy goes home after a while.
  useEffect(() => {
    if (!remark) return;
    setTyped(calm() ? remark.text.length : 0);
    const typing = window.setInterval(() => setTyped((count) => Math.min(count + 1, remark.text.length)), TYPING_MS);
    const done = window.setTimeout(goHome, REMARK_MS);
    return () => {
      window.clearInterval(typing);
      window.clearTimeout(done);
    };
  }, [remark, goHome]);

  // The speech bubble is nudged sideways so it never leaves the screen.
  useLayoutEffect(() => {
    const element = bubble.current;
    if (!element) return;
    element.style.translate = "0";
    const box = element.getBoundingClientRect();
    const shift = box.left < KEEP_CLEAR.side ? KEEP_CLEAR.side - box.left : Math.min(0, window.innerWidth - KEEP_CLEAR.side - box.right);
    element.style.translate = `${shift}px 0`;
  }, [remark]);

  const hush = () => {
    told.quiet = true;
    goHome();
  };
  const talking = remark !== null && typed < remark.text.length;

  return (
    <div className={`agent-dock${compact || away ? " compact" : ""}${talking ? " talking" : ""}`} ref={dock}>
      {remark && (
        <div className="agent-hint" ref={bubble}>
          <button className="agent-hint-text" onClick={() => onOpen(remark.about)} aria-label={remark.text}>{remark.text.slice(0, typed)}</button>
          <button className="agent-hint-close" onClick={hush} aria-label={t.agentHintClose}>✕</button>
        </div>
      )}
      <button className="agent-launcher" onClick={() => onOpen(remark?.about)}>
        <span className="agent-face" ref={face}>
          <Orb size={40} />
          <span className="agent-eyes" aria-hidden="true"><i /><i /></span>
        </span>
        <span className="agent-launcher-text">{t.agentLauncher}</span>
      </button>
    </div>
  );
}

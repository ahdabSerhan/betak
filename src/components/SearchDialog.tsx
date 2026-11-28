import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CATEGORIES, PRODUCTS, type Product } from "../data/catalog";
import { navigate } from "../hooks/useRoute";
import { askAgent, type AgentReply, type ChatMessage } from "../lib/agent";
import { money } from "../lib/format";
import { href, productHref } from "../lib/routes";
import { canListen, listen } from "../lib/voice";
import { usePersistentState } from "../hooks/usePersistentState";
import { useShop } from "../state/ShopContext";
import { pageLabel } from "./AgentWidget";
import { Dialog } from "./Dialog";

type Mode = "ai" | "text";

// One AI search: what the visitor asked and what the assistant answered.
interface Turn {
  question: string;
  reply: AgentReply;
}

const TEXT_RESULTS = 12;
// The room the AI assumes when the visitor gives no measurements or budget.
const DEFAULT_CONTEXT = { budget: 9000, dimensions: { wall: 4.5, depth: 3.8 } };

// Products whose name, category or SKU contain every word of the query.
function matchProducts(query: string, nameOf: (product: Product) => string): Product[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return PRODUCTS.filter((product) => {
    const category = CATEGORIES.find((item) => item.id === product.category);
    const text = [nameOf(product), product.name.he, product.name.en, category?.he, category?.en, product.sku].join(" ").toLowerCase();
    return words.every((word) => text.includes(word));
  }).slice(0, TEXT_RESULTS);
}

// The products of a search, as small cards that open the product page.
function Results({ products, onPick }: { products: Product[]; onPick: () => void }) {
  const { nameOf } = useShop();
  return (
    <ul className="search-results">
      {products.map((product) => (
        <li key={product.id}>
          <a href={productHref(product)} onClick={onPick}>
            <img src={product.image} alt="" loading="lazy" />
            <span>{nameOf(product)}</span>
            <b className="price">{money(product.price)}</b>
          </a>
        </li>
      ))}
    </ul>
  );
}

// Site search with two modes: instant matching by name, or an AI search that answers like the assistant.
export function SearchDialog({ route, onClose }: { route: string; onClose: () => void }) {
  const { t, lang, nameOf, showInRoom, openAgent } = useShop();
  const [mode, setMode] = usePersistentState<Mode>("betak.searchMode", "ai");
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const stopListening = useRef<() => void>(() => undefined);
  const matches = useMemo(() => (mode === "text" ? matchProducts(query, nameOf) : []), [mode, query, nameOf]);

  useEffect(() => input.current?.focus(), [mode]);
  useEffect(() => () => stopListening.current(), []);

  // Asks the AI, with the earlier searches of this dialog as the conversation so far.
  const askAi = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    setThinking(true);
    setQuery("");
    const history: ChatMessage[] = turns.flatMap((turn) => [{ role: "user", content: turn.question }, { role: "assistant", content: turn.reply.message }]);
    const reply = await askAgent([...history, { role: "user", content: question }], { pieces: [], ...DEFAULT_CONTEXT, lang, route, search: true });
    setTurns([...turns, { question, reply }]);
    setThinking(false);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "ai") void askAi(query);
  };

  // Speaking fills the box and searches when the sentence ends.
  const toggleMic = () => {
    if (listening) return stopListening.current();
    setListening(true);
    stopListening.current = listen(lang, (text, final) => {
      setQuery(text);
      if (final) void askAi(text);
    }, () => setListening(false));
  };

  const go = (page: string) => {
    onClose();
    navigate(page);
  };

  const latest = turns[turns.length - 1];

  return (
    <Dialog label={t.search.label} onClose={onClose}>
      <div className="search">
        <div className="search-modes" role="group" aria-label={t.search.label}>
          <button aria-pressed={mode === "ai"} onClick={() => setMode("ai")}>✦ {t.search.ai}</button>
          <button aria-pressed={mode === "text"} onClick={() => setMode("text")}>{t.search.text}</button>
        </div>

        <form className="search-bar" onSubmit={onSubmit} role="search">
          <label className="sr-only" htmlFor="site-search">{t.search.label}</label>
          <input id="site-search" ref={input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === "ai" ? (listening ? t.agentListening : t.search.aiPlaceholder) : t.search.placeholder} autoComplete="off" />
          {mode === "ai" && canListen() && (
            <button type="button" className={`search-mic${listening ? " on" : ""}`} onClick={toggleMic} aria-pressed={listening} aria-label={listening ? t.agentMicStop : t.agentMic}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1a7 7 0 0 0 6-6.9h-2Z" /></svg>
            </button>
          )}
          {mode === "ai" && <button className="btn gold" disabled={thinking || !query.trim()}>{t.search.go}</button>}
        </form>

        <div className="search-body" aria-live="polite" data-lenis-prevent>
          {mode === "text" && query.trim() !== "" && (
            matches.length > 0 ? <Results products={matches} onPick={onClose} /> : <p className="muted">{t.search.empty}</p>
          )}

          {mode === "ai" && (
            <>
              {turns.length === 0 && !thinking && (
                <div className="chips">
                  {t.search.suggestions.map((suggestion) => <button className="chip" onClick={() => void askAi(suggestion)} key={suggestion}>{suggestion}</button>)}
                </div>
              )}
              {turns.map((turn, index) => {
                // Without AI the assistant builds a room by rules; search shows name matches instead.
                const products = turn.reply.source === "rules" ? matchProducts(turn.question, nameOf) : turn.reply.pieces?.map((piece) => piece.product) ?? [];
                return (
                  <section className="search-turn" key={index}>
                    <p className="search-question">{turn.question}</p>
                    <p className="search-answer"><span aria-hidden="true">✦</span> {turn.reply.source === "rules" ? t.agentOffline : turn.reply.message}</p>
                    {products.length > 0 && <Results products={products} onPick={onClose} />}
                    {turn === latest && (
                      <div className="search-actions">
                        {turn.reply.page && turn.reply.page !== route && <a className="btn small" href={href(turn.reply.page)} onClick={(event) => { event.preventDefault(); go(turn.reply.page!); }}>{t.agentGo}: {pageLabel(turn.reply.page, t, lang)} {lang === "he" ? "←" : "→"}</a>}
                        {turn.reply.pieces && turn.reply.pieces.length > 1 && <button className="btn ghost small" onClick={() => { onClose(); showInRoom(turn.reply.pieces!); }}>✦ {t.agentSeeRoom}</button>}
                        <button className="btn ghost small" onClick={() => { onClose(); openAgent(); }}>{t.search.continue}</button>
                      </div>
                    )}
                  </section>
                );
              })}
              {thinking && <p className="search-answer thinking">{t.search.thinking}<i /><i /><i /></p>}
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}

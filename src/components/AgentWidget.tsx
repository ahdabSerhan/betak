import { useEffect, useRef, useState, type FormEvent } from "react";
import { type Product } from "../data/catalog";
import { askAgent, type ChatMessage } from "../lib/agent";
import { buildRoom, NO_TASTE, roomTotal, type Piece } from "../lib/designer";
import { navigate } from "../hooks/useRoute";
import { money, quantitySuffix } from "../lib/format";
import { useShop } from "../state/ShopContext";
import { PhotoButton } from "./PhotoButton";
import { productHref } from "../lib/routes";

const DEFAULT_BUDGET = 9000;
const DEFAULT_ROOM = { wall: 4.5, depth: 3.8 };

interface Turn extends ChatMessage {
  // Products the agent suggested with this answer.
  pieces?: Piece[];
}

// The products of one answer, with actions to buy them or see them together in 3D.
function Suggestions({ pieces }: { pieces: Piece[] }) {
  const { t, nameOf, addToCart, openCart, showInRoom } = useShop();

  const addAll = () => {
    pieces.forEach((piece) => addToCart(piece.product.id, piece.quantity));
    openCart();
  };

  return (
    <div className="agent-cards">
      {pieces.map(({ product, quantity }) => (
        <a className="agent-card" href={productHref(product)} key={product.id}>
          <img src={product.image} alt="" />
          <span>{nameOf(product)}{quantitySuffix(quantity)}</span>
          <b className="price">{money(product.price * quantity)}</b>
        </a>
      ))}
      <div className="agent-actions">
        <button className="btn gold small" onClick={addAll}>{t.agentAddAll} · {money(roomTotal(pieces))}</button>
        <button className="btn ghost small" onClick={() => showInRoom(pieces)}>✦ {t.agentSeeRoom}</button>
      </div>
    </div>
  );
}

// Floating chat with the store's AI agent. It stays open while the visitor moves between pages.
export function AgentWidget({ viewing }: { viewing?: Product }) {
  const { t, lang, agentOpen, openAgent, closeAgent, agentPrompt, clearAgentPrompt, agentRoom, setAgentRoom, agentBrief, setAgentBrief, showInRoom, setRoomPhoto } = useShop();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [offline, setOffline] = useState(false);
  const log = useRef<HTMLDivElement>(null);

  // A request typed in the home page box ("Design my room") opens the designed room by itself.
  const send = async (text: string, openRoom = false) => {
    const question = text.trim();
    if (!question || thinking) return;
    const history: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(history);
    setDraft("");
    setThinking(true);

    const messages = history.map(({ role, content }) => ({ role, content }));
    const dimensions = { wall: agentBrief.wall ?? DEFAULT_ROOM.wall, depth: agentBrief.depth ?? DEFAULT_ROOM.depth };
    const reply = await askAgent(messages, { pieces: agentRoom ?? [], budget: agentBrief.budget ?? DEFAULT_BUDGET, dimensions, lang, viewing });
    setTurns([...history, { role: "assistant", content: reply.message, pieces: reply.pieces ?? undefined }]);
    setOffline(reply.source === "rules");
    setThinking(false);
    setAgentBrief({ ...agentBrief, ...reply.dimensions, ...(reply.budget ? { budget: reply.budget } : {}) });
    // The designer page shows the agent's latest room, with the same plan and fit check.
    if (reply.pieces && openRoom) showInRoom(reply.pieces);
    else if (reply.pieces) setAgentRoom(reply.pieces);
  };

  // A prompt typed elsewhere on the site (the home page box) is sent when the chat opens.
  useEffect(() => {
    if (!agentPrompt) return;
    clearAgentPrompt();
    void send(agentPrompt, true);
  });

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking, agentOpen]);

  // "Design my room" always starts the designer from its first step.
  const startDesigner = () => {
    setAgentRoom(null);
    closeAgent();
    navigate("designer");
  };

  // The visitor's photo becomes the room; the current design (or a first living room) is placed in it.
  const onPhoto = (photo: string) => {
    setRoomPhoto(photo);
    setTurns([...turns, { role: "user", content: `📷 ${t.photoSent}` }, { role: "assistant", content: t.photoReply }]);
    showInRoom(agentRoom ?? buildRoom("living", "medium", agentBrief.budget ?? DEFAULT_BUDGET, NO_TASTE));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  if (!agentOpen) {
    return (
      <button className="agent-launcher" onClick={() => openAgent()}>
        <span className="agent-dot" />
        ✦ {t.agentLauncher}
      </button>
    );
  }

  return (
    <section className="agent agent-panel" aria-label={t.agentTitle}>
      <header className="agent-head">
        <span className="agent-dot" />
        <b>{t.agentTitle}</b>
        <button className="agent-close" onClick={closeAgent} aria-label={t.close}>✕</button>
      </header>
      <button className="agent-design" onClick={startDesigner}>✦ {t.agentDesign}</button>
      <div className="agent-log" ref={log} aria-live="polite">
        <p className="bubble assistant">{t.agentHello}</p>
        {turns.map((turn, index) => (
          <div className="agent-turn" key={index}>
            <p className={`bubble ${turn.role}`}>{turn.content}</p>
            {turn.pieces && <Suggestions pieces={turn.pieces} />}
          </div>
        ))}
        {thinking && <p className="bubble assistant thinking">{t.agentThinking}<i /><i /><i /></p>}
        {turns.length === 0 && !thinking && (
          <div className="chips">
            {t.agentSuggestions.map((suggestion) => <button className="chip" onClick={() => void send(suggestion)} key={suggestion}>{suggestion}</button>)}
          </div>
        )}
      </div>
      {offline && <small className="agent-note">{t.agentOffline}</small>}
      <form className="agent-form" onSubmit={onSubmit}>
        <PhotoButton className="agent-photo" label={t.photoUpload} onPhoto={onPhoto}>📷</PhotoButton>
        <label className="sr-only" htmlFor="agent-input">{t.agentPlaceholder}</label>
        <input id="agent-input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t.agentPlaceholder} autoComplete="off" />
        <button className="btn gold" disabled={thinking || !draft.trim()}>{t.agentSend}</button>
      </form>
    </section>
  );
}

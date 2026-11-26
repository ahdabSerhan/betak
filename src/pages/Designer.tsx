import { useEffect, useMemo, useState } from "react";
import { Dialog } from "../components/Dialog";
import { FloorPlanDrawing } from "../components/FloorPlanDrawing";
import { Fold } from "../components/Fold";
import { Orb } from "../components/Orb";
import { PhotoButton } from "../components/PhotoButton";
import { RoomScene } from "../components/RoomScene";
import { CATEGORIES, productsIn, type CategoryId, type Product } from "../data/catalog";
import { alternatives, BUDGETS, buildRoom, candidates, ROOM_KEYS, roomSlots, roomTotal, slotForProduct, tasteDeck, type Piece, type RoomKey, type Taste } from "../lib/designer";
import { areaOf, checkFit, DEPTH_RANGE, footprint, layout, mainPiece, sizeOf, SOFA_WIDTH_RANGE, WALL_RANGE, type RoomDimensions } from "../lib/measure";
import { money, quantitySuffix, whatsappLink } from "../lib/format";
import { useShop } from "../state/ShopContext";

type Choice = "room" | "measure" | "budget" | "style";

const SHUFFLE_RANDOMNESS = 4;
const BUDGET_STEP = 500;
const CHOICES: Choice[] = ["room", "measure", "budget", "style"];

interface Brief extends RoomDimensions {
  room: RoomKey;
  budget: number;
}

const FIRST_BRIEF: Brief = { room: "living", wall: 4.5, depth: 3.8, budget: BUDGETS.living.initial };
const tasteOf = (liked: Product[]): Taste => ({ liked, skipped: [] });
const roomFor = (brief: Brief, liked: Product[], randomness = 0) => buildRoom(brief.room, sizeOf(brief), brief.budget, tasteOf(liked), randomness);

function MeasureSlider({ id, label, value, range, onChange }: { id: string; label: string; value: number; range: { min: number; max: number; step: number }; onChange: (value: number) => void }) {
  const { t } = useShop();
  return (
    <div className="measure">
      <label htmlFor={id}>{label}<b className="price">{value.toFixed(1)} {t.metres}</b></label>
      <input id={id} type="range" {...range} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function SwapDialog({ piece, taste, canRemove, onPick, onRemove, onClose }: {
  piece: Piece;
  taste: Taste;
  canRemove: boolean;
  onPick: (product: Product) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { t, nameOf } = useShop();

  return (
    <Dialog label={t.swapTitle} onClose={onClose} narrow>
      <div className="body">
        <h2>{t.swapTitle}</h2>
        <p className="muted">{t.matchNote}</p>
        <div className="swap-list">
          {alternatives(piece, taste).map((product) => (
            <button className="swap-item" onClick={() => onPick(product)} key={product.id}>
              <img src={product.image} alt="" />
              <span>{nameOf(product)}</span>
              <b className="price">{money(product.price * piece.quantity)}</b>
            </button>
          ))}
        </div>
        {canRemove && <button className="link" onClick={onRemove}>{t.removePiece}</button>}
      </div>
    </Dialog>
  );
}

// Pick any product to add to the room: from a collection, or from what is already in the cart.
function AddDialog({ inRoom, onPick, onClose }: { inRoom: Piece[]; onPick: (product: Product) => void; onClose: () => void }) {
  const { t, lang, nameOf, cartLines } = useShop();
  const [source, setSource] = useState<CategoryId | "cart">(cartLines.length > 0 ? "cart" : "sofas");
  const taken = new Set(inRoom.map((piece) => piece.product.id));
  const products = (source === "cart" ? cartLines.map((line) => line.product) : productsIn(source)).filter((product) => !taken.has(product.id));

  return (
    <Dialog label={t.addItem} onClose={onClose} narrow>
      <div className="body">
        <h2>{t.addItem}</h2>
        <div className="chips">
          <button className="chip" aria-pressed={source === "cart"} onClick={() => setSource("cart")}>{t.fromCart} ({cartLines.length})</button>
          {CATEGORIES.map((category) => (
            <button className="chip" aria-pressed={source === category.id} onClick={() => setSource(category.id)} key={category.id}>{category[lang]}</button>
          ))}
        </div>
        <div className="swap-list">
          {products.length === 0 && <p className="muted">{t.nothingToAdd}</p>}
          {products.map((product) => (
            <button className="swap-item" onClick={() => onPick(product)} key={product.id}>
              <img src={product.image} alt="" />
              <span>{nameOf(product)}</span>
              <b className="price">{money(product.price)}</b>
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

// The room studio: the furnished room is on screen from the first moment, and every choice beside it redraws it.
export function Designer() {
  const { t, nameOf, addToCart, openCart, openAgent, agentRoom, setAgentRoom, agentBrief, roomPhoto, setRoomPhoto } = useShop();
  const [brief, setBrief] = useState<Brief>({ ...FIRST_BRIEF, ...agentBrief });
  const [liked, setLiked] = useState<Product[]>([]);
  const [pieces, setPieces] = useState(() => agentRoom ?? roomFor(brief, liked));
  const [open, setOpen] = useState<Choice | null>("room");
  const [swapping, setSwapping] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<"room" | "plan">("room");
  // Sofas are made to measure: the visitor can ask for another width.
  const [sofaWidth, setSofaWidth] = useState<number | null>(null);

  // When the AI assistant proposes a room in the chat, it appears here with what it learned about the room.
  useEffect(() => {
    if (agentRoom) setPieces(agentRoom);
  }, [agentRoom]);
  useEffect(() => setBrief((current) => ({ ...current, ...agentBrief })), [agentBrief]);

  const size = sizeOf(brief);
  // Products to choose a style from; a new set only when the kind or size of room changes.
  const styles = useMemo(() => tasteDeck(brief.room, size), [brief.room, size]);
  const total = roomTotal(pieces);
  const compared = new Set(roomSlots(brief.room, size).flatMap(candidates)).size;
  const lineName = (piece: Piece) => nameOf(piece.product) + quantitySuffix(piece.quantity);
  const main = mainPiece(pieces);
  const sofa = main?.slot.key === "sofa" ? main : undefined;
  const fit = checkFit(pieces, brief, sofaWidth);
  const fitText = fit && { fits: t.fitOk, tight: t.fitTight, tooWide: t.fitTooWide }[fit.kind](fit.amount);
  const budgetRange = BUDGETS[brief.room];

  // Every choice furnishes the room again at once; the visitor's own choices replace the assistant's room.
  const redesign = (nextBrief: Brief, nextLiked = liked, randomness = 0) => {
    setAgentRoom(null);
    setBrief(nextBrief);
    setLiked(nextLiked);
    setPieces(roomFor(nextBrief, nextLiked, randomness));
  };
  const toggleLiked = (product: Product) => redesign(brief, liked.includes(product) ? liked.filter((item) => item !== product) : [...liked, product]);

  const replacePiece = (index: number, product: Product) => {
    setPieces(pieces.map((piece, i) => (i === index ? { ...piece, product } : piece)));
    setSwapping(null);
  };
  const removePiece = (index: number) => {
    setPieces(pieces.filter((_, i) => i !== index));
    setSwapping(null);
  };
  const addPiece = (product: Product) => {
    setPieces([...pieces, { slot: slotForProduct(product), product, quantity: 1 }]);
    setAdding(false);
  };
  const keepLook = () => {
    pieces.forEach((piece) => addToCart(piece.product.id, piece.quantity));
    openCart();
  };

  const adviceMessage = [
    t.waRoom,
    ...pieces.map((piece) => `• ${lineName(piece)} ${money(piece.product.price * piece.quantity)}`),
    `${t.total}: ${money(total)}`,
    `${t.roomSizeLine}: ${brief.wall.toFixed(1)} × ${brief.depth.toFixed(1)} ${t.metres}`,
    ...(sofa && sofaWidth ? [`${t.sofaWidth}: ${sofaWidth} ${t.cm}`] : []),
  ].join("\n");

  // What each section shows on its row while it is closed.
  const chosen: Record<Choice, string> = {
    room: t.rooms[brief.room][0],
    measure: `${brief.wall.toFixed(1)} × ${brief.depth.toFixed(1)} ${t.metres}`,
    budget: money(brief.budget),
    style: liked.length > 0 ? t.likedCount(liked.length) : t.styleAny,
  };

  const panels: Record<Choice, React.ReactNode> = {
    room: (
      <div className="config-cards">
        {ROOM_KEYS.map((room) => (
          <button aria-pressed={brief.room === room} onClick={() => redesign({ ...brief, room, budget: BUDGETS[room].initial }, [])} key={room}>
            <b>{t.rooms[room][0]}</b>
            <small>{t.rooms[room][1]}</small>
          </button>
        ))}
      </div>
    ),
    measure: (
      <>
        <MeasureSlider id="wall" label={t.mainWall} value={brief.wall} range={WALL_RANGE} onChange={(wall) => redesign({ ...brief, wall })} />
        <MeasureSlider id="depth" label={t.roomDepth} value={brief.depth} range={DEPTH_RANGE} onChange={(depth) => redesign({ ...brief, depth })} />
        <small className="muted">{areaOf(brief).toFixed(1)} {t.squareMetres}</small>
      </>
    ),
    budget: (
      <div className="measure">
        <label htmlFor="budget">{t.dBudget}<b className="price">{money(brief.budget)}</b></label>
        <input id="budget" type="range" min={budgetRange.min} max={budgetRange.max} step={BUDGET_STEP} value={brief.budget} onChange={(event) => redesign({ ...brief, budget: Number(event.target.value) })} />
      </div>
    ),
    style: (
      <>
        <small className="muted">{t.styleHint}</small>
        <div className="studio-styles">
          {styles.map((product) => (
            <button aria-pressed={liked.includes(product)} onClick={() => toggleLiked(product)} key={product.id}>
              <img src={product.image} alt="" loading="lazy" />
              <span>{nameOf(product)}</span>
              <i aria-hidden="true">♥</i>
            </button>
          ))}
        </div>
      </>
    ),
  };

  return (
    <div className="studio">
      <section className="studio-room">
        <header className="studio-head">
          <div>
            <h1>{t.rooms[brief.room][0]}</h1>
            <small className="muted">{money(total)} · {areaOf(brief).toFixed(1)} {t.squareMetres} · {t.piecesCount(pieces.length)}</small>
          </div>
          <div className="chips" role="group" aria-label={t.viewRoom}>
            <button className="chip" aria-pressed={view === "room"} onClick={() => setView("room")}>{t.viewRoom}</button>
            <button className="chip" aria-pressed={view === "plan"} onClick={() => setView("plan")}>{t.viewPlan}</button>
            <PhotoButton className="chip" label={t.photoUpload} onPhoto={(photo) => { setRoomPhoto(photo); setView("room"); }}>📷 {roomPhoto ? t.photoChange : t.photoUpload}</PhotoButton>
            {roomPhoto && <button className="chip" onClick={() => setRoomPhoto(null)}>{t.photoRemove}</button>}
          </div>
        </header>

        {view === "room" ? (
          <div className="studio-scene">
            <RoomScene pieces={pieces} photo={roomPhoto} onSwap={setSwapping} onRemove={removePiece} />
            {/* The upload sits on the room itself, where the photo will appear. */}
            <PhotoButton className="scene-upload" label={t.photoUpload} onPhoto={setRoomPhoto}>📷 {roomPhoto ? t.photoChange : t.photoDesign}</PhotoButton>
          </div>
        ) : (
          <div className="plan-sheet">
            <FloorPlanDrawing room={brief} title={t.rooms[brief.room][0]} placed={layout(pieces, brief, sofaWidth)} />
            {sofa && (
              <div className="measure">
                <label htmlFor="sofa-width">{t.sofaWidth}<b className="price">{sofaWidth ?? footprint(sofa.product).width} {t.cm}</b></label>
                <input id="sofa-width" type="range" {...SOFA_WIDTH_RANGE} value={sofaWidth ?? footprint(sofa.product).width} onChange={(event) => setSofaWidth(Number(event.target.value))} />
              </div>
            )}
            <p className="muted small">{t.typicalNote}</p>
          </div>
        )}

        {fitText && <p className={`fit fit-${fit.kind}`}>{fitText}</p>}
        <p className="laya-note"><Orb size={30} />{t.compared(compared)} {t.tapSwap}</p>
        <p className="muted small">{t.disclaimer}</p>
      </section>

      <aside className="studio-side">
        <div className="config">
          <header className="config-head">
            <b>✦ {t.studioTitle}</b>
            <button className="link small" onClick={() => redesign(FIRST_BRIEF, [])}>{t.restart}</button>
          </header>
          {CHOICES.map((choice, index) => (
            <Fold number={index + 1} title={t.studioChoices[choice]} chosen={chosen[choice]} open={open === choice} onToggle={() => setOpen(open === choice ? null : choice)} key={choice}>
              {panels[choice]}
            </Fold>
          ))}

          <div className="studio-pieces">
            <h3>{t.studioPieces}</h3>
            <ul className="list">
              {pieces.map((piece, index) => (
                <li key={piece.product.id}>
                  <span>{lineName(piece)}</span>
                  <span className="price">{money(piece.product.price * piece.quantity)}</span>
                  <button className="chip" onClick={() => setSwapping(index)}>{t.swap}</button>
                  <button className="chip" onClick={() => removePiece(index)} aria-label={`${t.remove}: ${lineName(piece)}`}>✕</button>
                </li>
              ))}
            </ul>
            <div className="chips">
              <button className="chip" onClick={() => setAdding(true)}>+ {t.addItem}</button>
              <button className="chip" onClick={() => redesign(brief, liked, SHUFFLE_RANDOMNESS)}>{t.shuffle}</button>
              <button className="chip" onClick={() => openAgent()}>✦ {t.agentChange}</button>
              <a className="chip" href={whatsappLink(adviceMessage)} target="_blank" rel="noopener">{t.askRoom}</a>
            </div>
            <button className="btn wide" onClick={keepLook}>{t.keepLook} · {money(total)}</button>
          </div>
        </div>
      </aside>

      {adding && <AddDialog inRoom={pieces} onPick={addPiece} onClose={() => setAdding(false)} />}

      {swapping !== null && (
        <SwapDialog piece={pieces[swapping]} taste={tasteOf(liked)} canRemove={pieces.length > 1}
          onPick={(product) => replacePiece(swapping, product)} onRemove={() => removePiece(swapping)} onClose={() => setSwapping(null)} />
      )}
    </div>
  );
}

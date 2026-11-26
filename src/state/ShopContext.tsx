import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { productById, type Product } from "../data/catalog";
import { navigate } from "../hooks/useRoute";
import { usePersistentState } from "../hooks/usePersistentState";
import { describeDesign, rulesFor, standardDesign, type Design } from "../lib/custom";
import type { Piece } from "../lib/designer";
import type { RoomDimensions } from "../lib/measure";
import { askEsentrix, esentrixEnabled, loadEsentrixWidget } from "../lib/esentrix";
import { TEXT, type Lang, type Text } from "../i18n/text";

// What the agent learned about the room: its measurements and the budget.
export type AgentBrief = Partial<RoomDimensions> & { budget?: number };

export interface CartLine {
  product: Product;
  quantity: number;
}

interface Shop {
  lang: Lang;
  t: Text;
  nameOf: (product: Product) => string;
  toggleLang: () => void;
  cartLines: CartLine[];
  cartCount: number;
  cartTotal: number;
  addToCart: (productId: number, quantity?: number) => void;
  saved: number[];
  isSaved: (productId: number) => boolean;
  toggleSaved: (productId: number) => void;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  agentOpen: boolean;
  // Opens the chat widget; a prompt, if given, is sent right away.
  openAgent: (prompt?: string) => void;
  closeAgent: () => void;
  agentPrompt: string | null;
  clearAgentPrompt: () => void;
  // The latest room the agent proposed, shown in the 3D designer.
  agentRoom: Piece[] | null;
  // The size and fabric the visitor chose for a product, and the same as one line of text (null when unchanged).
  designs: Record<number, Design>;
  setDesign: (productId: number, design: Design | null) => void;
  designNote: (product: Product) => string | null;
  // The visitor's own room photo, used as the backdrop of the designed room (kept only for this visit).
  roomPhoto: string | null;
  setRoomPhoto: (photo: string | null) => void;
  setAgentRoom: (pieces: Piece[] | null) => void;
  agentBrief: AgentBrief;
  setAgentBrief: (brief: AgentBrief) => void;
  showInRoom: (pieces: Piece[]) => void;
}

const ShopContext = createContext<Shop | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = usePersistentState<Lang>("betak.lang", "he");
  const [cart, setCart] = usePersistentState<Record<number, number>>("betak.cart", {});
  const [saved, setSaved] = usePersistentState<number[]>("betak.saved", []);
  const [designs, setDesigns] = usePersistentState<Record<number, Design>>("betak.designs", {});
  const [cartOpen, setCartOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState<string | null>(null);
  const [agentRoom, setAgentRoom] = useState<Piece[] | null>(null);
  const [roomPhoto, setRoomPhoto] = useState<string | null>(null);
  const [agentBrief, setAgentBrief] = useState<AgentBrief>({});

  // Hebrew reads right to left, English left to right.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => loadEsentrixWidget(lang), [lang]);

  const addToCart = useCallback((productId: number, quantity = 1) => {
    setCart((current) => {
      const next = { ...current, [productId]: (current[productId] ?? 0) + quantity };
      if (next[productId] <= 0) delete next[productId];
      return next;
    });
  }, [setCart]);

  const toggleSaved = useCallback((productId: number) => {
    setSaved((current) => (current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]));
  }, [setSaved]);

  const shop = useMemo<Shop>(() => {
    const cartLines = Object.entries(cart).flatMap(([id, quantity]) => {
      const product = productById(Number(id));
      return product ? [{ product, quantity }] : [];
    });
    return {
      lang,
      t: TEXT[lang],
      nameOf: (product) => product.name[lang],
      toggleLang: () => setLang(lang === "he" ? "en" : "he"),
      cartLines,
      cartCount: cartLines.reduce((sum, line) => sum + line.quantity, 0),
      cartTotal: cartLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
      addToCart,
      saved,
      isSaved: (productId) => saved.includes(productId),
      toggleSaved,
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      agentOpen,
      openAgent: (prompt) => {
        // With eSentriX connected, its widget is the store's agent.
        if (esentrixEnabled) return askEsentrix(prompt);
        if (prompt) setAgentPrompt(prompt);
        setAgentOpen(true);
      },
      closeAgent: () => setAgentOpen(false),
      agentPrompt,
      clearAgentPrompt: () => setAgentPrompt(null),
      agentRoom,
      designs,
      setDesign: (productId, design) => setDesigns(({ [productId]: _old, ...others }) => (design ? { ...others, [productId]: design } : others)),
      designNote: (product) => {
        const rules = rulesFor(product);
        const design = designs[product.id];
        // Fill in choices added after the design was saved (e.g. the chaise depth).
        return rules && design ? describeDesign({ ...standardDesign(product, rules), ...design }, rules, TEXT[lang]) : null;
      },
      roomPhoto,
      setRoomPhoto,
      setAgentRoom,
      agentBrief,
      setAgentBrief,
      showInRoom: (pieces) => {
        setAgentRoom(pieces);
        // The chat steps aside so the room is fully visible; the launcher stays to bring it back.
        setAgentOpen(false);
        navigate("designer");
      },
    };
  }, [lang, cart, saved, cartOpen, agentOpen, agentPrompt, agentRoom, roomPhoto, designs, setDesigns, agentBrief, addToCart, toggleSaved, setLang]);

  return <ShopContext.Provider value={shop}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("useShop must be used inside ShopProvider");
  return shop;
}

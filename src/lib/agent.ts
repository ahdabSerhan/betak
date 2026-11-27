// The store's AI agent: sends the chat to the AI model and turns its answer into product suggestions.
import { PRODUCTS, productById, type Product } from "../data/catalog";
import { cutoutOf } from "../data/cutouts";
import { POLICIES } from "../data/details";
import { TEXT, type Lang } from "../i18n/text";
import { agentPagesText, describePage, isAgentPage } from "./agentPages";
import { buildRoom, roomTotal, slotForProduct, type Piece, type RoomKey } from "./designer";
import { DEPTH_RANGE, sizeOf, WALL_RANGE, type RoomDimensions } from "./measure";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentReply {
  message: string;
  // Suggested products; null when the answer suggests none.
  pieces: Piece[] | null;
  budget: number | null;
  // The room's measurements, when the visitor gave them.
  dimensions: RoomDimensions | null;
  // A page of the site that answers the question better, e.g. "shipping" or "beds".
  page: string | null;
  source: "ai" | "rules";
}

interface AgentContext {
  // The products suggested so far (the visitor's current room).
  pieces: Piece[];
  budget: number;
  dimensions: RoomDimensions;
  lang: Lang;
  // The product page the visitor is on, if any.
  viewing?: Product;
  // The page the visitor is on right now.
  route: string;
}

type Ask = (system: string, messages: ChatMessage[]) => Promise<string>;

const AGENT_ENDPOINT = "/api/designer";
const MAX_PIECES = 6;
const MAX_QUANTITY = 8;

// Like the designer, the agent offers pieces that can be shown standing in the room (any rug works).
const CATALOG = PRODUCTS.filter((product) => product.category === "rugs" || cutoutOf(product)).map((product) => `${product.id}|${product.category}|${product.name.en}|${product.name.he}|${product.price}`).join("\n");

function instructions({ pieces, budget, dimensions, lang, viewing, route }: AgentContext): string {
  const current = pieces.map((piece) => `${piece.product.id} x${piece.quantity}`).join(", ") || "none";
  return [
    "You are the sales and interior design assistant of Betak, a furniture store in Israel. You help visitors find furniture, answer questions and design rooms, using only Betak's catalog.",
    "Catalog, one product per line as id|category|English name|Hebrew name|price in ILS:",
    CATALOG,
    `Products suggested so far (product id x quantity): ${current}. Budget for a room: ${budget} ILS.`,
    `The room is ${dimensions.wall} m along its main wall and ${dimensions.depth} m deep, unless the visitor gives other measurements.`,
    viewing ? `The visitor is looking at product ${viewing.id} (${viewing.name.en}) right now.` : "",
    `The visitor is on: ${describePage(route)}. Help with what that page is about first.`,
    "Pages of the site, one per line as key: what it is:",
    agentPagesText(),
    "Delivery notes:",
    ...POLICIES.en.delivery,
    "Rules:",
    `- Use only ids from the catalog. Suggest up to ${MAX_PIECES} different products; a room has at most one rug.`,
    "- Dining chairs come in quantities of 4 or 6; everything else is quantity 1 unless the visitor asks.",
    "- When designing a room, keep the total within the budget unless the visitor says otherwise. If they name a budget, use it.",
    "- Match what the visitor describes: room type, size, colours, mood, who lives there.",
    "- Size the room to its measurements: under 15 square metres take 2 or 3 pieces and no corner sofa; over 25 take more. Leave an 80 cm walkway.",
    "- For anything the catalog and the delivery notes do not cover (stock, fabrics, exact dates), say the store will confirm on WhatsApp.",
    `- Write to the visitor in their language (default: ${lang === "he" ? "Hebrew" : "English"}), warm and brief: 2 or 3 sentences.`,
    "- When a page of the site answers the visitor better (all the beds, the shipping policy, the terms, the room designer), set \"page\" to its key so they get a button to it. Do not link to the page they are already on.",
    "Answer with one JSON object and nothing else:",
    '{"message": string, "pieces": [{"id": number, "quantity": number}] | null, "budget": number | null, "wall": number | null, "depth": number | null, "page": string | null}',
    '"wall" and "depth" are the room measurements in metres, only when the visitor states them.',
    'Set "pieces" to the products you suggest (for a room: the full room), or to null when no products are involved.',
  ].filter(Boolean).join("\n");
}

// Inside a Claude artifact the page can ask Claude directly.
async function previewAsk(): Promise<Ask | null> {
  const claude = (window as { claude?: { use: (name: string) => Promise<unknown> } }).claude;
  const sample = (await claude?.use("sample")) as ((input: ChatMessage[], options: { cache: boolean }) => Promise<{ text: string }>) | null | undefined;
  if (!sample) return null;
  // This channel has no system prompt, so the instructions ride on the first message.
  return async (system, [first, ...rest]) => (await sample([{ ...first, content: `${system}\n\nCustomer: ${first.content}` }, ...rest], { cache: false })).text;
}

// On the real site the chat goes through the store's own server, which calls Gemini on Vertex AI.
const serverAsk: Ask = async (system, messages) => {
  const response = await fetch(AGENT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages }),
  });
  if (!response.ok) throw new Error(`Designer server answered ${response.status}`);
  return ((await response.json()) as { text: string }).text;
};

const clamp = (value: number, range: { min: number; max: number }) => Math.min(Math.max(value, range.min), range.max);

// Measurements are kept only when both are given, and inside what the designer can draw.
function toDimensions(wall?: number | null, depth?: number | null): RoomDimensions | null {
  if (typeof wall !== "number" || typeof depth !== "number" || !(wall > 0) || !(depth > 0)) return null;
  return { wall: clamp(wall, WALL_RANGE), depth: clamp(depth, DEPTH_RANGE) };
}

function parseReply(text: string): AgentReply {
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const answer = JSON.parse(json) as { message?: string; pieces?: { id: number; quantity?: number }[] | null; budget?: number | null; wall?: number | null; depth?: number | null; page?: unknown };
  if (!answer.message) throw new Error("The agent's answer had no message");

  // Anything the model invented is dropped; only real catalog products stay.
  const pieces = (answer.pieces ?? []).flatMap(({ id, quantity }) => {
    const product = productById(Number(id));
    return product ? [{ slot: slotForProduct(product), product, quantity: Math.min(Math.max(Math.round(quantity ?? 1), 1), MAX_QUANTITY) }] : [];
  });

  return {
    message: answer.message,
    pieces: pieces.length > 0 ? pieces.slice(0, MAX_PIECES) : null,
    budget: typeof answer.budget === "number" && answer.budget > 0 ? answer.budget : null,
    dimensions: toDimensions(answer.wall, answer.depth),
    // Only real pages of the site; anything else the model names is dropped.
    page: isAgentPage(answer.page) ? answer.page : null,
    source: "ai",
  };
}

const mentions = (text: string, words: RegExp) => words.test(text.toLowerCase());

// Without AI, read the basics (room, size, budget) from the message and build by rules.
function rulesReply(request: string, { budget, dimensions, lang }: AgentContext): AgentReply {
  const room: RoomKey = mentions(request, /bedroom|bed\b|שינה|מיטה/) ? "bedroom" : mentions(request, /dining|אוכל/) ? "dining" : "living";
  // "4x3.5", "4 על 3.5" or "4 by 3.5" are room measurements in metres.
  const measured = request.match(/(\d(?:\.\d)?)\s*(?:x|×|על|by)\s*(\d(?:\.\d)?)/i);
  const statedRoom = measured ? toDimensions(Number(measured[1]), Number(measured[2])) : null;
  const size = statedRoom ? sizeOf(statedRoom) : mentions(request, /small|tiny|קטן|קטנה/) ? "small" : mentions(request, /large|big|גדול|גדולה/) ? "large" : sizeOf(dimensions);
  const stated = request.replace(/,/g, "").match(/\d{4,6}/);
  const cheaper = mentions(request, /cheaper|less|זול|פחות/);
  const newBudget = stated ? Number(stated[0]) : cheaper ? Math.round(budget * 0.8) : budget;
  const pieces = buildRoom(room, size, newBudget, { liked: [], skipped: [] }, 3);

  return { message: TEXT[lang].agentRules(roomTotal(pieces)), pieces, budget: newBudget, dimensions: statedRoom, page: null, source: "rules" };
}

// Uses Claude inside the Claude preview, the store's server everywhere else, and rules if both fail.
export async function askAgent(messages: ChatMessage[], context: AgentContext): Promise<AgentReply> {
  const system = instructions(context);
  try {
    const ask = (await previewAsk()) ?? serverAsk;
    return parseReply(await ask(system, messages));
  } catch {
    return rulesReply(messages[messages.length - 1].content, context);
  }
}

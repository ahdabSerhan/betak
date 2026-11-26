// The eSentriX agent widget. When Betak has a store id in CommerceOS, it replaces the built-in chat.
import { ESENTRIX } from "../data/store";
import type { Lang } from "../i18n/text";

// What eSentriX's embed.js exposes on the page once it has loaded.
interface EsentrixWidget {
  open: () => void;
  ask: (text: string) => void;
}

const widget = () => (window as { __esentrixWidget?: EsentrixWidget | null }).__esentrixWidget;

export const esentrixEnabled = ESENTRIX.storeId !== "";

// Adds the one script tag CommerceOS gives a store (Channels → Website).
export function loadEsentrixWidget(lang: Lang) {
  if (!esentrixEnabled || document.querySelector("script[data-esentrix-agent]")) return;
  const script = document.createElement("script");
  script.src = ESENTRIX.embedSrc;
  script.defer = true;
  Object.assign(script.dataset, { esentrixAgent: "", api: ESENTRIX.api, store: ESENTRIX.storeId, storeName: ESENTRIX.storeName, lang });
  document.body.appendChild(script);
}

// Opens the eSentriX chat; with a prompt, sends it as the visitor's message.
export function askEsentrix(prompt?: string) {
  if (prompt) widget()?.ask(prompt);
  else widget()?.open();
}

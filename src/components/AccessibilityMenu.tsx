import { useEffect, useState } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { href } from "../lib/routes";
import { useShop } from "../state/ShopContext";

type Option = "contrastDark" | "contrastLight" | "grayscale" | "keyboard" | "links" | "font" | "still";

interface Settings {
  // Text size step: -1 is smaller, 0 normal, up to TEXT_STEPS.max larger.
  text: number;
  options: Option[];
}

const OPTIONS: Option[] = ["contrastDark", "contrastLight", "grayscale", "keyboard", "links", "font", "still"];
// The two contrast modes replace each other.
const EXCLUSIVE: Partial<Record<Option, Option>> = { contrastDark: "contrastLight", contrastLight: "contrastDark" };
const TEXT_STEPS = { min: -1, max: 3, percent: 10 };
const NONE: Settings = { text: 0, options: [] };

// Each option is a class on <html>, styled in styles.css; the text size is a number in a CSS variable.
function apply({ text, options }: Settings) {
  const root = document.documentElement;
  OPTIONS.forEach((option) => root.classList.toggle(`a11y-${option}`, options.includes(option)));
  root.classList.toggle("a11y-text", text !== 0);
  root.style.setProperty("--a11y-zoom", String(1 + text * TEXT_STEPS.percent / 100));
}

// The accessibility button on the side of the screen, with the same options as the store's previous site.
export function AccessibilityMenu() {
  const { t } = useShop();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = usePersistentState<Settings>("betak.a11y.v2", NONE);

  useEffect(() => apply(settings), [settings]);

  // Escape closes the menu, as visitors using a keyboard expect.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = (option: Option) => {
    const others = settings.options.filter((item) => item !== option && item !== EXCLUSIVE[option]);
    setSettings({ ...settings, options: settings.options.includes(option) ? others : [...others, option] });
  };
  const resize = (step: number) => setSettings({ ...settings, text: Math.min(TEXT_STEPS.max, Math.max(TEXT_STEPS.min, settings.text + step)) });
  const changed = settings.text !== 0 || settings.options.length > 0;

  return (
    <div className="a11y">
      <button className="a11y-button" aria-expanded={open} aria-controls="a11y-menu" aria-label={t.a11yMenu} onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4" r="2" /><path d="M20 8.5c-2.3.6-5 1-8 1s-5.7-.4-8-1l-.5 1.9c2 .5 4.2.9 6.5 1V22h2v-5h1v5h2V11.4c2.3-.1 4.5-.5 6.5-1L20 8.5Z" /></svg>
      </button>
      {open && (
        <div className="a11y-menu" id="a11y-menu" role="group" aria-label={t.a11yMenu}>
          <b>{t.a11yMenu}</b>
          <div className="a11y-size" role="group" aria-label={t.a11yTextSize}>
            <button onClick={() => resize(-1)} disabled={settings.text <= TEXT_STEPS.min}><span aria-hidden="true">A−</span><span className="sr-only">{t.a11ySmaller}</span></button>
            <span aria-live="polite">{100 + settings.text * TEXT_STEPS.percent}%</span>
            <button onClick={() => resize(1)} disabled={settings.text >= TEXT_STEPS.max}><span aria-hidden="true">A+</span><span className="sr-only">{t.a11yLarger}</span></button>
          </div>
          {OPTIONS.map((option) => (
            <button aria-pressed={settings.options.includes(option)} onClick={() => toggle(option)} key={option}>{t.a11yOptions[option]}</button>
          ))}
          {changed && <button className="a11y-reset" onClick={() => setSettings(NONE)}>{t.a11yReset}</button>}
          <a href={href("accessibility")} onClick={() => setOpen(false)}>{t.accessibility}</a>
        </div>
      )}
    </div>
  );
}

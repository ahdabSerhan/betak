import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

// The accessibility menu's "stop animations" option, a class on <html>.
const STILL_CLASS = "a11y-still";

// True when the visitor asked for less motion, on their device or in the accessibility menu.
export function calm(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains(STILL_CLASS);
}

let lenis: Lenis | null = null;
const tick = (seconds: number) => lenis?.raf(seconds * 1000);

// Smooth wheel scrolling with Lenis, driven by GSAP's clock so scroll animations stay in step.
function setSmooth(on: boolean) {
  if (on && !lenis) {
    // Nested scroll areas (cart, dialogs, chat) keep their own scrolling.
    lenis = new Lenis({ lerp: 0.1, allowNestedScroll: true, autoToggle: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
  } else if (!on && lenis) {
    gsap.ticker.remove(tick);
    lenis.destroy();
    lenis = null;
  }
}

// Starts smooth scrolling and turns it off whenever the visitor asks for less motion.
export function startSmoothScroll(): () => void {
  gsap.ticker.lagSmoothing(0);
  const sync = () => setSmooth(!calm());
  sync();
  const watcher = new MutationObserver(sync);
  watcher.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", sync);
  return () => {
    watcher.disconnect();
    media.removeEventListener("change", sync);
    setSmooth(false);
  };
}

// Jumps to the top of a new page and re-measures the scroll animations for it.
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

// Keeps a wheel turn on a 3D piece or room from also scrolling the page.
export function keepWheel(event: WheelEvent) {
  event.preventDefault();
  (event as WheelEvent & { lenisStopPropagation?: boolean }).lenisStopPropagation = true;
}

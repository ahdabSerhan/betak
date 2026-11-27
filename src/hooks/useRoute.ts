import { scrollToTop } from "../lib/motion";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { isRoute, pathOf, routeOf, USES_PATHS } from "../lib/routes";

const NAVIGATE_EVENT = "betak:navigate";
const currentRoute = () => (USES_PATHS ? routeOf(window.location.pathname) : window.location.hash.slice(1) || "home");

// Go to a page. Some embedded viewers block address changes, so the app is also told directly.
export function navigate(route: string) {
  try {
    if (USES_PATHS) window.history.pushState(null, "", pathOf(route));
    else window.location.hash = route;
  } catch {
    // The address bar could not change; the page still will.
  }
  window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: route }));
}

// The page to show, kept in step with the address bar, the back button and in-site links.
export function useRoute() {
  const [route, setRoute] = useState(() => {
    // Old shared links such as /#product-1686 move to the page's real address.
    const legacy = window.location.hash.slice(1);
    if (USES_PATHS && isRoute(legacy)) {
      window.history.replaceState(null, "", pathOf(legacy));
      return legacy;
    }
    return currentRoute();
  });

  useEffect(() => {
    let currentShown = route;
    const show = (next: string) => {
      if (next === currentShown) return;
      currentShown = next;
      const update = () => {
        flushSync(() => setRoute(next));
        scrollToTop();
      };
      // Browsers with View Transitions cross-fade between pages.
      if ("startViewTransition" in document) document.startViewTransition(update);
      else update();
    };

    const onAddressChange = () => show(currentRoute());
    const onNavigate = (event: Event) => show((event as CustomEvent<string>).detail);
    // In-site links are routed here instead of reloading the page.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target || link.hasAttribute("download")) return;
      const target = link.getAttribute("href")!;
      if (USES_PATHS ? link.origin !== window.location.origin || !target.startsWith("/") : !target.startsWith("#")) return;
      event.preventDefault();
      navigate(USES_PATHS ? routeOf(link.pathname) : target.slice(1) || "home");
    };

    window.addEventListener(USES_PATHS ? "popstate" : "hashchange", onAddressChange);
    window.addEventListener(NAVIGATE_EVENT, onNavigate);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener(USES_PATHS ? "popstate" : "hashchange", onAddressChange);
      window.removeEventListener(NAVIGATE_EVENT, onNavigate);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return route;
}

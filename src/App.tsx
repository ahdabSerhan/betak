import { useEffect } from "react";
import { AccessibilityMenu } from "./components/AccessibilityMenu";
import { AgentWidget } from "./components/AgentWidget";
import { CartDrawer } from "./components/CartDrawer";
import { CookieNotice } from "./components/CookieNotice";
import { FloatingContact } from "./components/FloatingContact";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { CATEGORIES } from "./data/catalog";
import { useRoute } from "./hooks/useRoute";
import { productFromRoute } from "./lib/routes";
import { esentrixEnabled } from "./lib/esentrix";
import { About } from "./pages/About";
import { Accessibility, Privacy, Shipping, Terms } from "./pages/Accessibility";
import { CategoryPage } from "./pages/CategoryPage";
import { Contact } from "./pages/Contact";
import { Designer } from "./pages/Designer";
import { Home } from "./pages/Home";
import { ProductPage } from "./pages/ProductPage";
import { Saved } from "./pages/Saved";
import { useShop } from "./state/ShopContext";

function Page({ route }: { route: string }) {
  const category = CATEGORIES.find((item) => item.id === route);
  // The key resets filters when the visitor moves to another category.
  if (category) return <CategoryPage key={category.id} category={category} />;
  const product = productFromRoute(route);
  if (product) return <ProductPage key={product.id} product={product} />;
  if (route === "designer") return <Designer />;
  if (route === "saved") return <Saved />;
  if (route === "about") return <About />;
  if (route === "contact") return <Contact />;
  if (route === "accessibility") return <Accessibility />;
  if (route === "terms") return <Terms />;
  if (route === "privacy") return <Privacy />;
  if (route === "shipping") return <Shipping />;
  return <Home />;
}

// The browser tab's title for a page, e.g. "ספה פינתית דגם קאמילה | רהיטי ביתאק".
function titleOf(name: string | undefined, brand: string) {
  return name ? `${name} | ${brand}` : brand;
}

export function App() {
  const route = useRoute();
  const { t, lang, nameOf, cartOpen } = useShop();
  const product = productFromRoute(route);
  const category = CATEGORIES.find((item) => item.id === route);

  useEffect(() => {
    // Pages without a product or category are named by their menu label.
    const pageName: Record<string, string> = { designer: t.designer, saved: t.saved, about: t.about, contact: t.contact, accessibility: t.accessibility, terms: t.terms, privacy: t.privacy, shipping: t.shipping };
    document.title = route === "home" ? t.homeTitle : titleOf(product ? nameOf(product) : category?.h1[lang] ?? pageName[route], t.brandTitle);
  }, [route, product, category, lang, nameOf, t]);

  return (
    <>
      {/* Lets keyboard and screen reader users jump past the menu. */}
      <a className="skip-link" href="#main" onClick={(event) => { event.preventDefault(); document.getElementById("main")?.focus(); }}>{t.skipToContent}</a>
      <Header route={route} />
      <main id="main" tabIndex={-1}>
        <Page route={route} />
      </main>
      <Footer />
      {!esentrixEnabled && <AgentWidget viewing={product} />}
      <FloatingContact />
      <AccessibilityMenu />
      <CookieNotice />
      {cartOpen && <CartDrawer />}
    </>
  );
}

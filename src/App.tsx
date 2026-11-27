import { useEffect } from "react";
import { AccessibilityMenu } from "./components/AccessibilityMenu";
import { AgentWidget } from "./components/AgentWidget";
import { CartDrawer } from "./components/CartDrawer";
import { CookieNotice } from "./components/CookieNotice";
import { FloatingContact } from "./components/FloatingContact";
import { Footer } from "./components/Footer";
import { GoogleReviews } from "./components/GoogleReviews";
import { Header } from "./components/Header";
import { CATEGORIES } from "./data/catalog";
import { useRoute } from "./hooks/useRoute";
import { productFromRoute } from "./lib/routes";
import { esentrixEnabled } from "./lib/esentrix";
import { startSmoothScroll } from "./lib/motion";
import { About } from "./pages/About";
import { AdminOrders } from "./pages/AdminOrders";
import { Accessibility, Privacy, Shipping, Terms } from "./pages/Accessibility";
import { CategoryPage } from "./pages/CategoryPage";
import { Contact } from "./pages/Contact";
import { Designer } from "./pages/Designer";
import { Home } from "./pages/Home";
import { Paid } from "./pages/Paid";
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
  if (route === "paid") return <Paid />;
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

  // Smooth scrolling for the whole site; it stops when the visitor asks for less motion.
  useEffect(() => startSmoothScroll(), []);

  // The store's orders page and the after-payment page are never indexed.
  useEffect(() => {
    if (route !== "admin" && route !== "paid") return;
    const robots = Object.assign(document.createElement("meta"), { name: "robots", content: "noindex, nofollow" });
    document.head.append(robots);
    return () => robots.remove();
  }, [route]);

  useEffect(() => {
    // Pages without a product or category are named by their menu label.
    const pageName: Record<string, string> = { designer: t.designer, saved: t.saved, about: t.about, contact: t.contact, accessibility: t.accessibility, terms: t.terms, privacy: t.privacy, shipping: t.shipping, admin: t.admin.title, paid: t.paid.title };
    document.title = route === "home" ? t.homeTitle : titleOf(product ? nameOf(product) : category?.h1[lang] ?? pageName[route], t.brandTitle);
  }, [route, product, category, lang, nameOf, t]);

  if (route === "admin") {
    return (
      <>
        <main id="main" tabIndex={-1}><AdminOrders /></main>
        <AccessibilityMenu />
      </>
    );
  }

  return (
    <>
      {/* Lets keyboard and screen reader users jump past the menu. */}
      <a className="skip-link" href="#main" onClick={(event) => { event.preventDefault(); document.getElementById("main")?.focus(); }}>{t.skipToContent}</a>
      <Header route={route} />
      <main id="main" tabIndex={-1}>
        <Page route={route} />
        <GoogleReviews />
      </main>
      <Footer />
      {!esentrixEnabled && <AgentWidget viewing={product} route={route} />}
      <FloatingContact />
      <AccessibilityMenu />
      <CookieNotice />
      {cartOpen && <CartDrawer />}
    </>
  );
}

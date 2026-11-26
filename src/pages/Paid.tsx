import { useEffect } from "react";
import { href } from "../lib/routes";
import { useShop } from "../state/ShopContext";

// Where UPay sends the customer back after the payment page, at /paid?order=5001.
export function Paid() {
  const { t, clearCart } = useShop();
  const number = new URLSearchParams(window.location.search).get("order")?.replace(/\D/g, "") ?? "";

  // The cart is already ordered, also when the customer comes back in another tab.
  useEffect(() => clearCart(), [clearCart]);

  return (
    <div className="wrap page stack paid-page">
      <h1>{t.paid.title}</h1>
      {number && <p className="lead">{t.paid.text(number)}</p>}
      <p>{t.paid.more}</p>
      <p><a className="btn" href={href("home")}>{t.paid.home}</a></p>
    </div>
  );
}

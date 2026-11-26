import { STORE } from "../data/store";

export const money = (amount: number) => "₪" + amount.toLocaleString("en-US");

export const quantitySuffix = (quantity: number) => (quantity > 1 ? ` ×${quantity}` : "");

export const whatsappLink = (message = "") => `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(message)}`;

export const phoneLink = `tel:${STORE.phone.replace("-", "")}`;

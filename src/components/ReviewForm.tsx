import { useState, type FormEvent } from "react";
import { whatsappLink } from "../lib/format";
import { useShop } from "../state/ShopContext";

// "Add a review": the visitor writes it here and sends it to the store on WhatsApp; the store adds it to the page.
export function ReviewForm({ productName }: { productName: string }) {
  const { t } = useShop();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    window.open(whatsappLink(`${t.reviewSendIntro} ${productName}\n${t.reviewName}: ${name}\n${text}`), "_blank", "noopener");
    setOpen(false);
    setText("");
  };

  if (!open) return <button className="btn ghost" onClick={() => setOpen(true)}>✎ {t.reviewAdd}</button>;

  return (
    <form className="review-form" onSubmit={onSubmit}>
      <label>{t.reviewName}<input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" /></label>
      <label>{t.reviewText}<textarea value={text} onChange={(event) => setText(event.target.value)} required rows={4} /></label>
      <small className="muted">{t.reviewNote}</small>
      <div className="row">
        <button className="btn">{t.reviewSend}</button>
        <button className="btn ghost" type="button" onClick={() => setOpen(false)}>{t.close}</button>
      </div>
    </form>
  );
}

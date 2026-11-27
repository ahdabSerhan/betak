import { useState, type FormEvent } from "react";
import { STORE } from "../data/store";
import { phoneLink, whatsappLink } from "../lib/format";
import { sendMessage } from "../lib/messages";
import { href } from "../lib/routes";
import { useShop } from "../state/ShopContext";

const EMPTY = { name: "", phone: "", email: "", message: "", website: "" };

// The contact form: the message is saved for the store's admin page; if saving fails, it can go on WhatsApp.
function ContactForm() {
  const { t, lang } = useShop();
  const f = t.contactForm;
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const field = (name: keyof typeof EMPTY) => ({
    id: `contact-${name}`,
    name,
    value: form[name],
    onChange: (event: { target: { value: string } }) => setForm((current) => ({ ...current, [name]: event.target.value })),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("sending");
    const saved = await sendMessage({ ...form, page: window.location.pathname, lang });
    setState(saved ? "sent" : "failed");
    if (saved) setForm(EMPTY);
  };

  // The same message as WhatsApp text, for when the server could not take it.
  const whatsappText = [f.waIntro, `${f.name}: ${form.name}`, `${f.phone}: ${form.phone}`, form.email && `${t.email}: ${form.email}`, form.message].filter(Boolean).join("\n");

  if (state === "sent") {
    return (
      <div className="contact-form contact-sent" role="status">
        <p>{f.sent}</p>
        <button type="button" className="btn ghost" onClick={() => setState("idle")}>{f.another}</button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={submit} aria-labelledby="contact-form-title">
      <h2 id="contact-form-title">{f.title}</h2>
      <p>{f.intro}</p>
      <small className="muted">{t.checkout.required}</small>
      <div className="form-row">
        <label htmlFor="contact-name"><span>{f.name}<span className="required" aria-hidden="true"> *</span></span>
          <input {...field("name")} required minLength={2} maxLength={80} autoComplete="name" />
        </label>
        <label htmlFor="contact-phone"><span>{f.phone}<span className="required" aria-hidden="true"> *</span></span>
          <input {...field("phone")} required type="tel" pattern="[0-9+\-\s]{9,}" maxLength={30} autoComplete="tel" dir="ltr" />
        </label>
      </div>
      <label htmlFor="contact-email"><span>{f.email}</span>
        <input {...field("email")} type="email" maxLength={120} autoComplete="email" dir="ltr" />
      </label>
      <label htmlFor="contact-message"><span>{f.message}<span className="required" aria-hidden="true"> *</span></span>
        <textarea {...field("message")} required minLength={2} maxLength={2000} rows={5} />
      </label>
      {/* A trap for bots: hidden from people and from screen readers. */}
      <div className="trap" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input {...field("website")} tabIndex={-1} autoComplete="off" />
      </div>
      <small className="muted">{f.privacy}<a href={href("privacy")}>{t.privacy}</a>.</small>
      <div role="alert">
        {state === "failed" && (
          <p className="contact-failed">
            {f.failed}{" "}
            <a className="btn wa small" href={whatsappLink(whatsappText)} target="_blank" rel="noopener">{f.waSend}</a>
          </p>
        )}
      </div>
      <div>
        <button className="btn" type="submit" disabled={state === "sending"}>{state === "sending" ? f.sending : f.send}</button>
      </div>
    </form>
  );
}

export function Contact() {
  const { t } = useShop();

  return (
    <div className="wrap page contact-page">
      <div className="stack">
        <h1>{t.contactTitle}</h1>
        <p>{t.contactText}</p>
        <h2 className="contact-other">{t.contactForm.otherWays}</h2>
        <ul className="contact-list">
          <li>{t.phone}: <a href={phoneLink}>{STORE.phone}</a></li>
          <li>{t.email}: <a href={`mailto:${STORE.email}`}>{STORE.email}</a></li>
          <li>{t.pobox}</li>
        </ul>
        <div className="chips">
          <a className="btn wa" href={whatsappLink()} target="_blank" rel="noopener">{t.whatsapp}</a>
          <a className="btn ghost" href={STORE.instagram} target="_blank" rel="noopener">Instagram</a>
          <a className="btn ghost" href={STORE.facebook} target="_blank" rel="noopener">Facebook</a>
        </div>
      </div>
      <ContactForm />
    </div>
  );
}

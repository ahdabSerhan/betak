import { useShop } from "../state/ShopContext";

export function About() {
  const { t } = useShop();

  return (
    <div className="wrap page stack">
      <h1>{t.aboutTitle}</h1>
      {t.aboutText.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </div>
  );
}

import { ACCESSIBILITY } from "../data/accessibility";
import { useShop } from "../state/ShopContext";

// The accessibility statement (הצהרת נגישות).
export function Accessibility() {
  const { lang } = useShop();
  const statement = ACCESSIBILITY[lang];

  return (
    <article className="wrap page stack statement">
      <h1>{statement.title}</h1>
      <p className="muted">{statement.updated}</p>
      {statement.sections.map((section) => (
        <section className="stack" key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
        </section>
      ))}
    </article>
  );
}

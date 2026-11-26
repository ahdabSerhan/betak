import { ACCESSIBILITY, type Statement } from "../data/accessibility";
import { PRIVACY } from "../data/privacy";
import { SHIPPING } from "../data/shipping";
import { TERMS } from "../data/terms";
import type { Lang } from "../i18n/text";
import { useShop } from "../state/ShopContext";

// A page of policy text: the accessibility statement, terms of use, shipping policy or privacy policy.
function StatementPage({ statements }: { statements: Record<Lang, Statement> }) {
  const { lang } = useShop();
  const statement = statements[lang];

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

export const Accessibility = () => <StatementPage statements={ACCESSIBILITY} />;
export const Terms = () => <StatementPage statements={TERMS} />;
export const Shipping = () => <StatementPage statements={SHIPPING} />;
export const Privacy = () => <StatementPage statements={PRIVACY} />;

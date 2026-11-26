import type { Statement } from "../data/accessibility";

// A long text page made of titled sections, such as the accessibility statement or the terms.
export function StatementView({ statement }: { statement: Statement }) {
  return (
    <article className="wrap page stack statement">
      <h1>{statement.title}</h1>
      {statement.updated && <p className="muted">{statement.updated}</p>}
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

import type { ReactNode } from "react";

interface FoldProps {
  number: number;
  title: string;
  // The current choice, shown on the row while the section is closed.
  chosen: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

// One numbered section that expands in place.
export function Fold({ number, title, chosen, open, onToggle, children }: FoldProps) {
  return (
    <div className={open ? "config-section open" : "config-section"}>
      <button className="config-toggle" aria-expanded={open} onClick={onToggle}>
        <span className="config-number">{String(number).padStart(2, "0")}</span>
        <b>{title}</b>
        <span className="config-chosen">{chosen}</span>
        <span className="config-arrow" aria-hidden="true">⌄</span>
      </button>
      {/* The panel stays in the page so it can slide open and closed. */}
      <div className="config-fold" inert={!open}><div className="config-panel">{children}</div></div>
    </div>
  );
}

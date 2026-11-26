import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useShop } from "../state/ShopContext";

interface DialogProps {
  label: string;
  onClose: () => void;
  narrow?: boolean;
  children: ReactNode;
}

// Centered modal; closes on Escape or a click on the backdrop. It is drawn at the end of <body>,
// so a parent's stacking (a sticky column, an animation) cannot put page bars on top of it.
export function Dialog({ label, onClose, narrow, children }: DialogProps) {
  const { t } = useShop();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <>
      <div className="scrim" />
      <div className="modal" onClick={(event) => event.target === event.currentTarget && onClose()}>
        <div className={narrow ? "sheet narrow" : "sheet"} role="dialog" aria-modal="true" aria-label={label}>
          <button className="close" onClick={onClose} aria-label={t.close}>✕</button>
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}

import type { ReactNode } from "react";
import AnimatedContent from "./bits/AnimatedContent";
import { smallScreen } from "../lib/motion";

// Fades content up the first time it scrolls into view (GSAP ScrollTrigger, via React Bits).
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  // On phones: a short, quick fade with no blur, so cards are sharp as soon as they are in view.
  const phone = smallScreen();
  return (
    <AnimatedContent
      className={className}
      distance={phone ? 16 : 48}
      duration={phone ? 0.45 : 0.9}
      blur={phone ? 0 : 6}
      delay={phone ? 0 : delay / 1000}
      threshold={phone ? 0.05 : 0.12}
    >
      {children}
    </AnimatedContent>
  );
}

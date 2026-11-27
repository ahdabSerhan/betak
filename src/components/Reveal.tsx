import type { ReactNode } from "react";
import AnimatedContent from "./bits/AnimatedContent";

// Fades content up the first time it scrolls into view (GSAP ScrollTrigger, via React Bits).
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <AnimatedContent className={className} distance={48} duration={0.9} blur={6} delay={delay / 1000} threshold={0.12}>
      {children}
    </AnimatedContent>
  );
}

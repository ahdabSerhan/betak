import { useRef, type PointerEvent } from "react";

// Tilts an element in 3D toward the pointer by writing --rx / --ry (degrees) for CSS to use.
export function useTilt<T extends HTMLElement>(maxDegrees = 8) {
  const ref = useRef<T>(null);

  const setAngles = (rx: number, ry: number) => {
    ref.current?.style.setProperty("--rx", rx.toFixed(2));
    ref.current?.style.setProperty("--ry", ry.toFixed(2));
  };

  const onPointerMove = (event: PointerEvent<T>) => {
    // Touch scrolling should not tilt the page under the finger.
    if (event.pointerType === "touch" || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    setAngles(-y * 2 * maxDegrees, x * 2 * maxDegrees);
  };

  return { ref, onPointerMove, onPointerLeave: () => setAngles(0, 0) };
}

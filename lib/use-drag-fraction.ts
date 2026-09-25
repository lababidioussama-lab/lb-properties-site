"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useSite } from "./context/site-context";

/**
 * Shared pointer maths for every horizontal drag control on the site.
 *
 * The RTL inversion lives here rather than in each component, because it is
 * exactly the kind of detail that gets fixed in one slider and forgotten in
 * the next. In RTL the visual left edge is the MAXIMUM, so the fraction is
 * mirrored — dragging toward the start of the reading direction always
 * increases the value, in both directions.
 *
 * Pointer capture is used so a fast drag that leaves the element vertically
 * keeps tracking instead of stranding the handle mid-gesture.
 */
export function useDragFraction(onFraction: (fraction: number) => void) {
  const { rtl } = useSite();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const fractionFromClientX = useCallback(
    (clientX: number): number => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return 0;
      const raw = (clientX - rect.left) / rect.width;
      const clamped = Math.min(1, Math.max(0, raw));
      return rtl ? 1 - clamped : clamped;
    },
    [rtl],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      onFraction(fractionFromClientX(event.clientX));
    },
    [fractionFromClientX, onFraction],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!draggingRef.current) return;
      onFraction(fractionFromClientX(event.clientX));
    },
    [fractionFromClientX, onFraction],
  );

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return {
    trackRef,
    /** Spread onto the track element */
    dragHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
    rtl,
  };
}

/**
 * Arrow keys should move the value in the direction the key points on
 * screen, which in RTL is the opposite of the numeric direction.
 */
export function keyboardStepFor(key: string, rtl: boolean): number | null {
  const sign = rtl ? -1 : 1;
  switch (key) {
    case "ArrowRight":
      return sign;
    case "ArrowLeft":
      return -sign;
    case "ArrowUp":
      return 1;
    case "ArrowDown":
      return -1;
    default:
      return null;
  }
}

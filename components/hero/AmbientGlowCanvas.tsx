"use client";

import { useEffect, useRef } from "react";
import { useSite } from "@/lib/context/site-context";

/**
 * Slow bronze light mesh behind the hero card.
 *
 * Three overlapping radial fields drift on independent Lissajous paths and
 * lean toward the cursor. Because the periods are mutually irrational the
 * pattern never visibly repeats, which is what stops it reading as a loop.
 *
 * Rendered at half resolution and upscaled: the whole image is soft gradient,
 * so nothing is lost, and the per-frame fill cost drops to a quarter.
 */

interface Blob {
  /** Lissajous parameters — centre, amplitude, angular frequency, phase */
  cx: number;
  cy: number;
  ax: number;
  ay: number;
  fx: number;
  fy: number;
  phase: number;
  radius: number;
  alpha: number;
}

const BLOBS: Blob[] = [
  { cx: 0.34, cy: 0.30, ax: 0.16, ay: 0.12, fx: 0.055, fy: 0.041, phase: 0.0, radius: 0.46, alpha: 0.22 },
  { cx: 0.70, cy: 0.62, ax: 0.13, ay: 0.15, fx: 0.037, fy: 0.062, phase: 1.9, radius: 0.38, alpha: 0.16 },
  { cx: 0.52, cy: 0.84, ax: 0.19, ay: 0.09, fx: 0.029, fy: 0.048, phase: 3.4, radius: 0.32, alpha: 0.11 },
];

export function AmbientGlowCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useSite();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let rafId = 0;
    let running = false;
    let onScreen = true;
    const start = performance.now();

    const pointer = { x: 0.5, y: 0.5 };
    const eased = { x: 0.5, y: 0.5 };

    const styles = getComputedStyle(document.documentElement);
    const bronze = styles.getPropertyValue("--color-clay").trim() || "#14304f";
    const rgb = hexToRgb(bronze);

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // Half-res: this is nothing but soft gradients, so the extra pixels
      // would buy no visible detail.
      const scale = 0.5;
      w = Math.max(1, Math.round(rect.width * scale));
      h = Math.max(1, Math.round(rect.height * scale));
      canvas.width = w;
      canvas.height = h;
    }

    function frame(now: number) {
      if (!ctx) return;
      const t = (now - start) / 1000;

      eased.x += (pointer.x - eased.x) * 0.04;
      eased.y += (pointer.y - eased.y) * 0.04;
      const leanX = (eased.x - 0.5) * 0.14;
      const leanY = (eased.y - 0.5) * 0.10;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (const b of BLOBS) {
        const x = (b.cx + Math.sin(t * b.fx * Math.PI * 2 + b.phase) * b.ax + leanX) * w;
        const y = (b.cy + Math.cos(t * b.fy * Math.PI * 2 + b.phase) * b.ay + leanY) * h;
        const r = b.radius * Math.max(w, h);

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(${rgb}, ${b.alpha})`);
        grad.addColorStop(0.45, `rgba(${rgb}, ${b.alpha * 0.28})`);
        grad.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = "source-over";
      if (running && !reduceMotion) rafId = requestAnimationFrame(frame);
    }

    function play() {
      if (running || reduceMotion) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    }
    function pause() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    function onPointer(e: PointerEvent) {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = e.clientY / window.innerHeight;
    }
    function onVisibility() {
      if (document.hidden) pause();
      else if (onScreen) play();
    }

    resize();
    // Reduced motion still gets the light mesh, just held still.
    frame(performance.now());

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (entry.isIntersecting && !document.hidden) play();
        else pause();
      },
      { threshold: 0.01 },
    );
    observer.observe(canvas);

    const onResize = () => {
      resize();
      frame(performance.now());
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduceMotion) window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      pause();
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return "200, 168, 112";
  return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
}

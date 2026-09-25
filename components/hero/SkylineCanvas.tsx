"use client";

import { useEffect, useRef } from "react";
import { useSite } from "@/lib/context/site-context";

/* ---------------------------------------------------------------------------
   Geometry
   The skyline is described once in normalised coordinates (x across the band,
   y as height above the horizon) and scaled at draw time, so it composes
   correctly at any aspect ratio without a second set of magic numbers.
   ------------------------------------------------------------------------ */

type Tower =
  | { kind: "spire"; x: number; w: number; h: number; setbacks: number }
  | { kind: "block"; x: number; w: number; h: number; crown?: "flat" | "angled" | "stepped" }
  | { kind: "torus"; x: number; w: number; h: number }
  | { kind: "twist"; x: number; w: number; h: number };

/** Far layer — hazy, low contrast, barely moves. */
const FAR: Tower[] = [
  { kind: "block", x: 0.04, w: 0.05, h: 0.30, crown: "flat" },
  { kind: "block", x: 0.11, w: 0.04, h: 0.42, crown: "angled" },
  { kind: "block", x: 0.17, w: 0.06, h: 0.26, crown: "flat" },
  { kind: "block", x: 0.30, w: 0.045, h: 0.38, crown: "stepped" },
  { kind: "block", x: 0.37, w: 0.05, h: 0.31, crown: "flat" },
  { kind: "block", x: 0.57, w: 0.05, h: 0.35, crown: "angled" },
  { kind: "block", x: 0.65, w: 0.04, h: 0.44, crown: "flat" },
  { kind: "block", x: 0.78, w: 0.055, h: 0.29, crown: "stepped" },
  { kind: "block", x: 0.87, w: 0.045, h: 0.37, crown: "flat" },
  { kind: "block", x: 0.94, w: 0.05, h: 0.24, crown: "angled" },
];

/** Near layer — the recognisable Dubai silhouette. */
const NEAR: Tower[] = [
  { kind: "block", x: 0.08, w: 0.035, h: 0.34, crown: "stepped" },
  { kind: "twist", x: 0.16, w: 0.032, h: 0.46 },
  { kind: "block", x: 0.23, w: 0.04, h: 0.30, crown: "angled" },
  // Burj Khalifa: the tapering spire that anchors the whole composition
  { kind: "spire", x: 0.43, w: 0.055, h: 0.95, setbacks: 7 },
  { kind: "block", x: 0.53, w: 0.036, h: 0.38, crown: "flat" },
  // Museum of the Future
  { kind: "torus", x: 0.63, w: 0.075, h: 0.30 },
  { kind: "twist", x: 0.74, w: 0.034, h: 0.50 },
  { kind: "block", x: 0.82, w: 0.042, h: 0.33, crown: "stepped" },
  { kind: "block", x: 0.90, w: 0.036, h: 0.41, crown: "angled" },
];

interface Particle {
  /** Normalised grid position; depth drives both speed and opacity */
  x: number;
  y: number;
  depth: number;
  phase: number;
}

function readTheme(el: HTMLElement) {
  const s = getComputedStyle(el);
  return {
    skyTop: s.getPropertyValue("--canvas-sky-top").trim(),
    skyBottom: s.getPropertyValue("--canvas-sky-bottom").trim(),
    particle: s.getPropertyValue("--canvas-particle").trim(),
    structure: s.getPropertyValue("--canvas-structure").trim(),
    structureFar: s.getPropertyValue("--canvas-structure-far").trim(),
    sweep: s.getPropertyValue("--canvas-sweep").trim(),
  };
}

type Palette = ReturnType<typeof readTheme>;

function drawTower(
  ctx: CanvasRenderingContext2D,
  tower: Tower,
  bandX: number,
  bandW: number,
  horizonY: number,
  maxH: number,
  offsetX: number,
) {
  const x = bandX + tower.x * bandW + offsetX;
  const w = tower.w * bandW;
  const h = tower.h * maxH;
  const top = horizonY - h;

  ctx.beginPath();

  switch (tower.kind) {
    case "spire": {
      // Walk up the left profile recording each setback as a half-width at a
      // height, then replay it in reverse for the right side. Building the
      // profile once and mirroring it is what keeps the tower symmetrical.
      const segment = h / (tower.setbacks + 1.6);
      const profile: { halfW: number; y: number }[] = [];
      let halfW = w / 2;
      let y = horizonY;

      for (let i = 0; i < tower.setbacks; i++) {
        const nextY = y - segment;
        profile.push({ halfW, y: nextY }); // rise at the current width
        halfW *= 0.82; // then step in
        profile.push({ halfW, y: nextY });
        y = nextY;
      }
      // The needle above the last setback
      const needleHalf = halfW * 0.18;
      profile.push({ halfW: needleHalf, y: top + h * 0.06 });
      profile.push({ halfW: 0, y: top });

      ctx.moveTo(x - w / 2, horizonY);
      for (const p of profile) ctx.lineTo(x - p.halfW, p.y);
      for (let i = profile.length - 1; i >= 0; i--) {
        ctx.lineTo(x + profile[i].halfW, profile[i].y);
      }
      ctx.lineTo(x + w / 2, horizonY);
      ctx.closePath();
      break;
    }
    case "torus": {
      // Elliptical ring on a plinth
      ctx.moveTo(x - w * 0.28, horizonY);
      ctx.lineTo(x - w * 0.28, horizonY - h * 0.22);
      ctx.lineTo(x + w * 0.28, horizonY - h * 0.22);
      ctx.lineTo(x + w * 0.28, horizonY);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(x, horizonY - h * 0.62, w * 0.5, h * 0.42, 0, 0, Math.PI * 2);
      ctx.ellipse(x, horizonY - h * 0.62, w * 0.24, h * 0.20, 0, 0, Math.PI * 2);
      ctx.fill("evenodd");
      return;
    }
    case "twist": {
      // Cayan-style twist: each floor plate rotates a little further
      const floors = 26;
      const fh = h / floors;
      const left: [number, number][] = [];
      const right: [number, number][] = [];
      for (let i = 0; i <= floors; i++) {
        const t = i / floors;
        const shift = Math.sin(t * Math.PI * 0.92) * w * 0.55;
        const y = horizonY - i * fh;
        const halfW = (w / 2) * (1 - t * 0.18);
        left.push([x + shift - halfW, y]);
        right.push([x + shift + halfW, y]);
      }
      ctx.moveTo(left[0][0], left[0][1]);
      left.forEach(([lx, ly]) => ctx.lineTo(lx, ly));
      for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
      ctx.closePath();
      break;
    }
    default: {
      const half = w / 2;
      ctx.moveTo(x - half, horizonY);
      if (tower.crown === "angled") {
        ctx.lineTo(x - half, top + h * 0.1);
        ctx.lineTo(x, top);
        ctx.lineTo(x + half, top + h * 0.1);
      } else if (tower.crown === "stepped") {
        ctx.lineTo(x - half, top + h * 0.12);
        ctx.lineTo(x - half * 0.6, top + h * 0.12);
        ctx.lineTo(x - half * 0.6, top);
        ctx.lineTo(x + half * 0.6, top);
        ctx.lineTo(x + half * 0.6, top + h * 0.12);
        ctx.lineTo(x + half, top + h * 0.12);
      } else {
        ctx.lineTo(x - half, top);
        ctx.lineTo(x + half, top);
      }
      ctx.lineTo(x + half, horizonY);
      ctx.closePath();
    }
  }

  ctx.fill();
}

export function SkylineCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useSite();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let palette: Palette = readTheme(document.documentElement);

    // Pointer influence, lerped rather than applied directly so the parallax
    // glides instead of snapping to the cursor.
    const pointer = { x: 0.5, y: 0.5 };
    const eased = { x: 0.5, y: 0.5 };

    let rafId = 0;
    let running = false;
    let isOnScreen = true;
    let startTime = performance.now();

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // Cap DPR at 2: beyond that the particle field costs real battery for
      // a difference nobody can see.
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Particle count scales with area, so a phone doesn't run a desktop
      // workload, and a 4K monitor doesn't look sparse.
      const target = Math.round(Math.min(150, Math.max(38, (width * height) / 12000)));
      particles = Array.from({ length: target }, () => ({
        x: Math.random(),
        y: Math.random(),
        depth: 0.25 + Math.random() * 0.75,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function draw(now: number) {
      if (!ctx) return;
      const elapsed = (now - startTime) / 1000;

      eased.x += (pointer.x - eased.x) * 0.055;
      eased.y += (pointer.y - eased.y) * 0.055;
      const px = (eased.x - 0.5) * 2; // -1 … 1
      const py = (eased.y - 0.5) * 2;

      ctx.clearRect(0, 0, width, height);

      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, palette.skyTop);
      sky.addColorStop(1, palette.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      // The skyline is scenery, not the subject: the tallest tower tops out
      // around the lower third so it never crosses the headline. Sized off
      // height alone, a short landscape phone would flatten it, so the band
      // also respects width.
      const horizonY = height * 0.88;
      const maxH = Math.min(height * 0.44, width * 0.30);

      /* --- perspective grid receding to the horizon --- */
      ctx.strokeStyle = palette.structureFar;
      ctx.lineWidth = 1;
      const vanishX = width * (0.5 + px * 0.06);
      const rows = 9;
      for (let i = 1; i <= rows; i++) {
        // Quadratic spacing gives the impression of depth
        const t = i / rows;
        const y = horizonY + Math.pow(t, 2.1) * (height - horizonY) * 1.5;
        if (y > height) break;
        ctx.globalAlpha = (1 - t) * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      const cols = 14;
      for (let i = 0; i <= cols; i++) {
        const t = i / cols;
        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        ctx.moveTo(vanishX + (t - 0.5) * width * 0.5, horizonY);
        ctx.lineTo(t * width * 2.4 - width * 0.7, height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* --- skyline, far then near, at different parallax rates --- */
      const bandX = -width * 0.06;
      const bandW = width * 1.12;

      ctx.fillStyle = palette.structureFar;
      drawLayer(FAR, bandX, bandW, horizonY, maxH * 0.62, -px * width * 0.012 + py * 3);

      ctx.fillStyle = palette.structure;
      drawLayer(NEAR, bandX, bandW, horizonY, maxH, -px * width * 0.03 + py * 6);

      /* --- particle field --- */
      for (const p of particles) {
        const driftX = reduceMotion ? 0 : Math.sin(elapsed * 0.12 + p.phase) * 0.014;
        const driftY = reduceMotion ? 0 : Math.cos(elapsed * 0.09 + p.phase) * 0.01;
        const x = (p.x + driftX - px * 0.045 * p.depth) * width;
        const y = (p.y + driftY - py * 0.03 * p.depth) * horizonY;
        const r = 0.6 + p.depth * 1.5;

        ctx.globalAlpha = 0.18 + p.depth * 0.5;
        ctx.fillStyle = palette.particle;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* --- slow gold light sweep across the whole scene --- */
      const sweepPos = reduceMotion ? 0.34 : ((elapsed * 0.055) % 1.5) - 0.25;
      const sweep = ctx.createLinearGradient(
        sweepPos * width - width * 0.3,
        0,
        sweepPos * width + width * 0.3,
        height,
      );
      sweep.addColorStop(0, "transparent");
      sweep.addColorStop(0.5, palette.sweep);
      sweep.addColorStop(1, "transparent");
      ctx.fillStyle = sweep;
      ctx.fillRect(0, 0, width, height);

      /* --- horizon rule --- */
      const rule = ctx.createLinearGradient(0, 0, width, 0);
      rule.addColorStop(0, "transparent");
      rule.addColorStop(0.5, palette.particle);
      rule.addColorStop(1, "transparent");
      ctx.fillStyle = rule;
      ctx.fillRect(0, horizonY, width, 1);

      if (running && !reduceMotion) rafId = requestAnimationFrame(draw);
    }

    function drawLayer(
      towers: Tower[],
      bandX: number,
      bandW: number,
      horizonY: number,
      maxH: number,
      offsetX: number,
    ) {
      for (const tower of towers) {
        drawTower(ctx!, tower, bandX, bandW, horizonY, maxH, offsetX);
      }
    }

    function start() {
      if (running) return;
      running = true;
      startTime = performance.now() - 1;
      rafId = requestAnimationFrame(draw);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    function onPointerMove(event: PointerEvent) {
      pointer.x = event.clientX / window.innerWidth;
      pointer.y = event.clientY / window.innerHeight;
    }

    function onVisibility() {
      if (document.hidden) stop();
      else if (isOnScreen) start();
    }

    resize();

    if (reduceMotion) {
      // One static frame, painted at the neutral pointer position. The rAF
      // loop never starts at all.
      draw(performance.now());
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isOnScreen = entry.isIntersecting;
        if (reduceMotion) return;
        if (entry.isIntersecting && !document.hidden) start();
        else stop();
      },
      { threshold: 0.01 },
    );
    observer.observe(canvas);

    const onResize = () => {
      resize();
      if (reduceMotion) draw(performance.now());
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduceMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
    };
    // `theme` is in the dep list so the whole scene is rebuilt with the new
    // palette when the visitor toggles — the colours are read from CSS once
    // at setup, not per frame.
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={{ touchAction: "pan-y" }}
    />
  );
}

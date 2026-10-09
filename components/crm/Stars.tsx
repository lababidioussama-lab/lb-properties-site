"use client";

import { useEffect, useRef } from "react";

/**
 * DB Search's star field (dbsearchdubai.com), behind the whole CRM: three
 * drifting layers, a slow twinkle, faint links between the nearest bright
 * stars, a little parallax with the mouse. White glow on black in dark mode,
 * crisp blue dots on grey in light mode.
 *
 * Kept cheap the way DB Search keeps it: the glow is drawn once into a sprite
 * and stamped, the canvas is capped at ~2.3 MP, and it stops while the tab
 * is hidden. Reduced-motion users get a near-still field.
 */
const LAYERS = [
  { n: 34, r: [0.5, 1.1], sp: 0.3, a: 0.3, link: false, par: 0.1, dr: 0.3 },
  { n: 24, r: [0.9, 1.7], sp: 0.6, a: 0.52, link: false, par: 0.28, dr: 0.62 },
  { n: 22, r: [1.3, 2.5], sp: 1.1, a: 0.85, link: true, par: 0.55, dr: 1 },
];
const DIR = { x: -0.62, y: 0.26 };
const MAXPX = 2_300_000;
const SR = 40;

export function Stars({ id }: { id?: string } = {}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, raf: number | null = null, t = 0, mx = 0, my = 0, tx = 0, ty = 0;
    type P = { l: number; x: number; y: number; vx: number; vy: number; r: number; ph: number };
    let pts: P[] = [];

    const size = () => {
      W = window.innerWidth; H = window.innerHeight;
      const rs = Math.min(1, Math.sqrt(MAXPX / Math.max(1, W * H)));
      cv.width = Math.max(1, Math.round(W * rs)); cv.height = Math.max(1, Math.round(H * rs));
      ctx.setTransform(rs, 0, 0, rs, 0, 0);
    };
    const seed = () => {
      pts = [];
      const scale = Math.max(0.55, Math.min(1.9, (W * H) / (1440 * 900)));
      LAYERS.forEach((L, li) => {
        const n = Math.max(6, Math.round(L.n * scale));
        for (let i = 0; i < n; i++) {
          pts.push({
            l: li, x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - 0.5) * L.sp * (reduce ? 0.3 : 1), vy: (Math.random() - 0.5) * L.sp * (reduce ? 0.3 : 1),
            r: L.r[0] + Math.random() * (L.r[1] - L.r[0]), ph: Math.random() * Math.PI * 2,
          });
        }
      });
    };

    const sprite = document.createElement("canvas");
    const sctx = sprite.getContext("2d")!;
    let spriteKey = "";
    const buildSprite = (C: string, lite: boolean) => {
      const key = C + (lite ? "|l" : "|d");
      if (key === spriteKey) return;
      spriteKey = key;
      sprite.width = sprite.height = SR * 2;
      sctx.clearRect(0, 0, SR * 2, SR * 2);
      const g = sctx.createRadialGradient(SR, SR, 0, SR, SR, SR);
      if (lite) {
        g.addColorStop(0, `rgba(${C},1)`); g.addColorStop(0.34, `rgba(${C},1)`);
        g.addColorStop(0.52, `rgba(${C},.20)`); g.addColorStop(1, `rgba(${C},0)`);
      } else {
        g.addColorStop(0, `rgba(${C},1)`); g.addColorStop(0.2, `rgba(${C},.92)`);
        g.addColorStop(0.44, `rgba(${C},.28)`); g.addColorStop(1, `rgba(${C},0)`);
      }
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, SR * 2, SR * 2);
    };

    const frame = () => {
      t += 1 / 60;
      const lite = document.documentElement.dataset.theme !== "dark";
      const C = lite ? "47,111,214" : "214,228,250";
      buildSprite(C, lite);
      tx += (mx - tx) * 0.045; ty += (my - ty) * 0.045;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = lite ? "source-over" : "lighter";
      const near: { x: number; y: number }[] = [];
      for (const p of pts) {
        const L = LAYERS[p.l];
        const dm = L.dr * (reduce ? 0.3 : 1);
        p.x += p.vx + DIR.x * dm; p.y += p.vy + DIR.y * dm;
        if (p.x < -40) p.x = W + 40; else if (p.x > W + 40) p.x = -40;
        if (p.y < -40) p.y = H + 40; else if (p.y > H + 40) p.y = -40;
        const dx = p.x - tx * L.par, dy = p.y - ty * L.par;
        const tw = reduce ? 1 : 0.72 + 0.28 * Math.sin(t * 1.1 + p.ph);
        // Light mode stays quieter: the page is for reading.
        const a = L.a * tw * (lite ? 0.45 : 1);
        const s = p.r * (lite ? 2.1 : 4);
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(sprite, dx - s, dy - s, s * 2, s * 2);
        if (L.link) near.push({ x: dx, y: dy });
      }
      ctx.globalAlpha = 1;
      const LD = 140;
      for (let i = 0; i < near.length; i++) {
        for (let j = i + 1; j < near.length; j++) {
          const d = Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y);
          if (d < LD) {
            ctx.beginPath();
            ctx.moveTo(near[i].x, near[i].y);
            ctx.lineTo(near[j].x, near[j].y);
            ctx.strokeStyle = `rgba(${C},${(1 - d / LD) * 0.19 * (lite ? 0.5 : 1)})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (raf === null) raf = requestAnimationFrame(frame); };
    const stop = () => { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } };

    size(); seed(); start();
    let lastW = window.innerWidth, timer: number | undefined;
    const onResize = () => {
      size();
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { size(); seed(); }, 160);
    };
    const onMove = (e: MouseEvent) => { mx = (e.clientX - window.innerWidth / 2) / 26; my = (e.clientY - window.innerHeight / 2) / 26; };
    const onVis = () => (document.hidden ? stop() : start());
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} id={id} aria-hidden className={id ? undefined : "crm-stars"} />;
}

export { setCrmTheme, type CrmTheme } from "@/lib/crm-theme";

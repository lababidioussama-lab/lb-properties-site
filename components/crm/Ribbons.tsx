"use client";

import { useEffect, useRef } from "react";

/**
 * The light behind the whole workspace: a bundle of thin glowing strands that
 * sweeps up across the page, pinches into one bright point and fans out
 * again, breathing slowly, with a few drifting sparks. In the blue of the
 * Lababidi logo.
 *
 * Kept cheap, because it sits behind every screen: one canvas capped at about
 * 0.7 megapixels and stretched to fit, the strands drawn as ten paths rather
 * than one each, 24 frames a second, paused while the page is being scrolled
 * and stopped while the tab is hidden. People who ask for reduced motion
 * get one still frame. On paper (light theme) it draws faint and dark instead
 * of bright.
 */
const STRANDS = 110;
const STEPS = 40;
const BANDS = 5;      // by distance from the heart of the bundle
const PHASES = 2;     // two groups breathing out of step
const SPARKS = 60;

export function Ribbons() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, raf = 0, last = 0, t = 0, quietUntil = 0;
    const seeds = Array.from({ length: STRANDS }, (_, i) => ({ k: i / (STRANDS - 1) - 0.5, ph: (i * 2.399) % 6.283, w: 0.7 + ((i * 7) % 5) / 4 }));
    const sparks = Array.from({ length: SPARKS }, (_, i) => ({ u: (i * 0.618) % 1, k: ((i * 0.37) % 1) - 0.5, r: 0.6 + ((i * 3) % 4) / 3, sp: 0.012 + ((i * 5) % 7) / 500 }));

    const size = () => {
      const scale = Math.min(window.devicePixelRatio || 1, Math.sqrt(700_000 / (window.innerWidth * window.innerHeight)));
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };

    /* A point on the sweep: a cubic curve from low on the left, through a
       pinch a little left of centre, up and out at the top right. */
    const at = (u: number, k: number, time: number, ph: number) => {
      const a = 1 - u;
      const x0 = -0.2 * W, y0 = 1.02 * H, x1 = 0.34 * W, y1 = 1.18 * H, x2 = 0.44 * W, y2 = 0.14 * H, x3 = 1.2 * W, y3 = -0.08 * H;
      const x = a * a * a * x0 + 3 * a * a * u * x1 + 3 * a * u * u * x2 + u * u * u * x3;
      const y = a * a * a * y0 + 3 * a * a * u * y1 + 3 * a * u * u * y2 + u * u * u * y3;
      // tangent, for the normal the strand is pushed along
      const dx = 3 * a * a * (x1 - x0) + 6 * a * u * (x2 - x1) + 3 * u * u * (x3 - x2);
      const dy = 3 * a * a * (y1 - y0) + 6 * a * u * (y2 - y1) + 3 * u * u * (y3 - y2);
      const len = Math.hypot(dx, dy) || 1;
      const pinch = Math.abs(u - 0.47);
      const spread = (0.01 + Math.pow(pinch, 1.2) * 1.5) * Math.min(W, H);
      const wave = Math.sin(u * 5.2 + time * 0.55 + ph) * 0.16 + Math.sin(u * 11 - time * 0.35 + ph * 1.7) * 0.05;
      const off = (k + wave * (0.25 + pinch)) * spread;
      return [x + (-dy / len) * off, y + (dx / len) * off] as const;
    };

    const draw = () => {
      const dark = document.documentElement.dataset.theme !== "light";
      ctx.clearRect(0, 0, W, H);
      ctx.save();

      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      ctx.lineCap = "round";
      if (dark) {
        ctx.lineWidth = 34;
        ctx.strokeStyle = "rgba(47,111,214,0.05)";
        ctx.beginPath();
        for (let n = 0; n < seeds.length; n += 18) {
          const s = seeds[n];
          for (let i = 0; i <= STEPS; i += 2) { const [x, y] = at(i / STEPS, s.k, t, s.ph); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        }
        ctx.stroke();
      }
      // Strands that share a colour and a breath go down as one path: ten
      // strokes a frame instead of a hundred and ten.
      for (let band = 0; band < BANDS; band++) {
        for (let g = 0; g < PHASES; g++) {
          const mid = (band + 0.5) / BANDS / 2;                 // typical |k| of the band
          const edge = 1 - mid * 1.5;
          const alpha = (dark ? 0.24 : 0.09) * (0.3 + edge) * (0.72 + 0.28 * Math.sin(t * 0.4 + g * 3.1 + band));
          // blue at the heart of the bundle, a cooler cyan at its edges, as light scatters
          ctx.strokeStyle = dark
            ? `rgba(${Math.round(70 + 60 * mid)},${Math.round(140 + 70 * mid)},255,${alpha})`
            : `rgba(11,42,74,${alpha})`;
          ctx.lineWidth = 0.9 + 0.35 * g;
          ctx.beginPath();
          for (let n = 0; n < seeds.length; n++) {
            const s = seeds[n];
            if (n % PHASES !== g || Math.min(BANDS - 1, Math.floor(Math.abs(s.k) * 2 * BANDS)) !== band) continue;
            for (let i = 0; i <= STEPS; i++) {
              const [x, y] = at(i / STEPS, s.k, t, s.ph);
              if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            }
          }
          ctx.stroke();
        }
      }
      // the bright point where the strands meet
      const [px, py] = at(0.47, 0, t, 0);
      const glow = ctx.createRadialGradient(px, py, 0, px, py, Math.min(W, H) * 0.34);
      glow.addColorStop(0, dark ? "rgba(200,222,255,0.38)" : "rgba(47,111,214,0.14)");
      glow.addColorStop(0.12, dark ? "rgba(90,150,255,0.14)" : "rgba(47,111,214,0.07)");
      glow.addColorStop(0.45, dark ? "rgba(40,95,210,0.04)" : "rgba(47,111,214,0.03)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, -H, W, H * 3);
      // sparks carried along the strands
      for (const p of sparks) {
        const u = (p.u + t * p.sp) % 1;
        const [x, y] = at(u, p.k, t, p.k * 9);
        ctx.fillStyle = dark ? `rgba(200,225,255,${0.5 * Math.sin(u * Math.PI)})` : `rgba(11,42,74,${0.18 * Math.sin(u * Math.PI)})`;
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 41 || now < quietUntil) return;      // about 24 frames a second, and still while scrolling
      t += Math.min(0.1, (now - last) / 1000); last = now;
      draw();
    };
    const start = () => { if (!raf && !reduce && !document.hidden) raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVis = () => (document.hidden ? stop() : start());
    const onResize = () => { size(); draw(); };
    const onScroll = () => { quietUntil = performance.now() + 160; if (reduce) draw(); };

    size(); draw(); start();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    const mo = new MutationObserver(draw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { stop(); mo.disconnect(); window.removeEventListener("resize", onResize); window.removeEventListener("scroll", onScroll); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="crm-ribbons" />;
}

"use client";

import { useMemo, useState } from "react";

import { Card } from "../shared";

/**
 * Which way a unit faces, when the sun reaches that side in each season, and
 * the traditional Vastu reading of that direction. Pure calculation — no
 * owner data — so it needs no sign-in to the database and costs nothing.
 *
 * Sun position: the standard low-precision solar formulas (accurate to well
 * under a degree for 1950–2050), computed for Dubai.
 */

const LAT = 25.2048, LON = 55.2708, TZ = 4; // Dubai, UTC+4 all year
const rad = Math.PI / 180;

function sun(date: Date) {
  const d = date.getTime() / 86_400_000 - 10957.5; // days from J2000
  const g = ((357.529 + 0.98560028 * d) % 360) * rad;
  const q = (280.459 + 0.98564736 * d) % 360;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24) * 15 * rad;
  const ha = gmst + LON * rad - ra;
  const lat = LAT * rad;
  const elev = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(ha));
  return { elev: elev / rad, az: (az / rad + 360) % 360 };
}

const SEASONS = [
  { key: "summer", label: "Summer", day: [5, 21] as const, color: "var(--accent)" },
  { key: "spring", label: "Spring & autumn", day: [2, 20] as const, color: "var(--info)" },
  { key: "winter", label: "Winter", day: [11, 21] as const, color: "var(--accent-solid)" },
];

const DIRS = [
  { k: "N", deg: 0, name: "North", vastu: "Associated with Kubera, wealth. Traditionally considered a favourable entrance." },
  { k: "NE", deg: 45, name: "North-east", vastu: "Ishanya — traditionally the most auspicious direction for a main entrance." },
  { k: "E", deg: 90, name: "East", vastu: "The rising sun, new beginnings. Traditionally considered favourable." },
  { k: "SE", deg: 135, name: "South-east", vastu: "Agni, the fire corner — traditionally suggested for the kitchen rather than the entrance." },
  { k: "S", deg: 180, name: "South", vastu: "Traditionally regarded as less favourable for an entrance; remedies are often suggested." },
  { k: "SW", deg: 225, name: "South-west", vastu: "Nairutya — traditionally the least favoured direction for a main entrance." },
  { k: "W", deg: 270, name: "West", vastu: "Varuna — traditionally neutral to favourable, often preferred for businesses." },
  { k: "NW", deg: 315, name: "North-west", vastu: "Vayu, air and movement — traditionally considered neutral." },
];

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Minutes of direct sun on a wall facing `facing`, for one day, sampled every 5 minutes. */
function exposure(facing: number, month: number, day: number) {
  const year = new Date().getFullYear();
  let minutes = 0, first: number | null = null, last: number | null = null, peak = 0;
  const path: { az: number; elev: number }[] = [];
  for (let m = 0; m < 24 * 60; m += 5) {
    const t = new Date(Date.UTC(year, month, day, 0, m) - TZ * 3_600_000);
    const s = sun(t);
    if (s.elev > 0) {
      if (m % 30 === 0) path.push(s);
      const diff = Math.abs(((s.az - facing + 540) % 360) - 180);
      if (diff < 90) {
        minutes += 5;
        first ??= m;
        last = m;
        peak = Math.max(peak, s.elev);
      }
    }
  }
  const morning = first != null && first < 12 * 60;
  return { minutes, first, last, peak, path, when: first == null ? "none" : morning && (last ?? 0) <= 13 * 60 ? "morning" : !morning ? "afternoon" : "most of the day" };
}

export function DsVastu() {
  const [facing, setFacing] = useState(90);
  const dir = DIRS.reduce((a, b) => (Math.abs(((b.deg - facing + 540) % 360) - 180) < Math.abs(((a.deg - facing + 540) % 360) - 180) ? b : a));
  const seasons = useMemo(() => SEASONS.map((s) => ({ ...s, ...exposure(facing, s.day[0], s.day[1]) })), [facing]);

  const R = 110, C = 130;
  const pt = (az: number, elev: number) => {
    const r = R * (1 - Math.max(0, elev) / 90);
    return [C + r * Math.sin(az * rad), C - r * Math.cos(az * rad)] as const;
  };
  const summer = seasons[0];
  const heat = summer.when === "afternoon" || (summer.last ?? 0) > 15 * 60;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="p-5">
        <h3 className="text-[13.5px] font-bold">Which way does it face?</h3>
        <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">The direction the main windows or balcony look out to.</p>
        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {DIRS.map((d) => (
            <button key={d.k} onClick={() => setFacing(d.deg)} className={`h-10 rounded-lg border text-[13px] font-semibold ${dir.k === d.k ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-white" : "border-[var(--hairline-strong)] bg-white"}`}>{d.k}</button>
          ))}
        </div>
        <label className="mt-4 block text-[12px] font-semibold text-[var(--text-secondary)]">Exact bearing: <span className="figure">{facing}°</span>
          <input type="range" min={0} max={359} value={facing} onChange={(e) => setFacing(Number(e.target.value))} className="mt-2 w-full accent-[var(--accent-solid)]" />
        </label>

        <svg viewBox="0 0 260 260" className="mx-auto mt-4 block w-full max-w-[260px]" role="img" aria-label={`Sun paths over the year for a unit facing ${dir.name}`}>
          <circle cx={C} cy={C} r={R} fill="var(--surface-sunken)" stroke="rgb(15 23 42 / 0.15)" />
          <circle cx={C} cy={C} r={R * 2 / 3} fill="none" stroke="rgb(15 23 42 / 0.08)" />
          <circle cx={C} cy={C} r={R / 3} fill="none" stroke="rgb(15 23 42 / 0.08)" />
          {/* the half of the sky the wall looks into */}
          <path d={`M ${C} ${C} L ${pt(facing - 90, 0).join(" ")} A ${R} ${R} 0 0 1 ${pt(facing + 90, 0).join(" ")} Z`} fill="rgb(184 149 90 / 0.12)" />
          {seasons.map((s) => (
            <polyline key={s.key} fill="none" stroke={s.color} strokeWidth={2} points={s.path.map((p) => pt(p.az, p.elev).join(",")).join(" ")} />
          ))}
          <line x1={C} y1={C} x2={pt(facing, 30)[0]} y2={pt(facing, 30)[1]} stroke="var(--accent-solid)" strokeWidth={3} markerEnd="url(#arrow)" />
          <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent-solid)" /></marker></defs>
          {[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([k, a]) => {
            const [x, y] = pt(a as number, -12);
            return <text key={k as string} x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-secondary)">{k}</text>;
          })}
        </svg>
        <div className="mt-2 flex justify-center gap-3 text-[11px] text-[var(--text-secondary)]">
          {SEASONS.map((s) => <span key={s.key} className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <p className="text-[12px] font-medium text-[var(--violet)]">Facing {dir.name} · {facing}°</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight">
            {summer.minutes === 0 ? "No direct summer sun on this side" : `Direct sun ${summer.when === "most of the day" ? "most of the day" : `in the ${summer.when}`} in summer`}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {seasons.map((s) => (
              <div key={s.key} className="rounded-xl border border-[var(--hairline)] bg-[var(--surface-sunken)] p-4">
                <div className="text-[12px] font-semibold" style={{ color: s.color }}>{s.label}</div>
                <div className="figure mt-1 text-[20px] font-semibold">{s.minutes ? `${Math.floor(s.minutes / 60)} h ${s.minutes % 60} min` : "None"}</div>
                <div className="figure mt-1 text-[12px] text-[var(--text-muted)]">{s.first != null ? `${hhmm(s.first)} – ${hhmm(s.last!)}` : "of direct sun"}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {heat
              ? "This side takes the late-afternoon summer sun — the hottest part of a Dubai day. Expect warmer rooms and a higher cooling bill; good blinds and tinted glass matter here."
              : summer.minutes === 0
                ? "This side stays out of direct sun in summer — the coolest orientation in Dubai, with steady indirect light."
                : "This side gets its sun early, before the day's heat peaks — usually the more comfortable orientation in Dubai."}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-[12px] font-medium text-[var(--violet)]">Traditional Vastu reading</p>
          <p className="mt-2 text-[14px] leading-relaxed">{dir.vastu}</p>
          <p className="mt-3 text-[12px] text-[var(--text-muted)]">Vastu is a traditional belief system some buyers care about. Read it for the entrance direction, which may differ from the view.</p>
        </Card>
      </div>
    </div>
  );
}

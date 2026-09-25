/**
 * One room, drawn twice.
 *
 * The perspective shell — floor, ceiling, side walls, back wall, window
 * aperture — is identical geometry in both variants. Only the treatment
 * changes: palette, trim weight, glazing, lighting and furniture profile.
 * Sharing the geometry is what makes the comparison read as the SAME room
 * improved, rather than two unrelated pictures.
 *
 * Pure inline SVG: no photography, no external asset, themes with the page.
 */

type Variant = "before" | "after";

export type MaterialKey = "marble" | "oak" | "microcement" | "brass";

/* Shared perspective — a one-point box with the vanishing point at (400,250) */
const BACK = { x1: 210, y1: 130, x2: 590, y2: 372 };
const WIN = { x1: 318, y1: 168, x2: 482, y2: 300 };

/**
 * The four specified palettes. Only the AFTER room responds to these — the
 * developer handover looks the same whatever you would have chosen, which
 * is exactly the point the comparison is making.
 */
export const MATERIALS: Record<
  MaterialKey,
  {
    ceiling: string;
    backWall: string;
    leftWall: string;
    rightWall: string;
    floor: string;
    floorFar: string;
    floorLine: string;
    furniture: string;
    furnitureSoft: string;
    metal: string;
    feature: string;
    /** Swatch shown on the selector chip */
    swatch: string;
  }
> = {
  marble: {
    ceiling: "#eceef2",
    backWall: "#e4e7ec",
    leftWall: "#dadee5",
    rightWall: "#d0d5de",
    floor: "#dfdcd6",
    floorFar: "#efedea",
    floorLine: "#c3bfb7",
    furniture: "#4d5563",
    furnitureSoft: "#6b7484",
    metal: "#c8a870",
    feature: "#cfd4dc",
    swatch: "#e8e6e2",
  },
  oak: {
    ceiling: "#e9e5dd",
    backWall: "#ded7cb",
    leftWall: "#d1c8b9",
    rightWall: "#c6bcab",
    floor: "#a67f4f",
    floorFar: "#bd9a68",
    floorLine: "#8d6a3f",
    furniture: "#5a4b3a",
    furnitureSoft: "#77654e",
    metal: "#c8a870",
    feature: "#8d6a3f",
    swatch: "#a67f4f",
  },
  microcement: {
    ceiling: "#dedcd8",
    backWall: "#d2d0cc",
    leftWall: "#c6c4c0",
    rightWall: "#bab8b4",
    floor: "#b0aeaa",
    floorFar: "#c6c4c0",
    floorLine: "#a09e9a",
    furniture: "#585754",
    furnitureSoft: "#767572",
    metal: "#c8a870",
    feature: "#c6c4c0",
    swatch: "#b0aeaa",
  },
  brass: {
    ceiling: "#e6e2da",
    backWall: "#d9d3c7",
    leftWall: "#cdc6b7",
    rightWall: "#c1b9a8",
    floor: "#8f8a7d",
    floorFar: "#a49a86",
    floorLine: "#7d7668",
    furniture: "#4a4740",
    furnitureSoft: "#67635a",
    metal: "#c8a870",
    feature: "#c8a870",
    swatch: "#c8a870",
  },
};

/** The handover state — deliberately fixed, and deliberately drab. */
const BEFORE = {
  ceiling: "#ddd6c6",
  backWall: "#d8cdb6",
  leftWall: "#cec2a8",
  rightWall: "#c3b69b",
  floor: "#9d8f78",
  floorFar: "#8b7d67",
  floorLine: "#8a7c66",
  furniture: "#7a6a52",
  furnitureSoft: "#8d7d64",
  metal: "#9a8a6a",
  feature: "#b9ad93",
  swatch: "#b3a688",
};

export function RoomScene({
  variant,
  idSuffix,
  material = "marble",
}: {
  variant: Variant;
  idSuffix: string;
  material?: MaterialKey;
}) {
  const after = variant === "after";
  const id = (name: string) => `${name}-${idSuffix}`;
  const palette = after ? MATERIALS[material] : BEFORE;
  const sky = after ? "#cfe0ee" : "#c9c8bd";

  return (
    <svg
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id("floor")} x1="400" y1="372" x2="400" y2="500" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={palette.floor} />
          <stop offset="1" stopColor={palette.floorFar} />
        </linearGradient>

        <linearGradient id={id("glass")} x1="400" y1={WIN.y1} x2="400" y2={WIN.y2} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={after ? "#e8f2fb" : "#d7d6cb"} />
          <stop offset="1" stopColor={sky} />
        </linearGradient>

        {/* The cove glow that separates a fit-out from a handover */}
        <radialGradient id={id("cove")} cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor="#ffdf9e" stopOpacity={after ? "0.5" : "0"} />
          <stop offset="1" stopColor="#ffdf9e" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={id("lamp")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe6ad" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffe6ad" stopOpacity="0" />
        </linearGradient>

        <clipPath id={id("win")}>
          <rect x={WIN.x1} y={WIN.y1} width={WIN.x2 - WIN.x1} height={WIN.y2 - WIN.y1} />
        </clipPath>
      </defs>

      {/* ---------- shell ---------- */}
      <polygon points={`0,0 800,0 ${BACK.x2},${BACK.y1} ${BACK.x1},${BACK.y1}`} fill={palette.ceiling} />
      <polygon points={`0,0 ${BACK.x1},${BACK.y1} ${BACK.x1},${BACK.y2} 0,500`} fill={palette.leftWall} />
      <polygon points={`800,0 ${BACK.x2},${BACK.y1} ${BACK.x2},${BACK.y2} 800,500`} fill={palette.rightWall} />
      <rect x={BACK.x1} y={BACK.y1} width={BACK.x2 - BACK.x1} height={BACK.y2 - BACK.y1} fill={palette.backWall} />
      <polygon points={`0,500 ${BACK.x1},${BACK.y2} ${BACK.x2},${BACK.y2} 800,500`} fill={`url(#${id("floor")})`} />

      {/* ---------- floor treatment ---------- */}
      {after ? (
        // Wide plank, laid to the vanishing point
        <g stroke={palette.floorLine} strokeWidth="1" opacity="0.5">
          {[0.18, 0.38, 0.62, 0.82].map((t) => (
            <line
              key={t}
              x1={t * 800}
              y1={500}
              x2={BACK.x1 + t * (BACK.x2 - BACK.x1)}
              y2={BACK.y2}
            />
          ))}
        </g>
      ) : (
        // Small-format tile with a visible grout grid
        <g stroke={palette.floorLine} strokeWidth="1" opacity="0.6">
          {[0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94].map((t) => (
            <line
              key={t}
              x1={t * 800}
              y1={500}
              x2={BACK.x1 + t * (BACK.x2 - BACK.x1)}
              y2={BACK.y2}
            />
          ))}
          {[0.3, 0.58, 0.8].map((t) => {
            const y = BACK.y2 + t * (500 - BACK.y2);
            const inset = (1 - t) * BACK.x1;
            return <line key={t} x1={inset} y1={y} x2={800 - inset} y2={y} />;
          })}
        </g>
      )}

      {/* ---------- glazing ----------
          Same aperture; the fit-out takes it floor-to-ceiling and drops the
          heavy divided frame. */}
      {after ? (
        <>
          <rect
            x={WIN.x1 - 34}
            y={BACK.y1 + 12}
            width={WIN.x2 - WIN.x1 + 68}
            height={BACK.y2 - BACK.y1 - 24}
            fill={`url(#${id("glass")})`}
          />
          <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" fill="none">
            <rect
              x={WIN.x1 - 34}
              y={BACK.y1 + 12}
              width={WIN.x2 - WIN.x1 + 68}
              height={BACK.y2 - BACK.y1 - 24}
            />
            <line x1={400} y1={BACK.y1 + 12} x2={400} y2={BACK.y2 - 12} />
          </g>
          {/* distant skyline through the glass */}
          <g clipPath={`url(#${id("win")})`} opacity="0.30" fill="#7d92aa">
            <rect x="330" y="228" width="18" height="72" />
            <rect x="356" y="206" width="14" height="94" />
            <rect x="378" y="240" width="20" height="60" />
            <polygon points="410,300 418,196 426,300" />
            <rect x="436" y="222" width="16" height="78" />
            <rect x="458" y="248" width="18" height="52" />
          </g>
        </>
      ) : (
        <>
          <rect
            x={WIN.x1}
            y={WIN.y1}
            width={WIN.x2 - WIN.x1}
            height={WIN.y2 - WIN.y1}
            fill={`url(#${id("glass")})`}
          />
          {/* Chunky divided frame — the giveaway of a standard handover */}
          <g stroke="#b9ad93" strokeWidth="7" fill="none">
            <rect x={WIN.x1} y={WIN.y1} width={WIN.x2 - WIN.x1} height={WIN.y2 - WIN.y1} />
            <line x1={400} y1={WIN.y1} x2={400} y2={WIN.y2} />
            <line x1={WIN.x1} y1={234} x2={WIN.x2} y2={234} />
          </g>
        </>
      )}

      {/* ---------- ceiling / cornice ---------- */}
      {after ? (
        <>
          <rect x={BACK.x1} y={BACK.y1} width={BACK.x2 - BACK.x1} height="46" fill={`url(#${id("cove")})`} />
          <line x1={BACK.x1} y1={BACK.y1 + 3} x2={BACK.x2} y2={BACK.y1 + 3} stroke="#ffe6ad" strokeWidth="2" opacity="0.7" />
        </>
      ) : (
        // Deep stepped cornice, the dated tell
        <g fill="#cec2a8" stroke="#b9ad93" strokeWidth="1">
          <rect x={BACK.x1} y={BACK.y1} width={BACK.x2 - BACK.x1} height="14" />
          <rect x={BACK.x1} y={BACK.y1 + 14} width={BACK.x2 - BACK.x1} height="7" />
        </g>
      )}

      {/* ---------- lighting ---------- */}
      {after ? (
        <g>
          {[300, 400, 500].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy={BACK.y1 - 4} r="4" fill="#ffe6ad" opacity="0.9" />
              <polygon
                points={`${cx - 26},${BACK.y2} ${cx + 26},${BACK.y2} ${cx + 9},${BACK.y1} ${cx - 9},${BACK.y1}`}
                fill={`url(#${id("lamp")})`}
              />
            </g>
          ))}
        </g>
      ) : (
        <g>
          <line x1="400" y1="60" x2="400" y2="96" stroke="#9d8f78" strokeWidth="2" />
          <ellipse cx="400" cy="104" rx="30" ry="11" fill="#c9bda3" />
        </g>
      )}

      {/* ---------- furniture ----------
          Same footprint in both; the profile is what changes. */}
      {after ? (
        <g>
          {/* low, long sofa */}
          <rect x="262" y="380" width="276" height="30" rx="5" fill={palette.furniture} />
          <rect x="262" y="360" width="276" height="24" rx="8" fill={palette.furnitureSoft} />
          <rect x="274" y="352" width="72" height="16" rx="7" fill={palette.furnitureSoft} />
          <rect x="454" y="352" width="72" height="16" rx="7" fill={palette.furnitureSoft} />
          {/* slim rug + stone table */}
          <ellipse cx="400" cy="452" rx="196" ry="34" fill={palette.floorLine} opacity="0.4" />
          <rect x="344" y="424" width="112" height="13" rx="3" fill={palette.furniture} />
          <rect x="374" y="437" width="52" height="9" fill={palette.metal} />
        </g>
      ) : (
        <g>
          {/* bulky three-seater with skirt and arms */}
          <rect x="262" y="372" width="276" height="46" rx="4" fill={palette.furniture} />
          <rect x="262" y="348" width="276" height="30" rx="4" fill={palette.furnitureSoft} />
          <rect x="252" y="344" width="30" height="74" rx="6" fill={palette.furniture} />
          <rect x="518" y="344" width="30" height="74" rx="6" fill={palette.furniture} />
          <rect x="266" y="418" width="268" height="10" fill="#6a5c46" />
          {/* patterned rug + heavy table */}
          <ellipse cx="400" cy="456" rx="176" ry="30" fill="#a8987c" opacity="0.7" />
          <ellipse cx="400" cy="456" rx="128" ry="20" fill="none" stroke="#8a7c66" strokeWidth="3" />
          <rect x="348" y="428" width="104" height="15" rx="2" fill="#6a5c46" />
          <rect x="360" y="443" width="10" height="16" fill="#6a5c46" />
          <rect x="430" y="443" width="10" height="16" fill="#6a5c46" />
        </g>
      )}

      {/* ---------- wall styling ---------- */}
      {after ? (
        <g>
          {/* full-height slatted feature panel */}
          <g stroke={palette.feature} strokeWidth="3" opacity="0.85">
            {[228, 240, 252, 264].map((x) => (
              <line key={x} x1={x} y1={BACK.y1 + 18} x2={x} y2={BACK.y2 - 6} />
            ))}
          </g>
          <rect x="540" y="200" width="34" height="120" rx="3" fill={palette.metal} opacity="0.55" />
        </g>
      ) : (
        <g>
          {/* small framed picture, dado rail */}
          <rect x="228" y="212" width="46" height="36" fill="none" stroke="#a89a80" strokeWidth="4" />
          <line
            x1={BACK.x1}
            y1={318}
            x2={BACK.x2}
            y2={318}
            stroke="#b9ad93"
            strokeWidth="4"
          />
        </g>
      )}

      {/* Skirting exists in both — a real room detail, weighted differently */}
      <rect
        x={BACK.x1}
        y={BACK.y2 - (after ? 7 : 13)}
        width={BACK.x2 - BACK.x1}
        height={after ? 7 : 13}
        fill={after ? palette.feature : BEFORE.swatch}
      />
    </svg>
  );
}

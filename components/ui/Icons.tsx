/**
 * Line-art icon set, drawn to a shared 24×24 grid at 1.4 stroke so the whole
 * system reads as one hand. Inline SVG — no icon library, no font, no request.
 */

type IconProps = { className?: string; size?: number };

function Svg({ children, className = "", size = 24 }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 20h18" />
    <path d="M6 20V12" />
    <path d="M11 20V7" />
    <path d="M16 20v-6" />
    <path d="M21 20V4" />
  </Svg>
);

export const IconTruck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 16V6h11v10" />
    <path d="M13 9h4.2l2.8 3.4V16" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
    <path d="M9 18h6" />
  </Svg>
);

export const IconPlug = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3v5" />
    <path d="M15 3v5" />
    <path d="M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6Z" />
    <path d="M12 17v4" />
  </Svg>
);

export const IconKey = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7.5" cy="16.5" r="3.5" />
    <path d="M10 14 20 4" />
    <path d="M17 7l2.5 2.5" />
    <path d="M14.5 9.5 17 12" />
  </Svg>
);

export const IconPalette = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-.9 2-1.9 0-1.3-1.2-1.7-1.2-2.9 0-.8.7-1.4 1.6-1.4H16a5 5 0 0 0 5-5c0-3.7-4-6.8-9-6.8Z" />
    <circle cx="8" cy="10" r="1" />
    <circle cx="12" cy="7.5" r="1" />
    <circle cx="16" cy="10" r="1" />
  </Svg>
);

export const IconTools = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 5.5a3.5 3.5 0 0 0 4.6 4.6L21 12l-9 9-3-3 9-9-1.9-1.9a3.5 3.5 0 0 0-4.6-4.6L14.5 5.5Z" />
    <path d="m4 20 3-3" />
    <path d="M6.5 4.5 9 7 7 9 4.5 6.5 3 8V4h4Z" />
  </Svg>
);

export const IconCrane = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 21V4l8 4" />
    <path d="M4 8h16" />
    <path d="M16 8v4" />
    <path d="M13 12h6v5h-6z" />
    <path d="M4 21h8" />
  </Svg>
);

export const IconPool = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 17c1.6 0 1.6 1.4 3.2 1.4S6.8 17 8.4 17s1.6 1.4 3.2 1.4S13.2 17 14.8 17s1.6 1.4 3.2 1.4S19.6 17 21.2 17" />
    <path d="M2 21c1.6 0 1.6-1.2 3.2-1.2" />
    <path d="M7 15V5a2 2 0 0 1 4 0" />
    <path d="M14 15V5a2 2 0 0 1 4 0" />
    <path d="M7 9h4" />
  </Svg>
);

export const IconStamp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 21h14" />
    <path d="M6 18h12v-2a3 3 0 0 0-3-3h-1l.6-4.2A3 3 0 0 0 11.6 5h-.2a3 3 0 0 0-3 3.8L9 13H8a3 3 0 0 0-3 3v2Z" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5L19.5 7" />
  </Svg>
);

export const IconDash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 12h12" />
  </Svg>
);

export const IconArrow = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6 18 18" />
    <path d="M18 6 6 18" />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M3 12h18" />
    <path d="M3 18h18" />
  </Svg>
);

export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z" />
  </Svg>
);

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </Svg>
);

export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s7-3.5 7-9V5.5L12 3 5 5.5V12c0 5.5 7 9 7 9Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

/** WhatsApp glyph — brand shape, filled, no stroke. */
export const IconWhatsApp = ({ className = "", size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 5.83 2.42 8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.21.89 2.39 1.01 2.55.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z" />
  </svg>
);

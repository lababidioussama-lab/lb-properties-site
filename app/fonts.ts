import {
  Cormorant_Garamond,
  Montserrat,
  Manrope,
  Cinzel,
  Amiri,
  JetBrains_Mono,
  Noto_Sans,
  Noto_Sans_SC,
} from "next/font/google";

/* Downloaded at build time and self-hosted by next/font, so the rendered page
   makes no third-party request and there is no flash of unstyled text. */

export const cormorant = Cormorant_Garamond({
  // Cormorant carries Cyrillic, so Russian headings keep the same display
  // voice as English rather than falling back to a system serif.
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

/* The geometric sans set under the wordmark ("PROPERTIES") in the logo. */
export const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

/* Body and figures. Manrope's tabular lining numerals replace the old
   monospace, so prices read as print rather than as code. */
export const jakarta = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

/* Roman inscriptional capitals, the letterform of the LABABIDI wordmark. */
export const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cinzel",
  display: "swap",
});

/* Cormorant has no Arabic coverage; without an explicit Arabic face the
   display type would fall back per-glyph to whatever the OS happens to have.
   Amiri is a classical Naskh with the same high-contrast, unhurried feel
   Cormorant carries in Latin, so the two read as one typographic voice. */
export const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

/* Every financial figure on the site is set in this. Monospace is not a
   stylistic tic here: fixed-advance digits stop the numbers shifting while
   they spring between values, which is what makes the ROI panel read like a
   terminal rather than a marketing widget. */
export const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

/* Plus Jakarta Sans has no Cyrillic coverage, so Russian body copy would
   otherwise fall back per-glyph to whatever the OS supplies — which is how
   you end up with a headline in one typeface and its subtitle in another.
   preload is off: these only ever apply under their own [lang] rule, so
   preloading them would cost every English visitor a download they never
   render a glyph from. */
export const notoCyrillic = Noto_Sans({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cyrillic",
  display: "swap",
  preload: false,
});

/* Simplified Chinese has no coverage in any of the Latin faces above. */
export const notoSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sc",
  display: "swap",
  preload: false,
});

export const fontVariables = [
  cormorant.variable,
  montserrat.variable,
  jakarta.variable,
  cinzel.variable,
  amiri.variable,
  mono.variable,
  notoCyrillic.variable,
  notoSC.variable,
].join(" ");

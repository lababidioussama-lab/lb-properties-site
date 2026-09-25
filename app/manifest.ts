import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site-config";

/**
 * Web app manifest — what Android uses when the site is added to the home
 * screen. iOS ignores most of this and reads the <link rel="apple-touch-icon">
 * and apple-* meta tags in the layout head instead, so both are set.
 *
 * `display: standalone` opens it without browser chrome, which is what makes
 * an added-to-home-screen site feel like an app rather than a bookmark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.nameShort} — Dubai Property`,
    short_name: SITE.nameMark,
    description: SITE.tagline,
    start_url: "/",
    display: "standalone",
    // Matches the house default theme, so there is no white flash between the
    // splash screen and first paint.
    background_color: "#0a0708",
    theme_color: "#0a0708",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      /* Android crops icons to whatever shape the launcher uses. A "maskable"
         icon keeps its content inside a safe zone so the crop never clips the
         monogram; without one, Android letterboxes the icon in a white circle. */
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

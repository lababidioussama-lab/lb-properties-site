import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { fontVariables } from "../fonts";
import "../globals.css";

import { LOCALES, dirFor, type Locale } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n";
import { SiteProvider } from "@/lib/context/site-context";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileDock } from "@/components/layout/MobileDock";
import { LeadDrawer } from "@/components/ui/LeadDrawer";
import { SupportAgent } from "@/components/ui/SupportAgent";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * Phone chrome.
 *
 * `themeColor` paints the browser UI around the page — the notification bar
 * on Android Chrome, the surround in iOS Safari — so it must track the theme
 * rather than being one fixed colour. Both are declared and the OS picks;
 * without this the page sits in a white frame on a near-black design.
 *
 * `viewportFit: "cover"` lets the page extend under the notch and the home
 * indicator, which is what stops a launched-from-home-screen session showing
 * letterbox bars at top and bottom.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0708" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!(LOCALES as readonly string[]).includes(locale)) return {};
  const t = getDictionary(locale as Locale);

  return {
    title: t.meta.title,
    description: t.meta.description,

    /* Home-screen and tab icons. Android reads app/manifest.ts; iOS ignores
       the manifest's icons and uses apple-touch-icon, so both are declared. */
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    appleWebApp: {
      capable: true,
      title: "Lababidi Properties",
      // Matches the dark house theme, so the status bar does not sit as a
      // white band above a near-black page once it is launched from the
      // home screen.
      statusBarStyle: "black-translucent",
    },

    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      locale,
      type: "website",
    },
  };
}

/* Applies the theme before first paint, so nobody sees a flash of the wrong
   ground. The house default is dark regardless of the OS preference — light
   is a choice the visitor makes, not one their laptop makes for them — so
   this stamps 'dark' whenever there is no stored preference. It has to run
   as a blocking script in <head>: doing it in an effect would paint light
   first and then swap, which is the flash it exists to prevent. */
const THEME_BOOTSTRAP = `
(function(){
  var theme = 'dark';
  try {
    var saved = localStorage.getItem('dec:theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', theme);
})();
`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(LOCALES as readonly string[]).includes(locale)) notFound();

  const typed = locale as Locale;

  return (
    <html lang={typed} dir={dirFor(typed)} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <SiteProvider locale={typed}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:rounded-full focus:bg-[var(--surface-raised)] focus:px-5 focus:py-2.5 focus:text-sm focus:shadow-[var(--shadow-lift)]"
          >
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <MobileDock />
          <LeadDrawer />
          <SupportAgent />
        </SiteProvider>
      </body>
    </html>
  );
}

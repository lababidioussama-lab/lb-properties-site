"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDictionary, type Dictionary, type Locale, isRtl } from "@/lib/i18n";
import { CURRENCY_CODES, type CurrencyCode } from "@/lib/currency";
import type { ServiceKey } from "@/lib/site-config";
import type { LeadSelections } from "@/lib/lead";

type Theme = "dark" | "light";

interface SiteContextValue {
  locale: Locale;
  t: Dictionary;
  rtl: boolean;
  /** +1 for LTR, -1 for RTL — multiply any pointer delta by this. */
  dirSign: 1 | -1;

  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;

  theme: Theme;
  toggleTheme: () => void;

  /** The service the visitor last expressed interest in. Set by the hero
      tabs and every section CTA, read by the lead drawer. */
  activeService: ServiceKey;
  setActiveService: (s: ServiceKey) => void;

  /** Accumulated widget state, carried into whatever form opens next. */
  selections: LeadSelections;
  updateSelections: (patch: LeadSelections) => void;

  drawerOpen: boolean;
  openDrawer: (service?: ServiceKey, patch?: LeadSelections) => void;
  closeDrawer: () => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

const CURRENCY_KEY = "dec:currency";
const THEME_KEY = "dec:theme";

export function SiteProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("AED");
  // Matches THEME_BOOTSTRAP in the layout: light unless chosen otherwise.
  const [theme, setTheme] = useState<Theme>("light");
  const [activeService, setActiveService] = useState<ServiceKey>("advisory");
  const [selections, setSelections] = useState<LeadSelections>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Restore preferences after mount. Doing this in an effect rather than
  // during render keeps the server and first client paint identical, so
  // there is no hydration mismatch — the theme flash is handled instead by
  // the blocking script in the layout head.
  useEffect(() => {
    try {
      const savedCurrency = localStorage.getItem(CURRENCY_KEY) as CurrencyCode | null;
      if (savedCurrency && CURRENCY_CODES.includes(savedCurrency)) {
        setCurrencyState(savedCurrency);
      }
      const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
      if (savedTheme === "dark" || savedTheme === "light") {
        setTheme(savedTheme);
      } else {
        /* No stored choice means the house default, which the bootstrap
           script has already stamped on <html>. Reading the OS preference
           here instead would disagree with what is actually painted. */
        setTheme("light");
      }
    } catch {
      // Private browsing with storage disabled — defaults are fine.
    }
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(CURRENCY_KEY, c);
    } catch {
      /* non-fatal */
    }
  }, []);

  /* Keep the DOM attribute driven by state rather than written once at the
     moment of the click.
     Switching locale navigates to a different route layout, which re-renders
     <html>; an attribute that had only ever been set imperatively did not
     survive that render, so a visitor who had chosen dark was dropped back
     to the OS preference every time they changed language. Re-applying it
     from an effect means it is restored on any remount, using the value the
     mount effect has just read back out of localStorage. */
  useEffect(() => {
    // Safe to write on the first pass too: this state and THEME_BOOTSTRAP
    // share the same default, so the opening write only ever restates what
    // the blocking script already put there.
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* non-fatal */
      }
      return next;
    });
  }, []);

  const updateSelections = useCallback((patch: LeadSelections) => {
    setSelections((prev) => ({ ...prev, ...patch }));
  }, []);

  const openDrawer = useCallback((service?: ServiceKey, patch?: LeadSelections) => {
    if (service) setActiveService(service);
    if (patch) setSelections((prev) => ({ ...prev, ...patch }));
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Lock the page behind the drawer without letting the layout jump: the
  // scrollbar's width is replaced by padding as it is removed.
  useEffect(() => {
    if (!drawerOpen) return;
    const { body } = document;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingInlineEnd;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingInlineEnd = `${gap}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingInlineEnd = prevPad;
    };
  }, [drawerOpen]);

  const rtl = isRtl(locale);

  const value = useMemo<SiteContextValue>(
    () => ({
      locale,
      t: getDictionary(locale),
      rtl,
      dirSign: rtl ? -1 : 1,
      currency,
      setCurrency,
      theme,
      toggleTheme,
      activeService,
      setActiveService,
      selections,
      updateSelections,
      drawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [
      locale,
      rtl,
      currency,
      setCurrency,
      theme,
      toggleTheme,
      activeService,
      selections,
      updateSelections,
      drawerOpen,
      openDrawer,
      closeDrawer,
    ],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used inside <SiteProvider>");
  return ctx;
}

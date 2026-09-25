"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";

import { useSite } from "@/lib/context/site-context";
import { SECTION_IDS, NAV_KEYS, SITE, type ServiceKey } from "@/lib/site-config";
import { BrandLockup } from "@/components/ui/BrandMark";
import { Menu, X, Sun, Moon } from "lucide-react";
import { IconWhatsApp } from "@/components/ui/Icons";
import { CurrencyToggle } from "./CurrencyToggle";
import { LanguageSelector } from "./LanguageSelector";

export function Header() {
  const { t, locale, theme, toggleTheme } = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => setScrolled(latest > 40));

  // Close the mobile sheet on Escape, matching the drawer's behaviour.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navItems = NAV_KEYS.map((service) => ({
    service,
    href: `/${locale}#${SECTION_IDS[service]}`,
    label: t.nav[service],
    /* The bar uses short labels; the full name still appears in the hover
       flyout and the mobile sheet, where there is room for it. */
    short: t.nav[`${service}Short` as keyof typeof t.nav] as string,
    desc: t.nav[`${service}Desc` as keyof typeof t.nav] as string,
  }));

  return (
    <>
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 transition-all duration-500 [transition-timing-function:var(--ease-lux)]",
          scrolled
            ? "border-b border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md"
            : "border-b border-transparent bg-transparent",
        ].join(" ")}
      >
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-6 px-5 sm:px-8">
          <Link href={`/${locale}`} aria-label={SITE.name} className="shrink-0">
            <BrandLockup idSuffix="hdr" />
          </Link>

          {/* Desktop navigation with description flyouts */}
          <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-0.5 xl:flex">
            {navItems.map((item) => (
              <a
                key={item.service}
                href={item.href}
                className="group relative whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-medium text-[var(--text-secondary)] transition-colors duration-300 hover:text-[var(--text-primary)]"
              >
                {item.short}
                <span className="pointer-events-none absolute inset-x-3.5 bottom-1 h-px origin-center scale-x-0 bg-[var(--accent)] transition-transform duration-400 [transition-timing-function:var(--ease-lux)] group-hover:scale-x-100" />
                <span className="pointer-events-none absolute start-1/2 top-[calc(100%+10px)] w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-3.5 py-2 text-[11px] leading-snug text-[var(--text-muted)] opacity-0 shadow-[var(--shadow-card)] backdrop-blur-xl transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 rtl:translate-x-1/2">
                  <span className="mb-1 block font-semibold text-[var(--text-primary)]">{item.label}</span>
                  {item.desc}
                </span>
              </a>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2.5 xl:ms-0">
            <div className="hidden items-center gap-2.5 2xl:flex">
              <CurrencyToggle />
              <LanguageSelector />
              <button
                onClick={toggleTheme}
                aria-label={theme === "dark" ? t.utility.themeToLight : t.utility.themeToDark}
                className="grid h-9 w-9 place-items-center rounded-full border border-[var(--hairline)] text-[var(--text-secondary)] transition-colors duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {theme === "dark" ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
              </button>
            </div>

            <ConciergeCta />

            <button
              onClick={() => setMenuOpen(true)}
              aria-label={t.nav.openMenu}
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--hairline)] text-[var(--text-primary)] xl:hidden"
            >
              <Menu size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <MobileSheet items={navItems} onClose={() => setMenuOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function ConciergeCta() {
  const { t } = useSite();
  return (
    <a
      href={SITE.waLink(`Hello — I would like to speak to an advisor about a Dubai property.`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.utility.concierge}
      className="group inline-flex h-10 items-center gap-2.5 rounded-full cta-fill px-4 shadow-[var(--shadow-card)] transition-all duration-300 sm:px-5"
    >
      {/* Live dot: a static core with an expanding ring behind it. */}
      <span className="relative grid h-2 w-2 place-items-center">
        <span className="absolute h-2 w-2 rounded-full bg-white/90 pulse-ring" />
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
      <span className="hidden font-[family-name:var(--font-eyebrow)] text-[10.5px] font-semibold uppercase tracking-[0.16em] sm:inline">
        {t.utility.concierge}
      </span>
      <IconWhatsApp size={16} className="sm:hidden" />
    </a>
  );
}

function MobileSheet({
  items,
  onClose,
}: {
  items: { service: ServiceKey; href: string; label: string; desc: string }[];
  onClose: () => void;
}) {
  const { t, theme, toggleTheme } = useSite();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-[var(--surface)]/96 pb-10 backdrop-blur-2xl xl:hidden"
    >
      <div className="flex h-[72px] items-center justify-between px-5 sm:px-8">
        <BrandLockup idSuffix="sheet" />
        <button
          onClick={onClose}
          aria-label={t.nav.closeMenu}
          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--hairline)] text-[var(--text-primary)]"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      <nav className="flex flex-col px-5 pt-4 sm:px-8">
        {items.map((item, i) => (
          <motion.a
            key={item.service}
            href={item.href}
            onClick={onClose}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05, duration: 0.4 }}
            className="border-b border-[var(--hairline)] py-5"
          >
            <span className="display-3 block text-[var(--text-primary)]">{item.label}</span>
            <span className="mt-1.5 block text-[12px] text-[var(--text-muted)]">{item.desc}</span>
          </motion.a>
        ))}
      </nav>

      <div className="mt-8 flex flex-wrap items-center gap-3 px-5 sm:px-8">
        <CurrencyToggle />
        <LanguageSelector />
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? t.utility.themeToLight : t.utility.themeToDark}
          className="grid h-9 w-9 place-items-center rounded-full border border-[var(--hairline)] text-[var(--text-secondary)]"
        >
          {theme === "dark" ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
        </button>
      </div>
    </motion.div>
  );
}

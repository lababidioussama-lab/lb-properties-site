"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";

import { useSite } from "@/lib/context/site-context";
import { SITE, pageHref, type PageKey } from "@/lib/site-config";
import { BrandLockup } from "@/components/ui/BrandMark";
import { Menu, X, Sun, Moon } from "lucide-react";
import { IconWhatsApp } from "@/components/ui/Icons";
import { CurrencyToggle } from "./CurrencyToggle";
import { LanguageSelector } from "./LanguageSelector";

const PAGES: { key: PageKey; label: "projects" | "investors" | "services"; desc: "projectsDesc" | "investorsDesc" | "servicesDesc" }[] = [
  { key: "projects", label: "projects", desc: "projectsDesc" },
  { key: "invest", label: "investors", desc: "investorsDesc" },
  { key: "services", label: "services", desc: "servicesDesc" },
];

/** Every public page opens on full-bleed photography, so the bar starts
    transparent with a white lockup and turns to limestone once scrolled. */
export function Header() {
  const { t, locale, theme, toggleTheme, openDrawer } = useSite();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => setScrolled(latest > 40));

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const onPhoto = !scrolled;
  const items = PAGES.map((p) => {
    const href = pageHref(locale, p.key);
    return { ...p, href, text: t.nav[p.label], sub: t.nav[p.desc], active: pathname === href };
  });

  const linkTone = onPhoto ? "text-white/85 hover:text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]";
  const iconBtn = onPhoto
    ? "border-white/35 text-white hover:border-white"
    : "border-[var(--hairline)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]";

  return (
    <>
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 transition-all duration-500 [transition-timing-function:var(--ease-lux)]",
          scrolled
            ? "border-b border-[var(--glass-border)] bg-[var(--glass-bg-strong)] shadow-[0_8px_30px_-24px_rgb(11_26_43/0.5)] backdrop-blur-md"
            : "border-b border-white/10 bg-gradient-to-b from-[rgb(7_26_46/0.45)] to-transparent",
        ].join(" ")}
      >
        <div className={`mx-auto flex max-w-[1440px] items-center gap-6 px-5 transition-all duration-500 sm:px-8 ${scrolled ? "h-[72px]" : "h-[88px]"}`}>
          <Link href={`/${locale}`} aria-label={SITE.name} className="shrink-0">
            <BrandLockup tone={onPhoto ? "light" : "auto"} />
          </Link>

          <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-2 lg:flex">
            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={`group relative px-4 py-2 font-[family-name:var(--font-eyebrow)] text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors duration-300 rtl:tracking-normal rtl:text-[13px] ${linkTone}`}
              >
                {item.text}
                <span
                  className={`pointer-events-none absolute inset-x-4 -bottom-0.5 h-px origin-center transition-transform duration-500 [transition-timing-function:var(--ease-lux)] ${
                    onPhoto ? "bg-white" : "bg-[var(--accent)]"
                  } ${item.active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
                />
              </Link>
            ))}
            <button
              onClick={() => openDrawer()}
              className={`px-4 py-2 font-[family-name:var(--font-eyebrow)] text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors duration-300 rtl:tracking-normal rtl:text-[13px] ${linkTone}`}
            >
              {t.nav.contact}
            </button>
          </nav>

          <div className="ms-auto flex items-center gap-2.5 lg:ms-0">
            <div className={`hidden items-center gap-2.5 xl:flex ${onPhoto ? "[&_button]:!text-white/90" : ""}`}>
              <CurrencyToggle />
              <LanguageSelector />
            </div>
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t.utility.themeToLight : t.utility.themeToDark}
              className={`hidden h-9 w-9 place-items-center rounded-full border transition-colors duration-300 sm:grid ${iconBtn}`}
            >
              {theme === "dark" ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
            </button>

            <a
              href={SITE.waLink(`Hello — I would like to speak to an advisor about a Dubai property.`)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.utility.concierge}
              className="btn btn-wa !min-h-10 !px-4"
            >
              <IconWhatsApp size={15} />
              <span className="hidden sm:inline">{t.utility.conciergeShort}</span>
            </a>

            <button
              onClick={() => setMenuOpen(true)}
              aria-label={t.nav.openMenu}
              className={`grid h-10 w-10 place-items-center rounded-full border lg:hidden ${iconBtn}`}
            >
              <Menu size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && <MobileSheet items={items} onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function MobileSheet({
  items,
  onClose,
}: {
  items: { key: PageKey; href: string; text: string; sub: string }[];
  onClose: () => void;
}) {
  const { t, locale, theme, toggleTheme, openDrawer } = useSite();
  const links = [{ key: "home", href: `/${locale}`, text: t.nav.home, sub: "" }, ...items];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-[var(--surface)] pb-10 lg:hidden"
    >
      <div className="flex h-[72px] items-center justify-between px-5 sm:px-8">
        <BrandLockup />
        <button
          onClick={onClose}
          aria-label={t.nav.closeMenu}
          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--hairline)] text-[var(--text-primary)]"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      <nav className="flex flex-col px-5 pt-6 sm:px-8">
        {links.map((item, i) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 + i * 0.05, duration: 0.4 }}
            className="border-b border-[var(--hairline)]"
          >
            <Link href={item.href} onClick={onClose} className="block py-5">
              <span className="block font-[family-name:var(--font-display)] text-[32px] leading-none text-[var(--text-primary)]">{item.text}</span>
              {item.sub && <span className="mt-2 block text-[13px] text-[var(--text-muted)]">{item.sub}</span>}
            </Link>
          </motion.div>
        ))}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          onClick={() => {
            onClose();
            openDrawer();
          }}
          className="border-b border-[var(--hairline)] py-5 text-start"
        >
          <span className="block font-[family-name:var(--font-display)] text-[32px] leading-none text-[var(--text-primary)]">{t.nav.contact}</span>
          <span className="mt-2 block text-[13px] text-[var(--text-muted)]">{t.nav.contactDesc}</span>
        </motion.button>
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

"use client";

import Link from "next/link";
import { useSite } from "@/lib/context/site-context";
import { SERVICE_KEYS, SITE, pageHref, serviceHref } from "@/lib/site-config";
import { Phone, MapPin } from "lucide-react";
import { IconWhatsApp } from "@/components/ui/Icons";
import { BrandLockup } from "@/components/ui/BrandMark";
import { RATES_AS_OF } from "@/lib/currency";

export function Footer() {
  const { t, locale, currency } = useSite();
  const year = new Date().getFullYear();

  const pages = [
    { href: `/${locale}`, label: t.nav.home },
    { href: pageHref(locale, "projects"), label: t.nav.projects },
    { href: pageHref(locale, "invest"), label: t.nav.investors },
    { href: pageHref(locale, "services"), label: t.nav.services },
  ];

  return (
    <footer className="relative bg-[#07192b] text-[#c9d1dc]">
      <span className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#4a6788_20%,#9fb2c8_50%,#4a6788_80%,transparent)]" />

      <div className="mx-auto max-w-[1320px] px-5 pb-10 pt-20 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_0.8fr_1fr_1fr]">
          <div>
            <BrandLockup tone="light" size="lg" />
            <p className="mt-8 max-w-[40ch] text-[14.5px] leading-[1.85] text-[#aab4c2]">{t.footer.blurb}</p>
          </div>

          <nav>
            <h3 className="kicker !text-[#9fb2c8]">{t.nav.menu}</h3>
            <ul className="mt-6 space-y-3.5">
              {pages.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="text-[14px] text-[#dfe4ea] transition-colors duration-300 hover:text-white">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav>
            <h3 className="kicker !text-[#9fb2c8]">{t.footer.services}</h3>
            <ul className="mt-6 space-y-3.5">
              {SERVICE_KEYS.map((service) => (
                <li key={service}>
                  <Link href={serviceHref(locale, service)} className="text-[14px] text-[#dfe4ea] transition-colors duration-300 hover:text-white">
                    {t.nav[service]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="kicker !text-[#9fb2c8]">{t.footer.contact}</h3>
            <ul className="mt-6 space-y-4 text-[14px]">
              <li>
                <a href={SITE.waLink("Hello — I would like to speak to an advisor.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-[#dfe4ea] hover:text-white">
                  <IconWhatsApp size={16} />
                  <span className="figure" dir="ltr">{SITE.phoneDisplay}</span>
                </a>
              </li>
              <li>
                <a href={`tel:${SITE.phoneHref}`} className="inline-flex items-center gap-3 text-[#dfe4ea] hover:text-white">
                  <Phone size={16} strokeWidth={1.5} />
                  <span className="figure" dir="ltr">{SITE.phoneDisplay}</span>
                </a>
              </li>
              <li className="flex gap-3 text-[#aab4c2]">
                <MapPin size={16} strokeWidth={1.5} className="mt-1 shrink-0" />
                <span dir="ltr" className="leading-[1.7]">{t.footer.address}</span>
              </li>
              <li className="text-[14px] text-[#8793a3]">{t.footer.hours}</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-white/10 pt-8">
          <h4 className="kicker !text-[#9fb2c8]">{t.footer.disclaimerTitle}</h4>
          <p className="mt-3 max-w-[100ch] text-[13px] leading-[1.8] text-[#8793a3]">{t.footer.disclaimer}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 text-[12.5px] text-[#8793a3] sm:flex-row sm:items-center sm:justify-between">
          <span dir="ltr">{t.footer.legalName} · DET License No. {SITE.licenseNo}</span>
          <span>
            © {year} {SITE.name}. {t.footer.rights}
            {currency !== "AED" && <span className="figure"> · {t.common.ratesNote} · {RATES_AS_OF}</span>}
          </span>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useSite } from "@/lib/context/site-context";
import { SECTION_IDS, SERVICE_KEYS, SITE } from "@/lib/site-config";
import { BrandMark } from "@/components/ui/BrandMark";
import { Phone } from "lucide-react";
import { IconWhatsApp } from "@/components/ui/Icons";
import { RATES_AS_OF } from "@/lib/currency";

export function Footer() {
  const { t, locale, currency } = useSite();
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-32 border-t border-[var(--hairline)] bg-[var(--surface-sunken)]">
      {/* Clay hairline across the seam — the same signature as the rules */}
      <span className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent-dim)_20%,var(--accent)_50%,var(--accent-dim)_80%,transparent)]" />

      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3.5 text-[var(--accent)]">
              <BrandMark idSuffix="ftr" size={40} />
              <span className="flex flex-col leading-none">
                <span className="font-[family-name:var(--font-display)] text-[24px] tracking-[0.24em] text-[var(--text-primary)]">
                  {SITE.nameMark.toUpperCase()}
                </span>
                <span className="mt-2 font-[family-name:var(--font-eyebrow)] text-[8.5px] font-medium uppercase tracking-[0.34em] text-[var(--text-muted)]">
                  {SITE.nameSuffix}
                </span>
              </span>
            </div>
            <p className="mt-7 max-w-[46ch] text-[13.5px] leading-[1.85] text-[var(--text-secondary)]">
              {t.footer.blurb}
            </p>
            <address className="mt-6 max-w-[46ch] not-italic text-[12.5px] leading-[1.8] text-[var(--text-muted)]" dir="ltr">
              <span className="block font-medium text-[var(--text-secondary)]">{t.footer.legalName}</span>
              <span className="block">{t.footer.address}</span>
              <span className="figure block">DET License No. {SITE.licenseNo}</span>
            </address>
          </div>

          <nav>
            <h3 className="eyebrow">{t.footer.services}</h3>
            <ul className="mt-6 space-y-3.5">
              {SERVICE_KEYS.map((service) => (
                <li key={service}>
                  <a
                    href={`/${locale}#${SECTION_IDS[service]}`}
                    className="text-[13.5px] text-[var(--text-secondary)] transition-colors duration-300 hover:text-[var(--accent)]"
                  >
                    {t.nav[service]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="eyebrow">{t.footer.contact}</h3>
            <ul className="mt-6 space-y-3.5">
              <li>
                <a
                  href={SITE.waLink("Hello — I would like to speak to an advisor.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-[13.5px] text-[var(--text-secondary)] transition-colors duration-300 hover:text-[var(--accent)]"
                >
                  <IconWhatsApp size={15} />
                  <span className="figure" dir="ltr">
                    {SITE.phoneDisplay}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${SITE.phoneHref}`}
                  className="inline-flex items-center gap-2.5 text-[13.5px] text-[var(--text-secondary)] transition-colors duration-300 hover:text-[var(--accent)]"
                >
                  <Phone size={15} strokeWidth={1.5} />
                  <span className="figure" dir="ltr">
                    {SITE.phoneDisplay}
                  </span>
                </a>
              </li>
              <li className="pt-1 text-[13px] text-[var(--text-muted)]">{t.footer.hours}</li>
            </ul>
          </div>
        </div>

        {/* The disclaimer is real, not decorative — it is the same claim the
            calculator makes, restated where it is permanently visible. */}
        <div className="mt-16 rounded-xl border border-[var(--hairline)] bg-[var(--glass-bg)] p-6">
          <h4 className="eyebrow">{t.footer.disclaimerTitle}</h4>
          <p className="mt-3 max-w-[92ch] text-[12px] leading-[1.8] text-[var(--text-muted)]">
            {t.footer.disclaimer}
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--hairline)] pt-8 text-[11.5px] text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {year} {SITE.name}. {t.footer.rights}
            <span className="figure"> · DET License No. {SITE.licenseNo}</span>
          </span>
          {currency !== "AED" && (
            <span className="figure">
              {t.common.ratesNote} · {RATES_AS_OF}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}

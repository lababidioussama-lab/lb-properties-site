"use client";

import Image from "next/image";
import { KeyRound } from "lucide-react";

import { useSite } from "@/lib/context/site-context";
import { SECTION_IDS, SITE } from "@/lib/site-config";
import { CurtainImage, DrawLine, Reveal, SplitWords } from "@/components/motion";
import { IconWhatsApp } from "@/components/ui/Icons";

/**
 * Attended key handover and snagging for owners who are not in Dubai.
 *
 * Deliberately carries no price: the fee depends on the unit and the
 * developer's handover process, and it is quoted once we know both.
 */
export function KeyHandover() {
  const { t, openDrawer } = useSite();
  const c = t.relocation;

  return (
    <section
      id={SECTION_IDS.relocation}
      className="relative scroll-mt-24 overflow-hidden border-t border-[var(--hairline)] bg-[var(--surface-sunken)] py-24 sm:py-32"
    >
      <div className="mx-auto grid max-w-[1320px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div className="relative">
          <CurtainImage className="aspect-[4/5] shadow-[var(--shadow-lift)] sm:aspect-[5/6]">
            <Image
              src="/projects/palace-beach-residence-4.jpg"
              alt=""
              fill
              sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover"
            />
          </CurtainImage>
          <Reveal delay={0.5} className="absolute -bottom-6 end-5 sm:end-8">
            <div className="flex items-center gap-3 bg-[#0b2a4a] px-5 py-4 text-white shadow-[var(--shadow-lift)]">
              <KeyRound size={20} strokeWidth={1.5} className="text-[#d4b87f]" />
              <span className="font-[family-name:var(--font-eyebrow)] text-[10px] font-semibold uppercase tracking-[0.2em] rtl:tracking-normal rtl:text-[12px]">
                {c.tag}
              </span>
            </div>
          </Reveal>
        </div>

        <div>
          <Reveal>
            <p className="kicker flex items-center gap-3">
              <span className="h-px w-10 bg-[var(--metal)]/70" />
              {c.eyebrow}
            </p>
          </Reveal>
          <h2 className="display-2 mt-5 max-w-[18ch] text-[var(--text-primary)]">
            <SplitWords text={c.title} inView />
          </h2>
          <Reveal delay={0.15}>
            <p className="mt-7 max-w-[54ch] text-[16px] leading-[1.85] text-[var(--text-secondary)]">
              {c.subtitle}
            </p>
          </Reveal>

          <ol className="mt-10">
            {c.items.map((item, i) => (
              <li key={item}>
                <DrawLine className="block h-px bg-[var(--hairline-strong)]" delay={0.1 * i} />
                <Reveal delay={0.12 + 0.1 * i} y={12}>
                  <div className="flex items-baseline gap-5 py-4">
                    <span className="figure w-6 shrink-0 text-[12px] text-[var(--metal)]">0{i + 1}</span>
                    <span className="text-[15px] leading-relaxed text-[var(--text-primary)]">{item}</span>
                  </div>
                </Reveal>
              </li>
            ))}
            <DrawLine className="block h-px bg-[var(--hairline-strong)]" delay={0.4} />
          </ol>

          <Reveal delay={0.3} className="mt-10 flex flex-wrap gap-3">
            <button onClick={() => openDrawer("relocation")} className="btn btn-navy">
              {c.cta}
            </button>
            <a
              href={SITE.waLink(`Hello — I would like to book a handover inspection.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-line"
            >
              <IconWhatsApp size={15} />
              {t.utility.conciergeShort}
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

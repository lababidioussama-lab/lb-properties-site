"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, MapPin, Phone, Calculator, TrendingUp, Landmark, BarChart3, ShieldCheck, Globe2, KeyRound } from "lucide-react";
import { useSite } from "@/lib/context/site-context";
import { emphasize } from "@/lib/i18n/emphasis";
import { interpolate } from "@/lib/i18n";
import { SITE, MARKET_SECTION_ID, SECTION_IDS, pageHref, serviceHref } from "@/lib/site-config";
import { PROJECTS } from "@/lib/projects";
import { localizeProject } from "@/lib/i18n/project-copy";
import { IconWhatsApp } from "@/components/ui/Icons";

const EASE = [0.2, 0.8, 0.2, 1] as const;

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function Heading({ kicker, title, light = false, center = false }: { kicker: string; title: string; light?: boolean; center?: boolean }) {
  return (
    <Reveal className={center ? "text-center" : ""}>
      <p className={`kicker flex items-center gap-3 ${center ? "justify-center" : ""} ${light ? "!text-[#d4b87f]" : ""}`}>
        <span className={`h-px w-10 ${light ? "bg-[#c8a96e]/80" : "bg-[var(--metal)]/70"}`} />
        {kicker}
      </p>
      <h2 className={`display-2 mt-5 ${center ? "mx-auto" : ""} max-w-[20ch] ${light ? "text-white [&_em]:!text-[#d4b87f]" : "text-[var(--text-primary)]"}`}>
        {emphasize(title)}
      </h2>
    </Reveal>
  );
}

/* ---------------------------------------------------------------- intro */

export function BrandIntro() {
  const { t } = useSite();
  const c = t.home.intro;
  const pillars = [
    { icon: ShieldCheck, title: c.pillars.honest, desc: c.pillars.honestDesc },
    { icon: Globe2, title: c.pillars.remote, desc: c.pillars.remoteDesc },
    { icon: KeyRound, title: c.pillars.after, desc: c.pillars.afterDesc },
  ];

  return (
    <section className="stone-grain py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1320px] gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24">
        <div>
          <Heading kicker={c.kicker} title={c.title} />
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-[56ch] text-[16px] leading-[1.85] text-[var(--text-secondary)]">{c.body1}</p>
            <p className="mt-5 max-w-[56ch] text-[16px] leading-[1.85] text-[var(--text-secondary)]">{c.body2}</p>
          </Reveal>
          <Reveal delay={0.2} className="mt-12 grid gap-8 sm:grid-cols-3">
            {pillars.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="border-t border-[var(--hairline-strong)] pt-5">
                <Icon size={20} strokeWidth={1.4} className="text-[var(--metal)]" />
                <h3 className="mt-4 text-[14px] font-semibold text-[var(--text-primary)]">{title}</h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-[var(--text-muted)]">{desc}</p>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal delay={0.15} className="relative">
          <div className="relative aspect-[960/1093] overflow-hidden shadow-[var(--shadow-lift)]">
            <Image src="/brand/reception.jpg" alt="Lababidi Properties" fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />
          </div>
          <div className="absolute -bottom-8 start-6 hidden w-[46%] border-[10px] border-[var(--surface)] shadow-[var(--shadow-lift)] sm:block lg:-start-12">
            <div className="relative aspect-square">
              <Image src="/projects/the-cove-creek-island-4.jpg" alt="" fill sizes="25vw" className="object-cover" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- featured */

const FEATURED = ["palace-beach-residence", "grand-polo-equestra", "the-cove-creek-island", "creek-vistas-heights", "couture-by-cavalli"];

export function FeaturedProjects() {
  const { t, locale } = useSite();
  const c = t.home.featured;
  const list = FEATURED.map((s) => PROJECTS.find((p) => p.slug === s)!).filter(Boolean);
  const [lead, ...rest] = list;
  const href = (slug: string) => `${pageHref(locale, "projects")}?p=${slug}`;

  return (
    <section className="border-t border-[var(--hairline)] bg-[var(--surface-sunken)] py-24 sm:py-32">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Heading kicker={c.kicker} title={c.title} />
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-[56ch] text-[16.5px] leading-[1.8] text-[var(--text-secondary)]">{c.subtitle}</p>
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <Link href={pageHref(locale, "projects")} className="btn btn-line">
              {c.viewAll}
              <ArrowRight size={15} className="rtl:-scale-x-100" />
            </Link>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <ProjectFeature project={lead} href={href(lead.slug)} big />
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2">
            {rest.map((p, i) => (
              <Reveal key={p.slug} delay={0.08 * (i + 1)}>
                <ProjectFeature project={p} href={href(p.slug)} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectFeature({ project, href, big = false }: { project: (typeof PROJECTS)[number]; href: string; big?: boolean }) {
  const { t, locale } = useSite();
  const p = localizeProject(project, locale);
  return (
    <Link href={href} className={`zoom-media group relative block overflow-hidden bg-[#07192b] ${big ? "aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[640px]" : "aspect-[4/5] sm:aspect-[3/4]"}`}>
      <Image src={project.image} alt={project.name} fill sizes={big ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"} className="object-cover" />
      <div className="card-scrim absolute inset-0" />
      <span className="absolute start-5 top-5 bg-[rgb(7_26_46/0.7)] px-3 py-1.5 font-[family-name:var(--font-eyebrow)] text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm rtl:tracking-normal">
        {project.developer}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
        <h3 className={`font-[family-name:var(--font-display)] font-medium leading-[1.05] text-white ${big ? "text-[clamp(30px,3.4vw,46px)]" : "text-[24px]"}`}>
          {project.name}
        </h3>
        <p className="mt-2 flex items-center gap-1.5 text-[13.5px] text-white/75">
          <MapPin size={13} strokeWidth={1.5} />
          {project.community}
        </p>
        {big && <p className="mt-4 hidden max-w-[48ch] text-[14px] leading-[1.7] text-white/80 sm:block">{p.blurb}</p>}
        <span className="mt-5 inline-flex items-center gap-2 font-[family-name:var(--font-eyebrow)] text-[10px] font-semibold uppercase tracking-[0.2em] text-white rtl:tracking-normal">
          {t.home.featured.view}
          <ArrowUpRight size={14} className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100" />
        </span>
      </div>
    </Link>
  );
}

/* ---------------------------------------------------------- services */

export function ServicesShowcase() {
  const { t, locale } = useSite();
  const c = t.home.services;
  const items = [
    { ...c.items.acquisition, img: "/projects/the-cove-creek-island.jpg", href: pageHref(locale, "projects") },
    { ...c.items.investors, img: "/projects/aquarise.jpg", href: pageHref(locale, "invest") },
    { ...c.items.interiors, img: "/projects/couture-by-cavalli-5.jpg", href: serviceHref(locale, "fitout") },
    { ...c.items.construction, img: "/projects/grand-polo-equestra-4.jpg", href: serviceHref(locale, "construction") },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <Heading kicker={c.kicker} title={c.title} />
        <div className="mt-14 grid gap-px overflow-hidden border border-[var(--hairline)] bg-[var(--hairline)] sm:grid-cols-2 lg:grid-cols-4">
          {items.map((s, i) => (
            <Reveal key={s.title} delay={0.07 * i} className="bg-[var(--surface)]">
              <Link href={s.href} className="zoom-media group flex h-full flex-col">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={s.img} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
                </div>
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <span className="figure text-[12px] text-[var(--metal)]">0{i + 1}</span>
                  <h3 className="mt-3 font-[family-name:var(--font-display)] text-[26px] leading-[1.1] text-[var(--text-primary)] rtl:font-[family-name:var(--font-display-ar)]">
                    {s.title}
                  </h3>
                  <p className="mt-3 flex-1 text-[14.5px] leading-[1.75] text-[var(--text-secondary)]">{s.desc}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-[family-name:var(--font-eyebrow)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)] rtl:tracking-normal">
                    {c.explore}
                    <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- figures */

export function FiguresBand() {
  const { t } = useSite();
  const c = t.home.figures;
  const items = [c.items.tax, c.items.yield, c.items.visa, c.items.freehold];
  return (
    <section className="relative isolate overflow-hidden bg-[#0b2a4a] py-24 sm:py-28">
      <div className="absolute inset-0 -z-10 opacity-[0.16]">
        <Image src="/projects/palace-beach-residence-3.jpg" alt="" fill sizes="100vw" className="object-cover grayscale" />
      </div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#07192b_10%,rgb(11_42_74/0.85)_60%,#0b2a4a)]" />
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <Heading kicker={c.kicker} title={c.title} light />
        <div className="mt-16 grid gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((x, i) => (
            <Reveal key={x.label} delay={0.08 * i} className="border-t border-[#c8a96e]/45 pe-8 pt-6">
              <div className="font-[family-name:var(--font-display)] text-[clamp(44px,5vw,68px)] font-medium leading-none text-white" dir="ltr">
                {x.value}
              </div>
              <p className="mt-4 max-w-[26ch] text-[14.5px] leading-[1.7] text-[#c3ccd7]">{x.label}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-14 max-w-[80ch] text-[13px] leading-[1.75] text-[#8fa0b4]">{c.note}</p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- process */

export function ProcessSteps() {
  const { t, openDrawer } = useSite();
  const c = t.process;
  const steps = [c.steps.discovery, c.steps.shortlist, c.steps.reservation, c.steps.handover];
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <Heading kicker={c.eyebrow} title={c.title} />
          <Reveal delay={0.1}>
            <p className="max-w-[54ch] text-[16.5px] leading-[1.8] text-[var(--text-secondary)]">{c.subtitle}</p>
          </Reveal>
        </div>
        <ol className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={0.08 * i}>
              <li className="relative">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center border border-[var(--accent)] font-[family-name:var(--font-display)] text-[22px] text-[var(--accent)]">
                    {i + 1}
                  </span>
                  {i < steps.length - 1 && <span className="steel-rule hidden flex-1 lg:block" />}
                </div>
                <h3 className="mt-6 text-[16px] font-semibold text-[var(--text-primary)]">{s.title}</h3>
                <p className="mt-3 text-[14.5px] leading-[1.75] text-[var(--text-secondary)]">{s.desc}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal delay={0.2} className="mt-14">
          <button onClick={() => openDrawer("advisory")} className="btn btn-navy">
            {c.cta}
            <ArrowRight size={15} className="rtl:-scale-x-100" />
          </button>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- tools */

export function InvestorToolsTeaser() {
  const { t, locale } = useSite();
  const c = t.home.tools;
  const items = [
    { icon: TrendingUp, ...c.items.roi, href: pageHref(locale, "invest", SECTION_IDS.advisory) },
    { icon: Calculator, ...c.items.netRoi, href: pageHref(locale, "invest", SECTION_IDS.netRoi) },
    { icon: Landmark, ...c.items.mortgage, href: pageHref(locale, "invest", SECTION_IDS.mortgage) },
    { icon: BarChart3, ...c.items.market, href: pageHref(locale, "invest", MARKET_SECTION_ID) },
  ];
  return (
    <section className="border-y border-[var(--hairline)] bg-[var(--surface-sunken)] py-24 sm:py-32">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <Heading kicker={c.kicker} title={c.title} />
          <Reveal delay={0.1}>
            <p className="max-w-[54ch] text-[16.5px] leading-[1.8] text-[var(--text-secondary)]">{c.subtitle}</p>
            <p className="mt-4 inline-flex items-center gap-2 border border-[var(--accent-dim)] bg-[var(--accent-wash)] px-3 py-1.5 text-[13px] font-medium text-[var(--accent)]">
              ≈ {c.approx}
            </p>
          </Reveal>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, desc, href }, i) => (
            <Reveal key={title} delay={0.07 * i}>
              <Link
                href={href}
                className="group flex h-full flex-col border border-[var(--hairline)] bg-[var(--surface-raised)] p-7 shadow-[var(--shadow-card)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--accent-dim)] hover:shadow-[var(--shadow-lift)]"
              >
                <span className="grid h-12 w-12 place-items-center bg-[var(--accent-wash)] text-[var(--accent)]">
                  <Icon size={20} strokeWidth={1.5} />
                </span>
                <h3 className="mt-6 text-[16px] font-semibold text-[var(--text-primary)]">{title}</h3>
                <p className="mt-3 flex-1 text-[14.5px] leading-[1.7] text-[var(--text-secondary)]">{desc}</p>
                <ArrowRight size={16} className="mt-6 text-[var(--accent)] transition-transform duration-500 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2} className="mt-12">
          <Link href={pageHref(locale, "invest")} className="btn btn-line">
            {c.cta}
            <ArrowRight size={15} className="rtl:-scale-x-100" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- contact */

export function ContactBand() {
  const { t, openDrawer } = useSite();
  const c = t.home.contact;
  return (
    <section className="relative isolate overflow-hidden bg-[#07192b]">
      <div className="absolute inset-0 -z-10">
        <Image src="/projects/palace-beach-residence-2.jpg" alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(7_25_43/0.95)_0%,rgb(7_25_43/0.82)_50%,rgb(7_25_43/0.55)_100%)] rtl:bg-[linear-gradient(270deg,rgb(7_25_43/0.95)_0%,rgb(7_25_43/0.82)_50%,rgb(7_25_43/0.55)_100%)]" />
      </div>
      <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <Heading kicker={c.kicker} title={c.title} light />
          <Reveal delay={0.1}>
            <p className="mt-7 max-w-[52ch] text-[16px] leading-[1.85] text-white/80">{c.body}</p>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="flex flex-col gap-3 border border-white/15 bg-white/[0.04] p-7 backdrop-blur-sm sm:p-9">
          <a href={SITE.waLink("Hello — I would like to book a private consultation.")} target="_blank" rel="noopener noreferrer" className="btn btn-wa w-full">
            <IconWhatsApp size={16} />
            {c.whatsapp}
          </a>
          <a href={`tel:${SITE.phoneHref}`} className="btn btn-ghost-light w-full">
            <Phone size={15} strokeWidth={1.5} />
            <span dir="ltr">{interpolate(c.call, { phone: SITE.phoneDisplay })}</span>
          </a>
          <button onClick={() => openDrawer("advisory")} className="btn btn-light w-full">
            {c.form}
          </button>
          <p className="mt-3 text-center text-[13px] text-white/60">{c.hours}</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- developers */

export function DeveloperStrip() {
  const { t } = useSite();
  const names = [...new Set(PROJECTS.map((p) => p.developer))];
  const row = [...names, ...names];
  return (
    <section className="border-b border-[var(--hairline)] bg-[var(--surface-raised)] py-7">
      <div className="mx-auto flex max-w-[1320px] items-center gap-8 px-5 sm:px-8">
        <span className="kicker hidden shrink-0 md:block">{t.home.developers}</span>
        <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
          <div className="marquee flex w-max gap-14">
            {row.map((n, i) => (
              <span key={i} aria-hidden={i >= names.length} className="whitespace-nowrap font-[family-name:var(--font-display)] text-[22px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- founder */

export function FounderStory() {
  const { t } = useSite();
  const c = t.home.story;
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1320px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <Reveal className="relative mx-auto w-full max-w-[520px]">
          <div className="relative aspect-[4/5] overflow-hidden shadow-[var(--shadow-lift)]">
            <Image src="/brand/oussama-lababidi.jpg" alt={c.name} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
          </div>
          <span className="absolute -bottom-5 -end-5 -z-10 hidden h-full w-full border border-[#c8a96e]/60 sm:block" />
        </Reveal>

        <div>
          <Heading kicker={c.kicker} title={c.title} />
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-[58ch] text-[16px] leading-[1.85] text-[var(--text-secondary)]">{c.body}</p>
          </Reveal>
          <Reveal delay={0.2}>
            <figure className="mt-10 border-s-2 border-[#c8a96e] ps-7">
              <blockquote className="font-[family-name:var(--font-display)] text-[clamp(24px,2.6vw,32px)] font-medium italic leading-[1.3] text-[var(--text-primary)] rtl:not-italic rtl:font-[family-name:var(--font-display-ar)]">
                “{c.quote}”
              </blockquote>
              <figcaption className="mt-6">
                <span className="block font-[family-name:var(--font-wordmark)] text-[17px] tracking-[0.12em] text-[var(--text-primary)] rtl:font-[family-name:var(--font-display-ar)] rtl:tracking-normal">{c.name}</span>
                <span className="kicker mt-1.5 block">{c.role}</span>
              </figcaption>
            </figure>
          </Reveal>
          <Reveal delay={0.3} className="mt-10">
            <a href={SITE.waLink("Hello Oussama — I would like to discuss a Dubai property.")} target="_blank" rel="noopener noreferrer" className="btn btn-navy">
              <IconWhatsApp size={15} />
              {c.cta}
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

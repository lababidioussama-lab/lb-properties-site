"use client";

import { useSite } from "@/lib/context/site-context";
import { PageHero } from "./PageHero";
import { MARKET_SECTION_ID, SECTION_IDS, type PageKey } from "@/lib/site-config";

export function SubpageHero({ page, image }: { page: PageKey; image: string }) {
  const { t } = useSite();
  const c = t.pages[page];

  const jumps =
    page === "invest"
      ? [
          { id: SECTION_IDS.advisory, label: t.pages.invest.jump.roi },
          { id: SECTION_IDS.netRoi, label: t.pages.invest.jump.netRoi },
          { id: SECTION_IDS.mortgage, label: t.pages.invest.jump.mortgage },
          { id: MARKET_SECTION_ID, label: t.pages.invest.jump.market },
        ]
      : page === "services"
        ? [
            { id: SECTION_IDS.fitout, label: t.nav.fitout },
            { id: SECTION_IDS.construction, label: t.nav.construction },
            { id: SECTION_IDS.relocation, label: t.nav.relocation },
          ]
        : null;

  return (
    <PageHero image={image} kicker={c.kicker} title={c.title} subtitle={c.subtitle}>
      {jumps && (
        <nav className="flex flex-wrap gap-2">
          {jumps.map((j) => (
            <a key={j.id} href={`#${j.id}`} className="btn btn-ghost-light !min-h-10 !px-4 !text-[10px]">
              {j.label}
            </a>
          ))}
        </nav>
      )}
    </PageHero>
  );
}

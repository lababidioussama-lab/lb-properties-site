"use client";

import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";
import { useState } from "react";
import { Calculator } from "lucide-react";
import { useSite } from "@/lib/context/site-context";
import { SITE, serviceHref } from "@/lib/site-config";
import { IconWhatsApp } from "@/components/ui/Icons";

/**
 * Sticky bottom dock on small viewports. Appears once the hero is behind the
 * visitor (so it doesn't compete with the hero CTA) and hides while the lead
 * drawer is open (so it doesn't sit on top of the submit button).
 */
export function MobileDock() {
  const { t, locale, drawerOpen } = useSite();
  const [past, setPast] = useState(false);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => setPast(latest > 520));

  const visible = past && !drawerOpen;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 90 }}
          animate={{ y: 0 }}
          exit={{ y: 90 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-xl lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-2 gap-2.5 p-3">
            <a
              href={serviceHref(locale, "netRoi")}
              className="btn btn-line bg-[var(--surface-raised)] !px-3 !tracking-[0.12em] py-3.5 font-[family-name:var(--font-eyebrow)] text-[10px] font-semibold uppercase tracking-[0.12em]"
            >
              <Calculator size={15} strokeWidth={1.5} />
              {t.nav.netRoiShort}
            </a>
            <a
              href={SITE.waLink("Hello — I would like to speak to an advisor.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-wa !px-3 !tracking-[0.12em] py-3.5 font-[family-name:var(--font-eyebrow)] text-[10px] font-semibold uppercase tracking-[0.12em]"
            >
              <IconWhatsApp size={15} />
              {t.utility.conciergeShort}
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

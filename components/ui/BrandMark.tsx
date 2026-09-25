"use client";

import Image from "next/image";
import { SITE } from "@/lib/site-config";
import { useSite } from "@/lib/context/site-context";

type Tone = "auto" | "light";

/**
 * The real Lababidi Properties mark: the L/P monogram with the Burj Khalifa
 * in its negative space, shipped as the original raster crops so it renders
 * exactly as designed. "light" forces the white cut for use over photography.
 */
export function BrandMark({
  size = 34,
  tone = "auto",
  className = "",
}: {
  size?: number;
  tone?: Tone;
  idSuffix?: string;
  className?: string;
}) {
  const { theme } = useSite();
  const white = tone === "light" || theme === "dark";

  return (
    <Image
      src={white ? "/logo-icon-white.png" : "/logo-icon.png"}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
      priority
    />
  );
}

/** Monogram + wordmark, set the way the logo sets it: carved Roman caps over
    "PROPERTIES" flanked by two swept rules. */
export function BrandLockup({ tone = "auto", size = "md" }: { tone?: Tone; size?: "md" | "lg"; idSuffix?: string }) {
  const light = tone === "light";
  const lg = size === "lg";
  return (
    <span className="flex items-center gap-3">
      <BrandMark tone={tone} size={lg ? 44 : 36} />
      <span className="flex flex-col items-center leading-none">
        <span
          className={`font-[family-name:var(--font-wordmark)] font-medium tracking-[0.16em] ${lg ? "text-[24px]" : "text-[17px]"} ${
            light ? "text-white" : "text-[var(--text-primary)]"
          }`}
        >
          {SITE.nameMark.toUpperCase()}
        </span>
        <span className="mt-1 flex w-full items-center gap-1.5">
          <span className={`h-px flex-1 ${light ? "bg-white/50" : "bg-[var(--metal)]/60"}`} />
          <span
            className={`font-[family-name:var(--font-eyebrow)] font-semibold uppercase tracking-[0.3em] ${lg ? "text-[9px]" : "text-[7.5px]"} ${
              light ? "text-white/85" : "text-[var(--metal)]"
            }`}
          >
            {SITE.nameSuffix}
          </span>
          <span className={`h-px flex-1 ${light ? "bg-white/50" : "bg-[var(--metal)]/60"}`} />
        </span>
      </span>
    </span>
  );
}

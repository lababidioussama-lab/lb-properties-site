"use client";

import Image from "next/image";
import { SITE } from "@/lib/site-config";
import { useSite } from "@/lib/context/site-context";

/**
 * The real Lababidi Properties mark: an L/P monogram with the Burj Khalifa
 * skyline standing in its negative space. Shipped as two flat raster crops
 * (public/logo-icon.png, public/logo-icon-white.png) rather than a redraw,
 * so it renders exactly as designed.
 *
 * The header/footer sit on surfaces that flip between near-white and
 * near-black with the theme toggle (see app/globals.css), so the mark picks
 * whichever variant stays legible: white on dark, full colour on light.
 */
export function BrandMark({
  size = 34,
  idSuffix: _idSuffix = "hdr",
  className = "",
}: {
  size?: number;
  idSuffix?: string;
  className?: string;
}) {
  const { theme } = useSite();
  const src = theme === "dark" ? "/logo-icon-white.png" : "/logo-icon.png";

  return (
    <Image
      src={src}
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

export function BrandLockup({ idSuffix = "hdr" }: { idSuffix?: string }) {
  return (
    <span className="flex items-center gap-3 text-[var(--accent)]">
      <BrandMark idSuffix={idSuffix} size={32} />
      <span className="flex flex-col leading-none">
        <span className="font-[family-name:var(--font-display)] text-[19px] font-normal tracking-[0.24em] text-[var(--text-primary)]">
          {SITE.nameMark.toUpperCase()}
        </span>
        <span className="mt-1.5 font-[family-name:var(--font-eyebrow)] text-[8px] font-medium uppercase tracking-[0.34em] text-[var(--text-muted)]">
          {SITE.nameSuffix}
        </span>
      </span>
    </span>
  );
}

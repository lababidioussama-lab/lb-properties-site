"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Vastu Map, the same one as on dbsearchdubai.com: the 3D map of the UAE
 * with live sun and shadow by time of day and season, place search, drive
 * and auto flight. It is a self-contained page built from public map data
 * only (no owner records), served from /vastu-map and shown here edge to
 * edge, filling exactly what is left of the screen under the DB Search bar.
 */
export function DsVastu() {
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const fit = () => {
      if (!box.current) return;
      const top = box.current.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(420, window.innerHeight - top - 12));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div ref={box} style={{ height: height ?? "70dvh" }}
      className="relative left-1/2 w-[calc(100vw-1.5rem)] -translate-x-1/2 overflow-hidden rounded-[16px] border border-[var(--hairline)] bg-[#05070d] md:w-[calc(100vw-3rem)]">
      <iframe src="/vastu-map/index.html" title="Vastu Map" allow="fullscreen; geolocation" className="block h-full w-full border-0" />
    </div>
  );
}

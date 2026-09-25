"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hero backdrop.
 *
 * A video is used when one is present at /hero/berth-hero.(webm|mp4); until
 * then the still photograph carries it. Both sit over a 20px blur-up encoded
 * as a data URI, so the hero is never a blank rectangle on a slow connection
 * — the warm tone is on screen before anything downloads.
 *
 * The photograph is local (no CDN, no external host), so nothing here depends
 * on a third party staying up.
 */

const VIDEO_SOURCES = [
  { src: "/hero/berth-hero.webm", type: "video/webm" },
  { src: "/hero/berth-hero.mp4", type: "video/mp4" },
];

const BLUR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAALABQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDVvrUatdukjEWdsdpCnBkfHPPoOB9azbvQ7IKfsqmCVeVYMTz7g1LBPKNKiIcgvuZj6ksSTVaa4lLt85rm5nfQ3UVbUmt52nhDMuJB8rj0YdaKw7y4liun8tyu7BOO5wKKuzJuj//Z";

export function HeroBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    // Data saver and 2G exist precisely to stop autoplaying background loops.
    if (reduceMotion || connection?.saveData || /^(slow-)?2g$/.test(connection?.effectiveType ?? "")) {
      return;
    }

    const onCanPlay = () => {
      setVideoReady(true);
      void video.play().catch(() => setVideoReady(false));
    };
    video.addEventListener("canplay", onCanPlay);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !document.hidden) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.01 },
    );
    observer.observe(video);

    const onVisibility = () => {
      if (document.hidden) video.pause();
      else void video.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    video.load();

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 scale-110 bg-cover bg-center blur-xl"
        style={{ backgroundImage: `url("${BLUR}")` }}
      />

      <picture>
        <source media="(max-width: 767px)" srcSet="/hero/dubai-arch-tall.jpg" />
        <img
          src="/hero/dubai-arch-wide.jpg"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>

      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 [transition-timing-function:var(--ease-lux)]"
        style={{ opacity: videoReady ? 1 : 0 }}
      >
        {VIDEO_SOURCES.map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>

      {/* Grade the photograph down into the near-black ground rather than
          letting it sit on top as a foreign rectangle: a heavy dark wash so
          the canvas reads as the dominant surface, then a red cast. */}
      <div className="pointer-events-none absolute inset-0 bg-[var(--surface)]/85" />
      <div
        className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-[0.10]"
        style={{ backgroundColor: "var(--accent)" }}
      />
    </div>
  );
}

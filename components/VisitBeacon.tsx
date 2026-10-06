"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Tells the server a page was opened, so the admin's Visitors screen can
 * count visits and where they came from. It sends the page path and how the
 * visitor arrived (the linking site and any campaign tags), remembered for
 * the tab so every page of one visit carries the same origin. No cookie, no
 * identifier, nothing typed into a form.
 */
const KEY = "lb:arrived";

export function VisitBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    let arrived: Record<string, unknown> | null = null;
    try { arrived = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); } catch { /* storage may be blocked */ }
    if (!arrived) {
      const q = new URLSearchParams(window.location.search);
      arrived = {
        r: document.referrer || "",
        us: q.get("utm_source") ?? "", um: q.get("utm_medium") ?? "", uc: q.get("utm_campaign") ?? "",
        g: q.has("gclid") ? 1 : 0, f: q.has("fbclid") ? 1 : 0, t: q.has("ttclid") ? 1 : 0,
      };
      try { sessionStorage.setItem(KEY, JSON.stringify(arrived)); } catch { /* fine without it */ }
    }
    const body = JSON.stringify({ ...arrived, p: pathname, l: navigator.language });
    // keepalive lets the report finish even if the visitor leaves at once.
    void fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, [pathname]);

  return null;
}

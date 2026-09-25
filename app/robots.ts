import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

/* The public site is open to search engines; the CRM and APIs are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

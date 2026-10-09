import type { MetadataRoute } from "next";

/* This is the CRM: nothing here is for search engines. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}

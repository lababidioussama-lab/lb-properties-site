import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // There is a stray package-lock.json in the home directory above this
  // project, which makes Turbopack infer C:\Users\oussa as the workspace
  // root and then refuse it. Pin the root to this project explicitly.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },

  // Don't scaffold AGENTS.md / CLAUDE.md into the project.
  agentRules: false,

  // The Documents suite is read from disk by app/documents/route.ts, not
  // served from public/, so it has to be shipped with that function.
  outputFileTracingIncludes: {
    "/documents": ["./private/documents/**"],
  },

  // Old bookmarks and links pointed at the static file. The #LP-H01 part of
  // a link survives the redirect because the browser keeps it.
  /* Sent with every page: no framing by other sites (clickjacking), no type
     guessing, HTTPS only, and no referrer or device access leaking out. The
     CRM, DB Search and Documents APIs are never cached anywhere. */
  async headers() {
    const base = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=()" },
    ];
    const noStore = [{ key: "Cache-Control", value: "no-store, max-age=0" }];
    return [
      { source: "/:path*", headers: base },
      { source: "/api/crm/:path*", headers: noStore },
      { source: "/api/ds/:path*", headers: noStore },
    ];
  },

  async redirects() {
    return [{ source: "/documents/index.html", destination: "/documents", permanent: false }];
  },
};

export default nextConfig;

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
  async redirects() {
    return [{ source: "/documents/index.html", destination: "/documents", permanent: false }];
  },
};

export default nextConfig;

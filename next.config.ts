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
};

export default nextConfig;

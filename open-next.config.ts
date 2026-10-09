import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/* The website's pages are built once at deploy time and never revalidated, so
   they are served as ready-made files from the static assets instead of being
   rendered again on every request. That is what keeps each request cheap
   enough for Cloudflare's free plan. */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/* No incremental cache: the site's pages are built once at deploy time and the
   CRM is always rendered fresh, so nothing needs a cache bucket. */
export default defineCloudflareConfig();

"use client";

import dynamic from "next/dynamic";

/* The CRM and DB Search are drawn in the browser, not on the server. They need
   the signed-in person's data anyway, and rendering these large screens on the
   server on every visit costs far more computing time than Cloudflare's free
   plan allows. The server sends the small shell and the browser does the rest. */
const blank = () => <div className="min-h-[100dvh]" aria-busy="true" />;

export const CrmApp = dynamic(() => import("./CrmApp").then((m) => m.CrmApp), { ssr: false, loading: blank });
export const DbSearchApp = dynamic(() => import("./dbsearch/DbSearchApp").then((m) => m.DbSearchApp), { ssr: false, loading: blank });

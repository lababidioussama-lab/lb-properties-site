import type { Metadata } from "next";
import { fontVariables } from "../fonts";
import "../globals.css";

/**
 * A second root layout, sibling to app/[locale]/layout.tsx.
 *
 * The admin panel is deliberately outside the locale tree: it is the
 * operator's own tool, read by one person in one language, and routing it
 * through the i18n machinery would mean maintaining ten dictionaries for a
 * screen nobody but him ever opens.
 */
export const metadata: Metadata = {
  title: "Ledger — Lababidi Properties",
  // Belt and braces alongside the auth gate: nothing here should ever be
  // indexed, previewed or cached by an intermediary.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" data-theme="dark" className={`${fontVariables} crm-shell`}>
      <body className="bg-[var(--surface)]">{children}</body>
    </html>
  );
}

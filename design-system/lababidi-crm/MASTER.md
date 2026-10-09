# Lababidi CRM + DB Search: design system

The CRM and DB Search look like **dbsearchdubai.com** (its "v2" styles), so
the two read as one product. An earlier Swiss/editorial direction was tried
and rejected by the client (30 Sep 2026): too large, not DB Search.

## Rules from the client

- Same look as dbsearchdubai.com, across the whole CRM.
- DB Search's tabs are only: **Smart, Search, Phone, Agents**, plus
  **Portfolio for the admin only**. Nothing else in DB Search's navigation.
- DB Search has a **Back to CRM** button, as the Documents page does.
- Only the original Lababidi logo (`/logo-icon*.png`, `/logo-full*.png`).
- The site never describes the owner database (no taglines about owners,
  records or data).
- Dark and light modes; dark is the default. Star field in both.

## Tokens (app/globals.css, `html.crm-shell`)

| Token | Dark (DB Search v2) | Light (DB Search paper) |
|---|---|---|
| page | `#0F172A` + emerald glow top-left, blue glow top-right | `#E6DFDB` + 5% dot grid |
| panel | `rgba(30,41,59,.55)`, blur 16px | `#FFFDFC`, contact + long soft shadow |
| text | `#E2E8F0` | `#1A1214` |
| muted | `#94A3B8` | `#6A5F63` |
| border | `rgba(148,163,184,.14)` | `rgba(26,18,20,.16)` |
| accent | `#3B82F6` (text `#5B92FF`) | `#2158D0` |
| main action | `linear-gradient(135deg,#10B981,#0EA5E9 48%,#3B82F6)` | same |
| focus | emerald `#10B981` | accent |

Type: system sans for UI; `Iowan Old Style, Palatino Linotype, Palatino,
Georgia` serif for titles (`.display`); `ui-monospace, SF Mono, Menlo,
Consolas` for figures and labels (`.figure`, `.mono`, `.ds-label` = mono caps,
0.1em tracking).

Shape: panels 14px, controls 9-10px, chips full pill.

## Components (components/crm/shared.tsx, components/crm/dbsearch/ui.tsx)

- `BTN`: DB Search's `.btn`, an accent tint that fills in on hover.
- `BTN_GO`: the gradient, only on a screen's main action (Search, Ask,
  Sign in).
- `BTN_GHOST`: DB Search's `.btn-secondary`. `BTN_ICON`: square outline.
- `DsBox`: DB Search's search box: glass panel, mono caps label, 16px input,
  full-width gradient button, Clear under it.
- `ViewTabs` / DB Search tabs: equal words on one rule, 2px accent line that
  slides to the chosen tab.
- `Segmented`: DB Search's sign-in switch; the chosen option carries the
  gradient.
- `PageHead`: DB Search's section header: serif title, muted line, rule with
  a 64px accent segment, key figure in mono on the right.

## Motion

DB Search's two speeds: `--snap` 140ms for hovers and presses, rise 460ms
for a screen's entrance. Presses scale to 0.975. All off under
`prefers-reduced-motion`.

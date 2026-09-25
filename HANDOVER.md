# LB Properties site — handover

Next.js 16 / React 19 / Tailwind 4 site at `C:\Users\oussa\claude\estate-concierge`.
Dev server: `npm run dev` (port 3400, also in `.claude/launch.json`).

## Business model — read first

The client is a **RERA-registered real estate agent** running a **referral
business**. He captures leads and introduces them to partner firms (mortgage
advisors, maintenance companies, movers, fit-out contractors, developers) and
earns commission. He does **not** deliver those services himself.

Two consequences that shape everything:

1. **Prices for services are the partners', not his.** The maintenance tiers,
   relocation quotes, holiday-home commission and onboarding fees currently in
   `lib/services.ts` and `lib/holiday-home.ts` are invented placeholders. They
   need partner rate cards, or should show honest "from" ranges.
2. **Copy must say "introduce", not "we do".** The mortgage section already
   carries the correct framing: *"We are a registered real estate agency and
   introduce clients to licensed mortgage advisors — we do not lend or provide
   financial advice."* Extend that to the other services.

## BLOCKER — the site cannot capture a single lead

`POST /api/lead` returns **502**. Code is complete and correct; the table does
not exist. Apply `supabase/migrations/0001_concierge_leads.sql`.

Docker is not running here and `psql` is not installed, so it must be run by
the user — Supabase SQL editor, or:

```bash
docker run --rm -i -v "C:/Users/oussa/claude/estate-concierge/supabase/migrations:/m" \
  postgres:17 psql "$(tr -d '\r\n' < C:/Users/oussa/supabase-selfhosted/.cloud-db-url)" \
  -f /m/0001_concierge_leads.sql
```

Then verify:
```bash
curl -s -X POST http://localhost:3400/api/lead -H "Content-Type: application/json" \
  -d '{"fullName":"test","phone":"+971547044047","service":"advisory"}'
```

## Data provenance — DO NOT invent numbers

This was the hardest-won part of the project. Every figure is classified in the
header of `lib/dubai-market.ts`. **Read it before editing any number.**

| Provenance | What |
|---|---|
| **Real — DLD** | Unit sizes, and **70 of the table's 150 price cells**. From the client's own `property_transactions` table (1.4M rows) on the cloud Supabase. Regenerate: `scratchpad/dld_prices.py` → `apply_prices.py` |
| **⚠ Unmarked mix** | The other ~80 price cells are estimates and **nothing records which is which** — see below |
| **Real — listings** | 166 rent cells across 29 communities, scraped from Property Finder. Regenerate: `scratchpad/scrape_rents.py` → `apply_rents.py` |
| **Derived** | Gross yield = rent ÷ price, via `grossYieldBand()` in `lib/dubai-market.ts` |
| **Sourced & dated** | `lib/market-reference.ts` — REIDIN/ValuStrat/CBUAE via Global Property Guide. Price growth +10.79%, yields 6.57%, EIBOR 3.69%. **Review by Oct 2026** |
| **Statutory** | DLD 4%, agency 2%, visa thresholds, DET fees, LTV caps (verified vs Emirates NBD), 50% DBR |
| **Still estimates** | Service charges, short-let ADR, occupancy, per-hub appreciation |

### The price table's provenance went stale — READ THIS

The header in `lib/dubai-market.ts` used to say "70 of the 87 cells are DLD
medians". The table has since grown to **36 areas holding 150 price cells**,
so the 70 DLD-backed cells are now a *minority*, and no per-cell flag records
which ones they are. A rounding-granularity probe does not separate them
cleanly enough to label individual cells, and guessing would be exactly the
invention this project exists to prevent.

Consequences, already applied:

- `PRICE_DATA` now carries `dldBackedCells: 70` / `totalCells: 150` as data,
  so the disclosure the UI renders cannot drift from the table again.
- The market section says "70 of 150 cells were written from that pull; the
  rest are estimates, and the table does not record which is which" — it does
  **not** say "DLD medians".
- **To fix properly:** re-run `dld_prices.py` over the current 36 areas and
  have `apply_prices.py` write a per-cell flag, not a count in a comment.

### Traps already hit — do not repeat

- **Appreciation is NOT derivable from the DLD data.** A naive year-on-year
  median returns 44%/yr for Dubai Marina: the 2022 sample is 132 sales vs
  16,064 in 2023, median unit size drifts 836→1,180 sqft, and off-plan only
  enters the mix in 2024. Documented in `lib/investment-data.ts`.
- **Transaction volume is not chartable** for the same reason — 2 sales in
  2020-Q1 is a data-load artefact, not the market.
- **Service charges are per BUILDING, not per community.** Mollak renders a
  blank page without an owner login. A single community figure would be wrong
  regardless. The UI already says the binding figure is the Mollak statement.
- **Mismatched provenance manufactures fake yields.** A real rent over an
  estimated price gave Dubai Hills 9.1%, above REIDIN's citywide max.
  `grossYieldBand()` now discards anything outside 3–9%.
- **Property Finder's bed filter is a path segment**, not `?bedroom[]=N` —
  the query form is silently ignored and returns the unfiltered page.
- **Bayut, DuckDuckGo and Global Property Guide are Cloudflare/captcha-gated.**
  Property Finder and dubailand.gov.ae open fine. CDP-controlled Chrome is
  detected regardless of user clicks.

## State of the build

**Done:** hero + canvas, ROI calculator, acquisition process, featured
opportunities, 14-project off-plan listings (horizontal swipe rail + detail
modal with swipeable gallery, images extracted from client brochures), holiday
homes, net ROI engine, relocation, maintenance plans, renovation slider,
construction, testimonials, resources, lead drawer, Groq-backed AI concierge
(`/api/chat`, knowledge auto-built from live site data).

**Languages:** EN, AR (RTL), RU, ZH complete — 525 keys each, compiler-enforced
parity, plus per-project copy overlays in `lib/i18n/project-copy/`. The selector
only offers locales with real dictionaries (`TRANSLATED_LOCALES`). Routes exist
for fr/hi/ur/ja/th/id and fall back to English.

**Mortgage advisory — done.** `components/sections/MortgageAdvisory.tsx`, on the
page after `NetRoiEngine`. Leads with the cash-required figure (deposit plus the
fees that cannot be financed), then LTV / monthly / loan / deposit, the
non-financeable fee breakdown, and an affordability card that only appears once
an income is entered. Verified against hand-calculated figures at 2M and 6M,
including the >5M band drop and both DBR outcomes.

**Market charts — done.** `components/sections/MarketCharts.tsx`, section id
`market-data` (a plain id, deliberately **not** in `SECTION_IDS` — that type
feeds the DB `service` CHECK and this is not a service). Six growth stat tiles
from `market-reference.ts`, price per sq ft by community, and gross-yield bands
with the REIDIN citywide benchmark drawn on the same scale. One filter row
scopes both charts; every chart has a table twin.

- **Transaction volume is still not charted, on purpose.** Uneven ingest would
  draw a boom that isn't in the market.
- Both charts are single-hue: the communities are nominal, so colouring bars by
  their own value would re-encode what bar length already shows.
- Price per sq ft is **derived** — community median price ÷ *citywide* median
  size for that unit type. The denominator is constant across communities, which
  is what makes the bars comparable, and the UI says so rather than calling it a
  reported price per sq ft. See `pricePerSqft()`.

**Admin commission ledger — done, but needs two env vars.**
`/admin`, outside the locale tree (`app/admin/`), excluded from `proxy.ts`.
Money block (earned / outstanding / paid / **won-with-no-fee-recorded**),
pipeline block, per-partner conversion and outstanding, then the editable lead
table. Only the referral columns are writable — the submitted enquiry is the
record of what happened, not a working note.

- Auth is a single shared password in `ADMIN_PASSWORD`, HMAC-signed into an
  8-hour httpOnly cookie (`lib/admin-auth.ts`). No user table, no auth SDK —
  there is one operator. Under 12 characters it refuses to open at all.
- The gate is checked in the page **and** in every `/api/admin` route.
- Needs `SUPABASE_SERVICE_ROLE_KEY`: the anon key has insert and no select, so
  it physically cannot read a lead back. That is the feature, not a limitation.

## Needs the client, not research

- Real **BRN and ORN** — credentials strip still shows `00000`
- **Partner rate cards** for the service sections
- Whether **"AED 1.8B advised / 240+ projects"** in the hero is real — it
  currently sits beside "0 investors served" in the trust bar, and the two
  contradict each other on the same page

## Conventions

- Every number the UI shows is labelled as an estimate unless sourced.
- `ServiceKey` is derived from `SECTION_IDS`; adding one is a compile error
  everywhere it must be handled, and it feeds the DB `service` CHECK.
- The lead schema's referral columns (partner, status, commission) are
  protected by column-level GRANTs — RLS restricts rows, not columns.
- Scroll reveals are **fades only**. Whole-section transforms were tried and
  rejected: they read as sheets of paper sliding.

# Deploying the LB Properties site

## Read this first — there is no HTML file to upload

This is a **Next.js app**, not a static site. Four things run on a server and
cannot work from uploaded files:

| Feature | Route |
|---|---|
| The enquiry form | `/api/lead` |
| The AI concierge | `/api/chat` |
| The commission ledger | `/admin`, `/api/admin/*` |
| The language redirect | `proxy.ts` |

If you drag a folder into Netlify's drop zone you get a site where the form
fails silently, the concierge is dead and `/admin` returns 404. Netlify has to
**build** it, which is what the steps below do.

(The one file you *can* drag and drop is `Desktop\LB-Logo\index.html` — but
that is the logo sheet, not the website.)

---

## Deploy

Open a terminal **in this folder**.

### 1. Install dependencies

```
npm install
```

`node_modules` was not copied — it is 300+ MB and gets rebuilt from
`package-lock.json`, which is here.

### 2. Log in to Netlify

```
npx netlify login
```

Opens your browser to authorise.

### 3. Deploy

A preview URL first, which is **not indexed by Google** — use this to show
people before launch:

```
npx netlify deploy --build
```

When you are ready for the real thing:

```
npx netlify deploy --build --prod
```

### 4. Set the environment variables

**The site will build without these and then fail at runtime** — the form will
not save and `/admin` will not open. Set them in the Netlify UI under
*Site configuration → Environment variables*, or:

```
npx netlify env:set SUPABASE_URL "https://glsbjxncslcfaskigshw.supabase.co"
```

The full list is in `.env.example`. All five are required:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API → **service_role**,
  behind the "Reveal" button. Not the anon key.
- `ADMIN_PASSWORD` — 12+ characters
- `GROQ_API_KEY`

CRM sign-in and domain (all required for the CRM):

- `ADMIN_EMAIL` — the owner's email; the first admin account is created from it
- `SESSION_SECRET` — a long random string (32+ characters), signs sessions and codes
- `RESEND_API_KEY` — from resend.com; sends the 6-digit sign-in code by email.
  In Resend, add and verify the domain `lababidiproperties.com` (it gives you
  DNS records to add) so codes come from your own address.
- `OTP_FROM` — optional, defaults to
  `Lababidi Properties CRM <security@lababidiproperties.com>`
- `CRM_HOST` — `crm.lababidiproperties.com`. The CRM is then served at that
  address, and `/admin` on the main site redirects there.

Property portal leads (optional until you connect them):

- `PORTAL_WEBHOOK_SECRET` — 16+ random characters (or per portal:
  `BAYUT_WEBHOOK_SECRET`, `DUBIZZLE_WEBHOOK_SECRET`,
  `PROPERTY_FINDER_WEBHOOK_SECRET`). The CRM's *Integrations* page shows the
  exact address to give each portal and has a "Send test lead" button.

Never set `CRM_OTP_DISABLED` on the live site — it turns off the emailed code
and exists only for local testing.

### 5. Connect the domains

In Netlify → *Domain management*, add `lababidiproperties.com` (primary),
`www.lababidiproperties.com` and `crm.lababidiproperties.com` to the same site.
Netlify shows the DNS records to add at your domain registrar and issues the
HTTPS certificates automatically.

Do **not** set `ALLOW_SAMPLE_TESTIMONIALS`. See below.

Redeploy after changing any of them — they are read at build/boot.

---

## To run this copy locally

The secrets file was deliberately not copied. To run it here:

```
copy "C:\Users\oussa\claude\estate-concierge\.env.local" .
npm install
npm run dev
```

---

## Before you go live

Three things are still placeholders. None of them break the site; two of them
are a credibility problem on a regulated agency's public page.

1. **BRN and ORN read `00000`** in the credentials strip. These are your RERA
   registration numbers and they are displayed to the public.
2. **The hero and the trust bar contradict each other** — "AED 1.8B advised /
   240+ projects" sits above "0 investors served" and "Brokerage ranking
   pending" on the same screen. Pick which is true.
3. **The testimonials are sample copy, not real clients.** They are written,
   not collected. The section is *automatically omitted from production
   builds* — that is what `SHOW_TESTIMONIALS` in `app/[locale]/page.tsx` does.
   Setting `ALLOW_SAMPLE_TESTIMONIALS=true` would force invented reviews onto
   a live page, which for a RERA-registered agency is a false advertising
   claim. Replace them with real, permissioned quotes and delete the gate.

Service pricing (`lib/services.ts`, `lib/holiday-home.ts`) is still invented
placeholder numbers and needs partner rate cards — see `HANDOVER.md`.

---

## Database

Already applied to the cloud project — the leads table exists and the public
form works. If you ever need to re-run it against a fresh database:

```
node scripts/apply-migration.mjs supabase/migrations/0001_concierge_leads.sql
```

Two checks that assert the schema and the security model rather than assuming
them:

```
node scripts/verify-leads-table.mjs
node scripts/verify-anon-cannot-forge.mjs
```

The second one is the important one: it proves that a holder of the public
anon key can file an enquiry but cannot read leads back, mark one "won", or
attach a commission to it.

---

## If you would rather deploy from GitHub

`.gitignore` is set up so `.env.local` can never be committed. Verify before
pushing:

```
git init
git add -A
git status
```

`.env.local` must **not** appear in that list. Then push and connect the repo
in Netlify — it reads `netlify.toml` and configures itself.

-- Concierge lead capture.
--
-- Named concierge_leads rather than leads to be collision-safe alongside the
-- existing tables in this project's public schema.
--
-- The table carries two distinct kinds of column:
--   PUBLIC   — written by the website when a visitor submits an enquiry.
--   INTERNAL — the referral ledger: which partner the lead went to, what
--              happened, and what commission is owed. Never written by the
--              website, only by the owner.
-- The grants at the bottom enforce that split at the database level, so a
-- compromised anon key cannot forge a closed deal.

create table if not exists public.concierge_leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  service     text not null check (service in (
                'advisory','holidayHomes','netRoi',
                'relocation','maintenance','fitout','construction','mortgage')),
  full_name   text not null check (length(full_name) between 1 and 200),
  phone       text not null check (length(phone) between 5 and 40),
  email       text check (email is null or length(email) <= 320),
  notes       text check (notes is null or length(notes) <= 4000),
  -- Must list every locale the site ships. This previously allowed only
  -- en/ar/ru, which would have rejected a Chinese visitor's enquiry outright
  -- once zh went live — a silent lost lead, not a visible error.
  locale      text not null default 'en' check (locale in (
                'en','ar','ru','zh','fr','hi','ur','ja','th','id')),
  currency    text not null default 'AED' check (currency in ('AED','USD','EUR','GBP')),
  -- Widget state carried in from whichever calculator opened the drawer
  payload     jsonb not null default '{}'::jsonb,
  source      text,
  user_agent  text,

  /* ---- Referral ledger (internal) --------------------------------------
     This is a referral business: leads are introduced to partner firms and
     earn a commission. Without these columns the table is an inbox, not a
     ledger, and there is no record of what is owed. */
  partner           text,          -- firm the lead was introduced to
  referred_at       timestamptz,
  status            text not null default 'new' check (status in (
                      'new','referred','contacted','quoted','won','lost')),
  commission_aed    numeric(12,2) check (commission_aed is null or commission_aed >= 0),
  commission_paid_at timestamptz,
  internal_notes    text
);

create index if not exists concierge_leads_created_at_idx
  on public.concierge_leads (created_at desc);

create index if not exists concierge_leads_service_idx
  on public.concierge_leads (service, created_at desc);

-- The two questions actually asked of a referral ledger: what needs chasing,
-- and what has each partner produced.
create index if not exists concierge_leads_status_idx
  on public.concierge_leads (status, created_at desc);

create index if not exists concierge_leads_partner_idx
  on public.concierge_leads (partner, created_at desc)
  where partner is not null;

alter table public.concierge_leads enable row level security;

-- Insert-only, and nothing else. With no select/update/delete policy, a
-- holder of the anon key can file an enquiry but can never read one back —
-- reading returns zero rows even with a valid key. This is what makes it
-- safe for the publishable anon key to reach this table at all.
drop policy if exists concierge_leads_insert_only on public.concierge_leads;
create policy concierge_leads_insert_only
  on public.concierge_leads
  for insert
  to anon
  with check (true);

/* RLS decides WHICH ROWS may be written; it does not restrict WHICH COLUMNS.
   Without the grants below, anyone holding the anon key could insert a row
   already marked status='won' with a commission attached, corrupting the
   ledger. Column-level privileges are the only thing that prevents it. */
revoke all on public.concierge_leads from anon;
grant insert (
  service, full_name, phone, email, notes,
  locale, currency, payload, source, user_agent
) on public.concierge_leads to anon;

comment on table public.concierge_leads is
  'Website enquiries. Public columns are insert-only for anon via RLS plus column grants; the referral ledger columns (partner, status, commission) are writable only with the service role.';

-- Dubai compliance and operations: KYC/AML, agent licences, listing permits,
-- deal milestones, VAT invoices, tenancies, lead response time, portal spend.
-- Additive only. Same model as 0002: RLS on, no policies, service role only.

-- 1. KYC / AML ---------------------------------------------------------------
create table if not exists public.crm_kyc (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  contact_id          uuid not null unique references public.crm_contacts(id) on delete cascade,
  owner_id            uuid references public.crm_users(id) on delete set null,
  party_type          text not null default 'individual' check (party_type in ('individual','company')),
  legal_name          text,
  nationality         text,
  date_of_birth       date,
  emirates_id_no      text,
  emirates_id_expiry  date,
  passport_no         text,
  passport_expiry     date,
  trade_license_no    text,
  trade_license_expiry date,
  ubo_details         text,
  id_doc_url          text check (id_doc_url is null or id_doc_url ~ '^https?://'),
  passport_doc_url    text check (passport_doc_url is null or passport_doc_url ~ '^https?://'),
  is_pep              boolean,
  pep_details         text,
  sanctions_result    text not null default 'pending' check (sanctions_result in ('pending','clear','match')),
  sanctions_checked_at timestamptz,
  screened_by         uuid references public.crm_users(id) on delete set null,
  source_of_funds     text,
  payment_method      text check (payment_method is null or payment_method in ('transfer','cheque','mortgage','cash','crypto','mixed')),
  risk_rating         text check (risk_rating is null or risk_rating in ('low','medium','high')),
  status              text not null default 'incomplete' check (status in ('incomplete','complete','approved')),
  approved_by         uuid references public.crm_users(id) on delete set null,
  approved_at         timestamptz,
  notes               text
);
create index if not exists crm_kyc_owner_idx on public.crm_kyc (owner_id);

-- 2. Agent licences -------------------------------------------------------------
alter table public.crm_users
  add column if not exists brn_no             text,
  add column if not exists brn_expiry         date,
  add column if not exists visa_expiry        date,
  add column if not exists emirates_id_expiry date,
  add column if not exists rera_cert_date     date;

-- 3. Listing permits ------------------------------------------------------------
alter table public.crm_listings
  add column if not exists permit_expiry    date,
  add column if not exists permit_price_aed numeric(14,2) check (permit_price_aed is null or permit_price_aed >= 0),
  add column if not exists permit_agent_id  uuid references public.crm_users(id) on delete set null,
  add column if not exists dld_unit_no      text;

-- 4. Deal milestones, off-plan, goAML, KYC gate --------------------------------
alter table public.crm_deals
  add column if not exists milestones          jsonb not null default '{}'::jsonb,
  add column if not exists noc_expiry          date,
  add column if not exists transfer_at         timestamptz,
  add column if not exists developer           text,
  add column if not exists project             text,
  add column if not exists unit_no             text,
  add column if not exists spa_signed_at       date,
  add column if not exists oqood_no            text,
  add column if not exists payment_plan        jsonb not null default '[]'::jsonb,
  add column if not exists commission_trigger_pct numeric(5,2),
  add column if not exists developer_invoice_status text check (developer_invoice_status is null or developer_invoice_status in ('not_due','sent','paid')),
  add column if not exists payment_method      text check (payment_method is null or payment_method in ('transfer','cheque','mortgage','cash','crypto','mixed')),
  add column if not exists cash_amount_aed     numeric(14,2) check (cash_amount_aed is null or cash_amount_aed >= 0),
  add column if not exists goaml_required      boolean not null default false,
  add column if not exists goaml_ref           text,
  add column if not exists goaml_reported_at   timestamptz,
  add column if not exists kyc_override_reason text;

-- 5. VAT invoices -----------------------------------------------------------------
create table if not exists public.crm_invoices (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  number        text not null unique,
  deal_id       uuid references public.crm_deals(id) on delete set null,
  bill_to_name  text not null,
  bill_to_trn   text,
  bill_to_address text,
  description   text not null,
  net_aed       numeric(14,2) not null check (net_aed >= 0),
  vat_pct       numeric(5,2) not null default 5,
  vat_aed       numeric(14,2) not null default 0,
  total_aed     numeric(14,2) not null default 0,
  issue_date    date not null default current_date,
  due_date      date,
  status        text not null default 'draft' check (status in ('draft','sent','paid','void')),
  paid_aed      numeric(14,2) not null default 0,
  paid_at       date,
  notes         text
);
create index if not exists crm_invoices_status_idx on public.crm_invoices (status, issue_date desc);

-- 6. Tenancies ----------------------------------------------------------------------
create table if not exists public.crm_tenancies (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  deal_id             uuid references public.crm_deals(id) on delete set null,
  listing_id          uuid references public.crm_listings(id) on delete set null,
  landlord_contact_id uuid references public.crm_contacts(id) on delete set null,
  tenant_contact_id   uuid references public.crm_contacts(id) on delete set null,
  agent_id            uuid references public.crm_users(id) on delete set null,
  property_label      text not null,
  start_date          date not null,
  end_date            date not null,
  annual_rent_aed     numeric(14,2) not null check (annual_rent_aed >= 0),
  cheques_count       int check (cheques_count is null or cheques_count between 1 and 12),
  security_deposit_aed numeric(14,2),
  ejari_no            text,
  ejari_expiry        date,
  cheques             jsonb not null default '[]'::jsonb,
  status              text not null default 'active' check (status in ('active','renewing','renewed','ended')),
  renewal_notice_sent_at date,
  notes               text
);
create index if not exists crm_tenancies_end_idx on public.crm_tenancies (end_date);
create index if not exists crm_tenancies_agent_idx on public.crm_tenancies (agent_id);

-- 7. Response time and portal spend -------------------------------------------------
alter table public.concierge_leads add column if not exists first_response_at timestamptz;

create table if not exists public.crm_source_spend (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  month      date not null,
  source     text not null,
  amount_aed numeric(14,2) not null check (amount_aed >= 0),
  notes      text,
  unique (month, source)
);

alter table public.crm_kyc          enable row level security;
alter table public.crm_invoices     enable row level security;
alter table public.crm_tenancies    enable row level security;
alter table public.crm_source_spend enable row level security;
revoke all on public.crm_kyc, public.crm_invoices, public.crm_tenancies, public.crm_source_spend from anon, authenticated;

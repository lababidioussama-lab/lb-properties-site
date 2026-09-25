-- Temp/cold-call leads, partnership (co-broker) tracking, listing performance,
-- call duration, and a saved WhatsApp campaign log.

create table if not exists public.crm_temp_leads (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name  text not null check (length(full_name) between 1 and 200),
  phone      text not null check (length(phone) between 5 and 40),
  source     text,
  status     text not null default 'to_call' check (status in (
               'to_call','call_back','called_done','interested','not_interested',
               'wrong_number','do_not_call','it_is_agent','pre_exist','sold_rented')),
  notes      text,
  owner_id   uuid references public.crm_users(id) on delete set null
);
create index if not exists crm_temp_leads_owner_idx on public.crm_temp_leads (owner_id, status);

alter table public.concierge_leads
  add column if not exists partner_agency   text,
  add column if not exists partner_split_pct numeric(5,2) check (partner_split_pct is null or partner_split_pct between 0 and 100),
  add column if not exists partner_approved boolean not null default false;

alter table public.crm_listings
  add column if not exists off_market       boolean not null default false,
  add column if not exists low_performing   boolean not null default false,
  add column if not exists price_reduced_at timestamptz,
  add column if not exists price_was_aed    numeric(14,2);

alter table public.crm_activities
  add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds >= 0);

create table if not exists public.crm_campaigns (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid references public.crm_users(id) on delete set null,
  message     text not null,
  recipients  integer not null default 0
);

alter table public.crm_temp_leads enable row level security;
alter table public.crm_campaigns  enable row level security;
revoke all on public.crm_temp_leads, public.crm_campaigns from anon, authenticated;

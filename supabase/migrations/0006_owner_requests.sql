create table if not exists public.crm_owner_requests (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  owner_name       text not null check (length(owner_name) between 1 and 200),
  phone            text not null check (length(phone) between 5 and 40),
  email            text,
  purpose          text not null default 'sale' check (purpose in ('sale','rent')),
  property_type    text,
  community        text,
  building         text,
  asking_price_aed numeric(14,2) check (asking_price_aed is null or asking_price_aed >= 0),
  notes            text,
  status           text not null default 'new' check (status in ('new','in_progress','listed','declined')),
  owner_id         uuid references public.crm_users(id) on delete set null,
  listing_id       uuid references public.crm_listings(id) on delete set null
);
create index if not exists crm_owner_requests_owner_idx on public.crm_owner_requests (owner_id, created_at desc);
create index if not exists crm_owner_requests_status_idx on public.crm_owner_requests (status, created_at desc);

alter table public.crm_owner_requests enable row level security;
revoke all on public.crm_owner_requests from anon, authenticated;

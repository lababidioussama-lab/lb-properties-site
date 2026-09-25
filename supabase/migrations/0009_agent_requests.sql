create table if not exists public.crm_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null references public.crm_users(id) on delete cascade,
  kind        text not null check (kind in ('sim_esim', 'video_shoot', 'document', 'other')),
  title       text not null check (length(title) between 1 and 200),
  details     text,
  listing_id  uuid references public.crm_listings(id) on delete set null,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'done', 'rejected')),
  admin_note  text
);
create index if not exists crm_requests_user_idx on public.crm_requests (user_id, created_at desc);
create index if not exists crm_requests_status_idx on public.crm_requests (status, created_at desc);

alter table public.crm_requests enable row level security;
revoke all on public.crm_requests from anon, authenticated;

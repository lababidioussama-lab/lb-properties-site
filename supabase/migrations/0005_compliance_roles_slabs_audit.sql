-- Listing compliance + manager approval, contact roles/statuses,
-- agent commission slabs and quarterly targets, and an audit log.

alter table public.crm_listings
  add column if not exists ref_code       text unique,
  add column if not exists form_a_start   date,
  add column if not exists form_a_end     date,
  add column if not exists permit_status  text not null default 'none'
    check (permit_status in ('none','under_process','approved','expired')),
  add column if not exists approval       text not null default 'pending'
    check (approval in ('pending','approved','rejected')),
  add column if not exists approval_note  text,
  add column if not exists key_status     text,
  add column if not exists exclusive      boolean not null default false;

alter table public.crm_contacts
  add column if not exists roles  text[] not null default '{}',
  add column if not exists status text not null default 'need_to_validate'
    check (status in ('need_to_validate','validated','serious','motivated','vip','not_serious','unrealistic','wrong_client','blocked','archived'));

alter table public.crm_users
  add column if not exists slab_pct             numeric(5,2) not null default 50 check (slab_pct between 0 and 100),
  add column if not exists quarterly_target_aed numeric(14,2) check (quarterly_target_aed is null or quarterly_target_aed >= 0);

create table if not exists public.crm_audit (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid references public.crm_users(id) on delete set null,
  entity     text not null,
  entity_id  text,
  action     text not null,
  detail     jsonb not null default '{}'::jsonb
);
create index if not exists crm_audit_created_idx on public.crm_audit (created_at desc);
create index if not exists crm_audit_entity_idx on public.crm_audit (entity, entity_id);

alter table public.crm_audit enable row level security;
revoke all on public.crm_audit from anon, authenticated;

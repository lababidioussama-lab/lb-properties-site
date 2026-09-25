-- Lead lifecycle: requirements, SLA expiry + open pool, star, disqualify reasons,
-- and a 'system' activity kind for audit entries (claims, releases, reveals, expiry).

alter table public.concierge_leads
  add column if not exists deal_kind      text check (deal_kind is null or deal_kind in ('sale','rent')),
  add column if not exists property_type  text,
  add column if not exists beds           text,
  add column if not exists budget_aed     numeric(14,2) check (budget_aed is null or budget_aed >= 0),
  add column if not exists location       text,
  add column if not exists ready_status   text check (ready_status is null or ready_status in ('ready','offplan','any')),
  add column if not exists medium         text,
  add column if not exists starred        boolean not null default false,
  add column if not exists expires_at     timestamptz,
  add column if not exists lost_reason    text;

create index if not exists concierge_leads_expiry_idx
  on public.concierge_leads (expires_at) where expires_at is not null;

alter table public.crm_activities drop constraint if exists crm_activities_kind_check;
alter table public.crm_activities add constraint crm_activities_kind_check
  check (kind in ('note','call','whatsapp','email','meeting','stage','system'));

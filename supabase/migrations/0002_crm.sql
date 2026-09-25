-- CRM: team accounts, pipeline, contacts, properties, activity log, tasks.
--
-- Every CRM table has RLS enabled and NO policies, so the anon key (which the
-- public website holds) cannot read or write any of it. Only the service-role
-- key, used by /api/crm routes after checking the session, reaches these
-- tables. Per-agent visibility is enforced in those routes.

create table if not exists public.crm_users (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  email         text not null unique check (email = lower(email)),
  full_name     text not null,
  role          text not null default 'agent' check (role in ('admin','agent')),
  password_hash text not null,
  active        boolean not null default true
);

create table if not exists public.crm_contacts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  full_name   text not null,
  phone       text,
  email       text,
  nationality text,
  kind        text not null default 'buyer'
                check (kind in ('buyer','seller','landlord','tenant','investor','other')),
  owner_id    uuid references public.crm_users(id) on delete set null,
  notes       text
);
create index if not exists crm_contacts_owner_idx on public.crm_contacts (owner_id);
create index if not exists crm_contacts_phone_idx on public.crm_contacts (phone);

create table if not exists public.crm_properties (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  contact_id  uuid not null references public.crm_contacts(id) on delete cascade,
  relation    text not null default 'wants' check (relation in ('owns','wants')),
  community   text,
  building    text,
  unit        text,
  bedrooms    text,
  price_aed   numeric(14,2) check (price_aed is null or price_aed >= 0),
  notes       text
);
create index if not exists crm_properties_contact_idx on public.crm_properties (contact_id);

-- The website's enquiries become pipeline deals.
alter table public.concierge_leads
  add column if not exists stage text not null default 'new'
    check (stage in ('new','contacted','viewing','offer','won','lost')),
  add column if not exists owner_id uuid references public.crm_users(id) on delete set null,
  add column if not exists contact_id uuid references public.crm_contacts(id) on delete set null,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists deal_value_aed numeric(14,2);
create index if not exists concierge_leads_stage_idx on public.concierge_leads (stage, created_at desc);
create index if not exists concierge_leads_owner_idx on public.concierge_leads (owner_id);

-- 'holidayHomes' is no longer offered, but old rows may carry it; the CHECK
-- stays permissive so history is not rejected.

create table if not exists public.crm_activities (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lead_id     uuid references public.concierge_leads(id) on delete cascade,
  contact_id  uuid references public.crm_contacts(id) on delete cascade,
  user_id     uuid references public.crm_users(id) on delete set null,
  kind        text not null check (kind in ('note','call','whatsapp','email','meeting','stage')),
  body        text not null check (length(body) between 1 and 4000)
);
create index if not exists crm_activities_lead_idx on public.crm_activities (lead_id, created_at desc);
create index if not exists crm_activities_contact_idx on public.crm_activities (contact_id, created_at desc);

create table if not exists public.crm_tasks (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  title        text not null check (length(title) between 1 and 300),
  due_at       timestamptz,
  done_at      timestamptz,
  assignee_id  uuid references public.crm_users(id) on delete set null,
  created_by   uuid references public.crm_users(id) on delete set null,
  lead_id      uuid references public.concierge_leads(id) on delete cascade,
  contact_id   uuid references public.crm_contacts(id) on delete cascade
);
create index if not exists crm_tasks_assignee_idx on public.crm_tasks (assignee_id, done_at, due_at);

alter table public.crm_users      enable row level security;
alter table public.crm_contacts   enable row level security;
alter table public.crm_properties enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_tasks      enable row level security;

revoke all on public.crm_users, public.crm_contacts, public.crm_properties,
              public.crm_activities, public.crm_tasks from anon, authenticated;

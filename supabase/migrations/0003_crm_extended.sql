-- Listings, deals & commissions, calendar, WhatsApp templates, lead sources.
-- Same model as 0002: RLS on, no policies, reachable only via the service role.

create table if not exists public.crm_listings (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  title            text not null check (length(title) between 1 and 200),
  purpose          text not null default 'sale' check (purpose in ('sale','rent')),
  property_type    text not null default 'apartment'
                     check (property_type in ('apartment','villa','townhouse','penthouse','plot','office','retail')),
  community        text,
  building         text,
  unit             text,
  bedrooms         text,
  size_sqft        numeric(10,2) check (size_sqft is null or size_sqft >= 0),
  price_aed        numeric(14,2) check (price_aed is null or price_aed >= 0),
  permit_no        text,
  status           text not null default 'available'
                     check (status in ('available','reserved','sold','rented','off_market')),
  owner_contact_id uuid references public.crm_contacts(id) on delete set null,
  agent_id         uuid references public.crm_users(id) on delete set null,
  description      text,
  photos           text[] not null default '{}'
);
create index if not exists crm_listings_agent_idx on public.crm_listings (agent_id);
create index if not exists crm_listings_status_idx on public.crm_listings (status, created_at desc);

create table if not exists public.crm_deals (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  title            text not null,
  deal_type        text not null default 'sale' check (deal_type in ('sale','rent','offplan')),
  lead_id          uuid references public.concierge_leads(id) on delete set null,
  listing_id       uuid references public.crm_listings(id) on delete set null,
  contact_id       uuid references public.crm_contacts(id) on delete set null,
  agent_id         uuid references public.crm_users(id) on delete set null,
  price_aed        numeric(14,2) not null default 0 check (price_aed >= 0),
  commission_pct   numeric(5,2) not null default 2 check (commission_pct between 0 and 100),
  agent_split_pct  numeric(5,2) not null default 50 check (agent_split_pct between 0 and 100),
  closed_at        date not null default current_date,
  paid_at          date,
  notes            text
);
create index if not exists crm_deals_agent_idx on public.crm_deals (agent_id, closed_at desc);

create table if not exists public.crm_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  title       text not null check (length(title) between 1 and 200),
  kind        text not null default 'viewing' check (kind in ('viewing','meeting','call','handover')),
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  status      text not null default 'scheduled' check (status in ('scheduled','done','cancelled')),
  agent_id    uuid references public.crm_users(id) on delete set null,
  lead_id     uuid references public.concierge_leads(id) on delete set null,
  contact_id  uuid references public.crm_contacts(id) on delete set null,
  listing_id  uuid references public.crm_listings(id) on delete set null,
  location    text,
  notes       text
);
create index if not exists crm_events_agent_idx on public.crm_events (agent_id, starts_at);

create table if not exists public.crm_templates (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (length(name) between 1 and 80),
  body        text not null check (length(body) between 1 and 2000)
);

insert into public.crm_templates (name, body)
select * from (values
  ('First reply', 'Hello {name}, thank you for contacting Lababidi Properties. I''m {agent} and I''ll be helping you. When is a good time to speak?'),
  ('Follow-up', 'Hi {name}, just following up on your enquiry. Are you still looking? I have a few options that may suit you.'),
  ('Viewing confirmation', 'Hi {name}, your viewing is confirmed. I''ll share the location pin shortly. See you there, {agent} - Lababidi Properties'),
  ('Send brochure', 'Hi {name}, as promised here is the brochure and payment plan. Let me know if you have any questions.')
) as seed(name, body)
where not exists (select 1 from public.crm_templates);

alter table public.crm_listings  enable row level security;
alter table public.crm_deals     enable row level security;
alter table public.crm_events    enable row level security;
alter table public.crm_templates enable row level security;
revoke all on public.crm_listings, public.crm_deals, public.crm_events, public.crm_templates
  from anon, authenticated;

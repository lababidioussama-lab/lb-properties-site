alter table public.crm_users add column if not exists avatar_url text;

create table if not exists public.crm_agent_documents (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null references public.crm_users(id) on delete cascade,
  title      text not null check (length(title) between 1 and 200),
  url        text not null check (url ~ '^https?://'),
  kind       text not null default 'other' check (kind in ('id', 'visa', 'license', 'contract', 'other'))
);
create index if not exists crm_agent_documents_user_idx on public.crm_agent_documents (user_id, created_at desc);

alter table public.crm_agent_documents enable row level security;
revoke all on public.crm_agent_documents from anon, authenticated;

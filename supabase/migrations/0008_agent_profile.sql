alter table public.crm_users
  add column if not exists phone       text,
  add column if not exists languages   text,
  add column if not exists specialties text,
  add column if not exists bio         text;

-- Agent documents can now be real uploads, stored privately and served through
-- /api/crm/file (see lib/crm-files.ts), not only external https links.
alter table public.crm_agent_documents drop constraint if exists crm_agent_documents_url_check;
alter table public.crm_agent_documents add constraint crm_agent_documents_url_check
  check (url ~ '^https?://' or url ~ '^/api/crm/file\?p=docs%2F[0-9a-f-]{36}%2F[0-9a-f]{32}\.(pdf|jpg|png|webp|heic)$');

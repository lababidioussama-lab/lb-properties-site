-- Private file storage for the CRM: profile photos and agent documents.
-- Additive only. The bucket is private and has no storage policies, so the
-- anon/authenticated roles cannot read or write it; every access goes through
-- /api/crm/upload and /api/crm/file, which check the CRM session first.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crm-files', 'crm-files', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
on conflict (id) do nothing;

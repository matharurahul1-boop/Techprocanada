-- Run this once in the Supabase SQL Editor for project sagjxhxtkqtbzzhudggj.
-- Creates every storage bucket the app uploads files into, with the same access rules
-- as the individual setup files (jobs_setup.sql, mii_inspections_setup.sql,
-- order_documents_setup.sql). Safe to run again: existing buckets and policies are kept
-- or replaced with the same rules.
--
--   packing-slips         Job page: packing slips
--   inspection-documents  Inspections: supporting documents
--   order-documents       Tools Order Log / Inventory Items: order documents
--
-- All three are private: only signed-in users can read, upload or delete, and files are
-- opened through short-lived signed links.

insert into storage.buckets (id, name, public)
values
  ('packing-slips', 'packing-slips', false),
  ('inspection-documents', 'inspection-documents', false),
  ('order-documents', 'order-documents', false)
on conflict (id) do nothing;

-- Packing slips
drop policy if exists "authenticated read packing slips" on storage.objects;
create policy "authenticated read packing slips" on storage.objects
  for select to authenticated using (bucket_id = 'packing-slips');
drop policy if exists "authenticated write packing slips" on storage.objects;
create policy "authenticated write packing slips" on storage.objects
  for insert to authenticated with check (bucket_id = 'packing-slips');
drop policy if exists "authenticated delete packing slips" on storage.objects;
create policy "authenticated delete packing slips" on storage.objects
  for delete to authenticated using (bucket_id = 'packing-slips');

-- Inspection documents
drop policy if exists "authenticated read inspection documents" on storage.objects;
create policy "authenticated read inspection documents" on storage.objects
  for select to authenticated using (bucket_id = 'inspection-documents');
drop policy if exists "authenticated write inspection documents" on storage.objects;
create policy "authenticated write inspection documents" on storage.objects
  for insert to authenticated with check (bucket_id = 'inspection-documents');
drop policy if exists "authenticated delete inspection documents" on storage.objects;
create policy "authenticated delete inspection documents" on storage.objects
  for delete to authenticated using (bucket_id = 'inspection-documents');

-- Order documents
drop policy if exists "authenticated read order documents" on storage.objects;
create policy "authenticated read order documents" on storage.objects
  for select to authenticated using (bucket_id = 'order-documents');
drop policy if exists "authenticated write order documents" on storage.objects;
create policy "authenticated write order documents" on storage.objects
  for insert to authenticated with check (bucket_id = 'order-documents');
drop policy if exists "authenticated delete order documents" on storage.objects;
create policy "authenticated delete order documents" on storage.objects
  for delete to authenticated using (bucket_id = 'order-documents');

-- Shows the buckets afterwards, so you can see all three exist.
select id, public from storage.buckets order by id;

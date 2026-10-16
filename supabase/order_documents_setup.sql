-- Run this once in the Supabase SQL Editor for project sagjxhxtkqtbzzhudggj.
-- Private storage bucket for tool order documents (invoices, quotes), so a document
-- attached to an order can be opened from the Tools Order Log. Orders store the file's
-- path in inventory_orders.document_name; older orders only have a file name there.

insert into storage.buckets (id, name, public)
values ('order-documents', 'order-documents', false)
on conflict (id) do nothing;

drop policy if exists "authenticated read order documents" on storage.objects;
create policy "authenticated read order documents" on storage.objects
  for select to authenticated using (bucket_id = 'order-documents');

drop policy if exists "authenticated write order documents" on storage.objects;
create policy "authenticated write order documents" on storage.objects
  for insert to authenticated with check (bucket_id = 'order-documents');

drop policy if exists "authenticated delete order documents" on storage.objects;
create policy "authenticated delete order documents" on storage.objects
  for delete to authenticated using (bucket_id = 'order-documents');

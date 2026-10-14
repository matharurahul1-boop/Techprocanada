-- Optional: copies the old system's jobs into the "Jobs New" page (public.mii_job_number).
-- Run in the Supabase SQL Editor after:
--   1. supabase/mii_job_number_legacy_setup.sql  (gives the table the old layout)
--   2. supabase/legacy/data/legacy_import.sql    (the old data, in the legacy schema)
--   3. supabase/legacy/legacy_to_app.sql         (creates the companies this links to)
--
-- Every column is copied as it is, except: the company is linked to the matching
-- imported company, and `po` (an id in the old purchase-order table, which doesn't
-- exist here) is left blank. Each row remembers the old row in legacy_id, so running
-- this again adds nothing twice. One transaction: any error and nothing is changed.

begin;

alter table public.mii_job_number add column if not exists legacy_id integer unique;
comment on column public.mii_job_number.legacy_id is 'mii_job_number.id in the old MySQL system';

insert into public.mii_job_number (
  legacy_id, created_at, updated_at, created_by, updated_by, job_no, due_date, no_of_items,
  completed_items, status, days_left_behind, inspection_report, inspection, shipped_date,
  packing_slip, po_no, company, amount, currency, po_amount, "date", essential, remarks,
  packing_slips
)
select
  l.id,
  l.created_at,
  l.updated_at,
  u_created.id,
  u_updated.id,
  coalesce(btrim(l.job_no), ''),
  l.due_date,
  l.no_of_items,
  l.completed_items,
  -- Codes outside the known list are left blank rather than rejected.
  case when l.status in (1, 2, 3, 5, 6, 7, 8) then l.status end,
  l.days_left_behind,
  l.inspection_report,
  coalesce(l.inspection, false),
  l.shipped_date,
  l.packing_slip,
  coalesce(btrim(l.po_no), ''),
  c.id,
  l.amount,
  l.currency,
  l.po_amount,
  l."date",
  coalesce(l.essential, false),
  coalesce(legacy.plain_text(l.remarks), ''),
  l.packing_slips
from legacy.mii_job_number l
left join public.companies c on c.legacy_id = l.company
left join public.app_users u_created on u_created.id = l.created_by
left join public.app_users u_updated on u_updated.id = l.updated_by
on conflict (legacy_id) do nothing;

select count(*) as jobs_new_from_old_system from public.mii_job_number where legacy_id is not null;

commit;

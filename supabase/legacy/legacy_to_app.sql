-- Moves the old system's job data from the "legacy" schema into the app's tables.
-- Run in the Supabase SQL Editor for project sagjxhxtkqtbzzhudggj, in this order:
--   1. supabase/machining_hours_time_setup.sql   (adds hours and quantity to Machining Hours)
--   2. supabase/legacy/data/legacy_import.sql    (made by convert-mysql-dump.mjs)
--   3. this file
--
-- What goes where:
--   legacy.mii_company_details -> companies          (customers)
--   legacy.mii_job_number      -> jobs               (the Job page)
--   legacy.mii_orders_details  -> mii_order_details
--   legacy.mii_machining_hours -> machining_hours
--   legacy.mii_quoted_hours    -> quoted_hours
-- Not moved yet: mii_inspections and packing slips (their files are on the old CDN),
-- and the job fields the app has no place for (amount, currency, PO amount, essential,
-- remarks) - they stay in the legacy schema.
--
-- Users and machines are not copied: supabase/data_migration.sql already created
-- app_users and machines with the old system's ids, so those ids are used as they are
-- (an id the app no longer has is left blank).
--
-- Each new row records the old row it came from in legacy_id, so running this file again
-- adds nothing twice. It runs as one transaction: any error and nothing is changed.

begin;

-- ── Checks before anything is written ──────────────────────────────────────

do $$
begin
  if to_regclass('legacy.mii_job_number') is null
     or to_regclass('legacy.mii_company_details') is null then
    raise exception 'Run legacy_import.sql first (with the mii_company_details dump included).';
  end if;
  -- Status numbers this file knows; anything else would be imported under the wrong status.
  if exists (select 1 from legacy.mii_job_number where status is not null and status not in (1, 2, 3, 5, 6, 7, 8)) then
    raise exception 'legacy.mii_job_number has a status number with no mapping below.';
  end if;
  if exists (select 1 from legacy.mii_orders_details where order_status is not null and order_status not in (1, 2, 5, 7)) then
    raise exception 'legacy.mii_orders_details has an order_status number with no mapping below.';
  end if;
end $$;

-- ── Link back to the old rows ──────────────────────────────────────────────

alter table public.companies add column if not exists legacy_id integer unique;
alter table public.jobs add column if not exists legacy_id integer unique;
alter table public.mii_order_details add column if not exists legacy_id integer unique;
alter table public.machining_hours add column if not exists legacy_id integer unique;
alter table public.quoted_hours add column if not exists legacy_id integer unique;

comment on column public.companies.legacy_id is 'mii_company_details.id in the old MySQL system';
comment on column public.jobs.legacy_id is 'mii_job_number.id in the old MySQL system';
comment on column public.mii_order_details.legacy_id is 'mii_orders_details.id in the old MySQL system';
comment on column public.machining_hours.legacy_id is 'mii_machining_hours.id in the old MySQL system';
comment on column public.quoted_hours.legacy_id is 'mii_quoted_hours.id in the old MySQL system';

-- The old system stored rich text (<p>…</p>, &nbsp;) in some text fields.
create or replace function legacy.plain_text(value text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(
    replace(replace(replace(
      regexp_replace(regexp_replace(coalesce(value, ''), '<br\s*/?>|</p>', ' ', 'gi'), '<[^>]*>', '', 'g'),
      '&nbsp;', ' '), '&amp;', '&'), '&#39;', ''''),
    '\s+', ' ', 'g'))
$$;

-- ── Companies ──────────────────────────────────────────────────────────────

insert into public.companies (legacy_id, name, priority, address, contact_number)
select
  d.id,
  btrim(d.company_name),
  -- Old priority numbers -> app priority. CHECK THIS MAPPING before running.
  case d.priority when 3 then 'High' when 2 then 'Modest' else 'Low' end,
  coalesce(btrim(d.address), ''),
  coalesce(btrim(d.contact_number), '')
from legacy.mii_company_details d
where coalesce(btrim(d.company_name), '') <> ''
on conflict (legacy_id) do nothing;

-- ── Jobs ───────────────────────────────────────────────────────────────────

insert into public.jobs (
  legacy_id, company_id, job_number, job_date, due_date, number_of_items, completed_items,
  job, status, po_number, ship_date, priority
)
select
  j.id,
  c.id,
  coalesce(btrim(j.job_no), ''),
  j."date",
  j.due_date,
  coalesce(j.no_of_items, 0),
  coalesce(j.completed_items, 0),
  '',
  -- The old system's job status codes.
  case j.status
    when 1 then 'In Progress'
    when 2 then 'Completed'
    when 5 then 'Mistake'
    when 6 then 'Shipped'
    when 7 then 'Requires Attention'
    when 8 then 'Partially Completed'
    else 'Not Started' -- 3, or no status
  end,
  coalesce(btrim(j.po_no), ''),
  j.shipped_date,
  false
from legacy.mii_job_number j
left join public.companies c on c.legacy_id = j.company
on conflict (legacy_id) do nothing;

-- ── MII order details (drawings) ───────────────────────────────────────────

insert into public.mii_order_details (
  legacy_id, job_id, drawing_number, drawing_name, quantity, quantity_completed, order_status,
  completed, completed_date, inspected, shipment, shipment_date, remarks,
  quoted_minutes, actual_minutes
)
select
  d.id,
  j.id,
  coalesce(btrim(d.drawing_no), ''),
  coalesce(nullif(btrim(d.drawing_name), ''), legacy.plain_text(d.description)),
  coalesce(d.qty, 0),
  coalesce(d.qty_completed, 0),
  case d.order_status
    when 2 then 'Completed'
    when 5 then 'In Progress'
    when 7 then 'Shipped'
    else 'Not Started' -- 1, or no status
  end,
  coalesce(d.completed, false),
  d.completed_date,
  coalesce(d.inspected, false),
  coalesce(d.shipment, false),
  d.shipment_date,
  legacy.plain_text(d.remarks),
  -- Hours -> whole minutes (the app shows them as h:mm).
  case when d.quoted_hours >= 0 then round(d.quoted_hours * 60)::integer end,
  case when d.actual_hours >= 0 then round(d.actual_hours * 60)::integer end
from legacy.mii_orders_details d
left join public.jobs j on j.legacy_id = d.job_no
on conflict (legacy_id) do nothing;

-- ── Machining hours ────────────────────────────────────────────────────────

insert into public.machining_hours (
  legacy_id, work_date, user_id, machine_id, description, job_id, drawing_number,
  duration_minutes, quantity
)
select
  m.id,
  m."date",
  u.id,
  mc.id,
  legacy.plain_text(m.description),
  j.id,
  -- The old row points at a drawing row; the app stores its drawing number.
  coalesce(btrim(d.drawing_no), ''),
  case when m.job_hrs >= 0 then round(m.job_hrs * 60)::integer end,
  case when m.quantity >= 0 then m.quantity end
from legacy.mii_machining_hours m
left join public.app_users u on u.id = m."user"
left join public.machines mc on mc.id = m.machine
left join public.jobs j on j.legacy_id = m.job_no
left join legacy.mii_orders_details d on d.id = m.drawing_no
on conflict (legacy_id) do nothing;

-- ── Quoted hours ───────────────────────────────────────────────────────────

insert into public.quoted_hours (
  legacy_id, job_id, drawing_number, quantity, machine_id, job_hours, rate, description,
  time_remaining
)
select
  q.id,
  j.id,
  coalesce(btrim(d.drawing_no), ''),
  coalesce(q.quantity, 0),
  mc.id,
  coalesce(q.job_hrs, 0),
  coalesce(q.rate, 0),
  legacy.plain_text(q.description),
  legacy.plain_text(q.time_remarks)
from legacy.mii_quoted_hours q
left join public.jobs j on j.legacy_id = q.job_no
left join public.machines mc on mc.id = q.machine
left join legacy.mii_orders_details d on d.id = q.drawing_no
on conflict (legacy_id) do nothing;

-- ── What came across (shown in the SQL Editor's results) ───────────────────

select 'companies' as app_table, count(*) as from_old_system from public.companies where legacy_id is not null
union all select 'jobs', count(*) from public.jobs where legacy_id is not null
union all select 'mii_order_details', count(*) from public.mii_order_details where legacy_id is not null
union all select 'machining_hours', count(*) from public.machining_hours where legacy_id is not null
union all select 'quoted_hours', count(*) from public.quoted_hours where legacy_id is not null;

commit;

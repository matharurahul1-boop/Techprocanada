-- Run this once in the Supabase SQL Editor for project sagjxhxtkqtbzzhudggj
-- (Settings > SQL Editor > New query), after mii_job_number_setup.sql.
--
-- Reshapes public.mii_job_number (the "Jobs New" page) to match the old system's
-- mii_job_number table: its column names, the numeric status codes, and the extra
-- fields (company, date, shipped date, amount, currency, PO amount, essential,
-- inspection, remarks, packing slips, created/updated by). Existing rows are kept;
-- their text statuses are turned into codes. Safe to run again.
--
-- Status codes (the old system's dropdown):
--   1 In Progress, 2 Completed, 3 Not Started, 5 Mistake, 6 Shipped,
--   7 Requires Attention, 8 Partially Completed
-- Currency codes, as the old data suggests: 1 CAD, 2 USD.
--
-- Not carried over from the old table: the foreign key from `po` to the old
-- mii_purchase_order table (that table doesn't exist here; `po` is a plain number).

begin;

-- ── Column names as in the old table ───────────────────────────────────────

do $$
declare
  renames text[][] := array[
    array['job_number', 'job_no'],
    array['po_number', 'po_no'],
    array['number_of_items', 'no_of_items'],
    array['days_left', 'days_left_behind']
  ];
  pair text[];
begin
  foreach pair slice 1 in array renames loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'mii_job_number' and column_name = pair[1]
    ) then
      execute format('alter table public.mii_job_number rename column %I to %I', pair[1], pair[2]);
    end if;
  end loop;
end $$;

-- ── Status: text label -> the old system's code ────────────────────────────

alter table public.mii_job_number drop constraint if exists mii_job_number_status_check;

do $$
begin
  if (
    select data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'mii_job_number' and column_name = 'status'
  ) = 'text' then
    alter table public.mii_job_number alter column status drop default;
    alter table public.mii_job_number alter column status type integer using (
      case status
        when 'In Progress' then 1
        when 'Completed' then 2
        when 'Not Started' then 3
        when 'Mistake' then 5
        when 'Shipped' then 6
        when 'Requires Attention' then 7
        when 'Partially Completed' then 8
        else 3
      end
    );
  end if;
end $$;

alter table public.mii_job_number
  alter column status drop not null,
  alter column status set default 3,
  add constraint mii_job_number_status_check check (status in (1, 2, 3, 5, 6, 7, 8));

-- ── The old table's other columns ──────────────────────────────────────────

alter table public.mii_job_number
  add column if not exists updated_at timestamptz,
  add column if not exists created_by integer references public.app_users (id) on delete set null,
  add column if not exists updated_by integer references public.app_users (id) on delete set null,
  add column if not exists po integer,
  add column if not exists inspection_report text,
  add column if not exists inspection boolean not null default false,
  add column if not exists shipped_date date,
  add column if not exists packing_slip text,
  add column if not exists company integer references public.companies (id) on delete set null,
  add column if not exists amount double precision,
  add column if not exists currency integer,
  add column if not exists po_amount double precision,
  add column if not exists "date" date,
  add column if not exists essential boolean not null default false,
  add column if not exists remarks text not null default '',
  add column if not exists packing_slips jsonb;

-- Item counts may be blank, as in the old table.
alter table public.mii_job_number
  alter column no_of_items drop not null,
  alter column completed_items drop not null;

create index if not exists mii_job_number_company_idx on public.mii_job_number (company);

-- ── created/updated at and by, filled in automatically ─────────────────────

create or replace function public.mii_job_number_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor integer;
begin
  select id into actor from public.app_users where auth_user_id = auth.uid() limit 1;
  if tg_op = 'INSERT' then
    -- Rows copied from the old system keep their original stamps.
    new.created_at := coalesce(new.created_at, now());
    new.created_by := coalesce(new.created_by, actor);
    new.updated_at := coalesce(new.updated_at, now());
    new.updated_by := coalesce(new.updated_by, actor);
  else
    new.updated_at := now();
    new.updated_by := coalesce(actor, new.updated_by);
  end if;
  return new;
end $$;

drop trigger if exists mii_job_number_audit on public.mii_job_number;
create trigger mii_job_number_audit
  before insert or update on public.mii_job_number
  for each row execute function public.mii_job_number_audit();

commit;

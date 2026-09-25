-- Run this once in the Supabase SQL Editor for project sagjxhxtkqtbzzhudggj.
-- Fixes: dashboard/tables showing 0 rows for logged-in users, even though the
-- data exists. These tables had RLS enabled with no policy, so the app's
-- anon/authenticated client (src/integrations/supabase/client.ts) was
-- silently blocked from reading or writing them. This mirrors the same
-- "authenticated full access" policy already used for generated_reports
-- in reports_setup.sql.

do $$
declare
  t text;
begin
  foreach t in array array[
    'tool_types',
    'brands',
    'companies',
    'machines',
    'app_users',
    'inventory_items',
    'inventory_orders',
    'inventory_assigned',
    'timeliness_configurations'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated full access" on public.%I', t);
    execute format(
      'create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- Run once in the Supabase SQL Editor (the import has already been run).
-- The first version of legacy_to_app.sql guessed the old drawing status codes and had
-- 1 and 5 the wrong way round. The old system's own rules give the real codes:
--   1 In Progress, 2 Completed, 5 Not Started, 6 Mistake, 7 Shipped, 8 Requires Attention
-- This re-reads every imported drawing's status from the old data with those codes.
-- Only drawings that came from the old system are touched (legacy_id is set), and any
-- status changed in the app since the import is reset.

update public.mii_order_details d
set order_status = case l.order_status
    when 1 then 'In Progress'
    when 2 then 'Completed'
    when 6 then 'Mistake'
    when 7 then 'Shipped'
    when 8 then 'Requires Attention'
    else 'Not Started' -- 5, or no status
  end
from legacy.mii_orders_details l
where l.id = d.legacy_id;

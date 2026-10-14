-- Run once in the Supabase SQL Editor if legacy_to_app.sql was already run before
-- 14 Oct 2026. That version read the old job status codes wrongly (1 and 3 swapped).
-- This re-reads every imported job's status from the old data with the right codes:
--   1 In Progress, 2 Completed, 3 Not Started, 5 Mistake, 6 Shipped,
--   7 Requires Attention, 8 Partially Completed
-- Only jobs that came from the old system are touched (legacy_id is set).
-- Note: it also resets any status changed in the app since the import.

update public.jobs j
set status = case l.status
    when 1 then 'In Progress'
    when 2 then 'Completed'
    when 5 then 'Mistake'
    when 6 then 'Shipped'
    when 7 then 'Requires Attention'
    when 8 then 'Partially Completed'
    else 'Not Started' -- 3, or no status
  end
from legacy.mii_job_number l
where l.id = j.legacy_id;

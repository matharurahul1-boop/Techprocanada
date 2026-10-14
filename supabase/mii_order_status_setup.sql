-- Run this once in the Supabase SQL Editor for project sagjxhxtkqtbzzhudggj
-- (Settings > SQL Editor > New query), after mii_order_details_setup.sql.
-- Lets MII Order Details use the same statuses as jobs, adding "Partially Completed",
-- so every status dropdown offers the same list:
--   In Progress, Completed, Not Started, Mistake, Shipped, Requires Attention,
--   Partially Completed

alter table public.mii_order_details drop constraint if exists mii_order_details_order_status_check;

alter table public.mii_order_details
  add constraint mii_order_details_order_status_check check (order_status in (
    'In Progress', 'Completed', 'Not Started', 'Mistake', 'Shipped', 'Requires Attention',
    'Partially Completed'
  ));

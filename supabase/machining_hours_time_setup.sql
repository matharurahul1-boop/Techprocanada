-- Run this once in the Supabase SQL Editor for project sagjxhxtkqtbzzhudggj
-- (Settings > SQL Editor > New query), after machining_hours_setup.sql.
-- Adds the time worked and quantity to Machining Hours (the old system's job_hrs
-- and quantity), so they can be entered in the app and imported from the old data.

alter table public.machining_hours
  -- Time worked in whole minutes (shown as h:mm in the app).
  add column if not exists duration_minutes integer check (duration_minutes >= 0),
  -- Pieces worked on.
  add column if not exists quantity double precision check (quantity >= 0);

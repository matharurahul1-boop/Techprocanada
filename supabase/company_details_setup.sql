-- Run this once in the Supabase SQL Editor for project sagjxhxtkqtbzzhudggj
-- (Settings > SQL Editor > New query) to add the Company detail columns.

alter table public.companies
  add column if not exists priority text not null default 'Low',
  add column if not exists address text not null default '',
  add column if not exists contact_number text not null default '';

alter table public.companies drop constraint if exists companies_priority_check;
alter table public.companies
  add constraint companies_priority_check check (priority in ('Low', 'Modest', 'High'));

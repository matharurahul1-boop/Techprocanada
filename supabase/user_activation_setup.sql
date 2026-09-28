-- Run this once in the Supabase SQL Editor for project sagjxhxtkqtbzzhudggj.
-- Links Supabase Auth sign-ups to the app_users crew list, and adds an
-- activate/deactivate flag that blocks sign-in when off.

alter table public.app_users
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete set null,
  add column if not exists is_active boolean not null default true;

-- When someone signs up, match them to an existing crew member by name
-- (case-insensitive) so their assignment history stays attached to the
-- same app_users row. If no match exists, create a new crew record.
create or replace function public.handle_new_app_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text;
  v_matched_id bigint;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1));

  update public.app_users
  set auth_user_id = new.id
  where auth_user_id is null
    and lower(name) = lower(v_name)
  returning id into v_matched_id;

  if v_matched_id is null then
    insert into public.app_users (name, email, auth_user_id, is_active)
    values (v_name, new.email, new.id, true);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_app_user on auth.users;
create trigger on_auth_user_created_app_user
  after insert on auth.users
  for each row execute procedure public.handle_new_app_user();

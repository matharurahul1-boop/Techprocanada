-- Run this once in the Supabase SQL Editor for project sagjxhxtkqtbzzhudggj,
-- after user_activation_setup.sql. Links any auth.users accounts that
-- already existed before that migration ran (so the trigger never fired
-- for them) to the app_users crew list, same matching logic as the trigger.

do $$
declare
  u record;
  v_name text;
  v_matched_id bigint;
begin
  for u in
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    left join public.app_users pu on pu.auth_user_id = au.id
    where pu.id is null
  loop
    v_name := coalesce(nullif(trim(u.raw_user_meta_data ->> 'name'), ''), split_part(u.email, '@', 1));

    update public.app_users
    set auth_user_id = u.id
    where auth_user_id is null
      and lower(name) = lower(v_name)
    returning id into v_matched_id;

    if v_matched_id is null then
      insert into public.app_users (name, email, auth_user_id, is_active)
      values (v_name, u.email, u.id, true);
    end if;

    v_matched_id := null;
  end loop;
end $$;

-- ============================================================
-- Migration 007: Close a privilege-escalation gap on profiles
--
-- "profiles_update_own" (002_rls.sql) lets a user update their own row
-- with no column restriction, which means a plain sales_rep could call
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', myId)
-- directly and grant themselves admin. This trigger blocks any change to
-- role / organization_id / active unless the acting user is already an
-- admin — the Team page's admin-only edit controls already enforce this
-- in the UI, this makes it true at the database layer too.
-- ============================================================

create or replace function guard_profile_self_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth_role() <> 'admin' then
    if new.role is distinct from old.role
       or new.organization_id is distinct from old.organization_id
       or new.active is distinct from old.active then
      raise exception 'Only admins can change role, organization or active status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_self_update_guard on profiles;
create trigger profiles_self_update_guard
  before update on profiles
  for each row execute function guard_profile_self_update();

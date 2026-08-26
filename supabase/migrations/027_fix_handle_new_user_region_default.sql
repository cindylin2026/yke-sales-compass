-- Fix stale region default in handle_new_user(): 'US' predates the 8-value
-- region taxonomy (migration 018) and violates profiles' region CHECK
-- constraint, causing "Database error saving new user" for any invite/
-- signup that doesn't explicitly pass a region in metadata.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
begin
  v_org_id := coalesce(
    (new.raw_user_meta_data->>'organization_id')::uuid,
    (select id from organizations limit 1)
  );

  insert into profiles (id, organization_id, full_name, email, role, region, title, avatar_initials)
  values (
    new.id,
    v_org_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'sales_rep'),
    coalesce(new.raw_user_meta_data->>'region', 'Unknown'),
    new.raw_user_meta_data->>'title',
    upper(left(coalesce(new.raw_user_meta_data->>'full_name', new.email), 1)) ||
    upper(left(split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 2), 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

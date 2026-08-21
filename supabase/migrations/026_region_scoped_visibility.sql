-- 026_region_scoped_visibility.sql
--
-- Cindy (2026-08-19): sales reps should only see data from their own
-- region by default, not the whole org. Previously SELECT policies only
-- checked organization_id — any authenticated user could read every
-- account/lead/opportunity/contact regardless of role or region (only
-- UPDATE/DELETE were restricted by ownership).
--
-- New rule for accounts / leads / opportunities / contacts:
--   - manager, admin, marketing: unrestricted (need the full picture)
--   - sales_rep: can see a row if
--       • its region matches their own profile region, OR
--       • the region is 'Unknown' (un-triaged — anyone should be able
--         to find and claim it), OR
--       • they own the row (so a rep never loses visibility into
--         something assigned to them just because of a region tag)
--
-- Scope: this migration only touches accounts/leads/opportunities/contacts.
-- Tasks and interactions aren't region-tagged themselves (they link to
-- these via foreign keys) — restricting those by region requires a join
-- per row and has more edge cases (e.g. a task with no linked account),
-- so they're left org-wide-visible for now. Ask if you want that scoped
-- too once there's real multi-rep usage to observe.

create or replace function auth_region()
returns text language sql stable security definer as $$
  select region from profiles where id = auth.uid()
$$;

-- ── accounts ──
drop policy if exists "accounts_select" on accounts;
create policy "accounts_select" on accounts
  for select using (
    organization_id = auth_org_id() and (
      auth_role() in ('manager','admin','marketing') or
      region = auth_region() or
      region = 'Unknown' or
      owner_id = auth.uid()
    )
  );

-- ── leads ──
drop policy if exists "leads_select" on leads;
create policy "leads_select" on leads
  for select using (
    organization_id = auth_org_id() and (
      auth_role() in ('manager','admin','marketing') or
      region = auth_region() or
      region = 'Unknown' or
      owner_id = auth.uid()
    )
  );

-- ── opportunities ──
drop policy if exists "opportunities_select" on opportunities;
create policy "opportunities_select" on opportunities
  for select using (
    organization_id = auth_org_id() and (
      auth_role() in ('manager','admin','marketing') or
      region = auth_region() or
      region = 'Unknown' or
      owner_id = auth.uid()
    )
  );

-- ── contacts (no region column — inherit from the linked account) ──
drop policy if exists "contacts_select" on contacts;
create policy "contacts_select" on contacts
  for select using (
    organization_id = auth_org_id() and (
      auth_role() in ('manager','admin','marketing') or
      owner_id = auth.uid() or
      exists (
        select 1 from accounts a
        where a.id = contacts.account_id
          and (a.region = auth_region() or a.region = 'Unknown')
      )
    )
  );
